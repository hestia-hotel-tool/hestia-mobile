import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useChatStore } from '@features/chat/store/useChatStore';
import {
  clearNotificationBadgeInvalidateListeners,
  subscribeNotificationBadgeInvalidate,
} from '@/lib/inAppNotifications';
import {
  getBadgeCounts,
  refreshBadgeCounts,
  subscribeBadgeCounts,
} from '@/store/bottomTabBadgeCounts';

if (__DEV__) {
  // Fast Refresh can leave old `refresh` closures in the listener set (e.g.
  // after removing a hook dependency). Clear on hook module load so tabs
  // re-subscribe cleanly.
  clearNotificationBadgeInvalidateListeners();
}

/**
 * Tab bar badges. Chat counts everything unread on the Chat screen (Figma
 * 3272:62): its conversations — the higher of unread thread counts vs unread
 * `chat_message` notifications, so the two are not double-counted — plus the
 * two Notifications rows, General announcements and Tasks (`room_assignment`).
 * Tickets
 * uses unread `ticket_tag` notifications for the logged-in user (RLS).
 * Rooms uses unread `room_assignment` notifications; cleared when user opens Rooms from the badge.
 *
 * The counts themselves live in `@/store/bottomTabBadgeCounts`, shared across
 * every mounted tab bar — see the note there.
 */
export function useBottomTabBadges() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const chats = useChatStore((s) => s.chats) ?? [];
  const chatUnreadSum = useMemo(
    () => chats.reduce((total, chat) => total + (chat.unreadCount || 0), 0),
    [chats]
  );

  const shared = useSyncExternalStore(subscribeBadgeCounts, getBadgeCounts);

  const refresh = useCallback(() => {
    void refreshBadgeCounts(userId);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    return subscribeNotificationBadgeInvalidate(refresh);
  }, [refresh]);

  const chatBadgeCount =
    Math.max(chatUnreadSum, shared.chatMessage) + shared.general + shared.roomAssignment;
  const ticketsBadgeCount = shared.ticketTag;

  return { chatBadgeCount, ticketsBadgeCount, roomsAssignmentCount: shared.roomAssignment };
}
