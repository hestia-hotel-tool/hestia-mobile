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

import { calendarDaysAgo, dayLabel, isSameCalendarDay } from '@/utils/calendarDays';

export { calendarDaysAgo };

/** Same calendar day? */
export const isSameChatDay = isSameCalendarDay;

/** The time inside a bubble: 24-hour "16:13". Empty for an unreadable timestamp. */
export function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** The day chip above a day's first message (see `dayLabel`). */
export const chatDayLabel = dayLabel;
