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
  dirty: { label: 'Dirty', icon: 'status-dirty', toneClassName: 'bg-status-dirty' },
  inProgress: {
    label: 'In Progress',
    icon: 'status-in-progress',
    toneClassName: 'bg-status-in-progress',
  },
  cleaned: { label: 'Cleaned', icon: 'status-cleaned', toneClassName: 'bg-status-cleaned' },
  inspected: {
    label: 'Inspected',
    icon: 'status-inspected',
    toneClassName: 'bg-status-inspected',
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
const GLYPH_SIZE = 28;

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
          <Icon name={spec.icon} size={GLYPH_SIZE} color="#ffffff" />
        </View>

        <View className="absolute bottom-0 right-0">
          <CountBadge
            count={count}
            size={BADGE_SIZE}
            toneClassName="bg-surface-primary border border-border-medium"
            textClassName="text-ink-primary"
          />
        </View>
      </View>

      {showLabel && (
        <Text className="mt-sm font-hestia-secondary text-hestia-md font-light text-ink-primary">
          {spec.label}
        </Text>
      )}
    </Container>
  );
}
