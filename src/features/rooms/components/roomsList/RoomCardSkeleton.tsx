import React, { useEffect } from 'react';
import { View as RNView } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { CARD_BORDER, CARD_BORDER_WIDTH, PANEL_FILL, ROOM_CARD, cardPx } from './roomCardLayout';

/** The placeholder grey, on the white card and in the tinted panel. */
const BLOCK = '#e9edf3';

/**
 * A room card's outline while the rooms load — the same footprint as a
 * one-guest card (427 x 247, Figma 4553:853), so nothing jumps when the real
 * cards replace it: the number and a chip, the badge tile, the guest panel
 * with a photo and three lines, the attendant and the 207 x 70 pill.
 *
 * Shown when the AM/PM toggle switches shift: until that shift's rooms arrive
 * the list holds the other shift's, and painting them in the new shift's
 * colours, then swapping, read as a glitch.
 */
export function RoomCardSkeleton() {
  const { header, panel, guest, footer, pill } = ROOM_CARD;
  const block = (w: number, h: number, extra?: object) => (
    <RNView style={{ width: w, height: h, borderRadius: cardPx(6), backgroundColor: BLOCK, ...extra }} />
  );
  return (
    <RNView
      style={{
        backgroundColor: '#ffffff',
        borderRadius: ROOM_CARD.radius,
        borderWidth: CARD_BORDER_WIDTH,
        borderColor: CARD_BORDER,
        overflow: 'hidden',
      }}
    >
      <RNView style={{ margin: -CARD_BORDER_WIDTH }}>
        {/* Header: number, chip, a badge tile. */}
        <RNView
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingTop: header.top,
            paddingLeft: header.left,
            paddingRight: header.right,
            height: header.top + header.height,
            gap: header.numberToChip + cardPx(4),
          }}
        >
          {block(cardPx(56), cardPx(28))}
          {block(cardPx(87), cardPx(28), { borderRadius: cardPx(9) })}
          <RNView style={{ flex: 1 }} />
          {block(ROOM_CARD.badge.width, ROOM_CARD.badge.height, { borderRadius: ROOM_CARD.badge.radius })}
        </RNView>

        {/* Guest panel. */}
        <RNView
          style={{
            marginTop: panel.top,
            marginLeft: panel.left,
            marginRight: panel.right,
            height: panel.minHeight,
            borderRadius: panel.radius,
            backgroundColor: PANEL_FILL,
            flexDirection: 'row',
            paddingLeft: panel.paddingLeft,
            paddingTop: panel.paddingTop + guest.photoTop,
            gap: guest.textGap,
          }}
        >
          {block(guest.photo, guest.photo, { borderRadius: guest.photoRadius })}
          <RNView style={{ gap: cardPx(9), paddingTop: cardPx(2) }}>
            {block(cardPx(130), cardPx(12))}
            {block(cardPx(170), cardPx(11))}
            {block(cardPx(110), cardPx(11))}
          </RNView>
        </RNView>

        {/* Footer: attendant and pill. */}
        <RNView
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: footer.top,
            paddingLeft: footer.left,
            paddingRight: footer.right,
            paddingBottom: footer.bottom,
          }}
        >
          <RNView style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: ROOM_CARD.assigneeGap }}>
            {block(ROOM_CARD.assigneeAvatar, ROOM_CARD.assigneeAvatar, { borderRadius: ROOM_CARD.assigneeAvatar / 2 })}
            <RNView style={{ gap: cardPx(6) }}>
              {block(cardPx(90), cardPx(11))}
              {block(cardPx(64), cardPx(10))}
            </RNView>
          </RNView>
          {block(pill.width, pill.height, { borderRadius: pill.height / 2 })}
        </RNView>
      </RNView>
    </RNView>
  );
}

/**
 * A few skeleton cards, pulsing together (opacity 1 → 0.55, 0.8s each way),
 * in the list's own slots.
 */
export function RoomListSkeleton({ count = 3, slotStyle }: { count?: number; slotStyle?: object }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(0.55, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <Animated.View
      style={style}
      accessible
      accessibilityLabel="Loading rooms"
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: count }, (_, i) => (
        <RNView key={i} style={slotStyle}>
          <RoomCardSkeleton />
        </RNView>
      ))}
    </Animated.View>
  );
}

export default RoomListSkeleton;
