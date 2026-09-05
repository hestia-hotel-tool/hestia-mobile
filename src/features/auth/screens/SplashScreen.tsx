import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { View, Text, Pressable } from '@/tw';
import { colors } from '@/theme';
import LogoMark from '@assets/brand/logo-mark.svg';
import { usePermissions, resolveLandingRoute } from '@/domain/rbac';
import { useTranslation } from '@/providers/I18nProvider';
import { useAuth } from '../hooks/useAuth';

/**
 * Launch screen. The native splash (see app.config.ts) covers the cold-start
 * gap; this screen shares its background so the handoff is invisible. It exists
 * only to resolve the session and route on — no spinner, no artificial delay.
 */
export default function SplashScreen() {
  const { session, hotelId, error, isLoading, signOut } = useAuth();
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const { t } = useTranslation();
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
    <Animated.View style={[styles.root, { opacity: fade }]}>
      {/*
        The design places the logo at y=376 and the tagline's baseline near
        y=589 on a 956-tall frame — a block centred at 482 against a frame
        centre of 478. So it is centred, and centring reproduces it on every
        screen size, where the old `Math.min(w/440, h/956)` offsets only landed
        correctly on a 440x956 device.
      */}
      <View className="flex-1 items-center justify-center px-2xl">
        {/* Figma node 3265:2159 — mark 53x50, wordmark 13 to its right and 10 down. */}
        <View className="flex-row items-start">
          <LogoMark width={53} height={50} />
          <Text className="ml-[13px] mt-[10px] font-hestia-primary text-hestia-9xl leading-[45px] text-primary">
            Hestia
          </Text>
        </View>

        {/* 108px below the mark in the design (426 -> 534). */}
        <View className="mt-[108px] items-center">
          <Text className="font-hestia-primary text-hestia-6xl font-light leading-[25px] text-primary">
            {t('splash.subtitle')}
          </Text>
          <Text className="font-hestia-primary text-hestia-5xl font-bold leading-[24px] text-ink-pink">
            {t('splash.tagline')}
          </Text>
        </View>

        {(showError || noAccess) && (
          <View className="mt-4xl items-center">
            <Text className="text-center font-hestia-primary text-hestia-md text-primary opacity-95">
              {noAccess ? t('splash.noAccess') : error}
            </Text>
            <Pressable
              className="mt-lg rounded-full bg-primary px-2xl py-md"
              accessibilityRole="button"
              onPress={async () => {
                await signOut();
                router.replace('/(auth)/login');
              }}
            >
              <Text className="font-hestia-primary text-hestia-lg font-semibold text-ink-white">
                {t('common.backToSignIn')}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * Only the root needs a StyleSheet: Animated.View has no CSS wrapper, and the
 * background must be painted before the tree mounts so the handoff from the
 * native splash (same colour, see app.config.ts) stays invisible.
 */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
});
