import type { DepartmentRoomState } from '../types/allRooms.types';
import type { AssigneeStatus } from './cleaningClock';

const INK = '#1e1e1e';
const pad = (n: number) => String(n).padStart(2, '0');

/** Seconds worked on a department round so far (the running part included). */
export function roundElapsedSeconds(state: DepartmentRoomState, now: number): number {
  const running =
    state.status === 'in_progress' && state.resumedAt ? Math.max(0, (now - Date.parse(state.resumedAt)) / 1000) : 0;
  return Math.round(state.elapsedSeconds + (Number.isFinite(running) ? running : 0));
}

/** A round that is running: the card's clock ticks. */
export function roundHasLiveClock(state: DepartmentRoomState | undefined): boolean {
  return state?.status === 'in_progress';
}

/**
 * The line under the technician's name — housekeeping's analogy
 * (`assigneeStatus`): how long it has been running, paused since when, or when
 * it was checked.
 */
export function departmentAssigneeStatus(state: DepartmentRoomState | undefined, now: number): AssigneeStatus {
  const line = (text: string, size: AssigneeStatus['size'], weight: AssigneeStatus['weight']): AssigneeStatus => ({
    text,
    size,
    weight,
    color: INK,
    alert: false,
  });
  if (!state || state.status === 'unchecked') return line('Not started', 12, 'light');
  const mins = Math.max(0, Math.floor(roundElapsedSeconds(state, now) / 60));
  if (state.status === 'in_progress') return line(`Time: ${pad(mins)} mins`, 12, 'light');
  if (state.status === 'paused') return line(`Paused · ${pad(mins)} mins`, 13, 'bold');
  const at = state.checkedAt ? new Date(state.checkedAt) : null;
  return line(at && Number.isFinite(at.getTime()) ? `Checked at ${pad(at.getHours())}:${pad(at.getMinutes())}` : 'Checked', 12, 'light');
}
