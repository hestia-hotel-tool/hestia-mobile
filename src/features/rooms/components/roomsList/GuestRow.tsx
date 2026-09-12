import React from 'react';
import { View, Text, Pressable } from '@/tw';
import { Image } from '@/tw/image';
import { Icon, type IconName } from '@/components/Icon';
import { colors } from '@/theme';
import { ROOM_CARD } from './roomCardLayout';

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
 * `tint` is deliberately absent for arrival and departure.
 *
 * Those two glyphs are two-tone — they carry their own #41D541 and #F92424 and
 * are not in `TINTABLE_ICONS`, so `<Icon color=…>` warns in dev and changes
 * nothing. The rest are single-colour and need telling what to be.
 */
const BADGE: Record<GuestRowKind, { icon: IconName; tint?: string }> = {
  arrival: { icon: 'guest-arrival' },
  departure: { icon: 'guest-departure' },
  'stayover-linen': { icon: 'guest-stayover-linen', tint: colors.text.link },
  'stayover-no-linen': { icon: 'guest-stayover-no-linen', tint: colors.text.link },
  turndown: { icon: 'guest-turndown', tint: colors.primary.main },
  occupied: { icon: 'guest-occupied', tint: colors.primary.main },
  vacant: { icon: 'guest-vacant', tint: colors.text.muted },
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
  const PhotoContainer = onImagePress ? Pressable : View;

  return (
    // No `flex-1` here. As the single child of the guest panel it made no
    // difference, but two of these stacked in a column — the Arrival/Departure
    // card — each claimed a flex share and shrank to fit, so the rows collided:
    // the first guest's "ETA: …" line landed on top of the second guest's name.
    // Content height, always; the container decides the spacing.
    <View className="flex-row items-center gap-md">
      <PhotoContainer
        {...(onImagePress
          ? { onPress: onImagePress, accessibilityRole: 'button' as const, accessibilityLabel: `${name}'s photo` }
          : {})}
        style={{ width: ROOM_CARD.guest.photo, height: ROOM_CARD.guest.photo }}
      >
        {/* Android does not clip children to borderRadius — hence overflow. */}
        <View className="h-full w-full overflow-hidden rounded-sm bg-surface-secondary">
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} className="h-full w-full" resizeMode="cover" />
          ) : null}
        </View>
        <View
          className="absolute -bottom-[6px] -right-[6px] items-center justify-center rounded-full bg-surface-primary"
          style={{ width: ROOM_CARD.guest.badge, height: ROOM_CARD.guest.badge }}
        >
          <Icon
            name={badge.icon}
            size={ROOM_CARD.guest.badge}
            {...(badge.tint ? { color: badge.tint } : {})}
          />
        </View>
      </PhotoContainer>

      <View className="flex-1">
        <View className="flex-row items-baseline gap-xs">
          <Text className="font-hestia-primary text-hestia-md font-bold text-ink-primary" numberOfLines={2}>
            {name}
          </Text>
          {!!marker && (
            <Text className="font-hestia-primary text-hestia-sm font-light text-ink-secondary">
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
          <View className="flex-row flex-wrap items-center gap-x-md">
            {!!dates && (
              <Text className="font-hestia-primary text-hestia-md font-light text-ink-primary">
                {dates}
              </Text>
            )}
            {!!occupancy && (
              <View className="flex-row items-center gap-xs">
                <Icon name="guest-occupancy" size={13} color={colors.text.primary} />
                <Text className="font-hestia-primary text-hestia-md font-light text-ink-primary">
                  {occupancy}
                </Text>
              </View>
            )}
          </View>
        )}

        {!!timeLabel && (
          <Text className="font-hestia-primary text-hestia-md text-ink-primary">{timeLabel}</Text>
        )}
      </View>
    </View>
  );
}

export default GuestRow;
