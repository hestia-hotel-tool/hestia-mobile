import { supabase, isSupabaseConfigured } from '@shared/lib/supabase';
import type { StaffMember } from '../types/staff.types';

async function getShiftIdByName(shiftName: 'AM' | 'PM'): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('shifts')
    .select('id')
    .ilike('name', shiftName)
    .limit(1)
    .maybeSingle();
  if (!error && data) return (data as { id: string }).id;
  return null;
}

/**
 * Fetch staff members from Supabase `users` table and map them to StaffMember.
 * When Supabase is not configured or the query fails, returns an empty array.
 */
export async function fetchStaffFromSupabase(): Promise<StaffMember[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, avatar_url, departments(name), roles(name)');

  if (error || !data) {
    console.warn('Failed to fetch staff from Supabase', error);
    return [];
  }

  type UserRow = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    departments: { name: string } | null;
    roles: { name: string } | null;
  };

  return (data as UserRow[]).map((row) => ({
    id: row.id,
    name: row.full_name ?? 'Staff',
    avatar: row.avatar_url ?? undefined,
    department: row.departments?.name ?? undefined,
    role: row.roles?.name ?? undefined,
    onShift: true,
    shift: 'AM',
  }));
}

export type StaffRoomStats = {
  total: number;
  completed: number;
  inProgress: number;
  cleaned: number;
  dirty: number;
  currentRoomNumber?: string;
};

/**
 * Fetch housekeeping room stats per user for a given shift.
 * Uses `room_assignments` filtered by shift, joined with `rooms` for status + room number.
 */
export async function fetchStaffRoomStatsForShift(
  userIds: string[],
  shift: 'AM' | 'PM'
): Promise<Map<string, StaffRoomStats>> {
  const map = new Map<string, StaffRoomStats>();
  if (!isSupabaseConfigured) return map;
  if (!Array.isArray(userIds) || userIds.length === 0) return map;

  const shiftId = await getShiftIdByName(shift);
  if (!shiftId) return map;

  const { data, error } = await supabase
    .from('room_assignments')
    .select('user_id, work_status, rooms:rooms(id, room_number, house_keeping_status)')
    .eq('shift_id', shiftId)
    .in('user_id', userIds);

  if (error) {
    console.warn('[staff] fetchStaffRoomStatsForShift failed', error.message);
    return map;
  }

  type Row = {
    user_id: string;
    work_status: string | null;
    rooms: { id: string; room_number: string; house_keeping_status: string | null } | null;
  };

  const rows = (data ?? []) as Row[];
  for (const r of rows) {
    const uid = String(r.user_id ?? '');
    if (!uid) continue;
    const statusRaw = String(r.rooms?.house_keeping_status ?? '').trim().toLowerCase();
    const hk =
      statusRaw === 'inprogress' || statusRaw === 'in progress' || statusRaw === 'in_progress'
        ? 'InProgress'
        : statusRaw === 'cleaned'
          ? 'Cleaned'
          : statusRaw === 'inspected'
            ? 'Inspected'
            : 'Dirty';

    const prev =
      map.get(uid) ?? { total: 0, completed: 0, inProgress: 0, cleaned: 0, dirty: 0 } satisfies StaffRoomStats;
    prev.total += 1;
    if (hk === 'InProgress') prev.inProgress += 1;
    else if (hk === 'Cleaned' || hk === 'Inspected') {
      prev.cleaned += 1;
      prev.completed += 1;
    } else {
      prev.dirty += 1;
    }

    // Choose a "current" room (prefer assignment work_status == in_progress, else hk == InProgress)
    const ws = String(r.work_status ?? '').toLowerCase();
    if (!prev.currentRoomNumber) {
      if (ws === 'in_progress' || hk === 'InProgress') {
        const rn = r.rooms?.room_number ? String(r.rooms.room_number) : undefined;
        if (rn) prev.currentRoomNumber = rn;
      }
    }

    map.set(uid, prev);
  }

  return map;
}

