import React from 'react';
import type { Permission } from './permissions';
import { usePermissions } from './usePermissions';

interface CanProps {
  permission: Permission;
  /** Render when the permission is NOT held. Defaults to null. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Conditional renderer driven by the current user's permission set.
 *
 * <Can permission={PERMISSIONS.ROOMS_ASSIGN}>...</Can>
 */
export function Can({ permission, fallback = null, children }: CanProps) {
  const { can } = usePermissions();
  return <>{can(permission) ? children : fallback}</>;
}
