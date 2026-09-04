/**
 * Full-screen or inline loading overlay with ActivityIndicator only (no loading text when spinner is active).
 */
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface LoadingOverlayProps {
  /** If true, overlay covers the whole screen (absolute). Otherwise inline. */
  fullScreen?: boolean;
  /** Optional message; when provided it is not shown while spinner is active (spinner-only for cleaner UX). */
  message?: string;
}

export function LoadingOverlay({ fullScreen = false, message }: LoadingOverlayProps) {
  const label = message ?? 'Loading';
  return (
    <View
      style={[styles.container, fullScreen && styles.fullScreen]}
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      importantForAccessibility={fullScreen ? 'yes' : 'auto'}
    >
      <ActivityIndicator size="large" color={colors.primary.main} accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Not colors.background.overlay — that token is rgba(228,228,228,0.1), a
    // near-transparent grey. It was read with a `?? 'rgba(255,255,255,0.85)'`
    // fallback that never applied because the token is defined, so the intended
    // scrim was never drawn and content stayed legible behind the spinner.
    backgroundColor: 'rgba(255,255,255,0.85)',
    zIndex: 1000,
  },
});
