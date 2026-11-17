import React from 'react';
import { View } from '@/tw';
import { PANEL_FILL, PRIORITY_CARD, ROOM_CARD } from './roomCardLayout';

export type RoomCardBodyProps = {
  /** One or two GuestRows. */
  guests: React.ReactNode[];
  /** On a priority card the panel is solid white (4577:111): the translucent tint would pick up the red. */
  priority?: boolean;
};

/**
 * The guest panel under the header — Figma 4553:892 / 4553:796.
 *
 * #dfe6f0 at 40%, radius 10, 9 in from the card's left and 7 from its right:
 * 84 tall with one guest, 160 with two (their photos 82 apart). Rows grow
 * when their text wraps, and the panel with them.
 */
export function RoomCardBody({ guests, priority = false }: RoomCardBodyProps) {
  const { panel } = ROOM_CARD;
  return (
    <View
      style={{
        marginTop: panel.top,
        marginLeft: panel.left,
        marginRight: panel.right,
        minHeight: panel.minHeight,
        paddingTop: panel.paddingTop,
        paddingBottom: panel.paddingBottom,
        paddingLeft: panel.paddingLeft,
        paddingRight: panel.paddingRight - ROOM_CARD.marker.info,
        gap: panel.guestGap,
        borderRadius: panel.radius,
        backgroundColor: priority ? PRIORITY_CARD.panelFill : PANEL_FILL,
      }}
    >
      {guests}
    </View>
  );
}

export default RoomCardBody;
