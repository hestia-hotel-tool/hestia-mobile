import React from 'react';
import { View as RNView } from 'react-native';
import { View, Pressable } from '@/tw';
import { CARD_BORDER, PRIORITY_FRAME, ROOM_CARD } from './roomCardLayout';

export type RoomCardShellProps = {
  children: React.ReactNode;
  /**
   * Priority rooms sit in a red frame — Figma 4488:72: tinted #f92424 at 8%
   * with a #f92424 hairline at radius 12, holding the card 15 in, 22 down.
   * The card inside is then clear, so the tint is its ground.
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
  /** Front Office's coloured status band, drawn inside the card above everything else (StatusCap). */
  cap?: React.ReactNode;
};

/**
 * The frame every room card sits in — Figma 4553:854: white, a #e3e3e3
 * hairline, radius 9, the same for every state.
 *
 * `overflow-hidden` keeps children inside the rounded corners on Android.
 */
export function RoomCardShell({ children, framed, onPress, onLayout, measureRef, cap }: RoomCardShellProps) {
  const Container = onPress ? Pressable : View;

  const card = (
    <View
      className="w-full overflow-hidden"
      style={
        framed
          ? { borderRadius: ROOM_CARD.radius }
          : { backgroundColor: '#ffffff', borderRadius: ROOM_CARD.radius, borderWidth: 1, borderColor: CARD_BORDER }
      }
    >
      {cap}
      {children}
    </View>
  );

  return (
    <RNView ref={measureRef} collapsable={false} onLayout={onLayout}>
      <Container
        {...(onPress ? { onPress, accessibilityRole: 'button' as const } : {})}
        style={
          framed
            ? {
                backgroundColor: PRIORITY_FRAME.background,
                borderWidth: PRIORITY_FRAME.borderWidth,
                borderColor: PRIORITY_FRAME.border,
                borderRadius: PRIORITY_FRAME.radius,
                paddingHorizontal: PRIORITY_FRAME.paddingX,
                paddingTop: PRIORITY_FRAME.paddingTop,
                paddingBottom: PRIORITY_FRAME.paddingBottom,
              }
            : undefined
        }
      >
        {card}
      </Container>
    </RNView>
  );
}

export default RoomCardShell;
