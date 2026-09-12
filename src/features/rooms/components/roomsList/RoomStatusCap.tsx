import React from 'react';
import { View, Text } from '@/tw';
import { Icon, type IconName } from '@/components/Icon';
import { ROOM_CARD } from './roomCardLayout';

export type RoomStatusCapProps = {
  label: string;
  /** The band's colour, from STATUS_CONFIGS. */
  color: string;
  iconName: IconName;
  /** Glyph height in px — the four status marks are drawn at different sizes. */
  glyphHeight?: number;
};

/**
 * The coloured lid on a Paused or In Progress card — Figma 3883:6122 (In
 * Progress) and 3883:5974 (Paused).
 *
 * A full-bleed strip in the status colour with a white disc holding the status
 * glyph and the status name beside it. Only these two bands carry it; Priority,
 * Dirty, Cleaned and Inspected cards start at the room number.
 *
 * It belongs to the card, not to the band. An earlier version drew one cap
 * above a whole band, from a comment citing "Figma 3838:1575 — the pinned
 * band's coloured cap" — but that node is Rectangle 171, the cap *inside* a
 * single 422x264 card.
 */
export function RoomStatusCap({ label, color, iconName, glyphHeight = 25.4 }: RoomStatusCapProps) {
  return (
    <View
      className="flex-row items-center gap-lg rounded-t-xl px-3xl"
      style={{ height: ROOM_CARD.cap.height, backgroundColor: color }}
    >
      <View
        className="items-center justify-center rounded-full bg-surface-primary"
        style={{ width: ROOM_CARD.cap.disc, height: ROOM_CARD.cap.disc }}
      >
        <Icon name={iconName} size={glyphHeight} color={color} />
      </View>
      <Text className="font-hestia-primary text-hestia-4xl font-bold text-ink-white">
        {label}
      </Text>
    </View>
  );
}

export default RoomStatusCap;
