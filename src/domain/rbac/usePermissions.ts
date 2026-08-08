import { useMemo } from 'react';
import { useUserStore } from '@features/account';
import { useAuth } from '@features/auth';
import {
  getPermissionSet,
  getRoleCategory,
} from './rolePolicy';
import type { Permission } from './permissions';

/**
 * Resolve the current user's role + permission set.
 *
 * Role comes from the fetched profile (public.users → roles.name), falling
 * back to session metadata so gating works even before the profile loads.
 */
export function usePermissions() {
  const profileRole = useUserStore((s) => s.profile?.role ?? null);
  const { session } = useAuth();
  const metadataRole =
    (session?.user.user_metadata?.['role_name'] as string | undefined) ??
    (session?.user.user_metadata?.['role'] as string | undefined) ??
    null;

  const role = profileRole ?? metadataRole;

  const permissions = useMemo(() => getPermissionSet(role), [role]);
  const category = useMemo(() => getRoleCategory(role), [role]);

  return useMemo(
    () => ({
      role,
      category,
      can: (permission: Permission) => permissions.has(permission),
      canAny: (list: readonly Permission[]) => list.some((perm) => permissions.has(perm)),
      canAll: (list: readonly Permission[]) => list.every((perm) => permissions.has(perm)),
    }),
    [role, category, permissions]
  );
}
