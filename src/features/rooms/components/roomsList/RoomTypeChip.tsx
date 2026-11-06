import React from 'react';
import { View, Text } from '@/tw';
import { colors, typography } from '@/theme';
import type { FrontOfficeStatus } from '../../types/allRooms.types';
import { ROOM_CARD } from './roomCardLayout';

/** The chip types: one front-office type each, plus the back office's out-of-order mark. */
export type RoomChipType = Exclude<FrontOfficeStatus, 'Arrival/Departure'> | 'OutOfOrder';

/**
 * Text on a tint of itself — Figma 4553:262: Arrival 4553:801, Departure
 * 4553:803, Turndown 4553:1356, Stayover 4553:1446. "No Task" and "Refresh"
 * are not drawn there and take the brand blue-grey the same way.
 */
const CHIP: Record<RoomChipType, { label: string; text: string; fill: string }> = {
  Arrival: { label: 'Arrival', text: '#41d541', fill: 'rgba(204, 243, 204, 0.52)' },
  Departure: { label: 'Departure', text: '#f92424', fill: 'rgba(249, 36, 36, 0.1)' },
  Turndown: { label: 'Turndown', text: '#833bf6', fill: 'rgba(131, 59, 246, 0.15)' },
  Stayover: { label: 'Stayover', text: '#3bc1f6', fill: 'rgba(59, 193, 246, 0.2)' },
  'No Task': { label: 'No Task', text: '#5a759d', fill: 'rgba(90, 117, 157, 0.12)' },
  Refresh: { label: 'Refresh', text: '#5a759d', fill: 'rgba(90, 117, 157, 0.12)' },
  OutOfOrder: { label: 'Out of order', text: colors.text.white, fill: colors.status.outOfOrder },
};

/** The chips a room's type draws: Arrival/Departure is two, every other type one. */
export function roomTypeChips(type: FrontOfficeStatus): RoomChipType[] {
  return type === 'Arrival/Departure' ? ['Arrival', 'Departure'] : [type];
}

/** One type chip in the card header — 87 x 28 at least, radius 9, bold 12, centred. */
export function RoomTypeChip({ type }: { type: RoomChipType }) {
  const chip = CHIP[type];
  return (
    <View
      className="items-center justify-center"
      style={{
        minWidth: ROOM_CARD.chip.minWidth,
        height: ROOM_CARD.chip.height,
        paddingHorizontal: ROOM_CARD.chip.paddingX,
        borderRadius: ROOM_CARD.chip.radius,
        backgroundColor: chip.fill,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          fontFamily: typography.fontFamily.primary,
          fontSize: ROOM_CARD.chip.fontSize,
          fontWeight: '700',
          color: chip.text,
        }}
      >
        {chip.label}
      </Text>
    </View>
  );
}

export default RoomTypeChip;
