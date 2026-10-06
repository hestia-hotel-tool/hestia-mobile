/**
 * Shifts and who works them — Settings › Shifts.
 *
 * Reading is open to the hotel; changing hours or the roster goes through
 * `update_shift_hours` / `set_staff_shift`, which need `staff.manage`
 * (migration 20260929000100). Shift names are fixed: the app finds shifts by
 * "AM" / "PM".
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { clearStaffRosterCache } from '@features/staff/services/staffRoster';

export type Shift = {
  id: string;
  name: string;
  /** "06:00" */
  start: string;
  /** "14:00" — earlier than `start` for an overnight shift. */
  end: string;
};

export type RosterMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  department: string | null;
  shiftId: string | null;
};

/** "14:00:00" → "14:00". */
const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : '00:00');

/** AM, PM, Night, then anything else by start time. */
const ORDER = ['AM', 'PM', 'NIGHT'];
function compareShifts(a: Shift, b: Shift): number {
  const ia = ORDER.indexOf(a.name.toUpperCase());
  const ib = ORDER.indexOf(b.name.toUpperCase());
  if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  return a.start.localeCompare(b.start);
}

export async function listShifts(): Promise<Shift[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('shifts').select('id, name, start_time, end_time');
  if (error) throw new Error(error.message || 'Shifts could not be loaded.');
  return ((data ?? []) as { id: string; name: string; start_time: string; end_time: string }[])
    .map((s) => ({ id: s.id, name: s.name, start: hhmm(s.start_time), end: hhmm(s.end_time) }))
    .sort(compareShifts);
}

/** Everyone in the hotel, with the shift they are rostered on. */
export async function listRoster(): Promise<RosterMember[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, avatar_url, shift_id, job_titles(name), departments(name)')
    .order('full_name');
  if (error) throw new Error(error.message || 'Staff could not be loaded.');
  // Through `unknown`: the generated types predate job_title_id / shift_id.
  return (
    data as unknown as {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      shift_id: string | null;
      job_titles: { name: string | null } | null;
      departments: { name: string | null } | null;
    }[]
  ).map((u) => ({
    id: u.id,
    name: u.full_name || 'Staff',
    avatarUrl: u.avatar_url,
    jobTitle: u.job_titles?.name ?? null,
    department: u.departments?.name ?? null,
    shiftId: u.shift_id,
  }));
}

export async function updateShiftHours(shiftId: string, start: string, end: string): Promise<void> {
  const { error } = await supabase.rpc('update_shift_hours' as never, {
    p_shift_id: shiftId,
    p_start: start,
    p_end: end,
  } as never);
  if (error) throw new Error(error.message || 'The shift could not be saved.');
  clearStaffRosterCache();
}

/** Put people on a shift (or on none, with `null`). Returns how many changed. */
export async function setStaffShift(userIds: string[], shiftId: string | null): Promise<number> {
  if (userIds.length === 0) return 0;
  const { data, error } = await supabase.rpc('set_staff_shift' as never, {
    p_user_ids: userIds,
    p_shift_id: shiftId,
  } as never);
  if (error) throw new Error(error.message || 'The roster could not be saved.');
  clearStaffRosterCache();
  return (data as unknown as number) ?? 0;
}
