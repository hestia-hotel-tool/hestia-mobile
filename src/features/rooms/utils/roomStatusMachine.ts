import type { RoomCardData, StatusChangeOption } from '../types/allRooms.types';

/**
 * The room status rules, client side — the same table `room_action()` enforces
 * (migration 20261006000100, `room_status_rules`). The app reads that table and
 * builds the status menu from it, so what a person is offered and what the
 * database accepts cannot drift apart. `DEFAULT_ROOM_STATUS_RULES` is a copy of
 * the seed, used only until the table has loaded (or if it cannot be).
 */

export type RoomState =
  | 'dirty'
  | 'in_progress'
  | 'paused'
  | 'cleaned'
  | 'inspected'
  | 'dnd'
  | 'refused'
  | 'return_later';

export type RoomAction =
  | 'start'
  | 'undo_start'
  | 'pause'
  | 'resume'
  | 'clean'
  | 'dnd'
  | 'dnd_recheck'
  | 'dnd_clear'
  | 'refuse'
  | 'refuse_clear'
  | 'return_later'
  | 'return_later_clear'
  | 'inspect'
  | 'send_back'
  /** Supervisors: an in-progress or paused room straight back to Dirty. */
  | 'reset';

export type RoomStatusRule = { action: RoomAction; from_state: RoomState; actor: 'assignee' | 'inspector' };

const BASE_RULES: readonly RoomStatusRule[] = [
  { action: 'start', from_state: 'dirty', actor: 'assignee' },
  { action: 'start', from_state: 'return_later', actor: 'assignee' },
  { action: 'undo_start', from_state: 'in_progress', actor: 'assignee' },
  { action: 'pause', from_state: 'in_progress', actor: 'assignee' },
  { action: 'resume', from_state: 'paused', actor: 'assignee' },
  { action: 'clean', from_state: 'in_progress', actor: 'assignee' },
  { action: 'dnd', from_state: 'dirty', actor: 'assignee' },
  { action: 'dnd', from_state: 'return_later', actor: 'assignee' },
  { action: 'dnd_recheck', from_state: 'dnd', actor: 'assignee' },
  { action: 'dnd_clear', from_state: 'dnd', actor: 'assignee' },
  { action: 'refuse', from_state: 'dirty', actor: 'assignee' },
  { action: 'refuse', from_state: 'in_progress', actor: 'assignee' },
  { action: 'refuse_clear', from_state: 'refused', actor: 'assignee' },
  { action: 'return_later', from_state: 'dirty', actor: 'assignee' },
  { action: 'return_later', from_state: 'in_progress', actor: 'assignee' },
  { action: 'return_later', from_state: 'paused', actor: 'assignee' },
  { action: 'return_later', from_state: 'return_later', actor: 'assignee' },
  { action: 'return_later_clear', from_state: 'return_later', actor: 'assignee' },
  { action: 'inspect', from_state: 'cleaned', actor: 'inspector' },
  { action: 'send_back', from_state: 'cleaned', actor: 'inspector' },
  { action: 'send_back', from_state: 'inspected', actor: 'inspector' },
  { action: 'dnd_clear', from_state: 'dnd', actor: 'inspector' },
  { action: 'refuse_clear', from_state: 'refused', actor: 'inspector' },
  { action: 'return_later_clear', from_state: 'return_later', actor: 'inspector' },
];

/**
 * Managers and supervisors switch a room to any state (20261007000400):
 * In Progress, Cleaned and Inspected from every other state, Dirty from
 * every state, and the guest situations wherever service is still due.
 */
const ANY_STATE_INSPECTOR: readonly [RoomAction, RoomState][] = [
  ['start', 'cleaned'], ['start', 'inspected'], ['start', 'dnd'], ['start', 'refused'],
  ['clean', 'dirty'], ['clean', 'paused'], ['clean', 'inspected'], ['clean', 'dnd'], ['clean', 'refused'], ['clean', 'return_later'],
  ['inspect', 'dirty'], ['inspect', 'in_progress'], ['inspect', 'paused'], ['inspect', 'dnd'], ['inspect', 'refused'], ['inspect', 'return_later'],
  ['reset', 'in_progress'], ['reset', 'paused'],
  ['dnd', 'in_progress'], ['dnd', 'paused'], ['dnd', 'refused'],
  ['refuse', 'paused'], ['refuse', 'return_later'],
  ['return_later', 'dnd'], ['return_later', 'refused'],
];

/**
 * The built-in copy of the rules: the seed, every attendant step for
 * supervisors too (20261007000300), and the any-state rows above.
 */
export const DEFAULT_ROOM_STATUS_RULES: readonly RoomStatusRule[] = (() => {
  const out: RoomStatusRule[] = [...BASE_RULES];
  const has = (r: RoomStatusRule) =>
    out.some((x) => x.action === r.action && x.from_state === r.from_state && x.actor === r.actor);
  const add = (r: RoomStatusRule) => {
    if (!has(r)) out.push(r);
  };
  BASE_RULES.filter((r) => r.actor === 'assignee').forEach((r) => add({ ...r, actor: 'inspector' }));
  ANY_STATE_INSPECTOR.forEach(([action, from_state]) => add({ action, from_state, actor: 'inspector' }));
  return out;
})();

/** The room's state, exactly as the database's `_room_state()` derives it. */
export function roomStateOf(
  room: Pick<
    RoomCardData,
    'houseKeepingStatus' | 'pausedAt' | 'refuseServiceAt' | 'refuseServiceReason' | 'returnLaterAt'
  >
): RoomState {
  if (room.houseKeepingStatus === 'Inspected') return 'inspected';
  if (room.houseKeepingStatus === 'Cleaned') return 'cleaned';
  if (room.refuseServiceAt) {
    return /do not disturb/i.test(room.refuseServiceReason ?? '') ? 'dnd' : 'refused';
  }
  if (room.returnLaterAt) return 'return_later';
  if (room.houseKeepingStatus === 'InProgress') return room.pausedAt ? 'paused' : 'in_progress';
  return 'dirty';
}

/**
 * What a menu option means for a room in `state`. One option, several actions:
 * "In Progress" starts a dirty room and resumes a paused one; "Dirty" undoes a
 * start, sends a cleaned room back, or ends a DND / refusal / return-later.
 */
export function actionForOption(
  option: StatusChangeOption,
  state: RoomState,
  withinUndoWindow: boolean
): RoomAction | null {
  switch (option) {
    // Generous on purpose: the rules decide who may (attendants only from the
    // state before, supervisors from any).
    case 'InProgress':
      return state === 'paused' ? 'resume' : state === 'in_progress' ? null : 'start';
    case 'Pause':
      return state === 'in_progress' ? 'pause' : null;
    case 'Cleaned':
      return state === 'cleaned' ? null : 'clean';
    case 'Inspected':
      return state === 'inspected' ? null : 'inspect';
    case 'Dirty':
      if (state === 'in_progress') return withinUndoWindow ? 'undo_start' : 'reset';
      if (state === 'paused') return 'reset';
      if (state === 'cleaned' || state === 'inspected') return 'send_back';
      if (state === 'dnd') return 'dnd_clear';
      if (state === 'refused') return 'refuse_clear';
      if (state === 'return_later') return 'return_later_clear';
      return null;
    case 'DoNotDisturb':
      return state === 'dnd' ? 'dnd_recheck' : 'dnd';
    case 'RefuseService':
      return 'refuse';
    case 'ReturnLater':
      return 'return_later';
    default:
      return null;
  }
}

/** Who is looking at the menu, as far as the rules care. */
export type RoomStatusCaller = {
  /** Assigned to this room — the attendant. */
  isAssignee: boolean;
  /** `rooms.status.update` — may act on their own rooms. */
  canUpdateOwn: boolean;
  /** `rooms.inspect`. */
  canInspect: boolean;
  /** `rooms.status.override` — may act for the attendant, with a reason. */
  canOverride: boolean;
  /** Someone is assigned (an override needs an attendant to act for). */
  roomHasAssignee: boolean;
};

export type ResolvedOption = { action: RoomAction; viaOverride: boolean };

/**
 * Whether this caller may pick `option` on a room in `state`, and how — the
 * same precedence `room_action()` uses: as the assignee, else as an
 * inspector, else on the attendant's behalf.
 */
export function resolveOption(
  option: StatusChangeOption,
  state: RoomState,
  caller: RoomStatusCaller,
  rules: readonly RoomStatusRule[],
  withinUndoWindow: boolean
): ResolvedOption | null {
  const action = actionForOption(option, state, withinUndoWindow);
  if (!action) return null;
  const has = (actor: RoomStatusRule['actor']) =>
    rules.some((r) => r.action === action && r.from_state === state && r.actor === actor);
  if (has('assignee') && caller.isAssignee && caller.canUpdateOwn) return { action, viaOverride: false };
  if (has('inspector') && caller.canInspect) return { action, viaOverride: false };
  if (has('assignee') && caller.canOverride && caller.roomHasAssignee) return { action, viaOverride: true };
  return null;
}

/** The status options this caller is offered for the room. */
export function allowedStatusOptions(
  state: RoomState,
  caller: RoomStatusCaller,
  rules: readonly RoomStatusRule[],
  withinUndoWindow: boolean
): Map<StatusChangeOption, ResolvedOption> {
  const options: StatusChangeOption[] = [
    'Dirty',
    'InProgress',
    'Cleaned',
    'Inspected',
    'Pause',
    'ReturnLater',
    'RefuseService',
    'DoNotDisturb',
  ];
  const out = new Map<StatusChangeOption, ResolvedOption>();
  for (const option of options) {
    const resolved = resolveOption(option, state, caller, rules, withinUndoWindow);
    if (resolved) out.set(option, resolved);
  }
  return out;
}

/** Whether "Undo start" is still open for a room started at `startedAt`. */
export function isWithinUndoWindow(startedAt: string | null | undefined, undoSeconds: number, now = Date.now()): boolean {
  if (!startedAt) return false;
  const t = Date.parse(startedAt);
  return Number.isFinite(t) && now - t <= undoSeconds * 1000;
}

/**
 * The assignment's work status after an action — what `room_action()` writes
 * to `room_assignments.work_status`, so a card can show it without a reload.
 * `undefined`: the action leaves it as it was.
 */
export function workStatusAfter(action: RoomAction): 'in_progress' | 'paused' | 'completed' | null | undefined {
  switch (action) {
    case 'start':
    case 'resume':
      return 'in_progress';
    case 'pause':
      return 'paused';
    case 'clean':
      return 'completed';
    case 'inspect':
      return 'completed';
    default:
      return null;
  }
}

/** Reasons offered when a supervisor acts for the attendant. */
export const OVERRIDE_REASONS = ['Device issue', 'Staff absent', 'Correction'] as const;
/** Reasons offered when a room is sent back or reopened. */
export const SEND_BACK_REASONS = ['Failed inspection', 'Guest complaint', 'Missed item'] as const;
