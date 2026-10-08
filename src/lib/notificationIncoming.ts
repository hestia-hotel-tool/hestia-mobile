import { Vibration, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { uniqueChannelName } from './realtimeChannel';
import { notificationToastVisual, toastMessage, toastTitle } from './notificationToastVisual';
import { getToast } from '../utils/toast';
import {
  TASK_NOTIFICATION_TYPES,
  getOpenChatId,
  invalidateNotificationBadges,
  markNotificationRead,
} from './inAppNotifications';
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

/**
 * The same key as `incomingAlertDedupeKeyFromRow`, from a push: a push carries
 * the row's data plus its `type` and `notificationId`, so Realtime and push
 * agree on one key and the alert shows once.
 */
export function incomingAlertDedupeKeyFromPushData(data: PushData & Record<string, unknown>): string | null {
  if (typeof data.type !== 'string') return null;
  return incomingAlertDedupeKeyFromRow({ id: data.notificationId, type: data.type, data });
}

/**
 * Toast + short vibration + badge refetch. Deduped so Realtime + push do not double-fire.
 * @returns whether the alert was shown (false if deduped)
 */
export function presentIncomingNotificationAlert(
  dedupeKey: string,
  title: string,
  body: string,
  /** The notification type — picks the toast's pill colour and glyph. */
  type?: string | null,
  /** The notification's data (a General Announcement's `senderId`). */
  data?: Record<string, unknown> | null
): boolean {
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
    if (type === 'general') {
      /*
       * Figma 4443:547: "General Announcement" over the announcement's subject,
       * with the sender's photo where the pill would be. Shown once the sender
       * is known (a short lookup, cached); without one, initials.
       */
      const senderId = typeof data?.senderId === 'string' ? data.senderId : null;
      void announcementSender(senderId).then((sender) => {
        toast.show(toastMessage(title || body), {
          type: 'info',
          title: 'General Announcement',
          duration: 4500,
          visual: { colour: 'transparent', avatar: sender ?? { name: null } },
        });
      });
    } else {
      // Every other kind follows the same pattern: its pill, a Title Case
      // title, the message without a closing full stop. A chat message is
      // left as written — its title is a person's or group's name and its
      // body their words.
      const isChat = type === 'chat_message';
      toast.show(isChat ? body : toastMessage(body), {
        type: 'info',
        title: isChat ? title || 'Message' : toastTitle(title || 'Update'),
        duration: 4500,
        visual: notificationToastVisual(type),
      });
    }
  }
  queueMicrotask(() => invalidateNotificationBadges());
  return true;
}

/** Senders already looked up — announcements usually come from a few managers. */
const senderCache = new Map<string, { uri: string | null; name: string | null }>();

async function announcementSender(
  senderId: string | null
): Promise<{ uri: string | null; name: string | null } | null> {
  if (!senderId || !isSupabaseConfigured) return null;
  const cached = senderCache.get(senderId);
  if (cached) return cached;
  try {
    const { data } = await supabase.from('users').select('full_name, avatar_url').eq('id', senderId).maybeSingle();
    const row = data as { full_name?: string | null; avatar_url?: string | null } | null;
    const sender = { uri: row?.avatar_url ?? null, name: row?.full_name ?? null };
    senderCache.set(senderId, sender);
    return sender;
  } catch {
    return null;
  }
}

export function subscribeToIncomingNotificationRows(userId: string): () => void {
  if (!isSupabaseConfigured || !userId) return () => {};

  const channel: RealtimeChannel = supabase
    .channel(uniqueChannelName(`notifications-incoming:${userId}`))
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
        const alerting: readonly string[] = ['chat_message', 'ticket_tag', 'general', ...TASK_NOTIFICATION_TYPES];
        if (!alerting.includes(row.type)) {
          return;
        }
        // A message in the chat already open is being read — no toast, no badge.
        const chatId = (row.data as { chatId?: string } | null)?.chatId;
        if (row.type === 'chat_message' && row.id && chatId && chatId === getOpenChatId()) {
          void markNotificationRead(row.id).then((n) => n && invalidateNotificationBadges());
          return;
        }
        const key = incomingAlertDedupeKeyFromRow(row);
        presentIncomingNotificationAlert(key, row.title, row.body, row.type, row.data as Record<string, unknown> | null);
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
