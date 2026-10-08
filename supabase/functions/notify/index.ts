/// <reference lib="deno.ns" />

/**
 * Push dispatch: sends in-app notifications to the recipients' phones.
 *
 * Called by the database, not the app. The `notifications_dispatch_push`
 * trigger (migration 20260928000300) posts `{ ids }` for every batch of new
 * `notifications` rows, with the shared secret in `x-push-secret`. This loads
 * those rows, looks up each recipient's devices, and hands the messages to the
 * Expo push service, which delivers them through APNs / FCM.
 *
 * - Title and body are the notification's own, so a push reads exactly like
 *   the row in Chat > Notifications. Group chats add the group's name.
 * - `data` carries the row's data plus `type` and `notificationId`; the app
 *   uses them to open the right screen on tap and to avoid a second in-app
 *   alert when the app is already open.
 * - The app icon badge is set to the recipient's unread count.
 * - Devices Expo reports as no longer registered are forgotten.
 *
 * Replaces the earlier `notify`, which the app called itself; its inserts
 * lacked `hotel_id` and never succeeded, and it accepted unauthenticated
 * requests to message anyone.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PUSH_WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";
/** Optional: only needed if "enhanced push security" is on for the Expo project. */
const EXPO_ACCESS_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN") ?? "";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Expo accepts at most 100 messages per request. */
const EXPO_BATCH = 100;

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
};

type TokenRow = { user_id: string; expo_push_token: string };

type ExpoMessage = {
  to: string;
  title: string;
  subtitle?: string;
  body: string;
  data: Record<string, unknown>;
  sound: "default";
  badge?: number;
  priority: "high";
  channelId: "default";
};

type ExpoTicket = { status: "ok" | "error"; id?: string; message?: string; details?: { error?: string } };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Constant-time string comparison, so the secret cannot be guessed by timing. */
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
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`REST ${res.status} on ${path.split("?")[0]}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : null) as T;
}

const inList = (ids: string[]) => `(${ids.map(encodeURIComponent).join(",")})`;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function sendToExpo(messages: ExpoMessage[]): Promise<{ sent: number; failed: number; deadTokens: string[] }> {
  let sent = 0;
  let failed = 0;
  const deadTokens: string[] = [];
  for (const batch of chunk(messages, EXPO_BATCH)) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "accept-encoding": "gzip, deflate",
        ...(EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(batch),
    });
    const payload = (await res.json().catch(() => ({}))) as { data?: ExpoTicket[]; errors?: unknown };
    if (!res.ok || !Array.isArray(payload.data)) {
      console.error("[notify] Expo rejected the batch", res.status, JSON.stringify(payload).slice(0, 500));
      failed += batch.length;
      continue;
    }
    // Tickets come back in the order the messages were sent.
    payload.data.forEach((ticket, i) => {
      if (ticket.status === "ok") {
        sent++;
        return;
      }
      failed++;
      if (ticket.details?.error === "DeviceNotRegistered") deadTokens.push(batch[i].to);
      else console.warn("[notify] push error", ticket.details?.error ?? "", ticket.message ?? "");
    });
  }
  return { sent, failed, deadTokens };
}

/** Words left lower-case inside a title, as the designs write them. */
const SMALL_WORDS = new Set(["a", "an", "and", "at", "for", "in", "of", "on", "or", "the", "to", "with"]);

/**
 * The push text in the design's pattern (Figma 4443:595), the same rules the
 * app's toasts use (src/lib/notificationToastVisual.ts): a Title Case title
 * ("Cleaning Started", "Room Inspected"), the message without a closing full
 * stop, and an announcement as "General Announcement" over its subject.
 * Chat messages are left exactly as written.
 */
function titleCase(title: string): string {
  return title.trim().split(/\s+/).map((word, i) => {
    if (/^[A-Z0-9]{2,}$/.test(word)) return word;
    const lower = word.toLowerCase();
    if (i > 0 && SMALL_WORDS.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
}

function pushText(row: { type: string; title: string; body: string }): { title: string; body: string } {
  if (row.type === "chat_message") return { title: row.title, body: row.body };
  if (row.type === "general") {
    return { title: "General Announcement", body: (row.title || row.body).trim().replace(/\.$/, "") };
  }
  return { title: titleCase(row.title || "Update"), body: row.body.trim().replace(/\.$/, "") };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !PUSH_WEBHOOK_SECRET) {
    console.error("[notify] Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or PUSH_WEBHOOK_SECRET");
    return json({ error: "Not configured" }, 500);
  }
  if (!safeEqual(req.headers.get("x-push-secret") ?? "", PUSH_WEBHOOK_SECRET)) {
    return json({ error: "Forbidden" }, 403);
  }

  let ids: string[];
  try {
    const body = (await req.json()) as { ids?: unknown };
    ids = Array.isArray(body.ids) ? body.ids.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (ids.length === 0) return json({ ok: true, sent: 0 });

  try {
    const rows: NotificationRow[] = [];
    for (const part of chunk(ids, 200)) {
      rows.push(
        ...(await rest<NotificationRow[]>(
          `notifications?id=in.${inList(part)}&select=id,user_id,type,title,body,data`,
        )),
      );
    }
    if (rows.length === 0) return json({ ok: true, sent: 0 });

    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const tokens: TokenRow[] = [];
    for (const part of chunk(userIds, 200)) {
      tokens.push(
        ...(await rest<TokenRow[]>(`user_push_tokens?user_id=in.${inList(part)}&select=user_id,expo_push_token`)),
      );
    }
    if (tokens.length === 0) return json({ ok: true, sent: 0, reason: "no devices" });

    const tokensByUser = new Map<string, string[]>();
    for (const t of tokens) {
      const list = tokensByUser.get(t.user_id) ?? [];
      list.push(t.expo_push_token);
      tokensByUser.set(t.user_id, list);
    }

    const unread = new Map<string, number>();
    try {
      const counts = await rest<{ user_id: string; unread: number }[]>("rpc/notification_unread_counts", {
        method: "POST",
        body: JSON.stringify({ p_user_ids: [...tokensByUser.keys()] }),
      });
      for (const c of counts ?? []) unread.set(c.user_id, c.unread);
    } catch (e) {
      console.warn("[notify] unread counts unavailable", e instanceof Error ? e.message : String(e));
    }

    // Group chats: show the group's name under the sender's.
    const chatIds = [
      ...new Set(
        rows
          .filter((r) => r.type === "chat_message" && typeof r.data?.chatId === "string")
          .map((r) => r.data!.chatId as string),
      ),
    ];
    const groupName = new Map<string, string>();
    if (chatIds.length > 0) {
      const chats = await rest<{ id: string; type: string; name: string | null }[]>(
        `chats?id=in.${inList(chatIds)}&select=id,type,name`,
      ).catch(() => []);
      for (const c of chats) if (c.name && c.type !== "direct") groupName.set(c.id, c.name);
    }

    const messages: ExpoMessage[] = [];
    for (const row of rows) {
      const devices = tokensByUser.get(row.user_id);
      if (!devices) continue;
      const data = { ...(row.data ?? {}), type: row.type, notificationId: row.id };
      const subtitle =
        row.type === "chat_message" ? groupName.get(String(row.data?.chatId ?? "")) : undefined;
      const text = pushText(row);
      for (const to of devices) {
        messages.push({
          to,
          title: text.title,
          ...(subtitle ? { subtitle } : {}),
          body: text.body,
          data,
          sound: "default",
          ...(unread.has(row.user_id) ? { badge: unread.get(row.user_id) } : {}),
          priority: "high",
          channelId: "default",
        });
      }
    }

    const result = await sendToExpo(messages);

    if (result.deadTokens.length > 0) {
      await rest(`user_push_tokens?expo_push_token=in.${inList(result.deadTokens)}`, {
        method: "DELETE",
        headers: { prefer: "return=minimal" },
      }).catch((e) => console.warn("[notify] could not forget dead tokens", e instanceof Error ? e.message : String(e)));
    }

    return json({ ok: true, notifications: rows.length, sent: result.sent, failed: result.failed });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[notify] error", message);
    return json({ error: message }, 500);
  }
});
