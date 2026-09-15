import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@features/auth';
import { useChatStore } from '@features/chat';
import {
  clearNotificationBadgeInvalidateListeners,
  subscribeNotificationBadgeInvalidate,
} from '@/lib/inAppNotifications';

if (__DEV__) {
  // Fast Refresh can leave old `fetchNotificationCounts` closures in the listener set
  // (e.g. after removing a hook dependency). Clear on hook module load so tabs re-subscribe cleanly.
  clearNotificationBadgeInvalidateListeners();
}

/*
 * The counts live in one module-level snapshot, not in each hook's state.
 *
 * Every mounted screen renders its own `BottomTabBar`, and each bar called this
 * hook, and each copy of the hook ran its own three count queries and
 * subscribed itself to `invalidateNotificationBadges()`. After visiting four
 * tabs a single rooms fetch — which invalidates on every success — fanned out
 * to twelve extra round-trips and re-rendered four screen subtrees, for three
 * numbers that are the same on every bar.
 *
 * Now the fetch belongs to the module: the first mounted bar starts it, the
 * rest read the same snapshot, and one invalidation costs one fetch no matter
 * how many bars are mounted. `useSyncExternalStore` keeps them all in step.
 *
 * The alternative was hoisting a single tab bar into `(tabs)/_layout.tsx`. That
 * is the better end state, but each screen currently positions the bar inside
 * its own layout tree, so moving it is a layout change; this is not.
 */
type Counts = { chatMessage: number; ticketTag: number; roomAssignment: number };

const ZERO: Counts = { chatMessage: 0, ticketTag: 0, roomAssignment: 0 };

let counts: Counts = ZERO;
const listeners = new Set<() => void>();
/** Dedupes overlapping invalidations — they arrive in bursts. */
let inflight: Promise<void> | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return counts;
}

function setCounts(next: Counts) {
  // Reference equality is what `useSyncExternalStore` compares, so only publish
  // a new object when a number actually changed — otherwise every invalidation
  // would re-render every bar with identical values.
  if (
    counts.chatMessage === next.chatMessage &&
    counts.ticketTag === next.ticketTag &&
    counts.roomAssignment === next.roomAssignment
  ) {
    return;
  }
  counts = next;
  emit();
}

async function fetchCounts(userId: string | undefined) {
  if (!isSupabaseConfigured || !userId) {
    setCounts(ZERO);
    return;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    const [chatRes, ticketRes, roomAssignRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null)
        .eq('type', 'chat_message'),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null)
        .eq('type', 'ticket_tag'),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null)
        .eq('type', 'room_assignment'),
    ]);

    if (chatRes.error) {
      console.warn('[useBottomTabBadges] chat_message count', chatRes.error.message);
    }
    if (ticketRes.error) {
      console.warn('[useBottomTabBadges] ticket_tag count', ticketRes.error.message);
    }
    if (roomAssignRes.error) {
      console.warn('[useBottomTabBadges] room_assignment count', roomAssignRes.error.message);
    }

    setCounts({
      chatMessage: chatRes.count ?? 0,
      ticketTag: ticketRes.count ?? 0,
      roomAssignment: roomAssignRes.count ?? 0,
    });
  })();

  try {
    await inflight;
  } finally {
    inflight = null;
  }
}

/** Clear the shared counts — tenant-scoped, so a user switch must not keep them. */
export function clearBottomTabBadgeCounts() {
  counts = ZERO;
  inflight = null;
  emit();
}

/**
 * Tab bar badges: Chat uses the higher of unread thread counts vs unread in-app
 * `chat_message` notifications (avoids double-counting when both match). Tickets
 * uses unread `ticket_tag` notifications for the logged-in user (RLS).
 * Rooms uses unread `room_assignment` notifications; cleared when user opens Rooms from the badge.
 */
export function useBottomTabBadges() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const chats = useChatStore((s) => s.chats) ?? [];
  const chatUnreadSum = useMemo(
    () => chats.reduce((total, chat) => total + (chat.unreadCount || 0), 0),
    [chats]
  );

  const shared = useSyncExternalStore(subscribe, getSnapshot);

  const refresh = useCallback(() => {
    void fetchCounts(userId);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    return subscribeNotificationBadgeInvalidate(refresh);
  }, [refresh]);

  const chatBadgeCount = Math.max(chatUnreadSum, shared.chatMessage);
  const ticketsBadgeCount = shared.ticketTag;

  return { chatBadgeCount, ticketsBadgeCount, roomsAssignmentCount: shared.roomAssignment };
}
