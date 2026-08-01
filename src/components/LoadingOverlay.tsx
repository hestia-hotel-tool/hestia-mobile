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
    backgroundColor: colors.background.overlay ?? 'rgba(255,255,255,0.85)',
    zIndex: 1000,
  },
});
