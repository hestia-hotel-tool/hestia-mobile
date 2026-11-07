/**
 * Dates in a chat, the WhatsApp way.
 *
 * Inside a bubble only the time is shown ("16:13"); which day it was is said
 * once, by the chip above that day's first message: "Today", "Yesterday", the
 * weekday within the last week ("Thursday"), else the date ("13 October", with
 * the year when it is not this one).
 *
 * Days are calendar days in the phone's time zone, not 24-hour spans: a
 * message at 23:50 last night is "Yesterday" at 00:10 today.
 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Whole calendar days from `date` to `now` (0 = same day, 1 = yesterday). */
export function calendarDaysAgo(date: Date, now: Date = new Date()): number {
  return Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);
}

/** Same calendar day? */
export function isSameChatDay(a: string, b: string): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/** The time inside a bubble: 24-hour "16:13". Empty for an unreadable timestamp. */
export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** The day chip above a day's first message. */
export function chatDayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const days = calendarDaysAgo(d, now);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return WEEKDAYS[d.getDay()];
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? date : `${date} ${d.getFullYear()}`;
}
