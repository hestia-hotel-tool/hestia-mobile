import React from 'react';
import { View } from '@/tw';
import { Icon, type IconName } from '@/components/Icon';
import { cardPx } from './roomCardLayout';

/**
 * The card header's badge tile — Figma 4349:2631 (Rectangle 169): 38 x 34.4,
 * radius 10, #f8f8f8, holding one red glyph. The same size whether a room
 * shows one, two or all three. On a white
 * card the tile shows; on the off-white ones it all but disappears, as drawn.
 */
export const BADGE_TILE = { width: cardPx(38), height: cardPx(34.4), radius: cardPx(10), fill: '#f8f8f8' } as const;
const RED = '#f92424';

export type RoomBadge = {
  key: string;
  icon: IconName;
  label: string;
  /** Glyph height in the full-size tile, as drawn. */
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
    // 4349:2674 — the flag outline, 12 x 17.
    badges.push({
      key: 'flag',
      icon: 'action-flag-outline',
      label: room.flagReason ? `Flagged: ${room.flagReason}` : 'Flagged room',
      glyph: 17,
    });
  }
  const notes = room.notes?.count ?? 0;
  if (notes > 0) {
    // 4349:2667 — the bell, 16.7 x 16.1 in an 18 frame.
    badges.push({
      key: 'notes',
      icon: 'badge-bell',
      label: notes === 1 ? '1 note' : `${notes} notes`,
      glyph: 16.1,
    });
  }
  const lostAndFound = room.lostAndFoundCount ?? 0;
  if (lostAndFound > 0) {
    // 4349:2680 — the box, 19 x 21.
    badges.push({
      key: 'lostAndFound',
      icon: 'badge-lost-found',
      label: lostAndFound === 1 ? '1 lost & found item' : `${lostAndFound} lost & found items`,
      glyph: 21,
    });
  }
  return badges;
}

/** One badge tile. The glyph keeps its share of the tile if the row ever has to shrink. */
export function RoomBadgeTile({ badge, width, height }: { badge: RoomBadge; width: number; height: number }) {
  const scale = height / BADGE_TILE.height;
  return (
    <View
      className="items-center justify-center"
      style={{
        width,
        height,
        borderRadius: BADGE_TILE.radius * scale,
        backgroundColor: BADGE_TILE.fill,
      }}
      accessibilityLabel={badge.label}
    >
      <Icon name={badge.icon} size={cardPx(badge.glyph) * scale} color={RED} />
    </View>
  );
}

export default RoomBadgeTile;
