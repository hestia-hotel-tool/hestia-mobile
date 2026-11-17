/// <reference lib="deno.ns" />

/**
 * Email dispatch: sends rows of `email_outbox` through the configured provider.
 *
 * Called by the database, not the app. The `email_outbox_dispatch` trigger
 * (migration 20261023120000) posts `{ ids }` for each batch of new rows with
 * the shared secret in `x-push-secret` — the same secret and plumbing as push
 * (`notify`). `{ "pending": true }` instead sends everything still queued or
 * failed, e.g. after a provider is first configured.
 *
 * The provider is chosen by environment, so turning email on is only
 * `supabase secrets set …` (see docs/email.md):
 *
 *   EMAIL_PROVIDER   resend | sendgrid | postmark | mailgun | smtp
 *   EMAIL_FROM       "Hestia Lost & Found <lostandfound@yourhotel.com>"
 *   EMAIL_API_KEY    the provider's API key (not for smtp)
 *   EMAIL_REPLY_TO   optional fallback when the hotel has no contact_email
 *   MAILGUN_DOMAIN   mailgun only; MAILGUN_REGION=eu for the EU endpoint
 *   SMTP_HOST, SMTP_PORT (465), SMTP_USER, SMTP_PASS   smtp only
 *
 * Unconfigured, rows stay queued with a note in `last_error`, and go out on
 * the next `{ pending: true }` call once a provider is set. Each row is tried
 * at most MAX_ATTEMPTS times.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";

const PROVIDER = (Deno.env.get("EMAIL_PROVIDER") ?? "").trim().toLowerCase();
const FROM = (Deno.env.get("EMAIL_FROM") ?? "").trim();
const API_KEY = (Deno.env.get("EMAIL_API_KEY") ?? "").trim();
const DEFAULT_REPLY_TO = (Deno.env.get("EMAIL_REPLY_TO") ?? "").trim();

const MAX_ATTEMPTS = 5;

type OutboxRow = {
  id: string;
  to_email: string;
  reply_to: string | null;
  subject: string;
  text_body: string;
  html_body: string;
  attempts: number;
};

type Message = { to: string; from: string; replyTo?: string; subject: string; text: string; html: string };
type SendResult = { messageId?: string };

function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** What is missing for the chosen provider, or null when it can send. */
function configProblem(): string | null {
  if (!PROVIDER) return "Email is not configured (EMAIL_PROVIDER is not set).";
  if (!FROM) return "EMAIL_FROM is not set.";
  if (["resend", "sendgrid", "postmark", "mailgun"].includes(PROVIDER) && !API_KEY) return "EMAIL_API_KEY is not set.";
  if (PROVIDER === "mailgun" && !Deno.env.get("MAILGUN_DOMAIN")) return "MAILGUN_DOMAIN is not set.";
  if (PROVIDER === "smtp" && !(Deno.env.get("SMTP_HOST") && Deno.env.get("SMTP_USER") && Deno.env.get("SMTP_PASS"))) {
    return "SMTP_HOST, SMTP_USER and SMTP_PASS must be set.";
  }
  if (!["resend", "sendgrid", "postmark", "mailgun", "smtp"].includes(PROVIDER)) return `Unknown EMAIL_PROVIDER "${PROVIDER}".`;
  return null;
}

async function failOnError(res: Response, provider: string): Promise<unknown> {
  const body = await res.text();
  if (!res.ok) throw new Error(`${provider} ${res.status}: ${body.slice(0, 500)}`);
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    return {};
  }
}

/** One message through the configured provider. Throws with the provider's reason on failure. */
async function send(m: Message): Promise<SendResult> {
  switch (PROVIDER) {
    case "resend": {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ from: m.from, to: [m.to], subject: m.subject, html: m.html, text: m.text, ...(m.replyTo ? { reply_to: m.replyTo } : {}) }),
      });
      const j = (await failOnError(res, "Resend")) as { id?: string };
      return { messageId: j.id };
    }
    case "sendgrid": {
      const from = parseAddress(m.from);
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { authorization: `Bearer ${API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: m.to }] }],
          from,
          ...(m.replyTo ? { reply_to: { email: m.replyTo } } : {}),
          subject: m.subject,
          content: [
            { type: "text/plain", value: m.text },
            { type: "text/html", value: m.html },
          ],
        }),
      });
      await failOnError(res, "SendGrid");
      return { messageId: res.headers.get("x-message-id") ?? undefined };
    }
    case "postmark": {
      const res = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: { "X-Postmark-Server-Token": API_KEY, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ From: m.from, To: m.to, ReplyTo: m.replyTo, Subject: m.subject, HtmlBody: m.html, TextBody: m.text, MessageStream: "outbound" }),
      });
      const j = (await failOnError(res, "Postmark")) as { MessageID?: string };
      return { messageId: j.MessageID };
    }
    case "mailgun": {
      const domain = Deno.env.get("MAILGUN_DOMAIN") ?? "";
      const host = (Deno.env.get("MAILGUN_REGION") ?? "").toLowerCase() === "eu" ? "api.eu.mailgun.net" : "api.mailgun.net";
      const form = new FormData();
      form.set("from", m.from);
      form.set("to", m.to);
      form.set("subject", m.subject);
      form.set("text", m.text);
      form.set("html", m.html);
      if (m.replyTo) form.set("h:Reply-To", m.replyTo);
      const res = await fetch(`https://${host}/v3/${domain}/messages`, {
        method: "POST",
        headers: { authorization: `Basic ${btoa(`api:${API_KEY}`)}` },
        body: form,
      });
      const j = (await failOnError(res, "Mailgun")) as { id?: string };
      return { messageId: j.id };
    }
    case "smtp": {
      // Supabase blocks outbound ports 25 and 587; use 465 (implicit TLS).
      const { default: nodemailer } = await import("npm:nodemailer@6.9.16");
      const port = Number(Deno.env.get("SMTP_PORT") ?? "465");
      const transport = nodemailer.createTransport({
        host: Deno.env.get("SMTP_HOST"),
        port,
        secure: port === 465,
        auth: { user: Deno.env.get("SMTP_USER"), pass: Deno.env.get("SMTP_PASS") },
      });
      const info = await transport.sendMail({ from: m.from, to: m.to, replyTo: m.replyTo, subject: m.subject, text: m.text, html: m.html });
      return { messageId: info.messageId };
    }
    default:
      throw new Error(`Unknown EMAIL_PROVIDER "${PROVIDER}".`);
  }
}

/** `Name <a@b.c>` or `a@b.c` → SendGrid's `{ email, name }`. */
function parseAddress(v: string): { email: string; name?: string } {
  const m = v.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { email: m[2], ...(m[1] ? { name: m[1].replace(/^"|"$/g, "") } : {}) } : { email: v };
}

async function patch(id: string, fields: Record<string, unknown>): Promise<void> {
  await rest(`email_outbox?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(fields), headers: { prefer: "return=minimal" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !WEBHOOK_SECRET) {
    console.error("[send-email] Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or PUSH_WEBHOOK_SECRET");
    return new Response("Not configured", { status: 500 });
  }
  if (!safeEqual(req.headers.get("x-push-secret") ?? "", WEBHOOK_SECRET)) {
    return new Response("Forbidden", { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { ids?: unknown; pending?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x)) : [];
  const pending = body.pending === true;
  if (!pending && ids.length === 0) return Response.json({ sent: 0, failed: 0 });

  const problem = configProblem();
  const scope = pending ? "" : `&id=in.(${ids.join(",")})`;

  if (problem) {
    // Leave them queued: they go out once a provider is set.
    await rest(`email_outbox?status=eq.queued${scope}`, {
      method: "PATCH",
      body: JSON.stringify({ last_error: problem }),
      headers: { prefer: "return=minimal" },
    });
    console.warn(`[send-email] ${problem}`);
    return Response.json({ sent: 0, failed: 0, queued: true, reason: problem });
  }

  // Claim: only rows still waiting, so a duplicate call cannot send twice.
  const rows = await rest<OutboxRow[]>(
    `email_outbox?status=in.(queued,failed)&attempts=lt.${MAX_ATTEMPTS}${scope}&select=id,to_email,reply_to,subject,text_body,html_body,attempts`,
    { method: "PATCH", body: JSON.stringify({ status: "sending" }) },
  );

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const result = await send({
        to: row.to_email,
        from: FROM,
        replyTo: row.reply_to || DEFAULT_REPLY_TO || undefined,
        subject: row.subject,
        text: row.text_body,
        html: row.html_body,
      });
      await patch(row.id, {
        status: "sent",
        sent_at: new Date().toISOString(),
        attempts: row.attempts + 1,
        provider: PROVIDER,
        provider_message_id: result.messageId ?? null,
        last_error: null,
      });
      sent += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[send-email] ${row.id} failed: ${message}`);
      await patch(row.id, { status: "failed", attempts: row.attempts + 1, provider: PROVIDER, last_error: message.slice(0, 1000) });
      failed += 1;
    }
  }
  return Response.json({ sent, failed });
});
