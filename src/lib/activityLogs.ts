import { supabase, isSupabaseConfigured } from './supabase';

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export type ActivityLogTableName = 'rooms' | string;

/**
 * Record an app-authored event — something meaningful to a person that no table
 * change captures on its own. Row-level changes are recorded automatically by
 * the `audit_changes()` trigger; use this only for the rest.
 */
export async function logActivity(input: {
  action: string;
  tableName: ActivityLogTableName;
  recordId?: string | null;
  /** Room this event belongs to, so it appears in the Room History feed. */
  roomId?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured) return;

  const action = input.action.trim();
  if (!action) return;

  const recordId = input.recordId ?? null;
  if (recordId && !isValidUUID(recordId)) return;

  const roomId = input.roomId ?? null;
  if (roomId && !isValidUUID(roomId)) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id ?? null;

  const { error } = await (supabase as any).from('activity_logs').insert({
    user_id: userId,
    action,
    table_name: input.tableName,
    record_id: recordId,
    room_id: roomId,
  });

  if (error) {
    // Non-blocking: never break core app flows.
    console.warn('[activityLogs] Failed to insert activity_logs:', error.message, error.code);
  }
}

/**
 * Every activity related to a room, whatever table it happened on.
 *
 * Correlation lives in `room_id`, not `record_id`: a ticket change records the
 * ticket as the entity and the room as the correlation, so the same row serves
 * both the audit trail and the Room History feed.
 */
export async function getActivityLogsForRoom(input: {
  roomId: string;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    action: string;
    created_at: string | null;
    user_id: string | null;
    users: { full_name: string | null; avatar_url: string | null } | null;
  }>
> {
  if (!isSupabaseConfigured) return [];
  if (!input.roomId || !isValidUUID(input.roomId)) return [];

  const { data, error } = await (supabase as any)
    .from('activity_logs')
    .select('id, action, created_at, user_id, users(full_name, avatar_url)')
    .eq('room_id', input.roomId)
    .order('created_at', { ascending: false })
    .limit(input.limit ?? 300);

  if (error || !data) {
    console.warn('[activityLogs] Failed to fetch room activity:', error?.message, error?.code);
    return [];
  }

  return data as any;
}

export async function getActivityLogsForRecord(input: {
  tableName: ActivityLogTableName;
  recordId: string;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    action: string;
    created_at: string | null;
    user_id: string | null;
    users: { full_name: string | null; avatar_url: string | null } | null;
  }>
> {
  if (!isSupabaseConfigured) return [];
  if (!input.recordId || !isValidUUID(input.recordId)) return [];

  const { data, error } = await (supabase as any)
    .from('activity_logs')
    .select('id, action, created_at, user_id, users(full_name, avatar_url)')
    .eq('table_name', input.tableName)
    .eq('record_id', input.recordId)
    .order('created_at', { ascending: false })
    .limit(input.limit ?? 200);

  if (error || !data) {
    console.warn('[activityLogs] Failed to fetch activity_logs:', error?.message, error?.code);
    return [];
  }

  return data as any;
}

export async function getRecentActivityLogs(input: {
  tableName: ActivityLogTableName;
  /** Optional filter: only actions matching this pattern (case-insensitive). */
  actionIlike?: string;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    action: string;
    created_at: string | null;
    user_id: string | null;
    record_id: string | null;
    users: { full_name: string | null; avatar_url: string | null } | null;
  }>
> {
  if (!isSupabaseConfigured) return [];

  let q = (supabase as any)
    .from('activity_logs')
    .select('id, action, created_at, user_id, record_id, room_id, users(full_name, avatar_url)')
    .eq('table_name', input.tableName)
    .order('created_at', { ascending: false })
    .limit(input.limit ?? 50);

  if (input.actionIlike?.trim()) {
    q = q.ilike('action', input.actionIlike.trim());
  }

  const { data, error } = await q;
  if (error || !data) {
    console.warn('[activityLogs] Failed to fetch recent activity_logs:', error?.message, error?.code);
    return [];
  }

  return data as any;
}

