import React from 'react';
import { View, Text, Pressable } from '@/tw';
import { Icon, type IconName } from '@/components/Icon';
import { CountBadge } from './CountBadge';

/** The four housekeeping states, in the order the design shows them. */
export type RoomStatusKey = 'dirty' | 'inProgress' | 'cleaned' | 'inspected';

type StatusSpec = {
  label: string;
  icon: IconName;
  /** Tailwind background class for the circle. */
  toneClassName: string;
  /**
   * Glyph height in px. Per-status rather than one shared number: the four
   * marks are drawn at different sizes inside the same 50px circle — nodes
   * 2702:3440, :3430, :3408 and :3419 measure 27.8, 25.5, 30.6 and 25.0 tall.
   * `Icon` derives each width from the registered aspect ratio.
   */
  glyphHeight: number;
};

/**
 * The canonical status presentation.
 *
 * Before this existed the same four colours were written out in three places
 * with different key casing and different icon assets — CategoryCard's
 * STATUS_CONFIG, allRooms.types.ts's STATUS_CONFIGS, and inline in
 * HskPortierTasksOverviewCard. Colours now come from design-system.json via the
 * generated tokens.
 */
export const ROOM_STATUS: Record<RoomStatusKey, StatusSpec> = {
  dirty: {
    label: 'Dirty',
    icon: 'status-dirty',
    toneClassName: 'bg-status-dirty',
    glyphHeight: 27.8,
  },
  inProgress: {
    label: 'In Progress',
    icon: 'status-in-progress',
    toneClassName: 'bg-status-in-progress',
    glyphHeight: 25.5,
  },
  cleaned: {
    label: 'Cleaned',
    icon: 'status-cleaned',
    toneClassName: 'bg-status-cleaned',
    glyphHeight: 30.6,
  },
  inspected: {
    label: 'Inspected',
    icon: 'status-inspected',
    toneClassName: 'bg-status-inspected',
    glyphHeight: 25,
  },
};

export const ROOM_STATUS_ORDER: readonly RoomStatusKey[] = [
  'dirty',
  'inProgress',
  'cleaned',
  'inspected',
];

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

export type StatusCircleProps = {
  status: RoomStatusKey;
  count: number;
  onPress?: () => void;
  /** Hide the label when the circle is used inside a denser layout. */
  showLabel?: boolean;
};

/**
 * A status circle with its count and label — Figma nodes 2702:3284 (dirty),
 * :3274 (in progress), :3252 (cleaned), :3263 (inspected).
 *
 * Replaces four separate implementations of the same visual.
 */
export function StatusCircle({ status, count, onPress, showLabel = true }: StatusCircleProps) {
  const spec = ROOM_STATUS[status];

  // Matches the previous behaviour: an empty status is not a tap target.
  const interactive = count >= 1 && !!onPress;
  const Container = interactive ? Pressable : View;

  return (
    <Container
      className="items-center"
      {...(interactive
        ? {
            onPress,
            accessibilityRole: 'button' as const,
            accessibilityLabel: `${count} ${spec.label}`,
          }
        : { accessibilityLabel: `${count} ${spec.label}` })}
    >
      {/* The badge overhangs the circle, so the row reserves width for it. */}
      <View style={{ width: CIRCLE_SIZE + BADGE_SIZE / 2, height: CIRCLE_SIZE + 6 }}>
        <View
          className={`items-center justify-center rounded-full ${spec.toneClassName}`}
          style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
        >
          <Icon name={spec.icon} size={spec.glyphHeight} color="#ffffff" />
        </View>

        <View className="absolute bottom-0 right-0">
          <CountBadge
            count={count}
            size={BADGE_SIZE}
            fontSize={BADGE_FONT_SIZE}
            toneClassName="bg-surface-primary border border-border-medium"
            textClassName="text-ink-primary"
          />
        </View>
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
