import React from 'react';
import { View } from '@/tw';
import { Icon, type IconName } from '@/components/Icon';
import { ROOM_CARD, cardPx } from './roomCardLayout';

/**
 * The card header's badge tile — Figma 4553:856: 32.6 x 29.5, radius 10,
 * #f8f8f8, holding one red glyph. The same size whether a room shows one, two
 * or all three.
 */
const TILE_FILL = '#f8f8f8';
const RED = '#f92424';

export type RoomBadge = {
  key: string;
  icon: IconName;
  label: string;
  /** Glyph height in the tile, as drawn. */
  glyph: number;
};

/**
 * The header badges, per room, in the design's order (4349:2631): the flag,
 * the bell (the room has notes), the lost-and-found box (an item is held).
 */
export function roomBadges(room: {
  flagged?: boolean;
  flagReason?: string | null;
  notes?: { count: number } | null;
  lostAndFoundCount?: number;
}): RoomBadge[] {
  const badges: RoomBadge[] = [];
  if (room.flagged) {
    // 4553:867 — the flag, 1pt stroke, 15.8 tall as drawn.
    badges.push({
      key: 'flag',
      icon: 'action-flag-outline-thin',
      label: room.flagReason ? `Flagged: ${room.flagReason}` : 'Flagged room',
      glyph: 15.8,
    });
  }
  const notes = room.notes?.count ?? 0;
  if (notes > 0) {
    // 4553:859 — the bell, 1pt stroke, 14.8 tall as drawn.
    badges.push({
      key: 'notes',
      icon: 'badge-bell',
      label: notes === 1 ? '1 note' : `${notes} notes`,
      glyph: 14.8,
    });
  }
  const lostAndFound = room.lostAndFoundCount ?? 0;
  if (lostAndFound > 0) {
    // 4553:873 — the box, 16.3 x 17.9, Figma's own glyph.
    badges.push({
      key: 'lostAndFound',
      icon: 'badge-lost-found',
      label: lostAndFound === 1 ? '1 lost & found item' : `${lostAndFound} lost & found items`,
      glyph: 17.9,
    });
  }
  return badges;
}

/** One badge tile. */
export function RoomBadgeTile({ badge }: { badge: RoomBadge }) {
  return (
    <View
      className="items-center justify-center"
      style={{
        width: ROOM_CARD.badge.width,
        height: ROOM_CARD.badge.height,
        borderRadius: ROOM_CARD.badge.radius,
        backgroundColor: TILE_FILL,
      }}
      accessibilityLabel={badge.label}
    >
      <Icon name={badge.icon} size={cardPx(badge.glyph)} color={RED} />
    </View>
  );
}

export default RoomBadgeTile;
