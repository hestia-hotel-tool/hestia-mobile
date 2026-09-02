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
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect, useSegments, useRouter } from 'expo-router';
import { useAuth } from '@features/auth';
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

/** Shares the launch screen's background so the handoff stays invisible. */
function GuardSplash() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color="#5A759D" />
    </View>
  );
}

function NoAccess() {
  const router = useRouter();
  const { signOut } = useAuth();

  return (
    <View style={[styles.container, styles.padded]}>
      <Text style={styles.title}>No access yet</Text>
      <Text style={styles.body}>
        This account has not been given a job title, so it has no permissions.
        Ask your manager to assign one.
      </Text>
      <Pressable
        style={styles.button}
        onPress={async () => {
          await signOut();
          router.replace('/(auth)/login');
        }}
      >
        <Text style={styles.buttonText}>Back to sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF0F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  padded: { paddingHorizontal: 32 },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#5A759D',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#5A759D',
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.95,
  },
  button: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: '#5A759D',
  },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
