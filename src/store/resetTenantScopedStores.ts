import { useChatStore } from '@features/chat/store/useChatStore';
import { clearShiftIdCache } from '@features/rooms/services/rooms';
import { useRoomsStore, clearRoomsFetchCache } from '@features/rooms/store/useRoomsStore';
import { useUserStore } from '@features/account/store/useUserStore';
import { clearCachedHotelId } from '@/lib/tenant';
import { clearBottomTabBadgeCounts } from '@/store/bottomTabBadgeCounts';

/**
 * Clear all cached client state that must never bleed across tenants/users.
 * Call this whenever auth session changes (sign out / sign in as different user)
 * or when the resolved `hotelId` changes.
 *
 * Clearing the module-level hotel-id cache is part of the same job: callers used
 * to reset the stores without it, so a user switch that did not go through
 * signOut() left `getMyHotelId()` returning the previous user's hotel. Keeping
 * both here means the two can no longer drift apart.
 *
 * The rooms service's shift-id cache is here for the same reason — shift rows
 * belong to a hotel, so a stale entry would assign rooms to the previous
 * tenant's shift. `clearRoomsFetchCache()` does the same for the rooms list's
 * staleness marker, and also invalidates any fetch already in flight so it
 * cannot write the previous tenant's rooms into the freshly cleared store.
 */
export function resetTenantScopedStores() {
  clearCachedHotelId();
  clearShiftIdCache();
  clearRoomsFetchCache();
  clearBottomTabBadgeCounts();

  useRoomsStore.setState(
    {
      data: null,
      loading: false,
      refreshing: false,
      error: null,
      updatingRoomId: null,
      lastFetchedAt: null,
      lastFetchedShift: null,
    }
  );

  useChatStore.setState(
    {
      chats: [],
      messagesByChatId: {},
      loading: false,
      error: null,
    }
  );

  useUserStore.setState(
    {
      profile: null,
      loading: false,
      error: null,
    }
  );
}

