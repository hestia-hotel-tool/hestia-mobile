import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { TASK_NOTIFICATION_TYPES } from '@/lib/inAppNotifications';

/**
 * The tab bar's three unread counts, shared by every mounted bar.
 *
 * Every screen renders its own `BottomTabBar`, and each bar used to hold its
 * own copy of these numbers and run its own three count queries. After visiting
 * four tabs a single rooms fetch — which invalidates badges on every success —
 * fanned out to twelve extra round-trips and re-rendered four screen subtrees,
 * for three numbers that are identical on every bar.
 *
 * Plain module state rather than Zustand, because `useSyncExternalStore` in
 * `useBottomTabBadges` is all the subscription this needs.
 *
 * Separate from that hook, rather than living in the same file, so the import
 * graph stays acyclic: `resetTenantScopedStores` has to clear these counts, and
 * the hook reaches for `useAuth` -> `useAuthStore` -> `resetTenantScopedStores`.
 * With the store and the hook in one module that closed a require cycle; split,
 * this module is a leaf that both sides can depend on.
 */
export type BadgeCounts = {
  chatMessage: number;
  /** Unread General Announcements — shown on the Chat tab alongside messages. */
  general: number;
  /** Unread Tasks (every TASK_NOTIFICATION_TYPES row) — on the Chat tab. */
  tasks: number;
  ticketTag: number;
  roomAssignment: number;
};

const ZERO: BadgeCounts = { chatMessage: 0, general: 0, tasks: 0, ticketTag: 0, roomAssignment: 0 };

let counts: BadgeCounts = ZERO;
const listeners = new Set<() => void>();
/** Dedupes overlapping invalidations — they arrive in bursts. */
let inflight: Promise<void> | null = null;

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeBadgeCounts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getBadgeCounts(): BadgeCounts {
  return counts;
}

function setCounts(next: BadgeCounts) {
  // Reference equality is what `useSyncExternalStore` compares, so only publish
  // a new object when a number actually changed — otherwise every invalidation
  // would re-render every bar with identical values.
  if (
    counts.chatMessage === next.chatMessage &&
    counts.general === next.general &&
    counts.tasks === next.tasks &&
    counts.ticketTag === next.ticketTag &&
    counts.roomAssignment === next.roomAssignment
  ) {
    return;
  }
  counts = next;
  emit();
}

/**
 * Refresh the counts. The first caller starts the request; concurrent callers
 * join it, so one invalidation costs one fetch no matter how many bars are
 * mounted.
 */
export async function refreshBadgeCounts(userId: string | undefined) {
  if (!isSupabaseConfigured || !userId) {
    setCounts(ZERO);
    return;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    const [chatRes, generalRes, tasksRes, ticketRes, roomAssignRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null)
        .eq('type', 'chat_message'),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null)
        .eq('type', 'general'),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null)
        .in('type', [...TASK_NOTIFICATION_TYPES]),
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
      console.warn('[badgeCounts] chat_message count', chatRes.error.message);
    }
    if (generalRes.error) {
      console.warn('[badgeCounts] general count', generalRes.error.message);
    }
    if (tasksRes.error) {
      console.warn('[badgeCounts] tasks count', tasksRes.error.message);
    }
    if (ticketRes.error) {
      console.warn('[badgeCounts] ticket_tag count', ticketRes.error.message);
    }
    if (roomAssignRes.error) {
      console.warn('[badgeCounts] room_assignment count', roomAssignRes.error.message);
    }

    setCounts({
      chatMessage: chatRes.count ?? 0,
      general: generalRes.count ?? 0,
      tasks: tasksRes.count ?? 0,
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
