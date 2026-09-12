import React from 'react';
import { View, Text } from '@/tw';
import { ROOM_CARD } from './roomCardLayout';

export type RoomCardHeaderProps = {
  roomNumber: string;
  /** "ST2K - 1.4" — the room category and its cleaning credit. */
  category: string;
  /** "Arrival/Departure", "Departure", "Stayover"… */
  typeLabel: string;
  /** A pale badge beside the type label, e.g. the rush bell or the gift mark. */
  badge?: React.ReactNode;
  /** The assignee column on the right of the divider. */
  assignee?: React.ReactNode;
};

/**
 * The card's identity row — Figma 3883:6138 to 3883:6161.
 *
 * Room number, category and front-office status on the left; a hairline; who is
 * working it on the right.
 *
 * The left column is `flex-1` and the right a fixed `rightColumn`, which is the
 * whole of what the replaced card expressed as four hand-tuned `left` values
 * (227, 228, 255, 270) plus a parallel set for priority cards.
 */
export function RoomCardHeader({
  roomNumber,
  category,
  typeLabel,
  badge,
  assignee,
}: RoomCardHeaderProps) {
  return (
    <View className="flex-row items-center px-xl pt-lg">
      <View className="flex-1">
        <View className="flex-row items-baseline gap-sm">
          <Text className="font-hestia-primary text-[27px] font-bold leading-[32px] text-ink-secondary">
            {roomNumber}
          </Text>
          <Text className="font-hestia-primary text-hestia-sm font-light text-ink-secondary">
            {category}
          </Text>
        </View>
        <View className="flex-row items-center gap-md">
          <Text className="font-hestia-primary text-hestia-xl font-bold text-ink-secondary">
            {typeLabel}
          </Text>
          {badge}
        </View>
      </View>

      <View className="h-[50px] w-px bg-border-medium" />

      <View className="pl-lg" style={{ width: ROOM_CARD.rightColumn }}>
        {assignee}
      </View>
    </View>
  );
}

export default RoomCardHeader;
