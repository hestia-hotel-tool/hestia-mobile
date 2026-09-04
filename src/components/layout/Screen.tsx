import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { colors } from '@/theme';

export type ScreenProps = ViewProps & {
  /** Background token value. Defaults to the app's neutral ground. */
  background?: string;
  /**
   * Status bar content colour. Set explicitly rather than relying on "auto",
   * which keys off the colour scheme rather than this screen's background.
   */
  statusBar?: StatusBarStyle;
};

/**
 * A full-bleed screen ground.
 *
 * Deliberately dumb: a flex container, a background token, and an explicit
 * status bar style. It exists because every screen repeats those three things,
 * and because `<StatusBar style="auto" />` is currently set once globally —
 * which only looks right today because `userInterfaceStyle` is pinned to light.
 *
 * It does not apply safe-area insets. Whether content clears the notch is a
 * per-screen decision; take insets where you need them with
 * `useSafeAreaInsets()`.
 */
export function Screen({
  background = colors.background.secondary,
  statusBar = 'dark',
  style,
  children,
  ...rest
}: ScreenProps) {
  return (
    <View style={[styles.root, { backgroundColor: background }, style]} {...rest}>
      <StatusBar style={statusBar} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
