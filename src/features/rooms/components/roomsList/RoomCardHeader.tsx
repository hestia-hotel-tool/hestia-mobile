import React from 'react';
import { View, Text } from '@/tw';
import { typography } from '@/theme';
import type { FrontOfficeStatus } from '../../types/allRooms.types';
import { INK, ROOM_CARD } from './roomCardLayout';
import { RoomBadgeTile, type RoomBadge } from './RoomBadgeTile';
import { RoomTypeChip, roomTypeChips } from './RoomTypeChip';

export type RoomCardHeaderProps = {
  roomNumber: string;
  /** The room's front-office type; Arrival/Departure draws two chips. */
  type: FrontOfficeStatus;
  /** Flag, notes, lost & found — see `roomBadges`. */
  badges?: RoomBadge[];
  /** Out of order today (set in the back office): a grey chip after the type. */
  outOfOrder?: boolean;
};

/**
 * The card's identity row — Figma 4553:262.
 *
 * The room number (Helvetica bold 33), its type chips beside it, and the
 * badge tiles against the right edge. Nothing else: the attendant moved to
 * the card's footer, so the badges never compete with a name for room.
 *
 * The chips wrap to a second line rather than run under the badges in the
 * rare case that two chips, out of order and three badges meet on a narrow
 * phone.
 */
export function RoomCardHeader({ roomNumber, type, badges = [], outOfOrder = false }: RoomCardHeaderProps) {
  const { header, chip, badge } = ROOM_CARD;
  return (
    <View
      className="flex-row items-start"
      style={{
        paddingTop: header.top,
        paddingLeft: header.left,
        paddingRight: header.right,
        minHeight: header.top + header.height,
      }}
    >
      <Text
        style={{
          fontFamily: typography.fontFamily.primary,
          fontSize: header.numberSize,
          lineHeight: header.numberSize,
          fontWeight: '700',
          color: INK,
        }}
      >
        {roomNumber}
      </Text>

      <View
        className="flex-1 flex-row flex-wrap"
        style={{ marginLeft: header.numberToChip, marginTop: chip.top, gap: chip.gap }}
      >
        {roomTypeChips(type).map((t) => (
          <RoomTypeChip key={t} type={t} />
        ))}
        {outOfOrder ? <RoomTypeChip type="OutOfOrder" /> : null}
      </View>

      {badges.length > 0 ? (
        <View className="flex-row" style={{ marginTop: badge.top, marginLeft: chip.gap, gap: badge.gap }}>
          {badges.map((b) => (
            <RoomBadgeTile key={b.key} badge={b} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default RoomCardHeader;
