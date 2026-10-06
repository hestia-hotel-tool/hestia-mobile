import React from 'react';
import { StatusBubble, type StatusSpec } from './StatusBubble';

/** The four ticket states the engineering dashboard counts — Figma 3843:71. */
export type TicketStatusKey = 'priority' | 'unsolved' | 'solved' | 'outOfOrder';

/**
 * The canonical ticket status presentation — Figma 3843-52, colours sampled
 * from the exported frame rather than read off layer names.
 *
 * The counterpart of `ROOM_STATUS`, and drawn by the same `StatusBubble`. Three
 * of the four colours are already housekeeping tokens, which is deliberate on
 * the design's part: an unsolved ticket is the same red as a dirty room, a
 * solved one the same green as an inspected room.
 *
 * Priority is the odd row twice over — its mark sits on a pale ground rather
 * than a saturated one, so the runner is tinted red instead of white, and its
 * count is white-on-red where the other three are dark-on-white.
 */
export const TICKET_STATUS: Record<TicketStatusKey, StatusSpec> = {
  priority: {
    label: 'Priority',
    icon: 'action-priority',
    toneClassName: 'bg-status-priority',
    glyphHeight: 24,
    glyphColor: '#f92424',
    badgeToneClassName: 'bg-status-dirty',
    badgeTextClassName: 'text-ink-white',
  },
  unsolved: {
    label: 'Unsolved',
    icon: 'action-thumbs-down',
    toneClassName: 'bg-status-dirty',
    glyphHeight: 26,
    badgeToneClassName: 'bg-surface-primary border border-border-medium',
    badgeTextClassName: 'text-ink-primary',
  },
  solved: {
    label: 'Solved',
    icon: 'action-thumbs-up',
    toneClassName: 'bg-status-inspected',
    glyphHeight: 26,
    badgeToneClassName: 'bg-surface-primary border border-border-medium',
    badgeTextClassName: 'text-ink-primary',
  },
  outOfOrder: {
    label: 'Out of Order',
    // No mark: node 3843:86 is a grey ring, a disc with a concentric hole.
    toneClassName: 'bg-status-out-of-order',
    holeFraction: 0.42,
    badgeToneClassName: 'bg-surface-primary border border-border-medium',
    badgeTextClassName: 'text-ink-primary',
  },
};

export const TICKET_STATUS_ORDER: readonly TicketStatusKey[] = [
  'priority',
  'unsolved',
  'solved',
  'outOfOrder',
];

/**
 * The activity list needs a fifth face the overview card does not: a ticket
 * event that is not one of the four counted states — a note added, an
 * assignment changed. Kept out of `TICKET_STATUS` so the card's table stays
 * exactly the four circles it draws.
 */
export type TicketActivityKey = TicketStatusKey | 'neutral';

export const TICKET_ACTIVITY_STATUS: Record<TicketActivityKey, StatusSpec> = {
  ...TICKET_STATUS,
  neutral: {
    label: 'Updated',
    toneClassName: 'bg-status-out-of-order',
    holeFraction: 0.42,
    badgeToneClassName: 'bg-surface-primary border border-border-medium',
    badgeTextClassName: 'text-ink-primary',
  },
};

export type TicketStatusCircleProps = {
  status: TicketStatusKey;
  /** Omit for the plain avatar used on the activity rows. */
  count?: number;
  onPress?: () => void;
  showLabel?: boolean;
  size?: number;
};

/**
 * A ticket status circle — Figma 3843:71 in the overview card at 51px, and
 * 3843:133 as the activity rows' avatar at 59px with no count or label.
 */
export function TicketStatusCircle({
  status,
  count,
  onPress,
  showLabel = true,
  size,
}: TicketStatusCircleProps) {
  return (
    <StatusBubble
      spec={TICKET_STATUS[status]}
      count={count}
      onPress={onPress}
      showLabel={showLabel}
      size={size}
    />
  );
}

export default TicketStatusCircle;
