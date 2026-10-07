import type { MessageModalApi } from '@/contexts/MessageModalContext';

/**
 * Ask for a reason from a short fixed list, or nothing (cancelled).
 *
 * Used where `room_action()` requires one: acting for an attendant, and
 * sending a room back. A fixed list keeps the history and reports readable
 * ("Device issue", not twelve spellings of it); the server stores the text.
 */
export function askReason(
  modal: MessageModalApi,
  title: string,
  message: string,
  reasons: readonly string[]
): Promise<string | null> {
  return new Promise((resolve) => {
    modal.show({
      title,
      message,
      buttons: [
        ...reasons.map((reason) => ({ text: reason, onPress: () => resolve(reason) })),
        { text: 'Cancel', style: 'cancel' as const, onPress: () => resolve(null) },
      ],
    });
  });
}
