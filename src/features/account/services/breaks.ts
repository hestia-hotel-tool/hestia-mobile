/**
 * Breaks — the rules a shift allows (Settings › Shifts) and the breaks staff
 * take (My Shift on Settings). Migration 20260929000200.
 *
 * The tables postdate the generated types, hence the `as never` casts.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getMyHotelId } from '@/lib/tenant';

export type BreakRule = {
  id: string;
  shiftId: string;
  name: string;
  minutes: number;
  /** "11:00"; both null = any time during the shift. */
  windowStart: string | null;
  windowEnd: string | null;
};

export type StaffBreak = {
  id: string;
  userId: string;
  ruleId: string | null;
  name: string;
  plannedMinutes: number;
  startedAt: string;
  endedAt: string | null;
};

type RuleRow = {
  id: string;
  shift_id: string;
  name: string;
  duration_minutes: number;
  window_start: string | null;
  window_end: string | null;
};

type BreakRow = {
  id: string;
  user_id: string;
  shift_break_id: string | null;
  name: string;
  planned_minutes: number;
  started_at: string;
  ended_at: string | null;
};

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

const toRule = (r: RuleRow): BreakRule => ({
  id: r.id,
  shiftId: r.shift_id,
  name: r.name,
  minutes: r.duration_minutes,
  windowStart: hhmm(r.window_start),
  windowEnd: hhmm(r.window_end),
});

const toBreak = (r: BreakRow): StaffBreak => ({
  id: r.id,
  userId: r.user_id,
  ruleId: r.shift_break_id,
  name: r.name,
  plannedMinutes: r.planned_minutes,
  startedAt: r.started_at,
  endedAt: r.ended_at,
});

/** A shift's breaks, earliest window first (any-time breaks last). */
export async function listBreakRules(shiftId: string): Promise<BreakRule[]> {
  if (!isSupabaseConfigured || !shiftId) return [];
  const { data, error } = await supabase
    .from('shift_breaks' as never)
    .select('id, shift_id, name, duration_minutes, window_start, window_end')
    .eq('shift_id', shiftId);
  if (error) throw new Error(error.message || 'Breaks could not be loaded.');
  return ((data ?? []) as unknown as RuleRow[])
    .map(toRule)
    .sort((a, b) => (a.windowStart ?? '99').localeCompare(b.windowStart ?? '99'));
}

export type BreakRuleInput = {
  name: string;
  minutes: number;
  windowStart: string | null;
  windowEnd: string | null;
};

function validate(input: BreakRuleInput) {
  if (!input.name.trim()) throw new Error('Give the break a name.');
  if (input.minutes < 5 || input.minutes > 180) throw new Error('A break is between 5 minutes and 3 hours.');
  if ((input.windowStart == null) !== (input.windowEnd == null)) throw new Error('Set both ends of the window, or neither.');
  if (input.windowStart && input.windowStart === input.windowEnd) throw new Error('The window cannot start and end at the same time.');
}

export async function saveBreakRule(shiftId: string, input: BreakRuleInput, id?: string): Promise<void> {
  validate(input);
  const payload = {
    name: input.name.trim(),
    duration_minutes: input.minutes,
    window_start: input.windowStart,
    window_end: input.windowEnd,
  };
  if (id) {
    const { error } = await supabase.from('shift_breaks' as never).update(payload as never).eq('id', id);
    if (error) throw new Error(error.message || 'The break could not be saved.');
    return;
  }
  const hotelId = await getMyHotelId();
  if (!hotelId) throw new Error('No hotel assigned to this user.');
  const { error } = await supabase
    .from('shift_breaks' as never)
    .insert({ ...payload, shift_id: shiftId, hotel_id: hotelId } as never);
  if (error) throw new Error(error.message || 'The break could not be saved.');
}

export async function deleteBreakRule(id: string): Promise<void> {
  const { error } = await supabase.from('shift_breaks' as never).delete().eq('id', id);
  if (error) throw new Error(error.message || 'The break could not be deleted.');
}

/** The signed-in person's breaks started since local midnight, newest first. */
export async function fetchMyBreaksToday(): Promise<StaffBreak[]> {
  if (!isSupabaseConfigured) return [];
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return [];
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('staff_breaks' as never)
    .select('id, user_id, shift_break_id, name, planned_minutes, started_at, ended_at')
    .eq('user_id', userId)
    .or(`started_at.gte.${midnight.toISOString()},ended_at.is.null`)
    .order('started_at', { ascending: false });
  if (error) throw new Error(error.message || 'Your breaks could not be loaded.');
  return ((data ?? []) as unknown as BreakRow[]).map(toBreak);
}

/** Go on break: one of the shift's breaks, or a short break of `minutes`. */
export async function startBreak(ruleId: string | null, minutes?: number): Promise<StaffBreak> {
  const { data, error } = await supabase.rpc('start_break' as never, {
    p_shift_break_id: ruleId,
    p_minutes: minutes ?? null,
  } as never);
  if (error) throw new Error(error.message || 'Your break could not be started.');
  return toBreak(data as unknown as BreakRow);
}

export async function endBreak(): Promise<void> {
  const { error } = await supabase.rpc('end_break' as never);
  if (error) throw new Error(error.message || 'Your break could not be ended.');
}

/** Who is on break right now, among these people: user id → their open break. */
export async function fetchOpenBreaks(userIds?: string[]): Promise<Map<string, StaffBreak>> {
  const out = new Map<string, StaffBreak>();
  if (!isSupabaseConfigured) return out;
  let q = supabase
    .from('staff_breaks' as never)
    .select('id, user_id, shift_break_id, name, planned_minutes, started_at, ended_at')
    .is('ended_at', null);
  if (userIds && userIds.length > 0) q = q.in('user_id', userIds);
  const { data, error } = await q;
  if (error) {
    if (__DEV__) console.warn('[breaks] open breaks unavailable', error.message);
    return out;
  }
  for (const row of (data ?? []) as unknown as BreakRow[]) out.set(row.user_id, toBreak(row));
  return out;
}

/** Minutes left on a break (negative once over), at `now`. */
export function breakMinutesLeft(b: StaffBreak, now: number = Date.now()): number {
  const elapsed = (now - Date.parse(b.startedAt)) / 60_000;
  return Math.round(b.plannedMinutes - elapsed);
}
