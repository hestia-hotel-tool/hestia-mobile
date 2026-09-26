/// <reference lib="deno.ns" />
/**
 * What the assistant is allowed to look up, and how.
 *
 * ## Why tools rather than a snapshot in the prompt
 *
 * Hotel operations change by the minute: a room is cleaned, a ticket closes, an
 * item is handed back. A snapshot assembled when the sheet opened would be
 * wrong by the time it was read, would be paid for on every turn whether or not
 * the question needed it, and — the real objection — would have already escaped
 * RLS. Anything in the prompt has been read before the database was asked
 * whether this person may read it.
 *
 * So the model asks, and each answer is a live query **run as the caller**. The
 * `db` handed to an executor is bound to their JWT, so `hotel_id` scoping and
 * every RLS policy apply exactly as they do in the app.
 *
 * ## Two gates, not one
 *
 * `requiredPermission` decides whether a tool is *offered*. RLS decides what it
 * *returns*. The second is the security boundary — the first exists so the
 * model does not burn a round trip discovering it may not look, and does not
 * tell a housekeeper "there are no tickets" when the truth is "you cannot see
 * tickets". Offering nothing is a clearer answer than an empty list.
 *
 * ## Shape of the results
 *
 * Compact and row-capped. Every row is tokens the user pays for and latency
 * they wait through, and a model handed 300 rooms answers worse than one handed
 * the 12 that matter. Columns are trimmed to what an operational question
 * actually needs.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

/** Hard ceiling per query, whatever the model asks for. */
const MAX_ROWS = 60;
const DEFAULT_ROWS = 25;

function cap(limit: unknown): number {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_ROWS;
  return Math.min(Math.floor(n), MAX_ROWS);
}

/**
 * Housekeeping status is free text in the column and inconsistently cased —
 * `rooms.ts` normalises "in progress", "inprogress" and "in_progress" to one
 * value for display. The same spread has to be accepted here or a filter on
 * "in_progress" silently misses rows written as "In Progress".
 */
function houseKeepingVariants(status: string): string[] {
  const key = status.trim().toLowerCase().replace(/[\s_]+/g, "");
  const groups: Record<string, string[]> = {
    dirty: ["dirty", "Dirty"],
    inprogress: ["in_progress", "in progress", "inprogress", "In Progress", "InProgress"],
    cleaned: ["cleaned", "Cleaned"],
    inspected: ["inspected", "Inspected"],
  };
  return groups[key] ?? [status];
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  /** Omit to offer the tool to everyone who reached the assistant at all. */
  requiredPermission?: string;
  execute: (db: SupabaseClient, input: Record<string, unknown>) => Promise<unknown>;
}

/** Throwing inside an executor becomes a `tool_result` the model can recover from. */
function rows<T>(result: { data: T[] | null; error: { message?: string } | null }): T[] {
  if (result.error) throw new Error(result.error.message ?? "query failed");
  return result.data ?? [];
}

export const TOOLS: ToolDefinition[] = [
  {
    name: "list_rooms",
    description:
      "List rooms with their housekeeping status. Use for questions about how many rooms are dirty, cleaned, inspected or in progress, which rooms are flagged or priority, and which rooms a particular status applies to. Returns room numbers, not internal ids.",
    requiredPermission: "rooms.read",
    input_schema: {
      type: "object",
      properties: {
        housekeeping_status: {
          type: "string",
          enum: ["dirty", "in_progress", "cleaned", "inspected"],
          description: "Only rooms with this housekeeping status.",
        },
        flagged: { type: "boolean", description: "Only rooms that are flagged." },
        priority: { type: "boolean", description: "Only rush / priority rooms." },
        limit: { type: "integer", description: `Max rows, default ${DEFAULT_ROWS}.` },
      },
    },
    async execute(db, input) {
      let q = db
        .from("rooms")
        .select("room_number, house_keeping_status, linen_status, category, flagged, flag_reason, priority")
        .order("room_number", { ascending: true })
        .limit(cap(input.limit));

      if (typeof input.housekeeping_status === "string") {
        q = q.in("house_keeping_status", houseKeepingVariants(input.housekeeping_status));
      }
      if (input.flagged === true) q = q.eq("flagged", true);
      // `priority` is text ("high" | "normal"), not a boolean.
      if (input.priority === true) q = q.eq("priority", "high");

      const data = rows(await q);
      return { count: data.length, rooms: data };
    },
  },

  {
    name: "count_rooms_by_status",
    description:
      "Counts of rooms grouped by housekeeping status. Use this instead of list_rooms when the question is only 'how many', so the whole list does not have to be fetched.",
    requiredPermission: "rooms.read",
    input_schema: { type: "object", properties: {} },
    async execute(db) {
      const data = rows(
        await db.from("rooms").select("house_keeping_status").limit(1000),
      ) as { house_keeping_status: string | null }[];

      const tally: Record<string, number> = {
        dirty: 0,
        in_progress: 0,
        cleaned: 0,
        inspected: 0,
      };
      for (const row of data) {
        const key = (row.house_keeping_status ?? "dirty")
          .trim()
          .toLowerCase()
          .replace(/[\s_]+/g, "");
        if (key === "inprogress") tally.in_progress += 1;
        else if (key in tally) tally[key] += 1;
        else tally.dirty += 1; // rooms.ts defaults unknown values to Dirty
      }
      return { total: data.length, by_status: tally };
    },
  },

  {
    name: "get_room",
    description:
      "Everything about one room by its number: housekeeping and linen status, category, credit, flags, special instructions, and the guest currently staying there if any.",
    requiredPermission: "rooms.read",
    input_schema: {
      type: "object",
      properties: {
        room_number: { type: "string", description: 'e.g. "101".' },
      },
      required: ["room_number"],
    },
    async execute(db, input) {
      const roomNumber = String(input.room_number ?? "").trim();
      if (!roomNumber) throw new Error("room_number is required");

      const data = rows(
        await db
          .from("rooms")
          .select(
            "id, room_number, house_keeping_status, linen_status, category, credit, flagged, flag_reason, priority, special_instructions, " +
              "reservations(arrival_date, departure_date, adults, kids, front_office_status, guests(full_name, vip_code))",
          )
          .eq("room_number", roomNumber)
          .limit(1),
      );
      if (data.length === 0) return { found: false, room_number: roomNumber };
      return { found: true, room: data[0] };
    },
  },

  {
    name: "list_flag_events",
    description:
      "History of rooms being flagged, re-flagged with a new reason, and unflagged, with the reason given, who did it, who was @mentioned, and when. Use for reports such as 'rooms flagged this month and why' or 'why was room 204 flagged'. For which rooms are flagged right now, use list_rooms instead. Only flags made since flag history started being recorded are available.",
    requiredPermission: "rooms.read",
    input_schema: {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "Start, inclusive: an ISO date (YYYY-MM-DD) or datetime with offset. For 'this month', the first day of the current month.",
        },
        to: {
          type: "string",
          description: "End, inclusive: an ISO date (YYYY-MM-DD) or datetime with offset. Omit for up to now.",
        },
        room_number: { type: "string", description: "Only events for this room." },
        limit: { type: "integer", description: `Max events, default ${DEFAULT_ROWS}.` },
      },
      required: ["from"],
    },
    async execute(db, input) {
      const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
      const parse = (value: unknown, endOfDay: boolean): string | null => {
        if (typeof value !== "string" || !value.trim()) return null;
        const raw = value.trim();
        const d = new Date(DATE_ONLY.test(raw) ? `${raw}T00:00:00Z` : raw);
        if (!Number.isFinite(d.getTime())) throw new Error(`Not a date: ${raw}`);
        // An inclusive end date means "through the end of that day".
        if (endOfDay && DATE_ONLY.test(raw)) d.setUTCDate(d.getUTCDate() + 1);
        return d.toISOString();
      };
      const from = parse(input.from, false);
      if (!from) throw new Error("from is required");
      const to = parse(input.to, true);

      let q = db
        .from("room_history")
        .select("event_type, description, attachments, created_at, rooms(room_number, category, flagged), users(full_name)")
        .in("event_type", ["room_flagged", "room_flag_updated", "room_unflagged"])
        .gte("created_at", from)
        .order("created_at", { ascending: false })
        .limit(cap(input.limit));
      if (to) q = q.lt("created_at", to);

      if (typeof input.room_number === "string" && input.room_number.trim()) {
        const room = rows(
          await db.from("rooms").select("id").eq("room_number", input.room_number.trim()).limit(1),
        ) as { id: string }[];
        if (room.length === 0) return { count: 0, events: [], note: `No room ${input.room_number}.` };
        q = q.eq("room_id", room[0].id);
      }

      type Row = {
        event_type: string;
        description: string | null;
        attachments: { kind?: string; name?: string }[] | null;
        created_at: string;
        rooms: { room_number: string; category: string | null; flagged: boolean | null } | null;
        users: { full_name: string | null } | null;
      };
      const data = rows(await q) as Row[];

      const events = data.map((r) => ({
        room_number: r.rooms?.room_number ?? null,
        category: r.rooms?.category ?? null,
        event: r.event_type.replace(/^room_/, ""),
        reason: r.description,
        by: r.users?.full_name ?? null,
        mentioned: (Array.isArray(r.attachments) ? r.attachments : [])
          .filter((a) => a?.kind === "mention" && a.name)
          .map((a) => a.name),
        at: r.created_at,
        currently_flagged: r.rooms?.flagged ?? null,
      }));

      return {
        range: { from, to: to ?? "now" },
        count: events.length,
        rooms_flagged: new Set(events.filter((e) => e.event === "flagged").map((e) => e.room_number)).size,
        events,
        note:
          events.length === 0
            ? "No flag events in this range. Flag history is only recorded from 26 September 2026 onwards."
            : undefined,
      };
    },
  },

  {
    name: "list_tickets",
    description:
      "Maintenance and service tickets. Use for questions about open or unsolved issues, what is outstanding, and tickets for a particular room. Status values: unsolved (open), done (resolved), ofo (out of order).",
    // Tickets have no `.read` key; visibility is the tab permission.
    requiredPermission: "tab.tickets.view",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["unsolved", "done", "ofo"] },
        room_number: { type: "string", description: "Only tickets for this room." },
        limit: { type: "integer", description: `Max rows, default ${DEFAULT_ROWS}.` },
      },
    },
    async execute(db, input) {
      let q = db
        .from("tickets")
        .select(
          "title, description, status, priority, type, created_at, resolved_at, rooms(room_number), departments(name)",
        )
        .order("created_at", { ascending: false })
        .limit(cap(input.limit));

      if (typeof input.status === "string") q = q.eq("status", input.status);

      if (typeof input.room_number === "string" && input.room_number.trim()) {
        const room = rows(
          await db
            .from("rooms")
            .select("id")
            .eq("room_number", input.room_number.trim())
            .limit(1),
        ) as { id: string }[];
        if (room.length === 0) {
          return { count: 0, tickets: [], note: `No room ${input.room_number}.` };
        }
        q = q.eq("room_id", room[0].id);
      }

      const data = rows(await q);
      return { count: data.length, tickets: data };
    },
  },

  {
    name: "list_lost_and_found",
    description:
      "Items handed in to lost and found. Status values: stored (in storage), shipped (sent back to a guest), returned, discarded. Use for questions about whether an item was found, where it is, and what is waiting in storage.",
    requiredPermission: "lost_and_found.read",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["stored", "shipped", "returned", "discarded"] },
        search: {
          type: "string",
          description: "Match against the item name, e.g. 'watch', 'passport'.",
        },
        limit: { type: "integer", description: `Max rows, default ${DEFAULT_ROWS}.` },
      },
    },
    async execute(db, input) {
      let q = db
        .from("lost_and_found_items")
        .select(
          "item_name, description, status, found_location, found_at, tracking_number, storage_location, rooms(room_number)",
        )
        .order("found_at", { ascending: false })
        .limit(cap(input.limit));

      if (typeof input.status === "string") q = q.eq("status", input.status);
      if (typeof input.search === "string" && input.search.trim()) {
        // `%` and `,` would otherwise change the meaning of the filter.
        const safe = input.search.trim().replace(/[%,]/g, " ");
        q = q.ilike("item_name", `%${safe}%`);
      }

      const data = rows(await q);
      return { count: data.length, items: data };
    },
  },

  {
    name: "list_staff",
    description:
      "Staff and their departments. Use for questions about who works here and who is in which department. Does not include contact details.",
    requiredPermission: "staff.read",
    input_schema: {
      type: "object",
      properties: {
        department: { type: "string", description: 'e.g. "Housekeeping".' },
        limit: { type: "integer", description: `Max rows, default ${DEFAULT_ROWS}.` },
      },
    },
    async execute(db, input) {
      const data = rows(
        await db
          .from("users")
          .select("full_name, departments(name), job_titles(name)")
          .order("full_name", { ascending: true })
          .limit(cap(input.limit)),
      ) as { departments?: { name?: string } | null }[];

      const wanted =
        typeof input.department === "string" ? input.department.trim().toLowerCase() : "";
      const filtered = wanted
        ? data.filter((r) => (r.departments?.name ?? "").toLowerCase().includes(wanted))
        : data;

      return { count: filtered.length, staff: filtered };
    },
  },

  {
    name: "list_room_assignments",
    description:
      "Which staff member is assigned to which room on a shift, and how that work is going. Work status values: not_started, in_progress, paused, completed. Use for questions about who is cleaning what and what is still outstanding on a shift.",
    requiredPermission: "rooms.read",
    input_schema: {
      type: "object",
      properties: {
        work_status: {
          type: "string",
          enum: ["not_started", "in_progress", "paused", "completed"],
        },
        limit: { type: "integer", description: `Max rows, default ${DEFAULT_ROWS}.` },
      },
    },
    async execute(db, input) {
      let q = db
        .from("room_assignments")
        // `!room_assignments_user_id_fkey`: two links to users since `assigned_by_id`; this is the assignee.
        .select("work_status, start_time, end_time, rooms(room_number), users!room_assignments_user_id_fkey(full_name), shifts(name)")
        .limit(cap(input.limit));

      if (typeof input.work_status === "string") q = q.eq("work_status", input.work_status);

      const data = rows(await q);
      return { count: data.length, assignments: data };
    },
  },
];

/** The tools this caller may use, in Anthropic's wire shape. */
export function toolsFor(permissions: string[]): ToolDefinition[] {
  const held = new Set(permissions);
  return TOOLS.filter((t) => !t.requiredPermission || held.has(t.requiredPermission));
}

export function toWireFormat(tools: ToolDefinition[]) {
  return tools.map(({ name, description, input_schema }) => ({
    name,
    description,
    input_schema,
  }));
}
