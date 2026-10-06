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
  /** The assignee column, right of the number/type block. */
  assignee?: React.ReactNode;
  /**
   * What the assignee block says (name and line), so its width is measured
   * again only when that changes — not kept as a second, hidden copy.
   */
  assigneeKey?: string;
};

const INK = '#334866';
const NUMBER_LINE = cardPx(31);

/**
 * The card's identity row — Figma 3883:5570.
 *
 * Room number (Helvetica bold 27/31), category (light 12) and type label
 * (bold 16) on the left; the badge tiles; who is working it on the right. Each card kind places these differently, so every
 * offset comes from its `spec`.
 */
export function RoomCardHeader({
  spec,
  roomNumber,
  category,
  typeLabel,
  badges = [],
  assignee,
  assigneeKey = '',
}: RoomCardHeaderProps) {
  /** The header row's full width and the number/type block's width, once measured. */
  const [rowWidth, setRowWidth] = useState<number | null>(null);
  const [textWidth, setTextWidth] = useState<number | null>(null);
  /** The assignee block's own width, unconstrained — how narrow its column may go. */
  const [assigneeWidth, setAssigneeWidth] = useState<{ key: string; width: number } | null>(null);
  const measuredAssignee = assigneeWidth?.key === assigneeKey ? assigneeWidth.width : null;
  const layout =
    badges.length > 0 && rowWidth != null && textWidth != null && measuredAssignee != null
      ? headerLayout(spec, rowWidth, textWidth, badges.length, measuredAssignee)
      : null;
  const rightColumn = layout?.rightColumn ?? spec.rightColumn;
  const avatarGap = layout?.avatarGap ?? spec.avatarGap;

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
            // Against the assignee, as 4349:2631 draws them, however many there are.
            className="flex-1 flex-row items-center justify-end"
            style={{ marginLeft: TILE_GAP_TEXT, marginRight: TILE_GAP_RULE, gap: layout.gap }}
          >
            {badges.map((badge) => (
              <RoomBadgeTile key={badge.key} badge={badge} width={layout.tile} height={layout.tile * TILE_RATIO} />
            ))}
          </View>
        ) : null}
      </View>

      {/* No vertical rule before the assignee: removed from the design. A
          1-wide spacer keeps the column where the rule placed it. */}
      <View style={{ width: 1, height: ROOM_CARD.headerRule }} />

      <View
        style={{
          width: rightColumn - 1,
          paddingLeft: avatarGap,
          marginTop: spec.avatarTop - spec.ruleTop,
        }}
      >
        {assignee}
      </View>

      {/* An invisible, unconstrained copy of the assignee, measured so its
          column never narrows past the name and status (only with badges,
          which are what ask it to narrow). */}
      {/* Mounted only until measured for what it currently says. */}
      {badges.length > 0 && measuredAssignee == null ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ position: 'absolute', opacity: 0, left: 0, top: 0 }}
          onLayout={(e) => setAssigneeWidth({ key: assigneeKey, width: e.nativeEvent.layout.width })}
        >
          {assignee}
        </View>
      ) : null}
    </View>
  );
}

export default RoomCardHeader;

/** Room between the text block and the first tile. */
const TILE_GAP_TEXT = cardPx(8);
/** The last tile ends 6 before the assignee's photo (4349:2678 → 4349:2704), less the column's own inset. */
const TILE_GAP_RULE = 0;
/** 4349:2665 / 2672 / 2678: 38 x 34.4 tiles, 3.4 to 4.6 apart. */
const TILE_GAP = cardPx(4);
const TILE_RATIO = BADGE_TILE.height / BADGE_TILE.width;
/** The gap before the photo when the column has to narrow (against 9-16 as drawn). */
const TIGHT_AVATAR_GAP = cardPx(8);
/** Clear space after the name, so it never touches the card's edge. */
const TRAILING = cardPx(4);

type HeaderLayout = { rightColumn: number; tile: number; gap: number; avatarGap: number };

/**
 * Place the badge tiles beside the text, without overlapping it and without
 * cutting the attendant's name short.
 *
 * Tiles are the design's 38 x 34.4, 4 apart — one, two or three look the
 * same. When they do not fit at the card's right column, the column gives up
 * the width they need, but never below the assignee's own width (photo, name,
 * status), with the gap before the photo tightened to 8. Only if even that is
 * not enough — a long type label and three badges on a small phone — do the
 * tiles shrink, all together, to fit.
 */
function headerLayout(
  spec: RoomCardSpec,
  rowWidth: number,
  textWidth: number,
  count: number,
  assigneeWidth: number
): HeaderLayout {
  const ideal = count * BADGE_TILE.width + (count - 1) * TILE_GAP;
  const spaceWith = (right: number) => rowWidth - spec.numberLeft - right - textWidth - TILE_GAP_TEXT - TILE_GAP_RULE;

  const atDesign = spaceWith(spec.rightColumn);
  if (atDesign >= ideal) {
    return { rightColumn: spec.rightColumn, tile: BADGE_TILE.width, gap: TILE_GAP, avatarGap: spec.avatarGap };
  }
  const avatarGap = Math.min(spec.avatarGap, TIGHT_AVATAR_GAP);
  // 1 for the spacer where the rule was.
  const floor = Math.min(spec.rightColumn, 1 + avatarGap + assigneeWidth + TRAILING);
  const rightColumn = Math.max(floor, spec.rightColumn - (ideal - atDesign));
  const space = spaceWith(rightColumn);
  const tile = Math.min(BADGE_TILE.width, (space - TILE_GAP * (count - 1)) / count);
  return { rightColumn, tile, gap: TILE_GAP, avatarGap };
}
