import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Every notification type listed under Chat > Notifications > Tasks and
 * counted on the Chat badge. Written by triggers in
 * 20260925000100_task_notifications.sql.
 */
export const TASK_NOTIFICATION_TYPES = [
  'room_assignment',
  'room_flagged',
  'room_priority',
  'room_cleaned',
  'room_rejected',
  'ticket_assigned',
] as const;

/** The task types that are about a room — read by opening that room. */
export const ROOM_TASK_NOTIFICATION_TYPES = [
  'room_assignment',
  'room_flagged',
  'room_priority',
  'room_cleaned',
  'room_rejected',
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

export function invalidateNotificationBadges(): void {
  badgeInvalidateListeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn('[inAppNotifications] badge listener failed', e);
    }
  });
}

/** User opened the Chat inbox — clear all unread chat_message inbox rows. */
export async function markAllChatMessageNotificationsRead(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const readAt = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: readAt })
    .eq('type', 'chat_message')
    .is('read_at', null);
  if (error) {
    console.warn('[inAppNotifications] markAllChatMessageNotificationsRead', error.message);
  }
}

/**
 * User opened a specific chat — clear inbox rows for that chat (e.g. deep link).
 */
export async function markChatMessageNotificationsReadForChat(chatId: string): Promise<void> {
  if (!isSupabaseConfigured || !chatId) return;
  const readAt = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: readAt })
    .eq('type', 'chat_message')
    .is('read_at', null)
    .contains('data', { chatId });
  if (error) {
    console.warn('[inAppNotifications] markChatMessageNotificationsReadForChat', error.message);
  }
}

/** User opened the Tickets tab — clear unread ticket_tag inbox rows. */
export async function markAllTicketTagNotificationsRead(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const readAt = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: readAt })
    .eq('type', 'ticket_tag')
    .is('read_at', null);
  if (error) {
    console.warn('[inAppNotifications] markAllTicketTagNotificationsRead', error.message);
  }
}

/** User opened Rooms from the assignment badge — clear unread room_assignment inbox rows. */
export async function markAllRoomAssignmentNotificationsRead(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const readAt = new Date().toISOString();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: readAt })
    .eq('type', 'room_assignment')
    .is('read_at', null);
  if (error) {
    console.warn('[inAppNotifications] markAllRoomAssignmentNotificationsRead', error.message);
  }
}


/** User opened one notification's detail — clear just that row. */
export async function markNotificationRead(id: string): Promise<void> {
  if (!isSupabaseConfigured || !id) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);
  if (error) {
    console.warn('[inAppNotifications] markNotificationRead', error.message);
  }
}

/** User opened a room — clear its unread room tasks (a room task's "detail" is its room). */
export async function markRoomAssignmentNotificationsReadForRoom(roomId: string): Promise<void> {
  if (!isSupabaseConfigured || !roomId) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('type', [...ROOM_TASK_NOTIFICATION_TYPES])
    .is('read_at', null)
    .contains('data', { roomId });
  if (error) {
    console.warn('[inAppNotifications] markRoomAssignmentNotificationsReadForRoom', error.message);
  }
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
