import { useChatStore } from '@features/chat';
import { useRoomsStore } from '@features/rooms';
import { useUserStore } from '@features/account';
import { clearCachedHotelId } from '@/lib/tenant';

/**
 * Clear all cached client state that must never bleed across tenants/users.
 * Call this whenever auth session changes (sign out / sign in as different user)
 * or when the resolved `hotelId` changes.
 *
 * Clearing the module-level hotel-id cache is part of the same job: callers used
 * to reset the stores without it, so a user switch that did not go through
 * signOut() left `getMyHotelId()` returning the previous user's hotel. Keeping
 * both here means the two can no longer drift apart.
 */
export function resetTenantScopedStores() {
  clearCachedHotelId();

  useRoomsStore.setState(
    {
      data: null,
      loading: false,
      refreshing: false,
      error: null,
      updatingRoomId: null,
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

