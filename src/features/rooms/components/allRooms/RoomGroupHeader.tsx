import React from 'react';
import { View, Text } from '@/tw';

export type RoomGroupHeaderProps = {
  label: string;
  /** The band's colour, from `GROUP_COLOR` in `utils/roomGroups`. */
  color: string;
};

/**
 * A band heading — Paused, In Progress, Priority, Dirty, Cleaned, Inspected.
 * Figma 3883:5953 (Paused) and 3883:5968 (Inspected).
 *
 * A hairline, the label, a hairline. The rules flank the label at its own
 * vertical centre rather than running underneath it, and they take the band's
 * colour rather than a neutral grey — checked against the exported vectors,
 * where the Paused rule strokes #B0C0C6 and the Inspected rule #41D541.
 *
 * `flex-1` on the rules reproduces the design's asymmetric spans (139/138px
 * under "Paused", 119/119 under "Cleaned") for free: the label takes its
 * natural width at any label length and any device width, so the two balance.
 */
export function RoomGroupHeader({ label, color }: RoomGroupHeaderProps) {
  return (
    <View className="flex-row items-center gap-2xl px-3xl pb-2xl pt-3xl">
      <View className="h-px flex-1" style={{ backgroundColor: color }} />
      <Text className="font-hestia-secondary text-hestia-3xl font-bold" style={{ color }}>
        {label}
      </Text>
      <View className="h-px flex-1" style={{ backgroundColor: color }} />
    </View>
  );
}

export default RoomGroupHeader;
