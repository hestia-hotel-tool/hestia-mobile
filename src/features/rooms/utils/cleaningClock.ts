import { formatDueTime, formatMinutesSpan } from '@/utils/formatting';
import type { RoomCardData } from '../types/allRooms.types';
import { isRoomPaused } from '../types/allRooms.types';

type ClockRoom = Pick<
  RoomCardData,
  | 'credit'
  | 'houseKeepingStatus'
  | 'cleaningStartedAt'
  | 'cleaningElapsedSeconds'
  | 'pausedAt'
  | 'returnLaterAt'
  | 'refuseServiceAt'
  | 'refuseServiceReason'
  | 'promiseTimeAt'
  | 'roomAttendantAssigned'
  | 'dndAt'
  | 'dndCheckedAt'
  | 'dndNextCheckAt'
>;

export type CleaningClock = {
  /** Cleaning time so far this run. */
  elapsedMs: number;
  /** The room's credit, in ms. */
  creditMs: number;
  /** Credit minus time so far; negative once over. */
  remainingMs: number;
  /** The clock is ticking (In Progress, not paused / returning later / refused). */
  running: boolean;
  overdue: boolean;
};

/**
 * The room's cleaning clock at `now`, or null when it has no credit or has
 * never been started.
 *
 * The database keeps the clock (migration 20260926000400): `cleaningStartedAt`
 * is the start of the current running stretch and `cleaningElapsedSeconds`
 * what was banked before it, so pauses do not count against the credit.
 */
export function cleaningClock(
  room: { credit?: number | null; cleaningStartedAt?: string | null; cleaningElapsedSeconds?: number | null },
  now: number
): CleaningClock | null {
  const creditMs = (room.credit ?? 0) * 60_000;
  if (creditMs <= 0) return null;
  const startedMs = room.cleaningStartedAt ? Date.parse(room.cleaningStartedAt) : NaN;
  const running = Number.isFinite(startedMs);
  const banked = (room.cleaningElapsedSeconds ?? 0) * 1000;
  if (!running && banked === 0) return null;
  const elapsedMs = banked + (running ? Math.max(0, now - startedMs) : 0);
  const remainingMs = creditMs - elapsedMs;
  return { elapsedMs, creditMs, remainingMs, running, overdue: remainingMs < 0 };
}

export type AssigneeStatus = {
  text: string;
  /** `alert` draws it in red — over the expected time. */
  tone: 'default' | 'alert';
};

/**
 * The line under the attendant's name on a room card.
 *
 *  - Return later / refused / paused say so ("Return at 14:30").
 *  - In Progress counts down the credit: "32 min left", then "8 min late" in
 *    red once past it. Paused time is not counted.
 *  - Cleaned / Inspected say how long it took, when the clock knows.
 */
export function assigneeStatus(room: ClockRoom, now: number): AssigneeStatus {
  if (room.dndAt) {
    // When the door is next due a check; red once that time has come.
    const next = room.dndNextCheckAt ? Date.parse(room.dndNextCheckAt) : NaN;
    if (!Number.isFinite(next)) return { text: 'Do Not Disturb', tone: 'default' };
    return {
      text: `Check at ${formatDueTime(next, new Date(now))}`,
      tone: next <= now ? 'alert' : 'default',
    };
  }
  if (room.returnLaterAt) {
    const at = Date.parse(room.returnLaterAt);
    if (!Number.isFinite(at)) return { text: 'Return later', tone: 'default' };
    // Past the time the guest asked for: go back now.
    if (at <= now) return { text: `Go back now · due ${formatDueTime(at, new Date(now))}`, tone: 'alert' };
    return { text: `Return at ${formatDueTime(at, new Date(now))}`, tone: 'default' };
  }
  if (room.refuseServiceAt || room.refuseServiceReason) return { text: 'Refused service', tone: 'default' };

  const clock = cleaningClock(room, now);
  if (isRoomPaused(room)) {
    return clock?.overdue
      ? { text: `Paused · ${formatMinutesSpan(clock.remainingMs)} late`, tone: 'alert' }
      : { text: 'Paused', tone: 'default' };
  }

  switch (room.houseKeepingStatus) {
    case 'InProgress':
      if (!clock) return { text: 'Started', tone: 'default' };
      return clock.overdue
        ? { text: `${formatMinutesSpan(clock.remainingMs)} late`, tone: 'alert' }
        : { text: `${formatMinutesSpan(clock.remainingMs)} left`, tone: 'default' };
    case 'Cleaned':
    case 'Inspected': {
      const word = room.houseKeepingStatus;
      return clock && clock.elapsedMs >= 60_000
        ? { text: `${word} in ${formatMinutesSpan(clock.elapsedMs)}`, tone: clock.overdue ? 'alert' : 'default' }
        : { text: word, tone: 'default' };
    }
    case 'Dirty':
    default:
      return { text: 'Not started', tone: 'default' };
  }
}

/** "Promise time: 14:30" while a promise is set and the room is not yet ready. */
export function promiseLine(room: ClockRoom, now: number): string | null {
  if (!room.promiseTimeAt) return null;
  if (room.houseKeepingStatus === 'Cleaned' || room.houseKeepingStatus === 'Inspected') return null;
  const at = Date.parse(room.promiseTimeAt);
  return Number.isFinite(at) ? `Promise time: ${formatDueTime(at, new Date(now))}` : null;
}
