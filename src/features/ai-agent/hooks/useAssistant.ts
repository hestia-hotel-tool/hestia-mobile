import { useCallback, useRef, useState } from 'react';

import { askAssistant, type AssistantMessage } from '../services/assistantClient';

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Set when this turn failed. The bubble shows it and offers a retry. */
  error?: string;
  /** True while text is still arriving into this message. */
  streaming?: boolean;
  /** "Checking rooms" — what the assistant is looking up right now. */
  status?: string;
}

/**
 * How much history is sent back up.
 *
 * Every turn resends the whole conversation, so cost grows with the square of
 * its length. Twelve turns is far more context than an operational question
 * needs and keeps a long session from quietly getting expensive. The function
 * enforces its own cap too, because the app is not the only possible caller.
 */
const MAX_HISTORY = 12;

let sequence = 0;
const nextId = () => `m${Date.now().toString(36)}-${(sequence += 1)}`;

export interface UseAssistantResult {
  messages: AssistantChatMessage[];
  isStreaming: boolean;
  send: (text: string) => void;
  /** Re-send the last question, replacing the failed answer. */
  retry: () => void;
  /** Stop the current answer and keep whatever has arrived. */
  cancel: () => void;
  clear: () => void;
}

/**
 * The assistant conversation.
 *
 * Owns the transcript and the in-flight request. The transport lives in
 * `assistantClient`; this is the part the UI binds to.
 */
export function useAssistant(): UseAssistantResult {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  /*
   * The transcript is also read inside the streaming callbacks, which outlive
   * the render that started them. A ref keeps them reading the current one
   * without making every callback depend on `messages` and re-create on each
   * token.
   */
  const messagesRef = useRef<AssistantChatMessage[]>([]);
  const write = useCallback(
    (update: (prev: AssistantChatMessage[]) => AssistantChatMessage[]) => {
      setMessages((prev) => {
        const next = update(prev);
        messagesRef.current = next;
        return next;
      });
    },
    [],
  );

  const run = useCallback(
    async (history: AssistantChatMessage[], question: string) => {
      const answerId = nextId();

      write(() => [
        ...history,
        { id: answerId, role: 'assistant', content: '', streaming: true },
      ]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      /*
       * Only completed turns go up, and only the tail of them. The empty
       * placeholder above must not: an assistant message with no content is
       * not a turn that happened, and the API rejects it.
       */
      const payload: AssistantMessage[] = history
        .filter((m) => m.content.trim().length > 0 && !m.error)
        .slice(-MAX_HISTORY)
        .map(({ role, content }) => ({ role, content }));

      const patch = (change: Partial<AssistantChatMessage>) =>
        write((prev) =>
          prev.map((m) => (m.id === answerId ? { ...m, ...change } : m)),
        );

      try {
        await askAssistant(
          { messages: payload, signal: controller.signal },
          {
            onDelta: (text) =>
              write((prev) =>
                prev.map((m) =>
                  m.id === answerId
                    ? { ...m, content: m.content + text, status: undefined }
                    : m,
                ),
              ),
            /*
             * Clear the status as soon as text starts arriving, so the label
             * does not sit under a reply that has already begun.
             */
            onStatus: (label) => patch({ status: label }),
            onDone: () => patch({ streaming: false, status: undefined }),
            onError: (message) =>
              patch({ streaming: false, status: undefined, error: message }),
          },
        );
      } finally {
        // A newer question may already have replaced this one.
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsStreaming(false);
        }
        patch({ streaming: false });
      }

      return question;
    },
    [write],
  );

  const send = useCallback(
    (text: string) => {
      const question = text.trim();
      if (!question || abortRef.current) return;

      const history: AssistantChatMessage[] = [
        ...messagesRef.current,
        { id: nextId(), role: 'user' as const, content: question },
      ];
      void run(history, question);
    },
    [run],
  );

  const retry = useCallback(() => {
    if (abortRef.current) return;
    /*
     * Drop the failed answer and everything after it, then re-ask. Leaving the
     * failure in place would send it back up as context — the model would be
     * told it had already answered, with an error message as the answer.
     */
    const current = messagesRef.current;
    const lastUser = [...current].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    const upToQuestion = current.slice(0, current.indexOf(lastUser) + 1);
    void run(upToQuestion, lastUser.content);
  }, [run]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    write((prev) => prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)));
  }, [write]);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    write(() => []);
  }, [write]);

  return { messages, isStreaming, send, retry, cancel, clear };
}
