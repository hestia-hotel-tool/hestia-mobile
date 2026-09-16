import type { HistoryEvent, HistoryGroup } from '../types/roomDetail.types';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Midnight on the day the given date falls on. */
function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Room history, newest first, grouped into "Today" / "Yesterday" / "Jul 29"
 * bands — and "Jul 29 2025" once the year differs from the current one.
 *
 * There were two copies of this: one in `HistorySection`'s `useMemo` for the
 * timeline, and a verbatim ~50-line duplicate in `RoomDetailScreen` for the
 * downloadable PDF, the second labelled *"same logic as HistorySection"* in a
 * comment. They agreed only by transcription, and a screenshot can tell you the
 * timeline is right while saying nothing about the report.
 *
 * `now` is a parameter so a caller can pass a fixed clock; it defaults to the
 * real one, which is what both call sites used.
 */
export function groupHistoryEvents(
  events: readonly HistoryEvent[],
  now: Date = new Date()
): HistoryGroup[] {
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const newestFirst = (a: HistoryEvent, b: HistoryEvent) =>
    b.timestamp.getTime() - a.timestamp.getTime();

  // Keyed by calendar day rather than by timestamp, so two events hours apart
  // on the same day land in one band.
  const byDay = new Map<string, HistoryEvent[]>();
  for (const event of [...events].sort(newestFirst)) {
    const day = startOfDay(event.timestamp);
    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
    const bucket = byDay.get(key);
    if (bucket) bucket.push(event);
    else byDay.set(key, [event]);
  }

  const groups: HistoryGroup[] = [];
  byDay.forEach((dayEvents, key) => {
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(year, month, day);

    let dateLabel: string;
    if (date.getTime() === today.getTime()) {
      dateLabel = 'Today';
    } else if (date.getTime() === yesterday.getTime()) {
      dateLabel = 'Yesterday';
    } else {
      const monthName = MONTH_NAMES[date.getMonth()];
      dateLabel =
        year === now.getFullYear() ? `${monthName} ${day}` : `${monthName} ${day} ${year}`;
    }

    groups.push({ dateLabel, date, events: [...dayEvents].sort(newestFirst) });
  });

  return groups.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export default groupHistoryEvents;
