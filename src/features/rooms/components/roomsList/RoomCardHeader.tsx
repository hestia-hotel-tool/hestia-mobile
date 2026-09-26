import React, { useState } from 'react';
import { View, Text } from '@/tw';
import { Icon } from '@/components/Icon';
import { ROOM_CARD } from './roomCardLayout';
import { BADGE_TILE, RoomBadgeTile, type RoomBadge } from './RoomBadgeTile';

export type RoomCardHeaderProps = {
  roomNumber: string;
  /** "ST2K - 1.4" — the room category and its cleaning credit. */
  category: string;
  /** "Arrival/Departure", "Departure", "Stayover"… */
  typeLabel: string;
  /** Draws the red flag straight after the category, on the number's line. */
  flagged?: boolean;
  /** Read out with the flag, e.g. the flag reason. */
  flagLabel?: string;
  /**
   * Tiles to the right of the number/type block — Figma 3883:5570: the bell
   * (the room has notes) and the lost-and-found mark (an item is still held).
   * See `roomBadges`.
   */
  badges?: RoomBadge[];
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
  flagged = false,
  flagLabel,
  badges = [],
  assignee,
}: RoomCardHeaderProps) {
  /** The header row's full width and the number/type block's width, once measured. */
  const [rowWidth, setRowWidth] = useState<number | null>(null);
  const [textWidth, setTextWidth] = useState<number | null>(null);
  const layout =
    badges.length > 0 && rowWidth != null && textWidth != null
      ? headerLayout(rowWidth, textWidth, badges.length)
      : null;
  const rightColumn = layout?.rightColumn ?? ROOM_CARD.rightColumn;

  return (
    <View
      className="flex-row items-center px-xl pt-lg"
      onLayout={badges.length > 0 ? (e) => setRowWidth(e.nativeEvent.layout.width) : undefined}
    >
      {/*
        Figma 3883:5570 (e.g. nodes 3883:5579–5584): the category is aligned to
        the top of the room number, not its baseline — "ST2K - 1.4" starts 8–9px
        below the number's top (y3639 vs y3630, number line 31) — and the type
        label sits 30px below the number's top. The badge tiles sit in one row
        between the text and the divider; see `headerLayout` for how they fit.
      */}
      <View className="flex-1 flex-row items-center">
        <View
          className="shrink-0"
          onLayout={badges.length > 0 ? (e) => setTextWidth(e.nativeEvent.layout.width) : undefined}
        >
          <View className="flex-row items-start gap-sm">
            <Text
              className="font-hestia-primary text-[27px] font-bold text-ink-secondary"
              style={{ lineHeight: 31 }}
            >
              {roomNumber}
            </Text>
            <Text
              className="font-hestia-primary text-hestia-sm font-light text-ink-secondary"
              style={{ marginTop: 8, lineHeight: 14 }}
            >
              {category}
            </Text>
            {/* The flag sits inline after the category, not in a badge tile —
                the tiles are for the notes bell and lost-and-found marks. */}
            {flagged ? (
              <View
                style={{ marginTop: 5 }}
                accessibilityLabel={flagLabel ? `Flagged: ${flagLabel}` : 'Flagged room'}
              >
                <Icon name="action-flag-outline" size={18} color="#f92424" />
              </View>
            ) : null}
          </View>
          <Text
            className="font-hestia-primary text-hestia-xl font-bold text-ink-secondary"
            style={{ marginTop: -1, lineHeight: 18 }}
          >
            {typeLabel}
          </Text>
        </View>
        {/* Drawn once measured, so the first frame never overlaps the text. */}
        {layout ? (
          <View
            className="flex-1 flex-row items-center justify-center"
            style={{ marginLeft: TILE_GAP_TEXT, marginRight: TILE_GAP_DIVIDER, gap: layout.gap }}
          >
            {badges.map((badge) => (
              <RoomBadgeTile key={badge.key} badge={badge} width={layout.tile} height={layout.tile * TILE_RATIO} />
            ))}
          </View>
        ) : null}
      </View>

      <View className="h-[50px] w-px bg-border-medium" />

      <View className="pl-lg" style={{ width: rightColumn }}>
        {assignee}
      </View>
    </View>
  );
}

export default RoomCardHeader;

/** Room between the text block and the first tile. */
const TILE_GAP_TEXT = 8;
/** Room between the last tile and the divider, so a tile never touches it. */
const TILE_GAP_DIVIDER = 6;
const TILE_RATIO = BADGE_TILE.height / BADGE_TILE.width;
/** Horizontal padding of the header row (px-xl, both sides), the divider, the right column's pl-lg. */
const ROW_PADDING = 20 * 2;
const DIVIDER = 1;
/**
 * Narrowest the right column may become to make room for the tiles: still
 * fits the "Assign room" control in full (35 circle + 5 + a 76 pill + 16 pad).
 */
const RIGHT_COLUMN_MIN = 132;

/** Smallest tile — still holds the 27-tall lost-and-found glyph at full size. */
const MIN_TILE = 34;

type HeaderLayout = { rightColumn: number; tile: number; gap: number };

/**
 * Fit the badge tiles on one row, beside the text, without overlapping it.
 *
 * At the design width (a 440pt frame) everything is as drawn: a 168 right
 * column and full 42x38 tiles. When the tiles do not fit, the right column
 * gives up exactly the width they need, down to RIGHT_COLUMN_MIN — the
 * narrowest that still shows "Assign room" in full — and whatever shortfall
 * remains is taken by shrinking the tiles, which always stay in one row.
 */
function headerLayout(rowWidth: number, textWidth: number, count: number): HeaderLayout {
  const fullGap = 8;
  const ideal = count * BADGE_TILE.width + (count - 1) * fullGap;
  const spaceWith = (right: number) =>
    rowWidth - ROW_PADDING - DIVIDER - right - textWidth - TILE_GAP_TEXT - TILE_GAP_DIVIDER;

  const atDesign = spaceWith(ROOM_CARD.rightColumn);
  if (atDesign >= ideal) {
    return { rightColumn: ROOM_CARD.rightColumn, tile: BADGE_TILE.width, gap: fullGap };
  }
  const rightColumn = Math.max(RIGHT_COLUMN_MIN, ROOM_CARD.rightColumn - (ideal - atDesign));
  const space = spaceWith(rightColumn);
  const gap = count > 1 ? 4 : 0;
  // Not below 34 wide (31 tall): the lost-and-found glyph is 24.8x27 at its
  // Figma size and needs that tile to sit in.
  const tile = Math.max(MIN_TILE, Math.min(BADGE_TILE.width, (space - gap * (count - 1)) / count));
  return { rightColumn, tile, gap };
}
