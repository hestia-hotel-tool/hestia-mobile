import React from 'react';
import { View, Text, Pressable } from '@/tw';
import { Image } from '@/tw/image';
import { Icon, type IconName } from '@/components/Icon';
import { colors, typography } from '@/theme';
import { ROOM_CARD, cardPx } from './roomCardLayout';

/**
 * Which mark sits on the guest photo's corner. Derived from the reservation,
 * never from a card-type flag — an Arrival/Departure card shows `arrival` on
 * its first row and `departure` on its second (Figma 3883:5881).
 */
export type GuestRowKind =
  | 'arrival'
  | 'departure'
  | 'stayover-linen'
  | 'stayover-no-linen'
  | 'turndown'
  | 'occupied'
  | 'vacant';

/**
 * The disc on the photo's corner: a filled circle in the status colour with a
 * white mark on it.
 *
 * That way round, and measured off Figma 3883:5570 rather than assumed — the
 * app had it inverted, drawing a white disc with a coloured mark. Sampling the
 * frame: arrival is a 20px `#41d541` disc, departure a 20px `#f92424` disc, and
 * stayover a **29px** `#3bc1f6` one. The mark is white in every case.
 *
 * Arrival and departure share one arrow, mirrored — `guest-arrival` and
 * `guest-departure` are a different drawing (a person beside an arrow) that the
 * Rooms filter sheet still uses correctly, so they are left alone.
 *
 * `size` overrides the default disc (`ROOM_CARD.guest.badge`, 20);
 * `glyph` is the mark's height inside it. Turndown, occupied
 * and vacant do not appear in this frame, so they take the same treatment at
 * the default size with their existing colours — worth checking against a frame
 * that shows them.
 */
type BadgeSpec = {
  icon: IconName;
  background: string;
  /** Disc diameter. 20 unless the design draws it larger. */
  size?: number;
  /** Mark height inside the disc. */
  glyph?: number;
  /** Mirrored horizontally — departure is the arrival arrow flipped. */
  flip?: boolean;
};

const BADGE: Record<GuestRowKind, BadgeSpec> = {
  arrival: { icon: 'guest-arrow', background: colors.status.inspected, glyph: 7.46 },
  departure: { icon: 'guest-arrow', background: colors.status.dirty, glyph: 7.46, flip: true },
  /*
   * Both stayover kinds draw the same bed, on the default 20px disc.
   *
   * A knowing deviation: the frame draws this disc at 29 (3883:5849) where
   * arrival and departure are 20, and we match the 20 so the three badges are
   * one size. The bed is scaled by the same 20/29 so it keeps the proportion it
   * has in the design — 17.3218 x 9.1507 inside 29 is 60% of the disc, and
   * 6.3108 here keeps it at 60% of 20. `Icon` derives the width from the
   * registered aspect.
   *
   * One mark for both kinds: the frame has exactly one stayover disc and the
   * design system has no linen/no-linen variants. The app still tells them
   * apart in data — `getStayoverWithLinen` picks the kind — they just look
   * alike until the design gives the second mark.
   */
  'stayover-linen': {
    icon: 'guest-stayover-bed',
    background: colors.text.link,
    glyph: 6.3108,
  },
  'stayover-no-linen': {
    icon: 'guest-stayover-bed',
    background: colors.text.link,
    glyph: 6.3108,
  },
  turndown: { icon: 'guest-turndown', background: colors.primary.main },
  occupied: { icon: 'guest-occupied', background: colors.primary.main },
  vacant: { icon: 'guest-vacant', background: colors.text.muted },
};

export type GuestRowProps = {
  name: string;
  /** Formatted stay, e.g. "07/10-15/10". */
  dates?: string;
  /** Occupied / total, e.g. "2/2". */
  occupancy?: string;
  /** "ETA: 17:00" on an arrival, "EDT: 12:00" on a departure. */
  timeLabel?: string;
  kind: GuestRowKind;
  imageUrl?: string | null;
  /** The small superscript beside the name in the design, e.g. "11". */
  marker?: string;
  onImagePress?: () => void;
};

/**
 * One guest inside the card's panel — Figma 3883:6142.
 *
 * A 49px photo with a status disc on its corner, then the name, the stay dates
 * with an occupancy count, and an ETA or EDT when the reservation has one.
 *
 * This replaces `GuestInfoDisplay`, which took roughly thirty absolute-position
 * override props — `nameTop`, `iconLeft`, `countTextLeft`, `absolutePositioning`
 * — because every card type placed the same row differently. A flex row needs
 * none of them: the panel grows, and a wrapped name pushes the card taller
 * instead of overflowing a fixed height.
 */
export function GuestRow({
  name,
  dates,
  occupancy,
  timeLabel,
  kind,
  imageUrl,
  marker,
  onImagePress,
}: GuestRowProps) {
  const badge = BADGE[kind];
  const discSize = badge.size ?? ROOM_CARD.guest.badge;
  const PhotoContainer = onImagePress ? Pressable : View;

  return (
    // No `flex-1` here. As the single child of the guest panel it made no
    // difference, but two of these stacked in a column — the Arrival/Departure
    // card — each claimed a flex share and shrank to fit, so the rows collided:
    // the first guest's "ETA: …" line landed on top of the second guest's name.
    // Content height, always; the container decides the spacing.
    // At least the photo's height, and taller when a long name or the dates
    // wrap — the row grows rather than letting its text run into the next.
    <View className="flex-row items-center" style={{ gap: ROOM_CARD.guest.textGap, minHeight: ROOM_CARD.guest.photo }}>
      <PhotoContainer
        {...(onImagePress
          ? { onPress: onImagePress, accessibilityRole: 'button' as const, accessibilityLabel: `${name}'s photo` }
          : {})}
        style={{ width: ROOM_CARD.guest.photo, height: ROOM_CARD.guest.photo }}
      >
        {/* Android does not clip children to borderRadius — hence overflow. */}
        <View
          className="h-full w-full overflow-hidden bg-surface-secondary"
          style={{ borderRadius: ROOM_CARD.guest.photoRadius }}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} className="h-full w-full" contentFit="cover" />
          ) : null}
        </View>
        <View
          className="absolute items-center justify-center rounded-full"
          // 3883:6144: the disc hangs 6 below the photo and 2 past its right edge.
          style={{
            width: discSize,
            height: discSize,
            backgroundColor: badge.background,
            bottom: ROOM_CARD.guest.badgeBottom,
            right: ROOM_CARD.guest.badgeRight,
          }}
        >
          <View {...(badge.flip ? { style: { transform: [{ scaleX: -1 }] } } : {})}>
            <Icon
              name={badge.icon}
              size={badge.glyph != null ? cardPx(badge.glyph) : discSize * 0.62}
              color={colors.text.white}
            />
          </View>
        </View>
      </PhotoContainer>

      <View className="flex-1">
        <View className="flex-row items-baseline gap-xs">
          {/* Shrinks so a wrapped name keeps its marker ("11") beside it, in the column. */}
          <Text style={[LINE, { fontWeight: '700', flexShrink: 1 }]} numberOfLines={2}>
            {name}
          </Text>
          {!!marker && (
            <Text style={{ fontFamily: typography.fontFamily.primary, fontSize: cardPx(12), fontWeight: '300', color: '#334866' }}>
              {marker}
            </Text>
          )}
        </View>

        {(!!dates || !!occupancy) && (
          // Wraps rather than truncates.
          //
          // The design fits the stay dates and the occupancy count on one line
          // in a 127px column — but that column only exists on the 440pt frame
          // it was drawn for. On a 402pt device the same column is ~113px, and
          // "26/04-28/04" plus the count needs ~135px. Clipping lost the count
          // on every card; wrapping keeps both at any width and still sits on
          // one line at 440.
          // 3883:6000–6008: the dates, 10, the 13x12 occupancy glyph, 6, the count.
          <View className="flex-row flex-wrap items-center" style={{ columnGap: cardPx(10) }}>
            {!!dates && <Text style={[LINE, { fontWeight: '300' }]}>{dates}</Text>}
            {!!occupancy && (
              <View className="flex-row items-center" style={{ gap: cardPx(6) }}>
                <Icon name="guest-occupancy" size={cardPx(12)} color="#000000" />
                <Text style={[LINE, { fontWeight: '300' }]}>{occupancy}</Text>
              </View>
            )}
          </View>
        )}

        {!!timeLabel && <Text style={[LINE, { fontWeight: '400' }]}>{timeLabel}</Text>}
      </View>
    </View>
  );
}

/**
 * Helvetica 14 in black, every guest line (3883:6001, 6000, 5900). Lines are
 * 21 to 22 apart top to top in the frame.
 */
const LINE = {
  fontFamily: typography.fontFamily.primary,
  fontSize: cardPx(14),
  lineHeight: cardPx(21),
  color: '#000000',
} as const;

export default GuestRow;
