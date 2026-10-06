import React from 'react';
import { View, Text } from '@/tw';

export type CountBadgeProps = {
  count: number;
  /**
   * Diameter in px. The design uses two sizes: 24 for the small red badge on a
   * flag pill (node 2702:3247) and 34 for the white bubble on a status circle
   * (node 2702:3308).
   */
  size?: number;
  /**
   * Type size in px. Not derived from `size`: the design sets 15px inside the
   * 24px pill badge (node 2702:3400) and 20px inside the 34px status bubble
   * (node 2702:3462) — 0.63 and 0.59 of the diameter, so no single ratio gives
   * both. Defaults to a ratio for any other size.
   */
  fontSize?: number;
  /** Tailwind background class. Defaults to the red used on flag pills. */
  toneClassName?: string;
  /** Tailwind text-colour class. */
  textClassName?: string;
  className?: string;
};

/**
 * A circular count.
 *
 * Rendered as a real circle rather than the exported ellipse SVG the Figma
 * reference uses — it has to grow with the number of digits ("15" appears on
 * the StayOvers card), which a fixed-size vector cannot do.
 */
export function CountBadge({
  count,
  size = 24,
  fontSize = Math.round(size * 0.6),
  toneClassName = 'bg-status-dirty',
  textClassName = 'text-ink-white',
  className,
}: CountBadgeProps) {
  return (
    <View
      className={`items-center justify-center rounded-full ${toneClassName} ${className ?? ''}`}
      // Diameter is dynamic, so it stays a style rather than a class.
      style={{ minWidth: size, height: size, paddingHorizontal: count > 9 ? 4 : 0 }}
    >
      <Text
        className={`font-hestia-primary font-bold ${textClassName}`}
        style={{ fontSize }}
        numberOfLines={1}
      >
        {count}
      </Text>
    </View>
  );
}
