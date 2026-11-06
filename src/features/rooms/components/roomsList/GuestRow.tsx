import React, { useRef } from 'react';
import { Pressable as RNPressable, View as RNView } from 'react-native';
import { View, Text, Pressable } from '@/tw';
import { Image } from '@/tw/image';
import { Icon, type IconName } from '@/components/Icon';
import { colors, typography } from '@/theme';
import { ROOM_CARD, cardPx } from './roomCardLayout';
import { VIP_NEUTRAL, vipTierLabel, type VipTier } from '@/domain/vip';
import type { MeasureAnchor } from '../../hooks/useRevealBelow';

/**
 * Which mark sits on the guest photo's corner. Derived from the reservation,
 * never from a card-type flag — an Arrival/Departure card shows `arrival` on
 * its first row and `departure` on its second (Figma 4553:820 / 4553:827).
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
 * The disc on the photo's corner: a filled circle in the kind's colour with a
 * mark on it — Figma 4553:262.
 *
 * - Arrival / departure (4553:822 / 4553:829): 20, green / red, one white
 *   arrow mirrored, hanging 2 past the photo's right edge and 6 below it.
 * - Turndown (4553:1388): 25, #833bf6 with a yellow moon, 3 past and 7 below.
 * - Stayover (4553:1493): 25, #3bc1f6 with the white bed, 6 past and 10 below.
 *   Both stayover kinds draw the same bed: the design has no linen variant.
 * - Occupied and vacant are not drawn there and keep their 20 disc.
 */
type BadgeSpec = {
  icon: IconName;
  background: string;
  /** Mark colour. White unless drawn otherwise. */
  color?: string;
  /** Disc diameter, as drawn. */
  size: number;
  /** Mark height inside the disc, as drawn. Defaults to 62% of the disc. */
  glyph?: number;
  /** How far the disc hangs past the photo's right edge and below it. */
  right: number;
  bottom: number;
  /** Mirrored horizontally — departure is the arrival arrow flipped. */
  flip?: boolean;
};

const STAYOVER: BadgeSpec = { icon: 'guest-stayover-bed', background: colors.text.link, size: 25, glyph: 7.46, right: 6, bottom: 10 };

const BADGE: Record<GuestRowKind, BadgeSpec> = {
  arrival: { icon: 'guest-arrow', background: colors.status.inspected, size: 20, glyph: 7.46, right: 2, bottom: 6 },
  departure: { icon: 'guest-arrow', background: colors.status.dirty, size: 20, glyph: 7.46, right: 2, bottom: 6, flip: true },
  'stayover-linen': STAYOVER,
  'stayover-no-linen': STAYOVER,
  // The moon's viewBox is the disc's own 25, so it is drawn at the disc's size.
  turndown: { icon: 'guest-turndown-moon', background: '#833bf6', color: '#ffea80', size: 25, glyph: 25, right: 3, bottom: 7 },
  occupied: { icon: 'guest-occupied', background: colors.primary.main, size: 20, right: 2, bottom: 6 },
  vacant: { icon: 'guest-vacant', background: colors.text.muted, size: 20, right: 2, bottom: 6 },
};

/** The disc and its mark, at `size` (design units, unscaled); the mark keeps its share. */
function KindDisc({ badge, size }: { badge: BadgeSpec; size: number }) {
  const glyph = ((badge.glyph ?? badge.size * 0.62) * size) / badge.size;
  return (
    <View className="items-center justify-center rounded-full" style={{ width: size, height: size, backgroundColor: badge.background }}>
      <View {...(badge.flip ? { style: { transform: [{ scaleX: -1 }] } } : {})}>
        <Icon name={badge.icon} size={glyph} color={badge.color ?? colors.text.white} />
      </View>
    </View>
  );
}

/**
 * The guest-type disc on its own — for places that list a room without its
 * guest row (Staff › Activity, the room picker, the linen summary).
 */
export function GuestKindDisc({ kind, size = cardPx(20) }: { kind: GuestRowKind; size?: number }) {
  return <KindDisc badge={BADGE[kind]} size={size} />;
}

export type GuestRowProps = {
  name: string;
  /** "07 Oct - 15 Oct". */
  dates?: string;
  /** "2 Adults, 2 Kids". */
  occupancy?: string;
  /** "ETA: 17:00" on an arrival, "EDT: 12:00" on a departure. */
  timeLabel?: string;
  kind: GuestRowKind;
  imageUrl?: string | null;
  /** The guest's VIP code and its tier — the disc at the row's right. Absent for a regular guest. */
  vip?: { code: string; tier: VipTier };
  onImagePress?: () => void;
  /**
   * The VIP disc or its ⓘ was tapped. Hands over a way to measure the ⓘ, not
   * one reading of it: the list may scroll before the popover opens, and the
   * tail must point where the ⓘ ends up. Without it the disc is not a control.
   */
  onInfoPress?: (measure: MeasureAnchor) => void;
};

/**
 * One guest inside the card's panel — Figma 4553:262.
 *
 * A 49 photo with its kind disc on the corner, then three lines of Helvetica
 * 14, 20 apart: the name (bold), the ETA/EDT with the guests in words, and the
 * stay. A VIP's level ("V2") sits in a grey 35 disc at the row's right, the
 * info mark on its top-right corner. A regular guest has no disc.
 *
 * A flex row: a wrapped name pushes the row (and the panel) taller instead of
 * running into the next guest.
 */
export function GuestRow({
  name,
  dates,
  occupancy,
  timeLabel,
  kind,
  imageUrl,
  vip,
  onImagePress,
  onInfoPress,
}: GuestRowProps) {
  const badge = BADGE[kind];
  const { guest } = ROOM_CARD;
  const PhotoContainer = onImagePress ? Pressable : View;
  const details = [timeLabel, occupancy].filter(Boolean) as string[];

  return (
    <View className="flex-row items-start">
      <PhotoContainer
        {...(onImagePress
          ? { onPress: onImagePress, accessibilityRole: 'button' as const, accessibilityLabel: `${name}'s photo` }
          : {})}
        style={{ width: guest.photo, height: guest.photo, marginTop: guest.photoTop }}
      >
        {/* Android does not clip children to borderRadius — hence overflow. */}
        <View className="h-full w-full overflow-hidden bg-surface-secondary" style={{ borderRadius: guest.photoRadius }}>
          {imageUrl ? <Image source={{ uri: imageUrl }} className="h-full w-full" contentFit="cover" /> : null}
        </View>
        <View className="absolute" style={{ right: -cardPx(badge.right), bottom: -cardPx(badge.bottom) }}>
          <KindDisc badge={badge} size={cardPx(badge.size)} />
        </View>
      </PhotoContainer>

      <View className="flex-1" style={{ marginLeft: guest.textGap }}>
        <Text style={[LINE, { fontWeight: '700' }]} numberOfLines={2}>
          {name}
        </Text>
        {details.length > 0 && (
          // Wraps rather than truncates, so a narrow phone keeps both.
          <View className="flex-row flex-wrap" style={{ columnGap: guest.timeToCount }}>
            {details.map((d) => (
              <Text key={d} style={[LINE, { fontWeight: '300' }]}>
                {d}
              </Text>
            ))}
          </View>
        )}
        {!!dates && <Text style={[LINE, { fontWeight: '300' }]}>{dates}</Text>}
      </View>

      {vip ? <VipDisc code={vip.code} tier={vip.tier} name={name} onInfoPress={onInfoPress} /> : null}
    </View>
  );
}

/**
 * 4553:1674 — the VIP code in a 35 disc with the 14 info mark on its
 * top-right corner, 2 above the disc.
 *
 * Exactly the design: the grey disc of 4553:805 and the code in 4553:842's
 * Helvetica Bold 12, #334866 (VIP_NEUTRAL). The tier is in the accessibility
 * label and the guest's VIP card, not in colour.
 */
function VipDisc({
  code,
  tier,
  name,
  onInfoPress,
}: {
  code: string;
  tier: VipTier;
  name: string;
  onInfoPress?: (measure: MeasureAnchor) => void;
}) {
  const { marker: m } = ROOM_CARD;
  // A plain RN View: measured with measureInWindow, so it must stay in the native tree.
  const infoRef = useRef<RNView>(null);

  const measure: MeasureAnchor = () =>
    new Promise((resolve) => {
      const node = infoRef.current;
      if (!node) return resolve(null);
      node.measureInWindow((x, y, width, height) =>
        resolve([x, y, width, height].every(Number.isFinite) && height > 0 ? { x, y, width, height } : null)
      );
    });
  const open = () => onInfoPress?.(measure);

  const disc = (
    // Wide enough for the info mark, which hangs off the disc's right edge.
    <View style={{ width: m.size + m.info, height: m.size }}>
      <View
        className="items-center justify-center rounded-full"
        style={{ width: m.size, height: m.size, backgroundColor: VIP_NEUTRAL.disc }}
      >
        {/* The level, not the hotel's code: "V2", as 4577:156 draws it. */}
        <Text style={{ fontFamily: typography.fontFamily.primary, fontSize: m.fontSize, fontWeight: '700', color: VIP_NEUTRAL.ink }}>
          {vipTierLabel(tier.tier)}
        </Text>
      </View>
      <RNView ref={infoRef} collapsable={false} style={{ position: 'absolute', left: m.size, top: m.infoTop }}>
        <Icon name="action-info" size={m.info} color="#000000" />
      </RNView>
    </View>
  );

  const label = `VIP ${vipTierLabel(tier.tier)}, ${tier.name} (code ${code})`;
  // The code and the ⓘ are one target: either opens the VIP popover.
  return onInfoPress ? (
    <RNPressable
      onPress={open}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={`What being a VIP means for ${name}`}
      style={({ pressed }) => ({ marginLeft: m.gap, marginTop: m.top, opacity: pressed ? 0.6 : 1 })}
    >
      {disc}
    </RNPressable>
  ) : (
    <View style={{ marginLeft: m.gap, marginTop: m.top }} accessible accessibilityLabel={label}>
      {disc}
    </View>
  );
}

/** Helvetica 14 in black, every guest line, 20 apart (4553:900 / 921 / 919). */
const LINE = {
  fontFamily: typography.fontFamily.primary,
  fontSize: ROOM_CARD.guest.fontSize,
  lineHeight: ROOM_CARD.guest.line,
  color: '#000000',
} as const;

export default GuestRow;
