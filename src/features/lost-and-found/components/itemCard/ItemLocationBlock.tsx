import React from 'react';
import { Text, View } from '@/tw';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';

export type ItemLocationBlockProps = {
  /** "Stored Location" or "Shipped Location" — from the chrome row. */
  label: string;
  /** Already resolved to a display string by the caller. */
  value: string;
};

/**
 * Where the item is now — Figma nodes 3871:3598 (stored) and 3871:3718
 * (shipped).
 *
 * Label in Helvetica Light 19 over the value in Bold 15, both left-aligned to
 * the right column. Both strings come from the chrome table rather than a
 * ternary on status, so adding a state is a row rather than an edit here.
 */
export function ItemLocationBlock({ label, value }: ItemLocationBlockProps) {
  return (
    <View>
      <Text
        className="font-hestia-primary font-light text-ink-primary"
        style={{ fontSize: 13 * scaleX, fontFamily: typography.fontFamily.primary }}
      >
        {label}
      </Text>
      <Text
        className="font-hestia-primary font-bold text-ink-primary"
        numberOfLines={1}
        style={{
          fontSize: 14 * scaleX,
          fontFamily: typography.fontFamily.primary,
          marginTop: 2 * scaleX,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export default ItemLocationBlock;
