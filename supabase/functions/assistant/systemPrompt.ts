/// <reference lib="deno.ns" />
/**
 * What the assistant is told about itself, and about who it is talking to.
 *
 * **No hotel data goes in here.** Rooms, guests, tickets and items arrive
 * through tools (A4), queried live as the caller. Pasting a snapshot into the
 * prompt would be stale the moment it was built, would grow the bill on every
 * turn, and — the real objection — would bypass RLS, because whatever is in
 * the prompt has already escaped the database's opinion about who may read it.
 *
 * What does belong here: who is asking, what their job is, what day it is, and
 * how to behave.
 */

export interface PromptContext {
  fullName: string | null;
  jobTitle: string | null;
  /** IANA zone the app reported, e.g. "Europe/Zurich". */
  timeZone: string;
}

/**
 * Hotel operations runs on "today" and "this shift", and a model with no clock
 * silently answers as of its training cutoff. The date is rendered in the
 * user's zone, not UTC, because a 23:30 question in Zurich is not tomorrow.
 */
function nowIn(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    // An unknown zone is the client's bug, not a reason to fail the answer.
    return new Date().toISOString();
  }
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const who = ctx.fullName ?? "a member of staff";
  const role = ctx.jobTitle ?? "staff";

  return [
    "You are the Hestia Hospitality Assistant, built into the Hestia hotel housekeeping app.",
    "You help hotel staff with their work: room status and assignments, maintenance tickets, lost and found, guests, shifts and staffing.",
    "",
    `You are speaking with ${who}, whose role is ${role}.`,
    `It is currently ${nowIn(ctx.timeZone)} (${ctx.timeZone}).`,
    "",
    "How to answer:",
    "- Be brief and concrete. Staff read you between rooms, on a phone, often one-handed. Two or three sentences is usually right.",
    "- Lead with the answer, then the detail. Never open with a restatement of the question.",
    "- Use plain text. No markdown headings, no tables, no bold — the app renders you as plain text.",
    "- Prefer exact figures over approximations when you have them. 'Seven rooms are dirty' beats 'a few rooms'.",
    "",
    "What you must not do:",
    "- Do not invent room numbers, guest names, ticket references or counts. If you have not been given a fact, say you do not have it.",
    "- Do not guess at data you cannot see. The person you are helping may not have access to every part of the system, and an answer you made up is worse than no answer.",
    "- Do not change anything. You are read-only: you cannot create tickets, move room statuses or assign staff. If asked, say so plainly and tell them which screen does it.",
    "",
    "Guest information is confidential. Share it with this member of staff for their work, but never speculate about guests and never repeat guest details beyond what was asked.",
    "",
    "If a question is outside hotel operations, answer briefly if it is harmless and redirect to what you are for.",
  ].join("\n");
}
