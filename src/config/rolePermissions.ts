/**
 * @deprecated — use `@/domain/rbac` instead.
 *
 * Compatibility shim for the legacy tab-gating helpers. Kept so existing
 * consumers (e.g. BottomTabBar) keep working during the migration to
 * permission-driven RBAC. New code should use `usePermissions()` / `<Can/>`.
 */
import {
  getPermissionSet,
  getPermissionsForRole,
  TAB_PERMISSION,
} from '@/domain/rbac';
import type { Permission } from '@/domain/rbac';

export const ALL_TABS = ['Home', 'Rooms', 'Chat', 'Tickets', 'LostAndFound', 'Staff', 'Settings'] as const;
export type TabId = (typeof ALL_TABS)[number];

export function getAllowedTabs(roleName: string | undefined | null): TabId[] {
  return getPermissionsForRole(roleName).reduce<TabId[]>((acc, permission) => {
    const tab = Object.entries(TAB_PERMISSION).find(
      ([, perm]) => perm === permission
    )?.[0] as TabId | undefined;
    if (tab && !acc.includes(tab)) acc.push(tab);
    return acc;
  }, []);
}

export function isTabAllowed(tabId: string, roleName: string | undefined | null): boolean {
  const permission: Permission | undefined = TAB_PERMISSION[tabId];
  if (!permission) return true;
  return getPermissionSet(roleName).has(permission);
}
