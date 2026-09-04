import React from 'react';
import { View, Text, Pressable } from '@/tw';

export type CheckboxProps = {
  checked: boolean;
  onToggle: () => void;
  /** Announced by screen readers, e.g. "1st Floor". */
  accessibilityLabel?: string;
  /** Edge length in px. Figma node 2702:3195 uses 25. */
  size?: number;
};

/**
 * Square checkbox — Figma node 2702:3195.
 *
 * A 1px outline when clear, filled with ink when set. Deliberately square: the
 * design gives it no corner radius.
 *
 * The tick is the `✓` character rather than an icon, because the design only
 * shows the unchecked state and there is no tick in the icon registry to export
 * from this node. Swap it for `<Icon name="action-tick">` when a checked state
 * is designed.
 */
export function Checkbox({ checked, onToggle, accessibilityLabel, size = 25 }: CheckboxProps) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
    >
      <View
        className={`items-center justify-center border ${
          checked ? 'border-ink-primary bg-ink-primary' : 'border-border-control'
        }`}
        // Edge length is a prop, so it stays a style.
        style={{ width: size, height: size }}
      >
        {checked && (
          <Text
            className="font-hestia-primary font-bold text-ink-white"
            style={{ fontSize: size * 0.72, lineHeight: size * 0.72 }}
          >
            ✓
          </Text>
        )}
      </View>
    </Pressable>
  );
}
