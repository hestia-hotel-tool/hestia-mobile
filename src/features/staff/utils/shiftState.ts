import type {
  ShiftWindow,
  StaffAssignmentFacts,
  StaffShiftState,
} from '../types/staffRoster.types';

/**
 * Which of the frame's three groups a person is in.
 *
 * Pure, and deliberately free of any Supabase import: the rule is the part most
 * likely to be argued about and the part worth testing on its own, so it does
 * not sit behind a network call.
 */

/** `'14:30:00'` → 870. Null for unset or unparseable. */
export function parseShiftTime(value: string | null | undefined): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function toShiftWindow(row: {
  id: string;
  name: string | null;
  start_time?: string | null;
  end_time?: string | null;
}): ShiftWindow {
  const startMinutes = parseShiftTime(row.start_time);
  const endMinutes = parseShiftTime(row.end_time);
  return {
    id: String(row.id),
    name: String(row.name ?? '').trim(),
    startMinutes,
    endMinutes,
    // A window that ends at or before it starts runs through midnight.
    overnight:
      startMinutes != null && endMinutes != null && endMinutes <= startMinutes,
  };
}

function minutesOfDay(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Has this shift's clock run out?
 *
 * **False when the window is unknown.** No migration seeds `start_time` /
 * `end_time`, so on this database both are null today — and guessing that
 * everyone has gone home because the schema is incomplete would empty the
 * screen. Not knowing means not asserting.
 */
export function isShiftWindowOver(window: ShiftWindow | null, now: Date): boolean {
  if (!window || window.endMinutes == null) return false;
  const nowMinutes = minutesOfDay(now);
  if (window.overnight) {
    // e.g. 22:00→06:00 is over between 06:00 and 22:00.
    return window.startMinutes != null
      ? nowMinutes >= window.endMinutes && nowMinutes < window.startMinutes
      : nowMinutes >= window.endMinutes;
  }
  return nowMinutes >= window.endMinutes;
}

/**
 * Set true to treat "finished every assigned room" as Shift End.
 *
 * A single named constant rather than an inline condition because the other
 * reading — done, but still on the clock and available for reassignment, so
 * still On Shift — is equally defensible and is a product call. One edit here
 * rather than a hunt through the branch below.
 */
export const FINISHED_WORK_IS_SHIFT_END = true;

/**
 * First match wins.
 *
 * 1. The clock is out → Shift End. It beats everything; the shift is over
 *    whatever the rooms say.
 * 2. Anything paused → On Break.
 * 3. Everything assigned is finished → Shift End.
 * 4. Otherwise → On Shift.
 */
export function deriveStaffShiftState(args: {
  facts: StaffAssignmentFacts;
  window: ShiftWindow | null;
  now: Date;
}): StaffShiftState {
  const { facts, window, now } = args;

  if (isShiftWindowOver(window, now)) return 'shift_end';

  /*
   * On Break means *the person* stopped, not that one of their rooms is parked.
   *
   * `facts.paused > 0` alone was wrong, and live data showed it: a supervisor
   * with room 204 paused and room 407 in progress came out "On Break" while
   * actively cleaning. Pausing is a property of a room — someone who parks one
   * room and starts another has not gone anywhere. Only when nothing is in
   * progress and something is paused has the person actually stepped away.
   */
  if (facts.paused > 0 && facts.inProgress === 0) return 'on_break';

  /*
   * `facts.total > 0` is load-bearing.
   *
   * Without it `0 === 0` holds for everyone with no assignment, and the entire
   * unassigned half of the department would be filed under Shift End. They
   * belong in On Shift with an empty card — which is what branch 4 gives them,
   * structurally, rather than as a special case.
   */
  if (FINISHED_WORK_IS_SHIFT_END && facts.total > 0 && facts.completed === facts.total) {
    return 'shift_end';
  }

  return 'on_shift';
}

/**
 * The shift in progress now.
 *
 * Falls back to AM before local noon and PM after when no window contains the
 * moment — which is every case on this database, since the times are unseeded.
 * Without the fallback the Shifts tab would have no shift to derive against.
 */
export function pickCurrentShift(windows: ShiftWindow[], now: Date): ShiftWindow | null {
  if (windows.length === 0) return null;
  const nowMinutes = minutesOfDay(now);

  const containing = windows.find((w) => {
    if (w.startMinutes == null || w.endMinutes == null) return false;
    return w.overnight
      ? nowMinutes >= w.startMinutes || nowMinutes < w.endMinutes
      : nowMinutes >= w.startMinutes && nowMinutes < w.endMinutes;
  });
  if (containing) return containing;

  const wanted = now.getHours() < 12 ? 'am' : 'pm';
  return (
    windows.find((w) => w.name.toLowerCase() === wanted) ?? windows[0] ?? null
  );
}
