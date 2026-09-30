import React, { useState } from 'react';
import { View, Text } from '@/tw';
import { typography } from '@/theme';
import { ROOM_CARD, cardPx, type RoomCardSpec } from './roomCardLayout';
import { BADGE_TILE, RoomBadgeTile, type RoomBadge } from './RoomBadgeTile';

export type RoomCardHeaderProps = {
  spec: RoomCardSpec;
  roomNumber: string;
  /** "ST2K - 1.4" — the room category and its cleaning credit. */
  category: string;
  /** "Arrival/Departure", "Departure", "Stayover"… */
  typeLabel: string;
  /** Tiles between the number/type block and the rule — see `roomBadges`. */
  badges?: RoomBadge[];
  /** The assignee column on the right of the rule. */
  assignee?: React.ReactNode;
};

const INK = '#334866';
const NUMBER_LINE = cardPx(31);

/**
 * The card's identity row — Figma 3883:5570.
 *
 * Room number (Helvetica bold 27/31), category (light 12) and type label
 * (bold 16) on the left; the badge tiles; a 50.5 rule in #e3e3e3; who is
 * working it on the right. Each card kind places these differently, so every
 * offset comes from its `spec`.
 */
export function RoomCardHeader({ spec, roomNumber, category, typeLabel, badges = [], assignee }: RoomCardHeaderProps) {
  /** The header row's full width and the number/type block's width, once measured. */
  const [rowWidth, setRowWidth] = useState<number | null>(null);
  const [textWidth, setTextWidth] = useState<number | null>(null);
  const layout =
    badges.length > 0 && rowWidth != null && textWidth != null
      ? headerLayout(spec, rowWidth, textWidth, badges.length)
      : null;
  const rightColumn = layout?.rightColumn ?? spec.rightColumn;

  return (
    <View
      className="flex-row items-start"
      style={{ paddingTop: spec.ruleTop, paddingLeft: spec.numberLeft }}
      onLayout={badges.length > 0 ? (e) => setRowWidth(e.nativeEvent.layout.width) : undefined}
    >
      <View className="flex-1 flex-row items-center" style={{ height: ROOM_CARD.headerRule }}>
        <View
          className="shrink-0 self-start"
          // The frame's text boxes start at the top of their line, so each
          // Text's top is the node's y.
          style={{ marginTop: spec.numberTop - spec.ruleTop }}
          onLayout={badges.length > 0 ? (e) => setTextWidth(e.nativeEvent.layout.width) : undefined}
        >
          <View className="flex-row items-start" style={{ gap: spec.categoryGap }}>
            <Text style={{ fontFamily: typography.fontFamily.primary, fontSize: cardPx(27), lineHeight: NUMBER_LINE, fontWeight: '700', color: INK }}>
              {roomNumber}
            </Text>
            <Text
              style={{
                fontFamily: typography.fontFamily.primary,
                fontSize: cardPx(12),
                lineHeight: cardPx(13.8),
                fontWeight: '300',
                color: INK,
                marginTop: spec.categoryDrop,
              }}
            >
              {category}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: typography.fontFamily.primary,
              fontSize: cardPx(16),
              lineHeight: cardPx(18.4),
              fontWeight: '700',
              color: INK,
              // `typeDrop` is top to top; the number's line is 31.
              marginTop: spec.typeDrop - NUMBER_LINE,
              marginLeft: -1,
            }}
          >
            {typeLabel}
          </Text>
        </View>
        {/* Drawn once measured, so the first frame never overlaps the text. */}
        {layout ? (
          <View
            className="flex-1 flex-row items-center justify-center"
            style={{ marginLeft: TILE_GAP_TEXT, marginRight: TILE_GAP_RULE, gap: layout.gap }}
          >
            {badges.map((badge) => (
              <RoomBadgeTile key={badge.key} badge={badge} width={layout.tile} height={layout.tile * TILE_RATIO} />
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ width: 1, height: ROOM_CARD.headerRule, backgroundColor: '#e3e3e3' }} />

      <View
        style={{
          width: rightColumn - 1,
          paddingLeft: spec.avatarGap,
          marginTop: spec.avatarTop - spec.ruleTop,
        }}
      >
        {assignee}
      </View>
    </View>
  );
}

export default RoomCardHeader;

/** Room between the text block and the first tile. */
const TILE_GAP_TEXT = cardPx(8);
/** Room between the last tile and the rule, so a tile never touches it. */
const TILE_GAP_RULE = cardPx(6);
const TILE_RATIO = BADGE_TILE.height / BADGE_TILE.width;
/**
 * Narrowest the right column may become to make room for the tiles: still
 * fits the "Assign room" control in full (35 circle + 5 + a 76 pill + 16 pad).
 */
const RIGHT_COLUMN_MIN = cardPx(132);
/** Smallest tile; the glyphs scale down with it. */
const MIN_TILE = cardPx(18);

type HeaderLayout = { rightColumn: number; tile: number; gap: number };

/**
 * Fit the badge tiles on one row, beside the text, without overlapping it.
 *
 * At the design width everything is as drawn: the card's right column and
 * full 42x38 tiles 4 apart. When the tiles do not fit, the right column gives
 * up exactly the width they need, down to RIGHT_COLUMN_MIN, and whatever
 * shortfall remains is taken by shrinking the tiles, which stay in one row.
 */
function headerLayout(spec: RoomCardSpec, rowWidth: number, textWidth: number, count: number): HeaderLayout {
  const fullGap = cardPx(4);
  const ideal = count * BADGE_TILE.width + (count - 1) * fullGap;
  const spaceWith = (right: number) => rowWidth - spec.numberLeft - right - textWidth - TILE_GAP_TEXT - TILE_GAP_RULE;

  const atDesign = spaceWith(spec.rightColumn);
  if (atDesign >= ideal) {
    return { rightColumn: spec.rightColumn, tile: BADGE_TILE.width, gap: fullGap };
  }
  const rightColumn = Math.max(Math.min(RIGHT_COLUMN_MIN, spec.rightColumn), spec.rightColumn - (ideal - atDesign));
  const space = spaceWith(rightColumn);
  const gap = count > 1 ? cardPx(2) : 0;
  const tile = Math.max(MIN_TILE, Math.min(BADGE_TILE.width, (space - gap * (count - 1)) / count));
  return { rightColumn, tile, gap };
}
