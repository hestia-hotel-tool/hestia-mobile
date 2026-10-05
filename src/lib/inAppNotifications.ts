import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Every notification type listed under Chat > Notifications > Tasks and
 * counted on the Chat badge. Written by triggers in
 * 20260925000100_task_notifications.sql.
 */
export const TASK_NOTIFICATION_TYPES = [
  'room_assignment',
  'room_flagged',
  'room_flag_updated',
  'room_unflagged',
  'room_priority',
  'room_cleaned',
  'room_rejected',
  'room_paused',
  'room_overdue',
  'room_promise',
  'room_dnd',
  'room_dnd_check',
  'room_dnd_cleared',
  'room_dnd_welfare',
  'room_refused',
  'room_service_resumed',
  'room_return_later',
  'room_return_due',
  'room_return_overdue',
  'ticket_assigned',
  'ticket_tag',
] as const;

/** The task types that are about a room — read by opening that room. */
export const ROOM_TASK_NOTIFICATION_TYPES = [
  'room_assignment',
  'room_flagged',
  'room_flag_updated',
  'room_unflagged',
  'room_priority',
  'room_cleaned',
  'room_rejected',
  'room_paused',
  'room_overdue',
  'room_promise',
  'room_dnd',
  'room_dnd_check',
  'room_dnd_cleared',
  'room_dnd_welfare',
  'room_refused',
  'room_service_resumed',
  'room_return_later',
  'room_return_due',
  'room_return_overdue',
] as const;

const badgeInvalidateListeners = new Set<() => void>();

/** Dev / HMR: drop all badge listeners so stale callbacks cannot run after refactors. */
export function clearNotificationBadgeInvalidateListeners(): void {
  badgeInvalidateListeners.clear();
}

/** Subscribe to run when notification rows are marked read (refetch tab badges). */
export function subscribeNotificationBadgeInvalidate(listener: () => void): () => void {
  badgeInvalidateListeners.add(listener);
  return () => {
    badgeInvalidateListeners.delete(listener);
  };
}

/*
 * Coalesced: callers fire this in bursts (a screen focus, a list reload and an
 * incoming notification within the same moment), and each listener runs a
 * handful of count queries. One trailing run per 300ms does the same job.
 */
let invalidateTimer: ReturnType<typeof setTimeout> | null = null;

export function invalidateNotificationBadges(): void {
  if (invalidateTimer) clearTimeout(invalidateTimer);
  invalidateTimer = setTimeout(() => {
    invalidateTimer = null;
    runBadgeInvalidateListeners();
  }, 300);
}

function runBadgeInvalidateListeners(): void {
  badgeInvalidateListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn('[inAppNotifications] badge listener failed', e);
    }
  });
}

/** User opened the Chat inbox — clear all unread chat_message inbox rows. */
export async function markAllChatMessageNotificationsRead(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const readAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: readAt })
    .eq('type', 'chat_message')
    .is('read_at', null)
    .select('id');
  if (error) {
    console.warn('[inAppNotifications] markAllChatMessageNotificationsRead', error.message);
  }
  return data?.length ?? 0;
}

/**
 * User opened a specific chat — clear inbox rows for that chat (e.g. deep link).
 */
export async function markChatMessageNotificationsReadForChat(chatId: string): Promise<number> {
  if (!isSupabaseConfigured || !chatId) return 0;
  const readAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: readAt })
    .eq('type', 'chat_message')
    .is('read_at', null)
    .contains('data', { chatId })
    .select('id');
  if (error) {
    console.warn('[inAppNotifications] markChatMessageNotificationsReadForChat', error.message);
  }
  return data?.length ?? 0;
}

/** User opened the Tickets tab — clear unread ticket_tag inbox rows. */
export async function markAllTicketTagNotificationsRead(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const readAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: readAt })
    .eq('type', 'ticket_tag')
    .is('read_at', null)
    .select('id');
  if (error) {
    console.warn('[inAppNotifications] markAllTicketTagNotificationsRead', error.message);
  }
  return data?.length ?? 0;
}

/** User opened Rooms from the assignment badge — clear unread room_assignment inbox rows. */
export async function markAllRoomAssignmentNotificationsRead(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const readAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: readAt })
    .eq('type', 'room_assignment')
    .is('read_at', null)
    .select('id');
  if (error) {
    console.warn('[inAppNotifications] markAllRoomAssignmentNotificationsRead', error.message);
  }
  return data?.length ?? 0;
}


/** User opened one notification's detail — clear just that row. */
export async function markNotificationRead(id: string): Promise<number> {
  if (!isSupabaseConfigured || !id) return 0;
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null)
    .select('id');
  if (error) {
    console.warn('[inAppNotifications] markNotificationRead', error.message);
  }
  return data?.length ?? 0;
}

/** User opened a room — clear its unread room tasks (a room task's "detail" is its room). */
export async function markRoomAssignmentNotificationsReadForRoom(roomId: string): Promise<number> {
  if (!isSupabaseConfigured || !roomId) return 0;
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('type', [...ROOM_TASK_NOTIFICATION_TYPES])
    .is('read_at', null)
    .contains('data', { roomId })
    .select('id');
  if (error) {
    console.warn('[inAppNotifications] markRoomAssignmentNotificationsReadForRoom', error.message);
  }
  return data?.length ?? 0;
}

/**
 * The chat on screen right now, if any. A `chat_message` notification for it is
 * already being read, so it is marked read as it arrives rather than toasting
 * and bumping the badge while the user is looking at the conversation.
 */
let openChatId: string | null = null;

export function setOpenChatId(chatId: string | null): void {
  openChatId = chatId;
}

export function getOpenChatId(): string | null {
  return openChatId;
}
