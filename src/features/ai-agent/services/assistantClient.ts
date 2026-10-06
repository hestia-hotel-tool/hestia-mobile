/**
 * Talking to the `assistant` Edge Function.
 *
 * The Anthropic key is not here, and cannot be: anything this file could read
 * would be compiled into the app bundle and extractable from any installed
 * build. The app sends the conversation and its session token; the function
 * decides what may be read and what the model is told.
 *
 * Replaces the placeholder `aiAgent.ts`, which slept 1.2s and returned a
 * hardcoded sentence.
 */

// `expo/fetch`, not the global. React Native's XHR-backed fetch resolves only
// once the whole body has arrived, which would turn a streamed answer back
// into a spinner. This one exposes `body` as a real ReadableStream.
import { fetch as streamingFetch } from 'expo/fetch';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Mirrors the function's SSE protocol; see `supabase/functions/assistant/index.ts`. */
export interface AssistantStreamHandlers {
  onDelta: (text: string) => void;
  /**
   * The assistant is looking something up — "Checking rooms".
   *
   * A tool round can take a second or two during which no text arrives, and
   * silence reads as a hang. Naming the lookup also makes it visible that the
   * answer came from live data rather than from the model's imagination.
   */
  onStatus?: (label: string) => void;
  onDone: (stopReason: string | null) => void;
  onError: (message: string) => void;
}

export interface AskOptions {
  messages: AssistantMessage[];
  signal?: AbortSignal;
  /**
   * Stream synthetic text from the function instead of calling Claude.
   *
   * Used to tell "the assistant is down" apart from "the connection is broken"
   * without spending anything, and to prove streaming works on a device.
   */
  probe?: boolean;
}

/** Shown when the app cannot even reach the function. */
const OFFLINE_MESSAGE = 'No connection to the assistant. Check your network and try again.';

function functionUrl(): string {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  return `${base.replace(/\/+$/, '')}/functions/v1/assistant`;
}

/**
 * Ask the assistant, streaming the answer back through `handlers`.
 *
 * Resolves when the stream finishes. Errors are delivered to `onError` rather
 * than thrown, because by the time most of them happen the caller is already
 * rendering a half-written reply and needs to finish it, not catch something.
 */
export async function askAssistant(
  { messages, signal, probe }: AskOptions,
  handlers: AssistantStreamHandlers,
): Promise<void> {
  if (!isSupabaseConfigured) {
    handlers.onError('The assistant needs Supabase to be configured.');
    return;
  }

  const { data } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;
  if (!accessToken) {
    handlers.onError('Your session has expired. Sign in again.');
    return;
  }

  let response: Awaited<ReturnType<typeof streamingFetch>>;
  try {
    response = await streamingFetch(functionUrl(), {
      method: 'POST',
      signal,
      headers: {
        apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        accept: 'text/event-stream',
      },
      body: JSON.stringify({
        messages,
        // The function renders "today" in this zone. A model answering a
        // 23:30 question in Zurich from UTC would name the wrong day.
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        probe: probe === true,
      }),
    });
  } catch (e) {
    if (signal?.aborted) return;
    if (__DEV__) console.warn('[assistant] request failed', e);
    handlers.onError(OFFLINE_MESSAGE);
    return;
  }

  if (!response.ok) {
    /*
     * A non-2xx arrives as JSON, not SSE — the function only switches to a
     * stream once it has decided it can answer. Its `error` is already written
     * for the person reading it.
     */
    const message = await response
      .json()
      .then((b: { error?: string }) => b?.error)
      .catch(() => undefined);
    handlers.onError(message || 'The assistant could not answer that.');
    return;
  }

  if (!response.body) {
    handlers.onError('The assistant sent an empty response.');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawDone = false;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      /*
       * Frames are separated by a blank line and a chunk can split one
       * anywhere, including mid-character — hence the streaming decoder and
       * the leftover buffer.
       */
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        let event = 'message';
        let payload = '';
        for (const line of raw.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) payload += line.slice(5).trim();
        }
        if (!payload) continue;

        let parsed: {
          text?: string;
          stopReason?: string | null;
          message?: string;
          label?: string;
        };
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue; // an unreadable frame is not worth abandoning the answer
        }

        if (event === 'delta' && parsed.text) {
          handlers.onDelta(parsed.text);
        } else if (event === 'status' && parsed.label) {
          handlers.onStatus?.(parsed.label);
        } else if (event === 'done') {
          sawDone = true;
          handlers.onDone(parsed.stopReason ?? null);
        } else if (event === 'error') {
          sawDone = true;
          handlers.onError(parsed.message || 'The assistant could not answer that.');
        }
      }
    }

    /*
     * A stream that ends without `done` or `error` was cut off — a dropped
     * connection, a function timeout. The caller is holding a partial answer
     * and has to be told, or it silently reads as complete.
     */
    if (!sawDone && !signal?.aborted) {
      handlers.onError('The answer was cut off. Try asking again.');
    }
  } catch (e) {
    if (signal?.aborted) return;
    if (__DEV__) console.warn('[assistant] stream failed', e);
    handlers.onError(OFFLINE_MESSAGE);
  } finally {
    reader.cancel().catch(() => {});
  }
}
