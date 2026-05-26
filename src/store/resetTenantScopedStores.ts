import { useChatStore } from './useChatStore';
import { useRoomsStore } from './useRoomsStore';
import { useUserStore } from '@features/account';

/**
 * Clear all cached client state that must never bleed across tenants/users.
 * Call this whenever auth session changes (sign out / sign in as different user)
 * or when the resolved `hotelId` changes.
 */
export function resetTenantScopedStores() {
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

