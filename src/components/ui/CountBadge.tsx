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
        style={{ fontSize: size * 0.5 }}
        numberOfLines={1}
      >
        {count}
      </Text>
    </View>
  );
}
