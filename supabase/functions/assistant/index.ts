/// <reference lib="deno.ns" />
/**
 * The Hestia assistant.
 *
 * Proxies the app's questions to Anthropic and answers them from live hotel
 * data. The app never holds the Anthropic key — it is a Supabase secret read
 * here — and never decides what it is allowed to read.
 *
 * ## Why this does not use the service role
 *
 * `notify/index.ts` runs with `SUPABASE_SERVICE_ROLE_KEY` and `verify_jwt =
 * false`, which is right for a trusted server-to-server webhook whose payload
 * it controls. It would be wrong here, twice over:
 *
 *   1. The caller is a person, and the answer must be scoped to what that
 *      person may see. Service role bypasses RLS, so a housekeeper at one
 *      hotel could ask about another hotel's guests and get an answer.
 *   2. The question is free text handed to a model. Any query the model can
 *      compose runs with whatever authority this function has. That authority
 *      should therefore be the caller's, and nothing more.
 *
 * So: `verify_jwt = true` (see config.toml), and every read goes through a
 * client bound to the caller's token. RLS and `hotel_id` are the control, and
 * they are the same ones the app already relies on.
 *
 * ## Stage
 *
 * A1 — auth and identity. Verified: 401 without a token, 401 on a bad one,
 * 400 on a bad body, and a caller resolved from the database as themselves.
 *
 * A2/A3 — Anthropic, streamed. The reply is sent as Server-Sent Events so the
 * app can render words as they arrive instead of staring at a spinner for
 * several seconds.
 *
 * The app-facing event protocol is **ours**, not a passthrough of Anthropic's:
 *   event: delta   data: {"text":"..."}     a chunk of the answer
 *   event: status  data: {"label":"..."}    looking something up
 *   event: done    data: {"stopReason":...} the answer is complete
 *   event: error   data: {"message":"..."}  give up and show this
 *
 * A4 — tools. One client request can now be several Anthropic calls: the model
 * asks for data, the data is fetched as the caller, the model continues. A raw
 * passthrough of Anthropic's stream would leak that structure at the client;
 * this protocol hides it behind `status`.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.95.3";
import {
  AnthropicError,
  streamCompletion,
  type AnthropicMessage,
  type ContentBlock,
} from "./anthropic.ts";
import { buildSystemPrompt } from "./systemPrompt.ts";
import { toolsFor, toWireFormat, type ToolDefinition } from "./tools.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
/**
 * The publishable (anon) key, not the service role.
 *
 * It is only the API-gateway key; the `Authorization` header below is what
 * establishes identity, and PostgREST applies RLS for that user.
 */
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
/**
 * Set with `supabase secrets set ANTHROPIC_API_KEY=...`, never in the app.
 *
 * Absent, the function still serves `probe` (see below) and returns a clear
 * 503 for real questions, so the app can show "not configured" rather than a
 * generic failure.
 */
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

function corsHeaders(origin: string | null) {
  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-headers":
      "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
  };
}

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers ?? {}),
    },
  });
}

export interface Caller {
  userId: string;
  email: string | null;
  hotelId: string | null;
  fullName: string | null;
  jobTitle: string | null;
  permissions: string[];
  /** Bound to the caller's JWT: every query through it obeys RLS. */
  db: SupabaseClient;
}

/**
 * Resolve who is asking, and hand back a database client that can only see
 * what they can see.
 *
 * `verify_jwt = true` means the platform has already rejected a missing or
 * malformed token, but it does not tell us *who* it belongs to, and a token
 * can be valid yet revoked. `getUser()` re-checks against the auth server.
 */
async function resolveCaller(req: Request): Promise<Caller> {
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    throw new HttpError(401, "Missing bearer token.");
  }

  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await db.auth.getUser();
  if (userError || !userData?.user) {
    throw new HttpError(401, "Not signed in.");
  }
  const user = userData.user;

  /*
   * Profile and permissions come from the database as the user, not from
   * anything the client sent. `get_my_permissions()` is the same server truth
   * `PermissionProvider` uses in the app, so the assistant cannot be talked
   * into a capability the user does not have.
   */
  const [profileResult, permissionResult] = await Promise.all([
    db
      /*
       * `job_titles(name)` — not `label`; see the note in
       * `features/staff/services/staff.ts`, which reads the same embed.
       *
       * No `hotels(name)`. `public.hotels` has RLS on and no SELECT policy, so
       * it returns nothing to anyone and the embed was always null — a useful
       * confirmation that this client really is bound to the caller rather
       * than quietly running as service role. The assistant therefore says
       * "your hotel" rather than naming it. Naming it is one policy:
       *   CREATE POLICY "read own hotel" ON public.hotels FOR SELECT
       *     TO authenticated USING (id = (SELECT hotel_id FROM public.users
       *                                   WHERE id = auth.uid()));
       */
      .from("users")
      .select("full_name, hotel_id, job_titles(name)")
      .eq("id", user.id)
      .maybeSingle(),
    db.rpc("get_my_permissions"),
  ]);

  const profile = (profileResult.data ?? null) as
    | {
        full_name?: string | null;
        hotel_id?: string | null;
        job_titles?: { name?: string | null } | { name?: string | null }[] | null;
      }
    | null;

  const one = <T>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

  if (permissionResult.error) {
    // Fail closed: answer nothing rather than answer with an unknown
    // capability set. Mirrors `PermissionProvider`, which also fails closed.
    throw new HttpError(403, "Could not resolve your permissions.");
  }

  /*
   * `get_my_permissions()` returns a flat array of keys — `PermissionProvider`
   * casts its result straight to `Permission[]`. The object branch is
   * tolerance for a set-returning variant, not a second supported shape.
   */
  const permissions = Array.isArray(permissionResult.data)
    ? (permissionResult.data as unknown[])
        .map((row) =>
          typeof row === "string"
            ? row
            : String((row as { permission_key?: string })?.permission_key ?? ""),
        )
        .filter(Boolean)
    : [];

  return {
    userId: user.id,
    email: user.email ?? null,
    hotelId: profile?.hotel_id ?? null,
    fullName: profile?.full_name ?? null,
    jobTitle: one(profile?.job_titles)?.name ?? null,
    permissions,
    db,
  };
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /**
     * What the user reads. Defaults to `message`, which is safe for the
     * validation errors above; anything carrying internal detail passes an
     * explicit one so the internal text stays in the log.
     */
    readonly userMessage?: string,
  ) {
    super(message);
  }
}

/** The conversation the app sends up. Content is text only. */
interface AssistantRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  /** IANA zone from the device, so "today" means the user's today. */
  timeZone: string;
  /**
   * Stream synthetic text instead of calling Anthropic.
   *
   * React Native's networking is the one part of this that could not be taken
   * on trust — chunked SSE through `expo/fetch` either works on device or the
   * whole streaming design changes. This answers that without an API key and
   * without spending anything, and it stays afterwards as the way to tell
   * "the model is down" apart from "the transport is broken" from a phone in
   * a hotel basement.
   */
  probe?: boolean;
}

function parseRequest(body: unknown): AssistantRequest {
  const messages = (body as AssistantRequest | null)?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new HttpError(400, "`messages` must be a non-empty array.");
  }
  const cleaned = messages.map((m, i) => {
    const role = m?.role;
    if (role !== "user" && role !== "assistant") {
      throw new HttpError(400, `messages[${i}].role must be "user" or "assistant".`);
    }
    const content = String(m?.content ?? "").trim();
    if (!content) throw new HttpError(400, `messages[${i}].content is empty.`);
    /*
     * A cap here, not only in the app: the app is not the only thing that can
     * call this, and an unbounded prompt is somebody else's bill.
     */
    if (content.length > 4000) {
      throw new HttpError(400, `messages[${i}].content exceeds 4000 characters.`);
    }
    return { role, content };
  });
  if (cleaned[cleaned.length - 1].role !== "user") {
    throw new HttpError(400, "The last message must be from the user.");
  }

  /*
   * A conversation is capped server-side as well as in the app. Every turn
   * resends the whole history, so an unbounded one grows the bill
   * quadratically — and the app is not the only possible caller.
   */
  if (cleaned.length > 40) {
    throw new HttpError(400, "Conversation too long; start a new one.");
  }

  const raw = body as Partial<AssistantRequest> | null;
  return {
    messages: cleaned,
    timeZone: String(raw?.timeZone ?? "UTC"),
    probe: raw?.probe === true,
  };
}

/** One SSE frame in our app-facing protocol. */
function frame(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  );
}

/**
 * Synthetic deltas, no model, no key. See `AssistantRequest.probe`.
 *
 * The 60ms gap is not decoration: without a pause every chunk lands in one
 * network packet, which is exactly the case that would *hide* a client that
 * buffers instead of streaming.
 */
function probeStream(): ReadableStream<Uint8Array> {
  const words =
    "Streaming transport is working. This text is generated by the Edge Function, not by Claude — no API key was used to produce it."
      .split(" ");
  return new ReadableStream({
    async start(controller) {
      for (const word of words) {
        controller.enqueue(frame("delta", { text: word + " " }));
        await new Promise((r) => setTimeout(r, 60));
      }
      controller.enqueue(frame("done", { stopReason: "end_turn" }));
      controller.close();
    },
  });
}

/**
 * The real answer, forwarded delta by delta.
 *
 * Errors after the first byte cannot become an HTTP status — the status is
 * long gone — so they are sent as an `error` event and the stream is closed
 * cleanly. The client treats a stream that ends without `done` as a failure
 * too, which covers the connection simply dropping.
 */
/**
 * How many times the model may ask for data before answering.
 *
 * Each round is a full Anthropic call. A well-posed question needs one or two;
 * a model that has got stuck will otherwise loop until the function times out,
 * billing every turn. Six is generous headroom over observed need and still a
 * bounded worst case.
 */
const MAX_TOOL_ROUNDS = 6;

/** What the user sees while a tool runs. Not the tool name, which is jargon. */
const TOOL_STATUS: Record<string, string> = {
  list_rooms: "Checking rooms",
  count_rooms_by_status: "Counting rooms",
  get_room: "Looking up the room",
  list_flag_events: "Checking flag history",
  list_tickets: "Checking tickets",
  list_lost_and_found: "Checking lost and found",
  list_staff: "Checking staff",
  list_room_assignments: "Checking assignments",
};

/**
 * Run one tool the model asked for, as the caller.
 *
 * A failure is returned to the model rather than thrown: "that lookup failed"
 * is something it can tell the user or route around, whereas an exception here
 * would abandon a half-written answer. The message is deliberately thin — a
 * database error can quote the query, and the query can quote guest data.
 */
async function runTool(
  tool: ToolDefinition | undefined,
  block: Extract<ContentBlock, { type: "tool_use" }>,
  db: SupabaseClient,
): Promise<ContentBlock> {
  if (!tool) {
    return {
      type: "tool_result",
      tool_use_id: block.id,
      content: JSON.stringify({
        error: "That tool is not available to this user.",
      }),
      is_error: true,
    };
  }

  try {
    const input = (block.input ?? {}) as Record<string, unknown>;
    const result = await tool.execute(db, input);
    return {
      type: "tool_result",
      tool_use_id: block.id,
      content: JSON.stringify(result),
    };
  } catch (e) {
    console.error(
      `[assistant] tool ${tool.name} failed: ${e instanceof Error ? e.message : String(e)}`,
    );
    return {
      type: "tool_result",
      tool_use_id: block.id,
      content: JSON.stringify({ error: "That lookup failed." }),
      is_error: true,
    };
  }
}

function anthropicStream(opts: {
  system: string;
  messages: AnthropicMessage[];
  apiKey: string;
  signal: AbortSignal;
  tools: ToolDefinition[];
  db: SupabaseClient;
}): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        const conversation: AnthropicMessage[] = [...opts.messages];
        const wireTools = toWireFormat(opts.tools);

        for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
          let stopReason: string | null = null;
          let turn: ContentBlock[] = [];

          for await (const event of streamCompletion({
            apiKey: opts.apiKey,
            system: opts.system,
            messages: conversation,
            tools: wireTools,
            signal: opts.signal,
          })) {
            if (event.type === "text") {
              controller.enqueue(frame("delta", { text: event.text }));
            } else if (event.type === "stop") {
              stopReason = event.stopReason;
              turn = event.content;
            }
          }

          if (stopReason !== "tool_use") {
            controller.enqueue(frame("done", { stopReason }));
            return;
          }

          /*
           * Out of rounds. Tell the model so in a tool_result rather than
           * cutting the stream — it then writes a real apology using whatever
           * it did manage to gather, instead of the user seeing a half
           * sentence stop dead.
           */
          const exhausted = round === MAX_TOOL_ROUNDS;
          const requests = turn.filter(
            (b): b is Extract<ContentBlock, { type: "tool_use" }> => b.type === "tool_use",
          );

          conversation.push({ role: "assistant", content: turn });

          const results: ContentBlock[] = [];
          for (const request of requests) {
            if (exhausted) {
              results.push({
                type: "tool_result",
                tool_use_id: request.id,
                content: JSON.stringify({
                  error: "Too many lookups for one question. Answer with what you have.",
                }),
                is_error: true,
              });
              continue;
            }
            controller.enqueue(
              frame("status", {
                label: TOOL_STATUS[request.name] ?? "Looking that up",
              }),
            );
            results.push(
              await runTool(
                opts.tools.find((t) => t.name === request.name),
                request,
                opts.db,
              ),
            );
          }

          conversation.push({ role: "user", content: results });
        }
      } catch (e) {
        if (opts.signal.aborted) {
          // The user closed the sheet or asked something else. Not an error.
          controller.close();
          return;
        }
        const userMessage =
          e instanceof AnthropicError
            ? e.userMessage
            : "The assistant could not answer that.";
        console.error(
          `[assistant] stream failed: ${e instanceof Error ? e.message : String(e)}`,
        );
        controller.enqueue(frame("error", { message: userMessage }));
      } finally {
        try {
          controller.close();
        } catch {
          // already closed on the success path
        }
      }
    },
  });
}

serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return json({ error: "Use POST." }, { status: 405, headers: cors });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new HttpError(500, "Function is missing SUPABASE_URL / SUPABASE_ANON_KEY.");
    }

    const caller = await resolveCaller(req);
    const body = await req.json().catch(() => null);
    const { messages, timeZone, probe } = parseRequest(body);

    if (!probe && !ANTHROPIC_API_KEY) {
      /*
       * Distinct from a generic 500 so the app can say "the assistant is not
       * set up yet" instead of "something went wrong" — a deployment gap and
       * an outage need different reactions from whoever is holding the phone.
       */
      throw new HttpError(
        503,
        "ANTHROPIC_API_KEY secret is not set",
        "The assistant is not set up yet. An administrator needs to finish configuring it.",
      );
    }

    const system = buildSystemPrompt({
      fullName: caller.fullName,
      jobTitle: caller.jobTitle,
      timeZone,
    });

    /*
     * Only the tools this caller's permissions allow. RLS would return nothing
     * for the rest anyway; withholding them stops the model spending a round
     * trip to find that out, and stops it reporting "no tickets" when the
     * truth is "you cannot see tickets".
     */
    const tools = toolsFor(caller.permissions);

    const stream = probe
      ? probeStream()
      : anthropicStream({
          system,
          messages,
          apiKey: ANTHROPIC_API_KEY,
          signal: req.signal,
          tools,
          db: caller.db,
        });

    return new Response(stream, {
      headers: {
        ...cors,
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        // Supabase sits behind a proxy that will otherwise buffer the whole
        // body and defeat the point of streaming.
        "x-accel-buffering": "no",
      },
    });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    const message = e instanceof Error ? e.message : String(e);
    /*
     * Log the failure, never the conversation: these messages carry guest
     * names and room numbers, and function logs are a different retention and
     * access domain from the database they came from.
     */
    console.error(`[assistant] ${status}: ${message}`);
    const userMessage =
      e instanceof HttpError
        ? (e.userMessage ?? e.message)
        : "The assistant is unavailable.";
    return json({ error: userMessage }, { status, headers: cors });
  }
});
