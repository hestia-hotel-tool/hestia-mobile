import React from 'react';
import { Pressable, Text, View } from '@/tw';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import { ROOM_DETAIL_HEADER_LAYOUT as L } from './roomDetailHeaderLayout';

export type RoomActivityLineAction = {
  label: string;
  onPress: () => void;
};

export type RoomActivityLineProps = {
  /** Already composed — see `describeRoomActivity`. Empty renders nothing. */
  text: string;
  /**
   * A second, bolder segment after the text — Return Later's live countdown,
   * which Figma 2333-312 sets in Bold beside a Regular "Return at 11:22".
   */
  emphasis?: string;
  color: string;
  /**
   * The trailing text button. An **absent action means no affordance** — the
   * same rule the rest of this rebuild uses, so a caller cannot accidentally
   * render a dead control by passing a no-op.
   */
  action?: RoomActivityLineAction | null;
};

/**
 * The single line beneath the status button.
 *
 * One component for what were four absolutely-positioned rows — paused,
 * return-later, promised-time and refuse-service — that all shared the same
 * `top`, the same font and the same colour source, and two of which carried
 * byte-identical "Resume" / "Clear" buttons whose every padding, border, radius
 * and background was zeroed. They were four copies of one row with different
 * words in it.
 *
 * The words are composed upstream by `describeRoomActivity`, which is where the
 * genuinely per-state rules live (a paused room with no timestamp still prints
 * "Paused"; a return-later with no time prints nothing at all). This draws
 * whatever it is handed.
 */
export function RoomActivityLine({ text, emphasis, color, action }: RoomActivityLineProps) {
  if (!text) return null;

  return (
    <View
      className="flex-row items-center justify-center"
      style={{ gap: L.activityLine.actionGap * scaleX }}
      pointerEvents="box-none"
    >
      <Text
        style={{
          fontSize: L.activityLine.fontSize * scaleX,
          fontFamily: typography.fontFamily.primary,
          fontWeight: typography.fontWeights.light as never,
          color,
        }}
      >
        {text}
      </Text>

      {emphasis ? (
        <Text
          style={{
            fontSize: L.activityLine.fontSize * scaleX,
            fontFamily: typography.fontFamily.primary,
            fontWeight: typography.fontWeights.bold as never,
            color,
          }}
        >
          {emphasis}
        </Text>
      ) : null}

      {action ? (
        <Pressable
          onPress={action.onPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text
            className="text-status-dirty"
            style={{
              fontSize: L.activityLine.actionFontSize * scaleX,
              fontFamily: typography.fontFamily.primary,
              fontWeight: typography.fontWeights.bold as never,
              includeFontPadding: false,
            }}
          >
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default RoomActivityLine;
