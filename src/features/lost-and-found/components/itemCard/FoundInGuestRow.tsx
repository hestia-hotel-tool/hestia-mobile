import React from 'react';
import { Text, View } from '@/tw';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import { LOST_AND_FOUND_CARD_LAYOUT as L } from './lostAndFoundCardLayout';

export type FoundInGuestRowProps = {
  guestName?: string;
  guestDates?: string;
  /** No longer drawn — the room number tile took its place. Kept so callers need not change. */
  guestImage?: { uri: string } | number;
  /** No longer drawn (the red arrow badge was removed). Kept so callers need not change. */
  guestVipCode?: string | null;
  /** Rendered as the small chip beside the name. */
  roomNumber?: string | null;
};

/**
 * The room number in a tile — where a room item's card used to show the
 * guest's photo. The same 41x38 tile as a public area's, so the two kinds of
 * card line up. No red arrow badge on it (client change, 2026-10-23).
 */
export function RoomNumberTile({ roomNumber }: { roomNumber?: string | null }) {
  const label = roomNumber || '—';
  return (
    <View style={{ width: L.roomTile.width * scaleX, height: L.roomTile.height * scaleX }}>
      <View
        className="items-center justify-center"
        style={{
          width: L.roomTile.width * scaleX,
          height: L.roomTile.height * scaleX,
          borderRadius: L.roomTile.radius * scaleX,
          backgroundColor: L.roomTile.background,
        }}
        accessibilityLabel={`Room ${label}`}
      >
        <Text
          className="font-hestia-primary font-bold"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            fontSize: L.roomTile.fontSize * scaleX,
            fontFamily: typography.fontFamily.primary,
            color: L.roomTile.text,
            paddingHorizontal: 3 * scaleX,
          }}
        >
          {label}
        </Text>
      </View>

    </View>
  );
}

/**
 * The guest a room item was found against — Figma node 3871:3604, as changed
 * by the client (2026-10-23): the room number in a tile where the guest's
 * photo was, then the guest's name and stay dates. The room chip that sat
 * beside the name is gone — the tile says it.
 */
export function FoundInGuestRow({ guestName, guestDates, roomNumber }: FoundInGuestRowProps) {
  return (
    <View className="flex-row items-center" style={{ gap: 12 * scaleX }}>
      <RoomNumberTile roomNumber={roomNumber} />

      <View className="shrink">
        {guestName ? (
          <Text
            className="shrink font-hestia-primary font-bold text-black"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ fontSize: 14 * scaleX, fontFamily: typography.fontFamily.primary }}
          >
            {guestName}
          </Text>
        ) : null}
        {guestDates ? (
          <Text
            className="font-hestia-primary font-light text-black"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              fontSize: 14 * scaleX,
              fontFamily: typography.fontFamily.primary,
              marginTop: 4 * scaleX,
            }}
          >
            {guestDates}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default FoundInGuestRow;
