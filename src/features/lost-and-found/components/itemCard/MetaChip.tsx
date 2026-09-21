import React from 'react';
import { Text, View } from '@/tw';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import { LOST_AND_FOUND_CARD_LAYOUT as L } from './lostAndFoundCardLayout';

export type MetaChipProps = {
  label: string;
  /**
   * `tracking` is the pale pill beside the item name (node 3871:3602);
   * `meta` is the smaller one used for the room number (3871:3615) and the
   * "public area" tag (3871:3721).
   */
  size?: 'tracking' | 'meta';
  className?: string;
};

/**
 * A rounded label chip — Figma 3128:32.
 *
 * **One component for three chips.** The frame draws them at 77x22, 36x18 and
 * 66x18, which reads as three sizes until you subtract the text: every one is
 * `10 + textWidth + 10`, with only the height and font differing between the
 * tracking chip and the two small ones. So the widths are outcomes, not
 * settings, and there are two variants rather than three components.
 *
 * Deliberately not `ui/CountBadge`: that is a circular count, this is a
 * content-hugging text pill.
 */
export function MetaChip({ label, size = 'meta', className }: MetaChipProps) {
  const spec = size === 'tracking' ? L.trackingChip : L.chip;

  return (
    <View
      className={`items-center justify-center rounded-sm bg-badge-results ${className ?? ''}`}
      style={{
        height: spec.height * scaleX,
        paddingHorizontal: spec.paddingX * scaleX,
      }}
    >
      <Text
        className="font-hestia-primary text-ink-accent"
        numberOfLines={1}
        style={{
          fontSize: spec.fontSize * scaleX,
          fontFamily: typography.fontFamily.primary,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default MetaChip;
