import type { ToastVisual } from '@/contexts/ToastContext';
import { isKnownTaskType, taskMeta } from '@features/chat/utils/taskMeta';

/**
 * The toast pill for an incoming notification (Figma 4443:224): the same
 * colour and glyph the Tasks list gives that kind — yellow with a vacuum for
 * "Cleaning started", the pale red flag for a flagged room — so a toast and
 * its row in Tasks look like the same thing. Chat and announcements use the
 * brand blue with their tab's glyph.
 */
export function notificationToastVisual(type: string | null | undefined): ToastVisual {
  switch (type) {
    case 'chat_message':
      return { colour: '#5a759d', icon: 'nav-chat' };
    case 'general':
      return { colour: '#5a759d', icon: 'action-announcement' };
    case null:
    case undefined:
    case '':
      return { colour: '#5a759d', ionicon: 'notifications' };
    default: {
      // A kind with no entry of its own still gets the pattern: brand pill, bell.
      if (!isKnownTaskType(type)) return { colour: '#5a759d', ionicon: 'notifications' };
      const meta = taskMeta(type);
      return { colour: meta.colour, icon: meta.icon, glyph: meta.glyph };
    }
  }
}

/** Words left lower-case inside a title, as the frames write them. */
const SMALL_WORDS = new Set(['a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

/**
 * The toast's title in the frames' style — Title Case ("Cleaning Started",
 * "Room Inspected", "General Announcement"). Notification titles are written
 * in sentence case ("Room cleaned", "Check the DND sign"); every kind is shown
 * the same way, designed or not. Words already in capitals (DND) are kept.
 */
export function toastTitle(title: string): string {
  return title
    .trim()
    .split(/\s+/)
    .map((word, i) => {
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      const lower = word.toLowerCase();
      if (i > 0 && SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/** The toast's message as the frames write it: no closing full stop. */
export function toastMessage(body: string): string {
  return body.trim().replace(/\.$/, '');
}
