import React, { useEffect, useMemo, useState } from 'react';
import { Animated, View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { typography } from '@/theme';
import LogoMark from '@assets/brand/logo-mark.svg';
import { usePermissions, resolveLandingRoute } from '@/domain/rbac';
import { useAuth } from '../hooks/useAuth';

const DESIGN_WIDTH = 440;
const DESIGN_HEIGHT = 956;

/**
 * Launch screen. The native splash (see app.config.ts) covers the cold-start
 * gap; this screen shares its background so the handoff is invisible. It exists
 * only to resolve the session and route on — no spinner, no artificial delay.
 */
export default function SplashScreen() {
  const { session, hotelId, error, isLoading, signOut } = useAuth();
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const { width, height } = useWindowDimensions();
  const scale = useMemo(
    () => Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT),
    [width, height],
  );
  const styles = useMemo(() => buildSplashStyles(scale), [scale]);

  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [fade]);

  // Route as soon as auth state is settled. Cases:
  //  - no session               -> login
  //  - session + hotelId        -> first tab this role may open
  //  - session + error          -> stay, show the recovery action below
  //  - session, but no rights   -> stay, explain (see noAccess below)
  //
  // The landing route is resolved from permissions rather than hardcoded to
  // Home: F&B and Kitchen staff have no Dashboard right, so sending everyone to
  // Home would drop them on a screen they cannot see.
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
  const noAccess = settled && resolveLandingRoute(permissions) === null;
  const showError = !isLoading && !!session && !!error && !hotelId;

  return (
    <Animated.View style={[styles.container, { opacity: fade }]}>
      <View style={styles.logoTitleGroup}>
        <LogoMark width={53 * scale} height={50 * scale} />
        <Text style={styles.title}>Hestia</Text>
      </View>

      <Text style={styles.subtitle}>Build by Housekeepers</Text>
      <Text style={styles.tagline}>For Housekeeping</Text>

      {(showError || noAccess) && (
        <View style={styles.errorBlock}>
          <Text style={styles.errorText}>
            {noAccess
              ? 'This account has not been given a job title, so it has no permissions. Ask your manager to assign one.'
              : error}
          </Text>
          <Pressable
            style={styles.errorButton}
            onPress={async () => {
              await signOut();
              router.replace('/(auth)/login');
            }}
          >
            <Text style={styles.errorButtonText}>Back to sign in</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

function buildSplashStyles(scale: number) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#EEF0F6',
    },
    logoTitleGroup: {
      position: 'absolute',
      top: 376 * scale,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    title: {
      marginLeft: 13 * scale,
      marginTop: 10 * scale,
      fontSize: 39 * scale,
      fontFamily: typography.fontFamily.primary,
      fontWeight: typography.fontWeights.regular as '400',
      color: '#5A759D',
      lineHeight: 39 * scale * 1.147,
      textAlign: 'center',
    },
    subtitle: {
      position: 'absolute',
      top: 534 * scale,
      left: 0,
      right: 0,
      fontSize: 22 * scale,
      fontFamily: typography.fontFamily.primary,
      fontWeight: typography.fontWeights.light as '300',
      color: '#5A759D',
      lineHeight: 22 * scale,
      textAlign: 'center',
    },
    tagline: {
      position: 'absolute',
      top: 565 * scale,
      left: 0,
      right: 0,
      fontSize: 21 * scale,
      fontFamily: typography.fontFamily.primary,
      fontWeight: typography.fontWeights.bold as '700',
      color: '#FF46A3',
      lineHeight: 24 * scale,
      textAlign: 'center',
    },
    errorBlock: {
      position: 'absolute',
      top: 620 * scale,
      left: 24 * scale,
      right: 24 * scale,
      alignItems: 'center',
    },
    errorText: {
      fontSize: 14 * scale,
      fontFamily: typography.fontFamily.primary,
      color: '#5A759D',
      textAlign: 'center',
      opacity: 0.95,
    },
    errorButton: {
      marginTop: 16 * scale,
      paddingVertical: 10 * scale,
      paddingHorizontal: 24 * scale,
      borderRadius: 999,
      backgroundColor: '#5A759D',
    },
    errorButtonText: {
      fontSize: 15 * scale,
      fontFamily: typography.fontFamily.primary,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
}
