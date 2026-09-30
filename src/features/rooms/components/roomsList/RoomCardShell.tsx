import React from 'react';
import { View as RNView } from 'react-native';
import { View, Pressable } from '@/tw';
import { PRIORITY_FRAME, type RoomCardSpec } from './roomCardLayout';

export type RoomCardShellProps = {
  children: React.ReactNode;
  /** The card's ground, border and radius, and how far it sits in from the list. */
  spec: RoomCardSpec;
  /**
   * Priority rooms sit in a red frame — Figma 3883:5765: a 422 #f9fafc card
   * with a #f92424 hairline at radius 12, holding the card 15 in, 22 down.
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
 * The frame every room card sits in — Figma 3883:5570.
 *
 * Its ground, hairline and radius come from the card's spec: #f9fafc with a
 * blue-grey hairline at 12 for the 422 cards, white or #f9fafc with #e3e3e3
 * at 9 for the 392 ones, which also sit 15 further in from the list's edge.
 * No coloured cap: every state shows by its status pill alone.
 *
 * `overflow-hidden` keeps children inside the rounded corners on Android.
 */
export function RoomCardShell({ children, spec, framed, onPress, onLayout, measureRef }: RoomCardShellProps) {
  const Container = onPress ? Pressable : View;

  const card = (
    <View
      className="w-full overflow-hidden"
      style={{
        backgroundColor: spec.background,
        borderRadius: spec.radius,
        borderWidth: spec.border ? 1 : 0,
        borderColor: spec.border ?? undefined,
      }}
    >
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
                borderWidth: 1,
                borderColor: PRIORITY_FRAME.border,
                borderRadius: PRIORITY_FRAME.radius,
                paddingHorizontal: PRIORITY_FRAME.paddingX,
                paddingTop: PRIORITY_FRAME.paddingTop,
                paddingBottom: PRIORITY_FRAME.paddingBottom,
              }
            : { marginHorizontal: spec.inset }
        }
      >
        {card}
      </Container>
    </RNView>
  );
}

export default RoomCardShell;
