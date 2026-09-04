/**
 * Route-level access control.
 *
 * Wrap a navigator or a screen and it resolves the current route against
 * `ROUTE_PERMISSIONS`, sending the user somewhere they can actually be rather
 * than rendering a screen their role does not grant.
 *
 * Deliberately blocks rendering instead of redirecting after paint, so a denied
 * screen never flashes its contents.
 *
 * Fails closed at every branch: unknown route, unresolved permissions, and
 * missing session all deny.
 */
import React from 'react';
import { Redirect, useSegments } from 'expo-router';
import { useAuth } from '@features/auth';
import { LaunchView } from '@/components/launch/LaunchView';
import { NoAccessNotice, NO_JOB_TITLE_MESSAGE } from './NoAccessNotice';
import { usePermissions } from './usePermissions';
import { resolveRoutePermission } from './routePermissions';
import { resolveLandingRoute } from './landing';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const { session, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: permissionsLoading } = usePermissions();

  const required = resolveRoutePermission(segments as readonly string[]);

  // Never gate the auth stack or the splash — the splash is what routes people.
  if (required === undefined) return <>{children}</>;

  if (authLoading || permissionsLoading) return <GuardSplash />;

  if (!session) return <Redirect href="/(auth)/login" />;

  // `null` means the route is not in the manifest. Deny rather than guess.
  const allowed = required !== null && permissions.has(required);
  if (allowed) return <>{children}</>;

  const landing = resolveLandingRoute(permissions);

  // No permitted tab at all — usually an account with no job title assigned.
  // Redirecting would loop, so explain instead.
  if (!landing) return <NoAccess />;

  return <Redirect href={landing as never} />;
}

/**
 * Screen-level variant, for routes registered directly on the root Stack rather
 * than inside a guarded navigator. Keeps route files as one-line declarations:
 *
 *   export default withRouteGuard(RoomDetailScreen);
 */
export function withRouteGuard<P extends object>(Screen: React.ComponentType<P>) {
  function Guarded(props: P) {
    return (
      <RouteGuard>
        <Screen {...props} />
      </RouteGuard>
    );
  }
  Guarded.displayName = `withRouteGuard(${Screen.displayName ?? Screen.name ?? 'Screen'})`;
  return Guarded;
}

/**
 * Shown while permissions resolve. Renders the same visual as the launch
 * screen, so a cold-start deep link (which never mounts the launch route) shows
 * the brand rather than a bare spinner on a different background.
 */
function GuardSplash() {
  return <LaunchView />;
}

function NoAccess() {
  return (
    <LaunchView>
      <NoAccessNotice message={NO_JOB_TITLE_MESSAGE} />
    </LaunchView>
  );
}
