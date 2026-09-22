/// <reference lib="deno.ns" />
/**
 * The Anthropic call, and nothing else.
 *
 * Kept apart from `index.ts` so the transport (auth, SSE framing, errors) can
 * be read without the model wire format tangled through it, and so the tool
 * loop in A4 has one obvious place to live.
 */

export const ANTHROPIC_MODEL = "claude-sonnet-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/** Enough for a thorough answer; short enough that a runaway reply is bounded. */
export const MAX_TOKENS = 1024;

/**
 * A turn. Plain text for the app's own messages; blocks once a tool round has
 * happened, because the assistant's turn then contains `tool_use` and the
 * reply to it contains `tool_result`.
 */
export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | {
      type: "tool_result";
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    };

export class AnthropicError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** What the user should see. Never the upstream body, which can echo the prompt. */
    readonly userMessage: string,
  ) {
    super(message);
  }
}

/**
 * Translate an upstream failure into something a housekeeper can act on.
 *
 * The upstream body is deliberately not forwarded: Anthropic echoes parts of
 * the request in some errors, and the request contains the conversation.
 */
function describeFailure(status: number): string {
  if (status === 401 || status === 403) {
    return "The assistant is not configured correctly. Please tell an administrator.";
  }
  if (status === 429) {
    return "The assistant is busy right now. Try again in a moment.";
  }
  if (status === 529 || status >= 500) {
    return "The assistant is temporarily unavailable. Try again shortly.";
  }
  return "The assistant could not answer that.";
}

/** One decoded event from Anthropic's stream, reduced to what we act on. */
export type AnthropicStreamEvent =
  | { type: "text"; text: string }
  /**
   * The turn ended. `content` is the assistant turn reassembled from the
   * stream, which the caller appends verbatim to the conversation before
   * replying with tool results — the API requires the exact blocks back.
   */
  | {
      type: "stop";
      stopReason: string | null;
      content: ContentBlock[];
    };

/**
 * Stream a completion, yielding text as it arrives and the assembled turn at
 * the end.
 *
 * Anthropic speaks SSE and sends a turn as indexed content blocks: a block
 * opens, receives deltas, and closes. Text deltas are forwarded immediately so
 * the user sees words appear. A `tool_use` block cannot be — its arguments
 * arrive as a stream of JSON fragments (`input_json_delta`) that are not valid
 * JSON until the block closes — so those are buffered per index and parsed on
 * `content_block_stop`.
 */
export async function* streamCompletion(opts: {
  apiKey: string;
  system: string;
  messages: AnthropicMessage[];
  tools?: unknown[];
  signal?: AbortSignal;
}): AsyncGenerator<AnthropicStreamEvent> {
  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      signal: opts.signal,
      headers: {
        "x-api-key": opts.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        system: opts.system,
        messages: opts.messages,
        ...(opts.tools && opts.tools.length > 0 ? { tools: opts.tools } : {}),
        stream: true,
      }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new AnthropicError(502, `network: ${msg}`, describeFailure(502));
  }

  if (!res.ok || !res.body) {
    // Read the body for the log only — see `describeFailure`.
    const detail = await res.text().catch(() => "");
    throw new AnthropicError(
      res.status,
      `anthropic ${res.status}: ${detail.slice(0, 500)}`,
      describeFailure(res.status),
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  /** Blocks under construction, by the index Anthropic assigns them. */
  const open = new Map<
    number,
    { type: "text"; text: string } | { type: "tool_use"; id: string; name: string; json: string }
  >();
  /** The finished turn, in arrival order, to hand back at `stop`. */
  const assembled: ContentBlock[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      /*
       * SSE frames are separated by a blank line, and a chunk can split one
       * anywhere — including mid-UTF-8, which is why the decoder is streaming.
       * Everything up to the last separator is complete; the remainder stays
       * buffered.
       */
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        const dataLine = frame
          .split("\n")
          .find((l) => l.startsWith("data:"));
        if (!dataLine) continue;

        const payload = dataLine.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        let evt: Record<string, unknown>;
        try {
          evt = JSON.parse(payload);
        } catch {
          continue; // a frame we cannot read is not a reason to kill the answer
        }

        const type = evt.type;
        if (type === "content_block_start") {
          const index = Number(evt.index ?? 0);
          const block = evt.content_block as
            | { type?: string; id?: string; name?: string }
            | undefined;
          if (block?.type === "tool_use") {
            open.set(index, {
              type: "tool_use",
              id: String(block.id ?? ""),
              name: String(block.name ?? ""),
              json: "",
            });
          } else if (block?.type === "text") {
            open.set(index, { type: "text", text: "" });
          }
        } else if (type === "content_block_delta") {
          const index = Number(evt.index ?? 0);
          const delta = evt.delta as
            | { type?: string; text?: string; partial_json?: string }
            | undefined;

          if (delta?.type === "text_delta" && delta.text) {
            const block = open.get(index);
            if (block?.type === "text") block.text += delta.text;
            yield { type: "text", text: delta.text };
          } else if (delta?.type === "input_json_delta") {
            const block = open.get(index);
            if (block?.type === "tool_use") block.json += delta.partial_json ?? "";
          }
        } else if (type === "content_block_stop") {
          const index = Number(evt.index ?? 0);
          const block = open.get(index);
          open.delete(index);
          if (!block) continue;

          if (block.type === "text") {
            if (block.text) assembled.push({ type: "text", text: block.text });
          } else {
            /*
             * An empty `input` is what Anthropic sends for a no-argument tool,
             * and `JSON.parse("")` throws. Unparseable arguments are not fatal
             * either — the tool runner reports the failure back to the model
             * as a tool_result, which it can recover from.
             */
            let input: unknown = {};
            if (block.json.trim()) {
              try {
                input = JSON.parse(block.json);
              } catch {
                input = {};
              }
            }
            assembled.push({ type: "tool_use", id: block.id, name: block.name, input });
          }
        } else if (type === "message_delta") {
          const delta = evt.delta as { stop_reason?: string | null } | undefined;
          yield {
            type: "stop",
            stopReason: delta?.stop_reason ?? null,
            content: assembled,
          };
        } else if (type === "error") {
          const err = evt.error as { message?: string } | undefined;
          throw new AnthropicError(
            502,
            `anthropic stream error: ${err?.message ?? "unknown"}`,
            describeFailure(502),
          );
        }
      }
    }
  } finally {
    // An abandoned client must not leave the upstream connection open.
    reader.cancel().catch(() => {});
  }
}
