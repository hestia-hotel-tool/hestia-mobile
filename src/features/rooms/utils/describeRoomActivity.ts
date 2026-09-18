import { formatClock24, formatTime } from '@/utils/formatting';
import type { RoomActivityState } from '../types/allRooms.types';

export type RoomActivityDescription = {
  /** The line's main text. Empty means no line at all. */
  text: string;
  /** A second, bolder segment after it — Return Later's live countdown. */
  emphasis?: string;
};

export type DescribeRoomActivityOptions = {
  /** Live "45 mins" from `useCountdown`, when the room is returning later. */
  returnLaterRemaining?: string;
  /** Live "1h 20 min 6s" from `useCountdown`, when a time was promised. */
  promiseTimeRemaining?: string;
};

/**
 * The single line under the status button — its text, and optionally a second
 * bolder segment. An empty `text` means no line at all.
 *
 * Pure, and separate from the view, because the four states are *not* four
 * copies of one rule and the differences are easy to "tidy" away by accident:
 *
 *  - `paused` with no timestamp still prints something — the bare word
 *    "Paused" — because a paused room must look paused even when the column
 *    that says when is null.
 *  - `returnLater` and `promisedTime` with no `dueAt` print **nothing**. A
 *    return time is the entire content of that line; without one there is no
 *    line, and an empty row would just push the layout around.
 *  - `refuseService` prints its reason, falling back to the time it happened,
 *    and renders when *either* is present.
 *
 * Keeping that asymmetry here means it can be read in one place and checked
 * without mounting a component.
 *
 * Wording follows Figma 2333-132 for paused: "Paused at 11:22" — 24-hour, and
 * no colon after "at". The previous implementation wrote "Paused at: 14:05".
 */
export function describeRoomActivity(
  activity: RoomActivityState,
  { returnLaterRemaining = '', promiseTimeRemaining = '' }: DescribeRoomActivityOptions = {}
): RoomActivityDescription {
  switch (activity.kind) {
    case 'paused':
      return {
        text:
          activity.since == null
            ? 'Paused'
            : `Paused at ${formatClock24(new Date(activity.since))}`,
      };

    /*
     * Figma 2333-312 prints two things: "Return at 11:22" in Regular and the
     * countdown "30min 2s" in Bold beside it. The old code built one string —
     * `11:22 PM · 30 mins` — which differs in three ways at once: 12-hour
     * instead of 24, a `·` the frame does not have, and one weight instead of
     * two.
     */
    case 'returnLater':
      if (activity.dueAt == null) return { text: '' };
      return {
        text: `Return at ${formatClock24(new Date(activity.dueAt))}`,
        emphasis: returnLaterRemaining || undefined,
      };

    /*
     * Promised Time is **unverified** — its frame has not been read, so it
     * keeps the older `11:22 PM · 30 mins` shape rather than being reshaped to
     * look like Return Later on the assumption that they match.
     */
    case 'promisedTime':
      if (activity.dueAt == null) return { text: '' };
      return {
        text: `${formatTime(new Date(activity.dueAt))}${
          promiseTimeRemaining ? ` · ${promiseTimeRemaining}` : ''
        }`,
      };

    /*
     * Figma 2333-835 prints the reason and nothing else — "Guest Is Resting or
     * Sleeping", Light 14, centred. The old code prefixed it with "Refused: ",
     * which the frame does not have; the status label directly above already
     * says "Refused Service", so the prefix repeated it.
     *
     * The time fallback stays: `refuse_service_at` can be set with no reason,
     * and a state with a blank line under it looks like a rendering failure.
     */
    case 'refuseService': {
      if (activity.reason == null && activity.at == null) return { text: '' };
      return {
        text: activity.reason ?? (activity.at != null ? formatTime(new Date(activity.at)) : ''),
      };
    }

    case 'none':
    default:
      return { text: '' };
  }
}

export default describeRoomActivity;
