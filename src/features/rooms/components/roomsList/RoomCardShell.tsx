import React from 'react';
import { View as RNView } from 'react-native';
import { View, Pressable } from '@/tw';
import { CARD_BORDER, CARD_BORDER_WIDTH, PRIORITY_CARD, ROOM_CARD } from './roomCardLayout';

export type RoomCardShellProps = {
  children: React.ReactNode;
  /**
   * A priority room still to be started — Figma 4577:72: the same card, tinted
   * #feefef with a 1pt #f92424 border (PRIORITY_CARD).
   */
  priority?: boolean;
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
 * hairline, radius 9, 427 wide on the 440 frame; a priority room #feefef
 * with a #f92424 hairline (4577:73).
 *
 * `overflow-hidden` keeps children inside the rounded corners on Android.
 */
export function RoomCardShell({ children, priority, onPress, onLayout, measureRef, cap }: RoomCardShellProps) {
  const Container = onPress ? Pressable : View;
  return (
    <RNView ref={measureRef} collapsable={false} onLayout={onLayout}>
      <Container {...(onPress ? { onPress, accessibilityRole: 'button' as const } : {})}>
        <View
          className="w-full overflow-hidden"
          style={{
            backgroundColor: priority ? PRIORITY_CARD.background : '#ffffff',
            borderRadius: ROOM_CARD.radius,
            borderWidth: CARD_BORDER_WIDTH,
            borderColor: priority ? PRIORITY_CARD.border : CARD_BORDER,
          }}
        >
          {/* Pulled out over the hairline, so every offset counts from the
              card's outer edge as Figma measures it (the number 12 down, the
              panel 9 in) rather than from inside the border, 1 further. */}
          <View style={{ margin: -CARD_BORDER_WIDTH }}>
            {cap}
            {children}
          </View>
        </View>
      </Container>
    </RNView>
  );
}

export default RoomCardShell;
