import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ShiftType } from '@/types/shift.types';

/**
 * Which shift is on now — by the hotel's own shift times, everywhere.
 *
 * The Rooms list used a fixed rule (PM from 17:00) while the Staff screen
 * used the hotel's `shifts` rows (here AM 06–14, PM 14–22). Between 14:00 and
 * 17:00 a room assigned from Rooms landed on AM while Staff showed PM, so the
 * attendant's rooms seemed to vanish. One answer now, from the same rows.
 */

type Window = { name: string; start: number; end: number };

let windows: Window[] | null = null;
let loading: Promise<void> | null = null;

const minutes = (t: string | null | undefined): number | null => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
};

/** Load the hotel's shifts once (per sign-in). Safe to call often. */
export function ensureHotelShifts(): Promise<void> {
  if (windows || !isSupabaseConfigured) return Promise.resolve();
  if (loading) return loading;
  loading = (async () => {
    const { data, error } = await supabase.from('shifts').select('name, start_time, end_time');
    if (!error && data) {
      windows = (data as { name: string; start_time: string | null; end_time: string | null }[])
        .map((row) => ({ name: String(row.name ?? ''), start: minutes(row.start_time), end: minutes(row.end_time) }))
        .filter((w): w is Window => w.start != null && w.end != null);
    }
  })()
    .catch(() => {})
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** Forget the shifts — a different hotel may sign in. */
export function clearHotelShifts() {
  windows = null;
  loading = null;
}

/**
 * AM or PM right now. A Night shift has no AM/PM list of its own: before noon
 * the AM list (the shift about to start), after it the PM list. Until the
 * hotel's shifts have loaded, the usual 06–14 / 14–22 split.
 */
export function currentShiftNow(now: Date = new Date()): ShiftType {
  const m = now.getHours() * 60 + now.getMinutes();
  const containing = (windows ?? []).find((w) =>
    w.start <= w.end ? m >= w.start && m < w.end : m >= w.start || m < w.end
  );
  const name = containing?.name.toLowerCase();
  if (name === 'am') return 'AM';
  if (name === 'pm') return 'PM';
  if (!windows) {
    if (m >= 6 * 60 && m < 14 * 60) return 'AM';
    if (m >= 14 * 60 && m < 22 * 60) return 'PM';
  }
  return now.getHours() < 12 ? 'AM' : 'PM';
}
