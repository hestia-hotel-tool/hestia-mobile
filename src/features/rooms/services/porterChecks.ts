/**
 * Porter round marks (`porter_room_checks`, migrations 20261019130000/…100).
 * Reads and writes go through RPCs: `porter_checks_today` for the shift's
 * marks on the hotel's service day, `porter_check_action` to change one.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ShiftType } from '@/types/shift.types';
import type { PorterAction, PorterCheck } from '../utils/porter';

// Cast: these RPCs post-date the generated types.
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args: Record<string, unknown>
) => PromiseLike<{ data: unknown; error: { message?: string; code?: string } | null }>;

type Row = {
  room_id: string;
  status: PorterCheck['status'];
  user_id: string | null;
  user_name: string | null;
  started_at: string | null;
  paused_at: string | null;
  checked_at: string | null;
};

/** Room id → its mark for `shift` today. Rooms with none are UnChecked. */
export async function fetchPorterChecks(shift: ShiftType): Promise<Map<string, PorterCheck>> {
  const out = new Map<string, PorterCheck>();
  if (!isSupabaseConfigured) return out;
  const { data, error } = await rpc('porter_checks_today', { p_shift: shift });
  if (error) throw new Error(error.message || 'Porter checks could not be loaded.');
  for (const r of (data ?? []) as Row[]) {
    out.set(r.room_id, {
      status: r.status,
      userId: r.user_id,
      userName: r.user_name,
      startedAt: r.started_at,
      pausedAt: r.paused_at,
      checkedAt: r.checked_at,
    });
  }
  return out;
}

export async function runPorterAction(roomId: string, action: PorterAction, shift: ShiftType): Promise<void> {
  const { error } = await rpc('porter_check_action', { p_room_id: roomId, p_action: action, p_shift: shift });
  if (error) throw new Error(error.message || 'The room could not be updated.');
}
