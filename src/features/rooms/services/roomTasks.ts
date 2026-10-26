import { supabase } from '@/lib/supabase';
import type { Task } from '../types/roomDetail.types';

/**
 * A room's tasks (migration 20261026160000) — saved, where Room Detail used
 * to keep an added task in screen state only, so it vanished on reopening.
 * Deleting: the author, or anyone with rooms.notes.manage; recorded in the
 * room's History.
 */

type Row = { id: string; text: string; created_at: string; created_by_id: string | null };

const toTask = (r: Row): Task => ({ id: r.id, text: r.text, createdAt: r.created_at, createdById: r.created_by_id });

// Cast: room_tasks postdates the generated types.
const db = () => supabase as unknown as { from: (t: string) => any; rpc: (f: string, a: Record<string, unknown>) => any };

export async function fetchRoomTasks(roomId: string): Promise<Task[]> {
  const { data, error } = await db()
    .from('room_tasks')
    .select('id, text, created_at, created_by_id')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
  if (error) {
    if (__DEV__) console.warn('[roomTasks] fetch', error.message);
    return [];
  }
  return ((data ?? []) as Row[]).map(toTask);
}

export async function addRoomTask(roomId: string, text: string): Promise<Task> {
  const { data: room } = await supabase.from('rooms').select('hotel_id').eq('id', roomId).maybeSingle();
  const { data: session } = await supabase.auth.getSession();
  const { data, error } = await db()
    .from('room_tasks')
    .insert({ room_id: roomId, text: text.trim(), hotel_id: (room as { hotel_id?: string } | null)?.hotel_id, created_by_id: session?.session?.user?.id })
    .select('id, text, created_at, created_by_id')
    .single();
  if (error || !data) throw new Error(error?.message || 'The task could not be saved.');
  return toTask(data as Row);
}

export async function deleteRoomTask(taskId: string): Promise<void> {
  const { error } = await db().rpc('room_task_delete', { p_task_id: taskId });
  if (error) throw new Error(error.message || 'The task could not be deleted.');
}
