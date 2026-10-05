import { formatClock24, formatDueTime } from '@/utils/formatting';
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

/** Red, for a room over its credit or past a time it was due. */
const ALERT = '#f92424';
const INK = '#1e1e1e';

/**
 * The line under the attendant's name, and how it is set. Each state has its
 * own size, weight and colour in Figma 3883:5570.
 */
export type AssigneeStatus = {
  text: string;
  size: 10 | 12 | 13;
  weight: 'light' | 'bold';
  color: string;
  /** Over the credit or past due, for the screen reader. */
  alert: boolean;
};

const line = (text: string, size: AssigneeStatus['size'], weight: AssigneeStatus['weight'], color = INK, alert = false): AssigneeStatus => ({
  text,
  size,
  weight,
  color,
  alert,
});

/** Whole minutes of cleaning so far: the "Credits: N" the design prints. */
const creditsUsed = (elapsedMs: number) => Math.max(0, Math.round(elapsedMs / 60_000));

/**
 * The line under the attendant's name on a room card — Figma 3883:5570:
 *
 *  - Paused: "Paused at 18:00", bold 13.
 *  - In Progress: "Credits: 33", the minutes spent so far, bold 13; red once
 *    past the room's credit. Paused time is not counted.
 *  - Dirty: "Not Started"; Return Later: "Return at 19:00"; Refused: "NA";
 *    Do Not Disturb: "Check at 15:00" (the next door check). Light 12; red
 *    once the time has come.
 *  - Cleaned / Inspected: "Credits: 33", light 10 in the status colour (blue,
 *    green); bold red when it took longer than the credit.
 */
export function assigneeStatus(room: ClockRoom, now: number): AssigneeStatus {
  if (room.dndAt) {
    const next = room.dndNextCheckAt ? Date.parse(room.dndNextCheckAt) : NaN;
    if (!Number.isFinite(next)) return line('Do Not Disturb', 12, 'light');
    const due = next <= now;
    return line(`Check at ${formatDueTime(next, new Date(now))}`, 12, 'light', due ? ALERT : INK, due);
  }
  if (room.returnLaterAt) {
    const at = Date.parse(room.returnLaterAt);
    if (!Number.isFinite(at)) return line('Return later', 12, 'light');
    const due = at <= now;
    return line(`Return at ${formatDueTime(at, new Date(now))}`, 12, 'light', due ? ALERT : INK, due);
  }
  if (room.refuseServiceAt || room.refuseServiceReason) return line('NA', 12, 'light');

  const clock = cleaningClock(room, now);
  if (isRoomPaused(room)) {
    const since = room.pausedAt ? Date.parse(room.pausedAt) : NaN;
    return line(Number.isFinite(since) ? `Paused at ${formatClock24(new Date(since))}` : 'Paused', 13, 'bold');
  }

  switch (room.houseKeepingStatus) {
    case 'InProgress': {
      const over = !!clock?.overdue;
      return line(`Credits: ${creditsUsed(clock?.elapsedMs ?? 0)}`, 13, 'bold', over ? ALERT : INK, over);
    }
    case 'Cleaned':
    case 'Inspected': {
      const colour = room.houseKeepingStatus === 'Cleaned' ? '#4a91fc' : '#41d541';
      if (!clock) return line(room.houseKeepingStatus, 10, 'light', colour);
      return clock.overdue
        ? line(`Credits: ${creditsUsed(clock.elapsedMs)}`, 10, 'bold', ALERT, true)
        : line(`Credits: ${creditsUsed(clock.elapsedMs)}`, 10, 'light', colour);
    }
    case 'Dirty':
    default:
      return line('Not Started', 12, 'light');
  }
}

/** "Promise time: 14:30" while a promise is set and the room is not yet ready. */
export function promiseLine(room: ClockRoom, now: number): string | null {
  if (!room.promiseTimeAt) return null;
  if (room.houseKeepingStatus === 'Cleaned' || room.houseKeepingStatus === 'Inspected') return null;
  const at = Date.parse(room.promiseTimeAt);
  return Number.isFinite(at) ? `Promise time: ${formatDueTime(at, new Date(now))}` : null;
}

/**
 * Does this room's card show anything that changes with the clock? A running
 * cleaning timer, a DND check, a Return Later or a promise time. Cards
 * without one need not re-render on every tick.
 */
export function roomHasLiveClock(room: ClockRoom): boolean {
  return (
    (room.houseKeepingStatus === 'InProgress' && !!room.cleaningStartedAt) ||
    !!room.dndAt ||
    !!room.returnLaterAt ||
    !!room.promiseTimeAt
  );
}
