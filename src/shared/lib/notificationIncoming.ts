import { Vibration, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { getToast } from '../utils/toast';
import { invalidateNotificationBadges } from './inAppNotifications';
import type { PushData } from './notifications';

const DEDUPE_MS = 4500;
const dedupeUntil = new Map<string, number>();

function pruneDedupe(now: number) {
  for (const [k, t] of dedupeUntil) {
    if (now - t > DEDUPE_MS) dedupeUntil.delete(k);
  }
}

export function incomingAlertDedupeKeyFromRow(row: {
  id?: string;
  type: string;
  data: unknown;
}): string {
  const d = row.data as Record<string, string | undefined> | null;
  if (row.type === 'chat_message' && d?.messageId) return `cm:${d.messageId}`;
  if (row.type === 'ticket_tag' && d?.ticketId) return `tt:${d.ticketId}`;
  if (row.type === 'room_assignment' && d?.roomId) return `ra:${d.roomId}:${d?.shiftId ?? ''}`;
  if (row.id) return `id:${row.id}`;
  return `na:${row.type}:${Date.now()}`;
}

export function incomingAlertDedupeKeyFromPushData(
  data: Partial<PushData> & Record<string, unknown>
): string | null {
  if (data.type === 'chat_message' && typeof data.messageId === 'string') return `cm:${data.messageId}`;
  if (data.type === 'ticket_tag' && typeof data.ticketId === 'string') return `tt:${data.ticketId}`;
  if (data.type === 'room_assignment' && typeof data.roomId === 'string') {
    return `ra:${data.roomId}:${typeof data.shiftId === 'string' ? data.shiftId : ''}`;
  }
  return null;
}

/**
 * Toast + short vibration + badge refetch. Deduped so Realtime + push do not double-fire.
 * @returns whether the alert was shown (false if deduped)
 */
export function presentIncomingNotificationAlert(dedupeKey: string, title: string, body: string): boolean {
  const now = Date.now();
  pruneDedupe(now);
  if (dedupeUntil.has(dedupeKey)) return false;
  dedupeUntil.set(dedupeKey, now);

  if (Platform.OS === 'ios') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  } else if (Platform.OS === 'android') {
    try {
      Vibration.vibrate(280);
    } catch {
      // ignore
    }
  }
  const toast = getToast();
  if (toast) {
    toast.show(body, { type: 'info', title: title || 'Update', duration: 4500 });
  }
  queueMicrotask(() => invalidateNotificationBadges());
  return true;
}

export function subscribeToIncomingNotificationRows(userId: string): () => void {
  if (!isSupabaseConfigured || !userId) return () => {};

  const channel: RealtimeChannel = supabase
    .channel(`notifications-incoming:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as {
          id?: string;
          type: string;
          title: string;
          body: string;
          data: unknown;
        };
        if (row.type !== 'chat_message' && row.type !== 'ticket_tag' && row.type !== 'room_assignment') {
          return;
        }
        const key = incomingAlertDedupeKeyFromRow(row);
        presentIncomingNotificationAlert(key, row.title, row.body);
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
