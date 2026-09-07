import { useMemo } from 'react';
import { usePermissionContext } from '@/providers/PermissionProvider';
import type { Permission } from './permissions';

/**
 * The current user's permissions.
 *
 * The set is resolved once per session by `PermissionProvider` from
 * `get_my_permissions()`, so every call here is an O(1) lookup against server
 * truth — there is no client-side role→permission table to drift.
 *
 * Prefer a screen-level capabilities hook over scattering `can()` through JSX:
 * see `useRoomDetailCapabilities`. For structural gating (routes, tabs) use the
 * route manifest and the tab filter rather than checking in the screen body.
 *
 * Fails closed: while `isLoading` is true the set is empty.
 */
export function usePermissions() {
  const { permissions, homeVariant, roomsVariant, isLoading, error, refresh } =
    usePermissionContext();

  return useMemo(
    () => ({
      permissions,
      homeVariant,
      roomsVariant,
      isLoading,
      error,
      refresh,
      can: (permission: Permission) => permissions.has(permission),
      canAny: (list: readonly Permission[]) => list.some((p) => permissions.has(p)),
      canAll: (list: readonly Permission[]) => list.every((p) => permissions.has(p)),
    }),
    [permissions, homeVariant, roomsVariant, isLoading, error, refresh]
  );
}
