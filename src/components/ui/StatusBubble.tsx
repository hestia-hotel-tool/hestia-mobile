import React from 'react';
import { View, Text, Pressable } from '@/tw';
import { Icon, type IconName } from '@/components/Icon';
import { CountBadge } from './CountBadge';

/**
 * What one status looks like: its colour, its mark, and how its count reads.
 *
 * Shared by the housekeeping room statuses (`ROOM_STATUS`) and the engineering
 * ticket statuses (`TICKET_STATUS`), which are the same visual with different
 * rows.
 */
export type StatusSpec = {
  label: string;
  /**
   * The glyph inside the circle. Omitted for a status drawn as a shape rather
   * than a mark — Out of Order is a plain ring (Figma 3843:86).
   */
  icon?: IconName;
  /** Tailwind background class for the circle. */
  toneClassName: string;
  /**
   * Glyph height in px. Per-status rather than one shared number: the marks are
   * drawn at different sizes inside the same circle. `Icon` derives each width
   * from the registered aspect ratio.
   */
  glyphHeight?: number;
  /**
   * Glyph tint, for the single-colour marks. Left undefined for the two-tone
   * thumbs, which carry their own colours and warn if handed a tint.
   */
  glyphColor?: string;
  /**
   * A ring rather than a filled disc: the circle with a concentric hole punched
   * out of it. The fraction is the hole's diameter as a share of the circle.
   */
  holeFraction?: number;
  /** Tailwind background class for the count badge. */
  badgeToneClassName: string;
  /** Tailwind text-colour class for the count. */
  badgeTextClassName: string;
};

/** Figma node 2702:3254 — the circle is 50.017px, the count bubble 34px. */
const CIRCLE_SIZE = 50;
const BADGE_SIZE = 34;
/** Node 2702:3462 sets the bubble count at 20px, not a fraction of the bubble. */
const BADGE_FONT_SIZE = 20;
/**
 * The label's line box, pinned rather than left to the platform.
 *
 * Figma's own auto-height text node (2702:3426, "Dirty") is 17px, and the whole
 * circle-plus-label group (2702:3403) is exactly 81px — 56 + 8 + 17. Letting RN
 * derive the line height from the font would make that total differ between
 * iOS and Android, which would shift the card's height on one platform only.
 */
const LABEL_LINE_HEIGHT = 17;

export type StatusBubbleProps = {
  spec: StatusSpec;
  /**
   * The count in the badge. Omit for a bubble used as a plain avatar — the
   * engineering activity rows draw the same circle with no count (Figma
   * 3843:133).
   */
  count?: number;
  onPress?: () => void;
  /** Hide the label when the circle is used inside a denser layout. */
  showLabel?: boolean;
  /** Circle diameter. The activity rows draw it at 59 rather than 50. */
  size?: number;
  /**
   * Accessible name. Defaults to "<count> <label>", which reads wrong for a
   * bubble with no count.
   */
  accessibilityLabel?: string;
};

/**
 * A status circle with an optional count badge and label.
 *
 * The shared body of `StatusCircle` (rooms) and `TicketStatusCircle`
 * (engineering tickets). Both are the same drawing: a coloured disc carrying a
 * mark, a count overhanging its bottom-right, and a label beneath. Keeping one
 * implementation is the point — `StatusCircle` exists in the first place
 * because the same four colours had previously been written out in three
 * separate files, and adding a fourth by hand would repeat that.
 */
export function StatusBubble({
  spec,
  count,
  onPress,
  showLabel = true,
  size = CIRCLE_SIZE,
  accessibilityLabel,
}: StatusBubbleProps) {
  // Matches the previous behaviour: an empty status is not a tap target.
  const interactive = (count ?? 0) >= 1 && !!onPress;
  const Container = interactive ? Pressable : View;

  const name = accessibilityLabel ?? (count == null ? spec.label : `${count} ${spec.label}`);
  const badgeSize = Math.round(BADGE_SIZE * (size / CIRCLE_SIZE));

  return (
    <Container
      className="items-center"
      {...(interactive
        ? { onPress, accessibilityRole: 'button' as const, accessibilityLabel: name }
        : { accessibilityLabel: name })}
    >
      {/* The badge overhangs the circle, so the row reserves width for it. */}
      <View
        style={{
          width: count == null ? size : size + badgeSize / 2,
          height: size + 6,
        }}
      >
        <View
          className={`items-center justify-center rounded-full ${spec.toneClassName}`}
          style={{ width: size, height: size }}
        >
          {spec.holeFraction != null ? (
            // `overflow: hidden` on a rounded parent is unreliable on Android,
            // so the hole is a painted disc rather than a clipped cut-out.
            <View
              className="rounded-full bg-surface-primary"
              style={{
                width: size * spec.holeFraction,
                height: size * spec.holeFraction,
              }}
            />
          ) : (
            spec.icon && (
              <Icon
                name={spec.icon}
                size={(spec.glyphHeight ?? 26) * (size / CIRCLE_SIZE)}
                color={spec.glyphColor}
              />
            )
          )}
        </View>

        {count != null && (
          <View className="absolute bottom-0 right-0">
            <CountBadge
              count={count}
              size={badgeSize}
              fontSize={Math.round(BADGE_FONT_SIZE * (size / CIRCLE_SIZE))}
              toneClassName={spec.badgeToneClassName}
              textClassName={spec.badgeTextClassName}
            />
          </View>
        )}
      </View>

      {showLabel && (
        <Text
          className="mt-sm font-hestia-secondary text-hestia-md font-light text-ink-primary"
          style={{ lineHeight: LABEL_LINE_HEIGHT }}
        >
          {spec.label}
        </Text>
      )}
    </Container>
  );
}

export default StatusBubble;
