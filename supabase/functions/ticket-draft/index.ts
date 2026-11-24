/// <reference lib="deno.ns" />
/**
 * Create Ticket → "Create with AI" (Figma 589:514).
 *
 * The app sends what the person has: photos (already uploaded, as URLs)
 * and/or a sentence, plus where they are (a room or a public area). Claude
 * returns a draft — department, issue name, urgency, description — which the
 * app puts into the normal form for the person to check and submit. Nothing
 * is created here.
 *
 * Like `assistant`: `verify_jwt = true`, and every read goes through a client
 * bound to the caller's token, so the departments offered and the room read
 * are only those RLS lets this person see. The Anthropic key is a Supabase
 * secret (`ANTHROPIC_API_KEY`), never in the app.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import Anthropic from "npm:@anthropic-ai/sdk@0.136.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const MODEL = "claude-opus-5-5";
const MAX_PHOTOS = 4;
const MAX_TEXT = 1000;

type Urgency = "high" | "medium" | "low";
interface Draft {
  departmentId: string;
  title: string;
  urgency: Urgency;
  description: string;
}

function corsHeaders(origin: string | null) {
  return {
    "access-control-allow-origin": origin ?? "*",
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders(origin) },
  });
}

/** Only photos from this project's Storage — never an arbitrary URL handed to the model. */
function isOwnStorageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const base = new URL(SUPABASE_URL);
    return u.protocol === "https:" && u.host === base.host && u.pathname.startsWith("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

const SYSTEM = `You help hotel staff raise maintenance and service tickets from what they report.
From the photos and/or the note, decide:
- departmentId: the one department, from the list given, that should handle it. Choose only an id from that list.
- title: a short issue name (2-5 words, Title Case), like "Broken Shower" or "Shower Drain Clogged". Prefer one of the frequent cases when it fits.
- urgency: "high" if it affects guest safety, a guest-occupied room's basic use (water, power, heating/cooling, toilet, door/lock), or causes damage; "medium" for a clear fault that can wait a few hours; "low" for cosmetic or minor issues.
- description: one or two plain sentences for the technician, starting with the location (for example "Room 201 –"), saying what is wrong and what was observed. No speculation beyond what the photos or note show.
If the photos and note do not show a fault, still fill every field with your best reading and keep the description factual.`;

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405, origin);

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return json({ error: "Not signed in." }, 401, origin);
  if (!ANTHROPIC_API_KEY) return json({ error: "AI is not set up for this hotel yet." }, 503, origin);

  let body: { text?: unknown; photoUrls?: unknown; roomId?: unknown; publicAreaName?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request." }, 400, origin);
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : "";
  const photoUrls = (Array.isArray(body.photoUrls) ? body.photoUrls : [])
    .filter((u): u is string => typeof u === "string" && isOwnStorageUrl(u))
    .slice(0, MAX_PHOTOS);
  if (!text && photoUrls.length === 0) return json({ error: "Add a photo or describe the issue." }, 400, origin);

  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await db.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Not signed in." }, 401, origin);

  // The departments this person's hotel has (RLS-scoped).
  const { data: departments, error: deptError } = await db.from("departments").select("id, name").order("name");
  if (deptError || !departments?.length) return json({ error: "No departments to choose from." }, 500, origin);

  // Where it is: the room number, or the public area's name.
  let location = typeof body.publicAreaName === "string" && body.publicAreaName.trim() ? body.publicAreaName.trim() : "";
  if (!location && typeof body.roomId === "string" && body.roomId) {
    const { data: room } = await db.from("rooms").select("room_number").eq("id", body.roomId).maybeSingle();
    if (room?.room_number) location = `Room ${room.room_number}`;
  }

  const departmentList = departments.map((d) => `- ${d.id}: ${d.name}`).join("\n");
  const content: Anthropic.Beta.BetaContentBlockParam[] = [
    ...photoUrls.map((url) => ({ type: "image" as const, source: { type: "url" as const, url } })),
    {
      type: "text",
      text: [
        `Location: ${location || "not given"}`,
        `Departments (id: name):\n${departmentList}`,
        "Frequent cases: Broken Shower, Shower Drain Clogged, Toilet Not Flushing Properly, HVAC / Climate Control, Furniture & Fixtures",
        `Staff note: ${text || "(none — use the photos)"}`,
      ].join("\n\n"),
    },
  ];

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      // If the model declines, the API re-runs the request on a fallback model in the same call.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      max_tokens: 2048,
      system: SYSTEM,
      // A short classification: low effort is plenty and keeps it quick.
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              departmentId: { type: "string", enum: departments.map((d) => String(d.id)) },
              title: { type: "string" },
              urgency: { type: "string", enum: ["high", "medium", "low"] },
              description: { type: "string" },
            },
            required: ["departmentId", "title", "urgency", "description"],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: "user", content }],
    });

    if (response.stop_reason === "refusal") {
      return json({ error: "The AI could not draft this ticket. Fill it in manually." }, 422, origin);
    }
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return json({ error: "The AI returned no draft. Try again." }, 502, origin);
    }
    const draft = JSON.parse(textBlock.text) as Draft;
    return json({ draft }, 200, origin);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "The AI is busy. Try again in a moment." }, 429, origin);
    if (e instanceof Anthropic.BadRequestError) {
      console.warn("[ticket-draft] bad request", e.message);
      return json({ error: "The AI could not read these photos. Try another photo or a description." }, 400, origin);
    }
    if (e instanceof Anthropic.APIError) {
      console.warn("[ticket-draft] api error", e.status, e.message);
      return json({ error: "The AI is unavailable right now." }, 502, origin);
    }
    console.warn("[ticket-draft] failed", e);
    return json({ error: "The AI could not draft this ticket." }, 500, origin);
  }
});
