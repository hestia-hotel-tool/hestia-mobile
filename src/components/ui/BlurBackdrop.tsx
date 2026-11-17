import React from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '@/theme';

export type BlurBackdropProps = {
  /**
   * Absolute y the blur begins at. Everything above it shows through crisp —
   * screens use it to keep their header legible. Defaults to covering all of it.
   */
  top?: number;
  /**
   * expo-blur intensity. The design specifies a 10.45px backdrop blur, which
   * maps to roughly 80 here; a lighter value suits a panel the user is meant to
   * keep reading past.
   */
  intensity?: number;
  /**
   * Android's stand-in for the blur (it cannot blur behind a modal): how
   * opaque the wash is. 0.88 by default; lower for a lighter backdrop.
   */
  androidScrimOpacity?: number;
  /** Tapping the backdrop — the usual dismiss. Omit to make it inert. */
  onPress?: () => void;
  /** Announced on the dismiss target. */
  accessibilityLabel?: string;
  /**
   * Drawn on top of the blur, unblurred — a BlurView blurs what is *behind* it,
   * not its children. Anything that must stay sharp goes here.
   */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * The blurred wash every modal in the app sits on — Figma node 2582:735, a
 * 10.45px backdrop blur under a 10% #e4e4e4 veil.
 *
 * Three screens had grown their own copy of this, each with the same Android
 * caveat written out again and each drifting on intensity and scrim colour.
 */
export function BlurBackdrop({
  top = 0,
  intensity = 80,
  androidScrimOpacity = 0.88,
  onPress,
  accessibilityLabel = 'Dismiss',
  children,
  style,
}: BlurBackdropProps) {
  const layer: StyleProp<ViewStyle> = [styles.layer, { top }, style];

  const contents = (
    <>
      {onPress && (
        <Pressable
          style={styles.fill}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        />
      )}
      {children}
    </>
  );

  /*
   * iOS blurs the content behind the modal natively. Android cannot: since
   * expo-blur 56 its blur methods need a `blurTarget` ref pointing at a
   * BlurTargetView in the same view hierarchy, and a React Native Modal renders
   * in its own window — so there is nothing behind it to target. Passing a blur
   * method there logs a warning and silently falls back to no blur, which left
   * the backdrop almost invisible behind the 10% veil the design specifies over
   * blurred content.
   *
   * So Android gets an opaque-enough scrim instead of a broken blur.
   */
  // Android's stand-in for the blur, not a design token: with no blur beneath
  // it the design's 10% veil would be invisible. 0.88 keeps content behind
  // muted but still legible as context; `androidScrimOpacity` lightens it.
  if (Platform.OS !== 'ios') {
    return <View style={[layer, { backgroundColor: `rgba(238, 240, 246, ${androidScrimOpacity})` }]}>{contents}</View>;
  }

  return (
    <BlurView intensity={intensity} tint="light" style={layer}>
      <View style={styles.veil} pointerEvents="none" />
      {contents}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  fill: { ...StyleSheet.absoluteFill },
  veil: {
    ...StyleSheet.absoluteFill,
    // Figma node 2582:735 — a 10% wash, which only reads on top of a real blur.
    backgroundColor: colors.background.overlay,
  },
});

export default BlurBackdrop;
