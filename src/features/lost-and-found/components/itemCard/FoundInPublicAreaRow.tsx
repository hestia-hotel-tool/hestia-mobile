import React from 'react';
import { Text, View } from '@/tw';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import { LOST_AND_FOUND_CARD_LAYOUT as L } from './lostAndFoundCardLayout';
import { MetaChip } from './MetaChip';

export type FoundInPublicAreaRowProps = {
  areaName: string;
  /** "11:00, 12/2/2026" — already formatted by the caller. */
  timestamp?: string;
  /**
   * The chip beside the name. Defaults to the frame's "public area" tag
   * (3871:3721); a room with no reservation passes its room number instead, and
   * `null` draws none.
   */
  chipLabel?: string | null;
  /**
   * Whether to draw the area tile.
   *
   * A room that has no guest to show reuses this row for its title/chip/
   * timestamp layout but must not show the cocktail glyph, which would claim it
   * is a public area.
   */
  showTile?: boolean;
};

/**
 * The public area an item was found in — Figma node 3871:3703.
 *
 * A 41x38 tile (3871:3705) holding a 24x24 glyph (3871:3706), then the area
 * name with a "public area" chip beside it and the timestamp below.
 *
 * **One glyph for every area.** Brasserie, Gym, Toilet and Reception all get
 * the same mark, which is what both popover frames do — 3128:310 and 3107:70
 * give every location row an identical compass. A per-area family would need
 * art the design does not provide.
 */
export function FoundInPublicAreaRow({
  areaName,
  timestamp,
  chipLabel = 'public area',
  showTile = true,
}: FoundInPublicAreaRowProps) {
  return (
    <View className="flex-row items-center" style={{ gap: 12 * scaleX }}>
      {showTile ? (
        <View
          className="items-center justify-center overflow-hidden"
          style={{
            width: L.publicTile.width * scaleX,
            height: L.publicTile.height * scaleX,
            borderRadius: L.publicTile.radius * scaleX,
            backgroundColor: L.publicTile.background,
          }}
        >
          {/* aspect 0.9615, so a height of 24 paints 23.08 wide. */}
          <Icon name="area-public" size={L.publicTile.glyph * scaleX} color="#5a759d" />
        </View>
      ) : null}

      <View className="shrink">
        <View className="flex-row items-center" style={{ gap: 8 * scaleX }}>
          <Text
            className="shrink font-hestia-primary font-bold text-black"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ fontSize: 14 * scaleX, fontFamily: typography.fontFamily.primary }}
          >
            {areaName}
          </Text>
          {chipLabel ? <MetaChip label={chipLabel} variant={showTile ? 'publicArea' : 'room'} /> : null}
        </View>
        {timestamp ? (
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
            {timestamp}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default FoundInPublicAreaRow;
