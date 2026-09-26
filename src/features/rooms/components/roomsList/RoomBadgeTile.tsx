import React from 'react';
import { View } from '@/tw';
import { Icon, type IconName } from '@/components/Icon';

/**
 * The card header's badge tile — Figma 3883:5570 (Rectangle 168, e.g. node
 * 3883:5584): 42x38, radius 10, #f8f8f8, holding one red glyph.
 */
export const BADGE_TILE = { width: 42, height: 38, radius: 10, fill: '#f8f8f8' } as const;
const RED = '#f92424';

export type RoomBadge = {
  key: string;
  icon: IconName;
  /** Glyph height at full tile size — the frame draws the bell 18, lost-and-found 27. */
  glyphHeight: number;
  label: string;
};

/** The two header badges, per room — see RoomCardHeader for how they are laid out. */
export function roomBadges(room: { notes?: { count: number } | null; lostAndFoundCount?: number }): RoomBadge[] {
  const badges: RoomBadge[] = [];
  const notes = room.notes?.count ?? 0;
  if (notes > 0) {
    // Figma node 3883:5698 — the bell marks a room with notes.
    badges.push({
      key: 'notes',
      icon: 'badge-bell',
      glyphHeight: 18,
      label: notes === 1 ? '1 note' : `${notes} notes`,
    });
  }
  const lostAndFound = room.lostAndFoundCount ?? 0;
  if (lostAndFound > 0) {
    // Figma node 3883:5631 — an item found in this room is still being held.
    badges.push({
      key: 'lostAndFound',
      icon: 'badge-lost-found',
      glyphHeight: 27,
      label: lostAndFound === 1 ? '1 lost & found item' : `${lostAndFound} lost & found items`,
    });
  }
  return badges;
}

/**
 * One badge tile. Every tile in a row is the same size, and the glyph keeps its
 * Figma size (bell 18, lost-and-found 27) whatever the tile's — a shrunken tile
 * used to shrink the glyph with it, so the bell came out visibly smaller.
 */
export function RoomBadgeTile({ badge, width, height }: { badge: RoomBadge; width: number; height: number }) {
  const scale = height / BADGE_TILE.height;
  // Never larger than the tile allows (2px clear top and bottom).
  const glyph = Math.min(badge.glyphHeight, height - 4);
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
      <Icon name={badge.icon} size={glyph} color={RED} />
    </View>
  );
}

export default RoomBadgeTile;
