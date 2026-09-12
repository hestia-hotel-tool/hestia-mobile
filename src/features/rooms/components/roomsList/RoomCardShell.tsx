import React from 'react';
import { View as RNView } from 'react-native';
import { View, Pressable } from '@/tw';
import { colors } from '@/theme';

export type RoomCardShellProps = {
  children: React.ReactNode;
  /** The coloured lid, on Paused and In Progress cards only. */
  cap?: React.ReactNode;
  /**
   * Priority rooms get a red frame — Figma 3883:5766, an outer 422 card with a
   * #f92424 border wrapping the inner 392 panel.
   *
   * The card this replaces declared `styles.priorityBorder` and then never
   * applied it to any element, so priority rooms rendered with no frame at all.
   */
  framed?: boolean;
  onPress?: () => void;
  onLayout?: (e: import('react-native').LayoutChangeEvent) => void;
  /**
   * Measured by the screen with `measureInWindow` to place the status popover
   * and the blur overlay.
   *
   * Held by a plain React Native `View`, not one of the `src/tw` wrappers:
   * those go through `useCssElement(Component as ComponentType<any>)` and ref
   * forwarding through that cast is not something to bet a modal's position on.
   * `collapsable={false}` is required too — Android drops decoration-free views
   * out of the native tree and `measureInWindow` then reports zeros.
   */
  measureRef?: React.Ref<RNView>;
};

/**
 * The frame every room card sits in — Figma 3883:6123.
 *
 * `#f9fafc` on a `rgba(90,117,157,0.23)` hairline at radius 12, content-height.
 *
 * `overflow-hidden` is load-bearing on Android, which does not clip children to
 * `borderRadius`: without it the cap's square top corners punch through the
 * card's rounded ones.
 */
export function RoomCardShell({
  children,
  cap,
  framed,
  onPress,
  onLayout,
  measureRef,
}: RoomCardShellProps) {
  const Container = onPress ? Pressable : View;

  const card = (
    <View className="w-full overflow-hidden rounded-xl border border-border-card bg-surface-card">
      {cap}
      {children}
    </View>
  );

  return (
    <RNView ref={measureRef} collapsable={false} onLayout={onLayout}>
      <Container
        {...(onPress ? { onPress, accessibilityRole: 'button' as const } : {})}
        className={framed ? 'rounded-xl border p-md' : undefined}
        style={framed ? { borderColor: colors.status.dirty } : undefined}
      >
        {card}
      </Container>
    </RNView>
  );
}

export default RoomCardShell;
