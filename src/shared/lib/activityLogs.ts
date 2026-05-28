import { supabase, isSupabaseConfigured } from './supabase';

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export type ActivityLogTableName = 'rooms' | string;

export async function logActivity(input: {
  action: string;
  tableName: ActivityLogTableName;
  recordId?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured) return;

  const action = input.action.trim();
  if (!action) return;

  const recordId = input.recordId ?? null;
  if (recordId && !isValidUUID(recordId)) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id ?? null;

  const { error } = await supabase.from('activity_logs').insert({
    user_id: userId,
    action,
    table_name: input.tableName,
    record_id: recordId,
  });

  if (error) {
    // Non-blocking: never break core app flows.
    console.warn('[activityLogs] Failed to insert activity_logs:', error.message, error.code);
  }
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

  const { data, error } = await supabase
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

  let q = supabase
    .from('activity_logs')
    .select('id, action, created_at, user_id, record_id, users(full_name, avatar_url)')
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

