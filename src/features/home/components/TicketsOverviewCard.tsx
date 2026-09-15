import React from 'react';
import { View, Text } from '@/tw';
import { Card, CardDivider, TicketStatusCircle, TICKET_STATUS_ORDER } from '@/components';
import type { TicketStatusKey } from '@/components';

/** Node 3843:67 — the divider sits 79px below the card's top edge. */
const HEADER_HEIGHT = 79;
/** Node 3843:70, "{n} Tickets", matching the housekeeping card's title box. */
const TITLE_LINE_HEIGHT = 23;

export type TicketsOverviewCardProps = {
  total: number;
  priority: number;
  unsolved: number;
  solved: number;
  outOfOrder: number;
  onPressPriority?: () => void;
  onPressUnsolved?: () => void;
  onPressSolved?: () => void;
  onPressOutOfOrder?: () => void;
};

/**
 * The ticket dashboard's summary card — Figma 3843:67 (engineering) and
 * 3859:3355 (In Room Dining), which draw it identically.
 *
 * "{total} Tickets", a divider, then Priority / Unsolved / Solved / Out of
 * Order as counted circles. Structurally the housekeeping `CategoryCard` with a
 * different set of states, so it is built from the same primitives: the card,
 * its divider and the shared status bubble all come from `@/components`.
 *
 * The previous version drew this by hand — 271 lines of `useDesignScale`
 * arithmetic, hardcoded hex and two `require()`'d PNGs — plus a progress bar
 * that the design does not have and whose value nothing read.
 */
export function TicketsOverviewCard({
  total,
  priority,
  unsolved,
  solved,
  outOfOrder,
  onPressPriority,
  onPressUnsolved,
  onPressSolved,
  onPressOutOfOrder,
}: TicketsOverviewCardProps) {
  const counts: Record<TicketStatusKey, number> = {
    priority,
    unsolved,
    solved,
    outOfOrder,
  };
  const handlers: Record<TicketStatusKey, (() => void) | undefined> = {
    priority: onPressPriority,
    unsolved: onPressUnsolved,
    solved: onPressSolved,
    outOfOrder: onPressOutOfOrder,
  };

  return (
    <Card>
      <View className="justify-center px-xl" style={{ height: HEADER_HEIGHT }}>
        <Text
          className="font-hestia-primary text-hestia-4xl font-bold text-ink-primary"
          style={{ lineHeight: TITLE_LINE_HEIGHT }}
          numberOfLines={1}
        >
          {total} Tickets
        </Text>
      </View>

      <CardDivider />

      <View className="flex-row items-start justify-between px-lg pb-xl pt-xl">
        {TICKET_STATUS_ORDER.map((status) => (
          <TicketStatusCircle
            key={status}
            status={status}
            count={counts[status]}
            onPress={handlers[status]}
          />
        ))}
      </View>
    </Card>
  );
}

export default TicketsOverviewCard;
