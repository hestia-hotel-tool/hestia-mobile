import React from 'react';
import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View, Text, Pressable } from '@/tw';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';
import { STAFF_ROOMS_LAYOUT as L, STAFF_ROOMS_CHROME as C } from './staffRoomsLayout';

interface ReassignFooterProps {
  count: number;
  busy: boolean;
  onAssign: () => void;
  onCancel: () => void;
}

/**
 * "Assign N Rooms" over "Cancel" — nodes 3831:1078 and 3831:1081.
 *
 * ## Pinned, where the frame has it in flow
 *
 * 3831:99 puts this at y=2748, after the last card on a 2897-tall canvas. A
 * flat canvas has no way to say "pinned", and drawing a bar at the bottom of
 * the tallest artboard is how a pinned bar gets drawn — but the difference
 * matters here: in flow, a supervisor with eight rooms has to scroll to the end
 * to act on a selection made at the top, and the count they are confirming
 * scrolls out of sight with it. Pinned, it is visible the whole time.
 *
 * Stated because it is a departure: move it into the list's content if the
 * frame meant it literally.
 *
 * Disabled at zero selected, rather than hidden — the bar appearing and
 * disappearing as the count crosses one would shift the list under the finger.
 */
export default function ReassignFooter({
  count,
  busy,
  onAssign,
  onCancel,
}: ReassignFooterProps) {
  const insets = useSafeAreaInsets();
  const s = (n: number) => n * scaleX;
  const F = L.reassign.footer;
  const disabled = count === 0 || busy;

  return (
    <View
      className="items-center bg-surface-primary"
      style={{
        paddingTop: s(F.paddingTop),
        paddingBottom: insets.bottom + s(F.paddingBottom),
      }}
    >
      <Pressable
        onPress={onAssign}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={
          count === 1 ? 'Assign 1 room' : `Assign ${count} rooms`
        }
        className="items-center justify-center"
        style={{
          width: s(F.buttonWidth),
          height: s(F.buttonHeight),
          backgroundColor: C.assignBar,
          // Node 3831:1078 is a square-cornered rectangle, unlike every other
          // button in the app. Drawn as it is drawn.
          borderRadius: 0,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        {busy ? (
          <ActivityIndicator color={C.assignLabel} />
        ) : (
          <Text
            className="font-hestia-primary"
            style={{
              fontSize: s(F.buttonFontSize),
              fontFamily: typography.fontFamily.primary,
              color: C.assignLabel,
            }}
          >
            {`Assign ${count} ${count === 1 ? 'Room' : 'Rooms'}`}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={onCancel}
        disabled={busy}
        hitSlop={{ top: 10, bottom: 10, left: 24, right: 24 }}
        accessibilityRole="button"
        accessibilityLabel="Cancel reassigning"
        style={{ marginTop: s(F.cancelMarginTop) }}
      >
        <Text
          className="font-hestia-primary"
          style={{
            fontSize: s(F.cancelFontSize),
            fontFamily: typography.fontFamily.primary,
            color: C.cancelLabel,
          }}
        >
          Cancel
        </Text>
      </Pressable>
    </View>
  );
}
