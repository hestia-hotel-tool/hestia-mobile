import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ShiftType } from '@/types/shift.types';

/**
 * The signed-in user's rostered shift (`users.shift_id`), cached per user id.
 * Kept free of React and permissions so `resetTenantScopedStores` can clear it
 * without an import cycle.
 */
const cache = new Map<string, ShiftType | null>();

export function clearMyShiftCache() {
  cache.clear();
}

/** 'AM' | 'PM', or null when none is set (or it is another shift, e.g. Night). */
export async function fetchMyRosteredShift(): Promise<ShiftType | null> {
  if (!isSupabaseConfigured) return null;
  const { data: auth } = await supabase.auth.getSession();
  const userId = auth?.session?.user?.id;
  if (!userId) return null;
  if (cache.has(userId)) return cache.get(userId) ?? null;
  const { data, error } = await supabase.from('users').select('shifts(name)').eq('id', userId).maybeSingle();
  if (error) return null;
  const name = (data as unknown as { shifts: { name: string | null } | null } | null)?.shifts?.name ?? null;
  const shift: ShiftType | null = name === 'AM' || name === 'PM' ? name : null;
  cache.set(userId, shift);
  return shift;
}

/**
 * The shifts the signed-in user has rooms on right now (`room_assignments`;
 * cleared overnight, so this is today's). An attendant can hold rooms on both
 * AM and PM. Not cached: assignments change during the day.
 */
export async function fetchMyAssignmentShifts(): Promise<Set<ShiftType>> {
  const out = new Set<ShiftType>();
  if (!isSupabaseConfigured) return out;
  const { data: auth } = await supabase.auth.getSession();
  const userId = auth?.session?.user?.id;
  if (!userId) return out;
  const { data, error } = await supabase.from('room_assignments').select('shifts(name)').eq('user_id', userId);
  if (error || !data) return out;
  for (const row of data as unknown as { shifts: { name: string | null } | null }[]) {
    const name = row.shifts?.name;
    if (name === 'AM' || name === 'PM') out.add(name);
  }
  return out;
}
