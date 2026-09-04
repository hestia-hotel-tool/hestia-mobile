import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { usePermissions, resolveLandingRoute } from '@/domain/rbac';
import { NO_JOB_TITLE_MESSAGE } from '@/domain/rbac/NoAccessNotice';
import { useAuth } from '@features/auth';

/**
 * How long the launch screen waits before admitting something is wrong.
 *
 * `getMyHotelId()` and `get_my_permissions()` go through a fetch timeout of
 * 120s for `/rest/v1/`. Offline with a stored session, that is two minutes of
 * a motionless splash with no feedback, so we surface a notice long before it.
 */
const STALL_NOTICE_MS = 8000;

export type LaunchRouting = {
  /** Message to show, or null while the launch is proceeding normally. */
  notice: string | null;
  /** False while the situation may still resolve on its own. */
  canSignOut: boolean;
};

/**
 * Resolves the session and decides where the app opens.
 *
 * The routing itself is unchanged and deliberately kept in one small file: it
 * is RBAC-critical, so "did the refactor change routing?" stays answerable by
 * reading this alone rather than a rewritten screen.
 *
 * Cases:
 *   - no session             -> login
 *   - session + hotelId      -> the first tab this role may open
 *   - session + error        -> stay, explain, offer sign-out
 *   - session, but no rights -> stay, explain
 *
 * The landing route comes from permissions rather than being hardcoded to Home:
 * F&B and Kitchen staff have no Dashboard right, so sending everyone to Home
 * would drop them on a screen they cannot see.
 */
export function useLaunchRouting(): LaunchRouting {
  const { session, hotelId, error, isLoading } = useAuth();
  const { permissions, isLoading: permissionsLoading, error: permissionsError } = usePermissions();
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      router.replace('/(auth)/login');
      return;
    }
    if (!hotelId || permissionsLoading) return;

    const landing = resolveLandingRoute(permissions);
    if (landing) router.replace(landing as never);
  }, [isLoading, session, hotelId, permissionsLoading, permissions]);

  const settled = !isLoading && !!session && !!hotelId && !permissionsLoading;

  useEffect(() => {
    if (settled) return;
    const t = setTimeout(() => setStalled(true), STALL_NOTICE_MS);
    return () => clearTimeout(t);
  }, [settled]);

  const noAccess = settled && resolveLandingRoute(permissions) === null;
  const showError = !isLoading && !!session && !!error && !hotelId;

  if (showError) return { notice: error, canSignOut: true };

  // A failed `get_my_permissions()` leaves the set empty with isLoading false,
  // which looks exactly like "no job title". Prefer the truthful message when
  // the provider actually recorded an error.
  if (noAccess) {
    return { notice: permissionsError ?? NO_JOB_TITLE_MESSAGE, canSignOut: true };
  }

  if (stalled && !settled && !!session) {
    return { notice: 'Still connecting…', canSignOut: true };
  }

  return { notice: null, canSignOut: false };
}
