/**
 * Home dashboard service (Supabase)
 * Small dashboard-only lookups that don't belong to a single feature service.
 */

import { supabase } from '@/lib/supabase';

export interface LatestPausedAssignment {
  roomId: string;
  updatedAt?: string;
}

/**
 * Most recent `paused` room_assignment for a user within a named shift
 * (e.g. "AM" / "PM"). Returns null when there's no paused assignment.
 */
export async function getLatestPausedAssignment(
  userId: string,
  shiftName: string
): Promise<LatestPausedAssignment | null> {
  const { data: shiftRow } = await supabase
    .from('shifts')
    .select('id')
    .ilike('name', shiftName)
    .limit(1)
    .maybeSingle();

  const shiftId = (shiftRow as any)?.id as string | undefined;
  if (!shiftId) return null;

  const { data: paused } = await supabase
    .from('room_assignments')
    .select('room_id, updated_at')
    .eq('user_id', userId)
    .eq('shift_id', shiftId)
    .eq('work_status', 'paused')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const roomId = (paused as any)?.room_id as string | undefined;
  if (!roomId) return null;

  return { roomId, updatedAt: (paused as any)?.updated_at as string | undefined };
}
