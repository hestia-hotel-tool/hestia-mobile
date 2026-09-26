import { formatClock24, formatDueIn, formatDueTime, formatMinutesSpan, formatTime } from '@/utils/formatting';
import type { RoomActivityState, RoomStatus } from '../types/allRooms.types';
import type { CleaningClock } from './cleaningClock';

export type RoomActivityDescription = {
  /** The line's main text. Empty means no line at all. */
  text: string;
  /** A second, bolder segment after it — "in 25 min", "32 min". */
  emphasis?: string;
};

export type DescribeRoomActivityOptions = {
  /** The time to describe against — `useNow()`, so the line moves each tick. */
  now?: number;
  /** The room's status, for the cleaning countdown when nothing else is going on. */
  status?: RoomStatus;
  /** The cleaning clock (`cleaningClock`), or null when there is none. */
  clock?: CleaningClock | null;
};

/** "32 min left" / "8 min over" — the credit, as far as the clock has got. */
function clockSummary(clock: CleaningClock): string {
  return clock.overdue
    ? `${formatMinutesSpan(clock.remainingMs)} over`
    : `${formatMinutesSpan(clock.remainingMs)} left`;
}

/**
 * The single line under the status button — its text, and optionally a second
 * bolder segment. An empty `text` means no line at all.
 *
 * Every time is 24-hour and only as precise as it is useful: "Return at
 * 14:30" / "in 25 min", "Ready by tomorrow 09:00" / "in 18 h 5 min". The old
 * line ticked seconds ("30min 2s", "1h 20 min 6s", "0h 0 min 0s"), mixed 12-
 * and 24-hour clocks, and never said the day, so a return time tomorrow read
 * as today's.
 *
 *  - `paused` with no timestamp still prints "Paused"; with a clock it adds
 *    how much of the credit is left (the clock is stopped meanwhile).
 *  - `returnLater` and `promisedTime` with no due time print nothing.
 *  - `refuseService` prints its reason, falling back to the time it happened.
 *  - Otherwise, a room In Progress counts down its credit: "Time left 32 min",
 *    then "Over expected time by 8 min". A finished room says how long it took.
 */
export function describeRoomActivity(
  activity: RoomActivityState,
  { now = Date.now(), status, clock = null }: DescribeRoomActivityOptions = {}
): RoomActivityDescription {
  switch (activity.kind) {
    case 'paused':
      return {
        text:
          activity.since == null
            ? 'Paused'
            : `Paused at ${formatClock24(new Date(activity.since))}`,
        emphasis: clock ? `· ${clockSummary(clock)}` : undefined,
      };

    case 'returnLater':
      if (activity.dueAt == null) return { text: '' };
      return {
        text: `Return at ${formatDueTime(activity.dueAt, new Date(now))}`,
        emphasis: formatDueIn(activity.dueAt, now),
      };

    case 'promisedTime':
      if (activity.dueAt == null) return { text: '' };
      return {
        text: `Ready by ${formatDueTime(activity.dueAt, new Date(now))}`,
        emphasis: formatDueIn(activity.dueAt, now),
      };

    case 'refuseService': {
      if (activity.reason == null && activity.at == null) return { text: '' };
      return {
        text: activity.reason ?? (activity.at != null ? formatTime(new Date(activity.at)) : ''),
      };
    }

    case 'none':
    default:
      if (!clock) return { text: '' };
      if (status === 'InProgress') {
        return clock.overdue
          ? { text: 'Over expected time by', emphasis: formatMinutesSpan(clock.remainingMs) }
          : { text: 'Time left', emphasis: formatMinutesSpan(clock.remainingMs) };
      }
      if ((status === 'Cleaned' || status === 'Inspected') && clock.elapsedMs >= 60_000) {
        return { text: 'Cleaned in', emphasis: formatMinutesSpan(clock.elapsedMs) };
      }
      return { text: '' };
  }
}

export default describeRoomActivity;
