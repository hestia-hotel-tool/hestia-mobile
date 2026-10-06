/**
 * Hotel settings (name, time zone) and cleaning credits per room category.
 * Changes go through `update_hotel_settings` / `set_category_credit`
 * (migration 20260929000300), which check the manager's permission.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getMyHotelId } from '@/lib/tenant';

export type HotelSettings = {
  id: string;
  name: string;
  timezone: string;
  /** Minutes between checks of a Do Not Disturb door. */
  dndRecheckMinutes: number;
  /** "14:00" — still DND after this (hotel time) → welfare-check alert. */
  dndCutoff: string;
};

export async function fetchHotelSettings(): Promise<HotelSettings | null> {
  if (!isSupabaseConfigured) return null;
  const hotelId = await getMyHotelId();
  if (!hotelId) return null;
  const { data, error } = await supabase
    .from('hotels' as never)
    .select('id, name, timezone, dnd_recheck_minutes, dnd_cutoff_time')
    .eq('id', hotelId)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Hotel settings could not be loaded.');
  const row = data as unknown as {
    id: string;
    name: string | null;
    timezone: string | null;
    dnd_recheck_minutes: number | null;
    dnd_cutoff_time: string | null;
  } | null;
  return row
    ? {
        id: row.id,
        name: row.name ?? '',
        timezone: row.timezone ?? 'UTC',
        dndRecheckMinutes: row.dnd_recheck_minutes ?? 60,
        dndCutoff: (row.dnd_cutoff_time ?? '14:00').slice(0, 5),
      }
    : null;
}

export async function updateHotelSettings(name: string, timezone: string): Promise<void> {
  const { error } = await supabase.rpc('update_hotel_settings' as never, { p_name: name, p_timezone: timezone } as never);
  if (error) throw new Error(error.message || 'Hotel settings could not be saved.');
}

/** Do Not Disturb rules: how often the door is checked, and the welfare-check time. */
export async function updateHotelServiceRules(recheckMinutes: number, cutoff: string): Promise<void> {
  const { error } = await supabase.rpc('update_hotel_service_rules' as never, {
    p_recheck_minutes: recheckMinutes,
    p_cutoff: cutoff,
  } as never);
  if (error) throw new Error(error.message || 'Do Not Disturb settings could not be saved.');
}

export type RoomCategory = {
  /** As stored in `rooms.category`; null for rooms without one. */
  category: string | null;
  rooms: number;
  minCredit: number | null;
  maxCredit: number | null;
  /** The most common credit, a sensible starting point for editing. */
  typicalCredit: number | null;
};

/** The hotel's room categories with how many rooms each has and their credits. */
export async function listRoomCategories(): Promise<RoomCategory[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('rooms').select('category, credit');
  if (error) throw new Error(error.message || 'Rooms could not be loaded.');
  const groups = new Map<string, number[]>();
  for (const r of (data ?? []) as { category: string | null; credit: number | null }[]) {
    const key = r.category ?? '';
    const list = groups.get(key) ?? [];
    if (r.credit != null) list.push(r.credit);
    else list.push(NaN);
    groups.set(key, list);
  }
  return Array.from(groups.entries())
    .map(([key, credits]) => {
      const known = credits.filter((c) => Number.isFinite(c));
      const counts = new Map<number, number>();
      known.forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
      const typical = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? null;
      return {
        category: key || null,
        rooms: credits.length,
        minCredit: known.length ? Math.min(...known) : null,
        maxCredit: known.length ? Math.max(...known) : null,
        typicalCredit: typical,
      };
    })
    .sort((a, b) => b.rooms - a.rooms || (a.category ?? '').localeCompare(b.category ?? ''));
}

/** Set the credit of every room in a category. Returns how many rooms changed. */
export async function setCategoryCredit(category: string | null, minutes: number): Promise<number> {
  const { data, error } = await supabase.rpc('set_category_credit' as never, {
    p_category: category,
    p_minutes: minutes,
  } as never);
  if (error) throw new Error(error.message || 'Cleaning credits could not be saved.');
  return (data as unknown as number) ?? 0;
}
