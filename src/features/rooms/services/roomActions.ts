import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { RoomClock } from './rooms';
import {
  DEFAULT_ROOM_STATUS_RULES,
  type RoomAction,
  type RoomState,
  type RoomStatusRule,
} from '../utils/roomStatusMachine';

/** What `room_action()` returns: the room after its triggers ran. */
export type RoomActionResult = RoomClock & { state: RoomState; inProgressStartedAt: string | null };

/**
 * A request id per tap. Sent with the action, so a retry on a flaky
 * connection is recognised by the server and applied once. Not
 * cryptographic — it only has to be unique enough not to collide.
 */
function requestId(): string {
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${hex(3)}-${hex(12)}`;
}

/**
 * Change a room's housekeeping status or service state — the only way to.
 *
 * The server checks the rule (who may do this, from the room's current state),
 * the assignment, the permission, the one-room-at-a-time rule and the undo
 * window, all under a lock on the room. Its messages are written for the
 * person holding the phone, so they are passed through as the error.
 */
export async function runRoomAction(
  roomId: string,
  action: RoomAction,
  options: { reason?: string | null; until?: string | null; photoUrls?: string[] } = {}
): Promise<RoomActionResult> {
  // Cast: room_action lands in 20261006000100; the generated types predate it.
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: { message?: string; code?: string } | null }>;

  const { data, error } = await rpc('room_action', {
    p_room_id: roomId,
    p_action: action,
    p_reason: options.reason ?? null,
    p_until: options.until ?? null,
    p_request_id: requestId(),
    // Only when there are photos: servers without migration 20261014000100
    // have no such parameter, and every other call must keep working there.
    ...(options.photoUrls?.length ? { p_photo_urls: options.photoUrls } : null),
  });
  if (error) {
    const err = new Error(error.message || 'The room could not be updated.');
    (err as Error & { code?: string }).code = error.code;
    throw err;
  }

  const r = (data ?? {}) as Record<string, string | number | null>;
  const str = (k: string) => (r[k] as string | null) ?? null;
  return {
    state: (str('state') ?? 'dirty') as RoomState,
    promiseTimeAt: str('promise_time_at'),
    cleaningStartedAt: str('cleaning_started_at'),
    cleaningElapsedSeconds: (r.cleaning_elapsed_seconds as number | null) ?? 0,
    houseKeepingStatus: str('house_keeping_status'),
    pausedAt: str('paused_at'),
    returnLaterAt: str('return_later_at'),
    returnLaterReason: str('return_later_reason'),
    refuseServiceAt: str('refuse_service_at'),
    refuseServiceReason: str('refuse_service_reason'),
    dndAt: str('dnd_at'),
    dndCheckedAt: str('dnd_checked_at'),
    dndCheckCount: (r.dnd_check_count as number | null) ?? 0,
    dndNextCheckAt: str('dnd_next_check_at'),
    inProgressStartedAt: str('in_progress_started_at'),
  };
}

export type RoomStatusConfig = {
  rules: readonly RoomStatusRule[];
  /** How long an attendant may undo a start (the hotel's setting). */
  undoSeconds: number;
};

const DEFAULT_CONFIG: RoomStatusConfig = { rules: DEFAULT_ROOM_STATUS_RULES, undoSeconds: 120 };

let cached: Promise<RoomStatusConfig> | null = null;

/** The rules table and the hotel's undo window, once per session. */
export function loadRoomStatusConfig(): Promise<RoomStatusConfig> {
  if (!isSupabaseConfigured) return Promise.resolve(DEFAULT_CONFIG);
  if (cached) return cached;
  cached = (async () => {
    const [rulesRes, settingsRes] = await Promise.all([
      (supabase.from as unknown as (t: string) => any)('room_status_rules').select('action, from_state, actor'),
      (supabase.from as unknown as (t: string) => any)('hotel_housekeeping_settings')
        .select('undo_start_seconds')
        .limit(1)
        .maybeSingle(),
    ]);
    const rules = (rulesRes?.data as RoomStatusRule[] | null) ?? [];
    return {
      rules: rules.length > 0 ? rules : DEFAULT_ROOM_STATUS_RULES,
      undoSeconds: (settingsRes?.data?.undo_start_seconds as number | undefined) ?? 120,
    };
  })().catch((e) => {
    if (__DEV__) console.warn('[roomActions] Could not load the status rules; using the built-in copy', e);
    cached = null;
    return DEFAULT_CONFIG;
  });
  return cached;
}

/** Forget the cached rules (a different hotel signed in). */
export function clearRoomStatusConfig() {
  cached = null;
}

/**
 * Take a room out of order from today, with a reason, or put it back
 * (engineering's status menu, Figma 4686:686). Through
 * `set_room_out_of_order()` (migration 20261117100000): `rooms.out_of_order.toggle`
 * may change only these fields, where a direct update needs `rooms.manage`.
 * The period is open-ended until switched off.
 */
export async function setRoomOutOfOrder(
  roomId: string,
  outOfOrder: boolean,
  reason: string | null
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => PromiseLike<{ error: { message?: string; code?: string } | null }>;
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const { error } = await rpc('set_room_out_of_order', {
    p_room_id: roomId,
    p_out_of_order: outOfOrder,
    p_reason: outOfOrder ? reason : null,
    p_from: today,
  });
  if (error) {
    const err = new Error(error.message || 'The room could not be updated.');
    (err as Error & { code?: string }).code = error.code;
    throw err;
  }
}

/** A move in a department's round (engineering, migration 20261118100000). */
export type DepartmentRoundAction = 'start' | 'pause' | 'resume' | 'check' | 'uncheck' | 'priority_on' | 'priority_off';

/**
 * Change a room's round in one department's layer, through
 * `room_department_action()`: the assigned technician starts, pauses and
 * checks; an engineering lead may act for them with a `reason` (they are told)
 * and sets priority. The database's message is passed through as the error.
 */
export async function runRoomDepartmentAction(
  roomId: string,
  department: 'engineering',
  action: DepartmentRoundAction,
  reason?: string | null
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => PromiseLike<{ error: { message?: string; code?: string } | null }>;
  const { error } = await rpc('room_department_action', {
    p_room_id: roomId,
    p_department: department,
    p_action: action,
    p_reason: reason ?? null,
  });
  if (error) {
    const err = new Error(error.message || 'The room could not be updated.');
    (err as Error & { code?: string }).code = error.code;
    throw err;
  }
}
