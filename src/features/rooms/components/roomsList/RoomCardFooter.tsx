import React from 'react';
import { View, Text } from '@/tw';
import { typography } from '@/theme';
import { ROOM_CARD } from './roomCardLayout';

export type RoomCardFooterProps = {
  /** "Room Attendant" over the assignee; omit for a left side that names itself (the porter's Guest in). */
  label?: string;
  /** The assignee block, or the porter's guest presence. */
  left: React.ReactNode;
  /** The status pill. */
  pill: React.ReactNode;
};

/**
 * The card's last row — Figma 4553:893 / 4553:901.
 *
 * Left: "Room Attendant" (light 10) over who is working the room. Right: the
 * 207 status pill, 20 below the guest panel, 7 in from the card's edge and 13
 * above its bottom. Both start at the pill's top.
 */
export function RoomCardFooter({ label, left, pill }: RoomCardFooterProps) {
  const { footer } = ROOM_CARD;
  return (
    <View
      className="flex-row items-start"
      style={{
        marginTop: footer.top,
        paddingLeft: footer.left,
        paddingRight: footer.right,
        paddingBottom: footer.bottom,
      }}
    >
      <View className="flex-1" style={{ marginRight: footer.left }}>
        {label ? (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: typography.fontFamily.primary,
              fontSize: footer.labelSize,
              lineHeight: footer.labelLine,
              fontWeight: '300',
              color: '#000000',
              marginBottom: footer.labelToAvatar,
            }}
          >
            {label}
          </Text>
        ) : null}
        {left}
      </View>
      {pill}
    </View>
  );
}

export default RoomCardFooter;
