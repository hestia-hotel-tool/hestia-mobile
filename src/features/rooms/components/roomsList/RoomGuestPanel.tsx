import React from 'react';
import { View } from '@/tw';
import { ROOM_CARD } from './roomCardLayout';

export type RoomGuestPanelProps = {
  /** One GuestRow, or two separated by a hairline on an Arrival/Departure. */
  children: React.ReactNode;
  /** The status pill, centred in its own column across however many rows. */
  action?: React.ReactNode;
};

/**
 * The tinted block holding the guests and the action — Figma 3883:6141.
 *
 * `rgba(223,230,240,0.4)` at radius 10. The pill lives *inside* it as the
 * right-hand child, vertically centred: on a two-guest card that centres it
 * across both rows for free, which is what the replaced card achieved with a
 * per-card-type table of `top` values.
 */
export function RoomGuestPanel({ children, action }: RoomGuestPanelProps) {
  return (
    <View
      className="m-lg flex-row items-center gap-md overflow-hidden rounded-lg bg-[rgba(223,230,240,0.4)] p-md"
      style={{ minHeight: ROOM_CARD.panelMinHeight }}
    >
      <View className="flex-1 justify-center">{children}</View>
      {!!action && (
        <View className="items-center justify-center" style={{ width: ROOM_CARD.pill.width }}>
          {action}
        </View>
      )}
    </View>
  );
}

/** The rule between the two guests on an Arrival/Departure card. */
export function GuestRowDivider() {
  return <View className="my-md h-px bg-border-medium" />;
}

export default RoomGuestPanel;
