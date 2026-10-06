import React from 'react';
import { StatusBubble, type StatusSpec } from './StatusBubble';

/** The four housekeeping states, in the order the design shows them. */
export type RoomStatusKey = 'dirty' | 'inProgress' | 'cleaned' | 'inspected';

/**
 * The canonical status presentation.
 *
 * Before this existed the same four colours were written out in three places
 * with different key casing and different icon assets — CategoryCard's
 * STATUS_CONFIG, allRooms.types.ts's STATUS_CONFIGS, and inline in
 * HskPortierTasksOverviewCard. Colours now come from design-system.json via the
 * generated tokens.
 *
 * The glyph heights are per-status because the four marks are drawn at
 * different sizes inside the same 50px circle — nodes 2702:3440, :3430, :3408
 * and :3419 measure 27.8, 25.5, 30.6 and 25.0 tall.
 */
export const ROOM_STATUS: Record<RoomStatusKey, StatusSpec> = {
  dirty: {
    label: 'Dirty',
    icon: 'status-dirty',
    toneClassName: 'bg-status-dirty',
    glyphHeight: 27.8,
    glyphColor: '#ffffff',
    badgeToneClassName: 'bg-surface-primary border border-border-medium',
    badgeTextClassName: 'text-ink-primary',
  },
  inProgress: {
    label: 'In Progress',
    icon: 'status-in-progress',
    toneClassName: 'bg-status-in-progress',
    glyphHeight: 25.5,
    glyphColor: '#ffffff',
    badgeToneClassName: 'bg-surface-primary border border-border-medium',
    badgeTextClassName: 'text-ink-primary',
  },
  cleaned: {
    label: 'Cleaned',
    icon: 'status-cleaned',
    toneClassName: 'bg-status-cleaned',
    glyphHeight: 30.6,
    glyphColor: '#ffffff',
    badgeToneClassName: 'bg-surface-primary border border-border-medium',
    badgeTextClassName: 'text-ink-primary',
  },
  inspected: {
    label: 'Inspected',
    icon: 'status-inspected',
    toneClassName: 'bg-status-inspected',
    glyphHeight: 25,
    glyphColor: '#ffffff',
    badgeToneClassName: 'bg-surface-primary border border-border-medium',
    badgeTextClassName: 'text-ink-primary',
  },
};

export const ROOM_STATUS_ORDER: readonly RoomStatusKey[] = [
  'dirty',
  'inProgress',
  'cleaned',
  'inspected',
];

export type StatusCircleProps = {
  status: RoomStatusKey;
  count: number;
  onPress?: () => void;
  /** Hide the label when the circle is used inside a denser layout. */
  showLabel?: boolean;
};

/**
 * A room status circle with its count and label — Figma nodes 2702:3284
 * (dirty), :3274 (in progress), :3252 (cleaned), :3263 (inspected).
 *
 * The drawing itself lives in `StatusBubble`, shared with the engineering
 * ticket statuses. This is the housekeeping row of that table.
 */
export function StatusCircle({ status, count, onPress, showLabel = true }: StatusCircleProps) {
  return (
    <StatusBubble spec={ROOM_STATUS[status]} count={count} onPress={onPress} showLabel={showLabel} />
  );
}
