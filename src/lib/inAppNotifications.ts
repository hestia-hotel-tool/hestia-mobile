import { supabase, isSupabaseConfigured } from './supabase';

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
