import React from 'react';
import { View } from '@/tw';
import { Icon, type IconName } from '@/components/Icon';

/**
 * The card header's badge tile — Figma 3883:5570 (Rectangle 168, e.g. node
 * 3883:5584): radius 10, #f8f8f8, holding one red glyph.
 *
 * 30 wide rather than the frame's 42. The fill is all but the card's own
 * (#f9fafc), so the tile itself does not show — what shows is the space inside
 * it, and at 42 that left ~25px between the bell and the lost-and-found box.
 * 30 hugs the 22-high glyphs and halves it.
 */
export const BADGE_TILE = { width: 30, height: 38, radius: 10, fill: '#f8f8f8' } as const;
const RED = '#f92424';
/**
 * One glyph height for every badge, so the bell and the lost-and-found box read
 * as a matched pair. The frame drew them 18 and 27 — side by side the bell
 * looked half the size of its neighbour. 22 sits between the two, centred in
 * the 38-high tile with 8 clear above and below.
 */
const BADGE_GLYPH = 22;

export type RoomBadge = {
  key: string;
  icon: IconName;
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
      label: notes === 1 ? '1 note' : `${notes} notes`,
    });
  }
  const lostAndFound = room.lostAndFoundCount ?? 0;
  if (lostAndFound > 0) {
    // Figma node 3883:5631 — an item found in this room is still being held.
    badges.push({
      key: 'lostAndFound',
      icon: 'badge-lost-found',
      label: lostAndFound === 1 ? '1 lost & found item' : `${lostAndFound} lost & found items`,
    });
  }
  return badges;
}

/**
 * One badge tile. Every tile in a row is the same size and every glyph the same
 * height (`BADGE_GLYPH`), centred both ways; each icon's viewBox is trimmed to
 * its ink so centring the box centres the drawing.
 */
export function RoomBadgeTile({ badge, width, height }: { badge: RoomBadge; width: number; height: number }) {
  const scale = height / BADGE_TILE.height;
  // Never larger than the tile allows (at least 4px clear top and bottom).
  const glyph = Math.min(BADGE_GLYPH, height - 8);
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
