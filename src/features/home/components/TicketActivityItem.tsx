import React from 'react';
import { View, Text } from '@/tw';
import { StatusBubble } from '@/components';
import { TICKET_ACTIVITY_STATUS, type TicketActivityKey } from '@/components';

/** Node 3843:131 — the row is 96 tall with a 59px avatar. */
const ROW_HEIGHT = 96;
const AVATAR_SIZE = 59;
/**
 * Nodes 3843:142 and :146 are 15px line boxes around 13px type — the box, not
 * the font size. Pinned so the row height holds on both platforms.
 */
const LINE_HEIGHT = 15;

export type TicketActivityItemProps = {
  roomLabel: string;
  message: string;
  timeLabel: string;
  /**
   * Which ticket state the event moved to. The activity avatar is the same
   * circle the overview card draws, so a solved ticket reads identically in
   * both places — which is the point of sharing the table rather than passing
   * a colour.
   */
  status?: TicketActivityKey;
};

/**
 * One row of a ticket dashboard's Recent activity list — Figma 3843:131
 * (engineering) and 3859:3420 (In Room Dining), which draw it identically.
 *
 * The status circle, the room over the message, and the time on the right.
 *
 * The previous version took a `state` of `'solved' | 'unsolved' | 'neutral'`
 * and turned it into a bordered dot with its own hex values, so "Out of Order"
 * was labelled `unsolved` and drawn in a grey that appeared nowhere else. It
 * now names the same states as the card above it.
 */
export function TicketActivityItem({
  roomLabel,
  message,
  timeLabel,
  status = 'neutral',
}: TicketActivityItemProps) {
  return (
    <View
      className="mb-md w-full flex-row items-center rounded-xl bg-surface-activity px-lg"
      style={{ height: ROW_HEIGHT }}
    >
      <StatusBubble
        spec={TICKET_ACTIVITY_STATUS[status]}
        size={AVATAR_SIZE}
        showLabel={false}
        accessibilityLabel={roomLabel}
      />

      <View className="ml-md min-w-0 flex-1">
        <Text
          className="font-hestia-primary text-hestia-base font-bold text-ink-accent"
          style={{ lineHeight: LINE_HEIGHT }}
          numberOfLines={1}
        >
          {roomLabel}
        </Text>
        <Text
          className="mt-xs font-hestia-primary text-hestia-base text-ink-primary"
          style={{ lineHeight: LINE_HEIGHT }}
          numberOfLines={1}
        >
          {message}
        </Text>
      </View>

      <Text
        className="ml-sm font-hestia-primary text-hestia-base font-bold text-ink-accent"
        style={{ lineHeight: LINE_HEIGHT }}
        numberOfLines={1}
      >
        {timeLabel}
      </Text>
    </View>
  );
}

export default TicketActivityItem;
