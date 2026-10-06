import React from 'react';
import { View } from '@/tw';
import { ROOM_CARD, type RoomCardSpec } from './roomCardLayout';

export type RoomCardBodyProps = {
  spec: RoomCardSpec;
  /** One or two GuestRows. */
  guests: React.ReactNode[];
  /** The status pill. */
  action?: React.ReactNode;
};

/** The panel's tint — Figma 3883:6141, #dfe6f0 at 40%, radius 10. */
const PANEL_FILL = 'rgba(223, 230, 240, 0.4)';

/**
 * The guests and the status pill, below the header — Figma 3883:5570.
 *
 * Either inside a tinted panel inset from the card (`panel`), or on the card
 * itself under a full-width #e3e3e3 rule (`divider`), as the card's spec says.
 *
 * Guest rows are at least the photo's 49 tall and 24 apart — 73 photo to
 * photo, as drawn — and grow when their text wraps, so nothing overlaps. The
 * pill is centred on the guests. The panel's vertical padding is what makes a
 * one-guest panel the frame's 101 with the 70 pill in it; the guests start at
 * the frame's photo top within that.
 */
export function RoomCardBody({ spec, guests, action }: RoomCardBodyProps) {
  const { body } = spec;
  const headerBottom = spec.ruleTop + ROOM_CARD.headerRule;
  const pill = ROOM_CARD.pill.height;

  const row = (padTop: number) => (
    // Guests from the top, at the frame's photo top; the pill centred on
    // whichever is taller, the guests or itself.
    <View className="flex-row items-start">
      <View className="flex-1" style={{ gap: ROOM_CARD.guestGap, marginTop: padTop }}>
        {guests}
      </View>
      {!!action && (
        <View style={{ alignSelf: 'center', marginLeft: ROOM_CARD.textToPill, marginRight: body.pillRight }}>{action}</View>
      )}
    </View>
  );

  if (body.kind === 'panel') {
    const padV = Math.min(body.photoTop, (body.minHeight - pill) / 2);
    return (
      <View
        className="overflow-hidden"
        style={{
          marginTop: body.top - headerBottom,
          marginLeft: body.left,
          marginRight: body.right,
          marginBottom: body.bottom,
          minHeight: body.minHeight,
          paddingLeft: body.photoLeft,
          paddingVertical: padV,
          borderRadius: ROOM_CARD.panelRadius,
          backgroundColor: PANEL_FILL,
        }}
      >
        {row(body.photoTop - padV)}
      </View>
    );
  }

  return (
    <>
      <View style={{ marginTop: body.top - headerBottom, height: 1, backgroundColor: '#e3e3e3' }} />
      <View
        style={{
          minHeight: guests.length > 1 ? body.minHeightTwo : body.minHeight,
          paddingLeft: body.photoLeft,
          paddingTop: body.photoTop,
          paddingBottom: body.photoTop,
        }}
      >
        {row(0)}
      </View>
    </>
  );
}

export default RoomCardBody;
