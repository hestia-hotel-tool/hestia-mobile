import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { View, Pressable } from '@/tw';

export type CheckboxProps = {
  checked: boolean;
  onToggle: () => void;
  /** Announced by screen readers, e.g. "1st Floor". */
  accessibilityLabel?: string;
  /** Edge length in px. Figma node 2702:3195 uses 25. */
  size?: number;
  /**
   * Outline and tick in one colour, e.g. Lost & Found's email choice (Figma
   * 4649:3242: #5a759d). Without it: the ink / control-border tokens.
   */
  color?: string;
  /** Outline weight; the tick thickens with it. Default 1. */
  borderWidth?: number;
};

/** The select-mode tick (Figma 4361:6101): 15x11, a 1pt stroke, in a 29-wide box. */
const TICK = { width: 15, height: 11, boxWidth: 29 } as const;

/**
 * Square checkbox — Figma node 2702:3195.
 *
 * A 1px outline when clear. When set, the outline darkens to ink and a thin
 * tick is drawn inside — no fill. That is the tick of Staff → rooms select
 * mode (`RoomSelectCheckbox`, Figma 4361:6101), which the client asked every
 * checkbox to use (2026-11-16) in place of the solid black box with a white
 * "✓" character. Deliberately square: the design gives it no corner radius.
 */
export function Checkbox({ checked, onToggle, accessibilityLabel, size = 25, color, borderWidth = 1 }: CheckboxProps) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
    >
      <View
        className={`items-center justify-center border ${checked ? 'border-ink-primary' : 'border-border-control'}`}
        // Edge length is a prop, so it stays a style.
        style={[
          { width: size, height: size },
          borderWidth !== 1 && { borderWidth },
          color ? { borderColor: color } : null,
        ]}
      >
        {checked && (
          // Same path and stroke as RoomSelectCheckbox, scaled with the box.
          <Svg
            width={(size * TICK.width) / TICK.boxWidth}
            height={(size * TICK.height) / TICK.boxWidth}
            viewBox="0 0 15 11"
            fill="none"
          >
            <Path d="M0.363709 5.12128L5.12128 9.87885L14.6364 0.363709" stroke={color ?? '#1e1e1e'} strokeWidth={1.03 * borderWidth} />
          </Svg>
        )}
      </View>
    </Pressable>
  );
}
