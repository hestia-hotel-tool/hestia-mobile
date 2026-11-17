/**
 * Calendar days, the WhatsApp way — shared by Chat (the day chip above a day's
 * first message) and Lost & Found (the separator between days of items).
 *
 * Days are calendar days in the phone's time zone, not 24-hour spans: 23:50
 * last night is "Yesterday" at 00:10 today.
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
export function isSameCalendarDay(a: string, b: string): boolean {
  const x = new Date(a);
  const y = new Date(b);
  return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
}

/**
 * "Today", "Yesterday", the weekday within the last week ("Thursday"), else the
 * date ("13 October", with the year when it is not this one). Empty for an
 * unreadable timestamp.
 */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const days = calendarDaysAgo(d, now);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return WEEKDAYS[d.getDay()];
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? date : `${date} ${d.getFullYear()}`;
}
