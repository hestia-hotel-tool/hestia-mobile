import React, { useRef } from 'react';
import { View as RNView } from 'react-native';
import { View, Text, Pressable } from '@/tw';
import { Avatar } from '@/components/ui/Avatar';
import { typography } from '@/theme';
import { ROOM_CARD, cardPx } from './roomCardLayout';
import type { AssigneeStatus } from '../../utils/cleaningClock';
import type { MeasureAnchor } from '../../hooks/useRevealBelow';

export type RoomAssigneeBlockProps = {
  /** Who is on the room. An unassigned room shows AssignRoomPill instead of this block. */
  name: string;
  avatarUrl?: string | null;
  /** The line under the name, already styled for its state — see `assigneeStatus`. */
  status?: AssigneeStatus | null;
  /**
   * Tapped. Hands over a way to measure the block, not one reading of it: the
   * list may scroll to make room before a menu opens under it, and the menu's
   * tail must point where the block ends up (as VipDisc does).
   */
  onPress?: (measure: MeasureAnchor) => void;
};

/** Figma's line heights: Helvetica at 115%. */
const STATUS_LINE_HEIGHT = { 10: cardPx(11.5), 12: cardPx(13.8), 13: cardPx(14.9) } as const;
/** Status top 17.5 under the name's (3883:6009 → 3883:6012). */
const STATUS_GAP = cardPx(17.5 - 14.9);

/**
 * Who is working the room — Figma 4553:893 (first drawn in 3883:6158).
 *
 * A 35px photo, 8 to the name (Helvetica bold 13, #1e1e1e), and one line of
 * assignment state under it. An unassigned room shows AssignRoomPill
 * (Figma 4577:228) in its place.
 *
 * Deliberately no chevron: the design has none, and the whole card is already
 * a tap target for the room.
 */
export function RoomAssigneeBlock({ name, avatarUrl, status, onPress }: RoomAssigneeBlockProps) {
  const statusText = status ? (
    <Text
      style={{
        fontFamily: typography.fontFamily.primary,
        fontSize: cardPx(status.size),
        lineHeight: STATUS_LINE_HEIGHT[status.size],
        marginTop: STATUS_GAP,
        fontWeight: status.weight === 'bold' ? '700' : '300',
        color: status.color,
      }}
      numberOfLines={1}
      accessibilityLabel={status.alert ? `Running late: ${status.text}` : undefined}
    >
      {status.text}
    </Text>
  ) : null;

  const Container = onPress ? Pressable : View;
  // A plain RN View, measured with measureInWindow on a tap.
  const ref = useRef<RNView>(null);
  const measure: MeasureAnchor = () =>
    new Promise((resolve) => {
      const node = ref.current;
      if (!node) return resolve(null);
      node.measureInWindow((x, y, width, height) =>
        resolve([x, y, width, height].every(Number.isFinite) && height > 0 ? { x, y, width, height } : null)
      );
    });
  const press = () => onPress?.(measure);

  return (
    <RNView ref={ref} collapsable={false}>
      <Container
        {...(onPress
          ? {
              onPress: press,
              accessibilityRole: 'button' as const,
              accessibilityLabel: `Assigned to ${name}`,
              accessibilityHint: 'Reassign or unassign this room',
            }
          : {})}
        className="flex-row items-center"
        style={{ gap: ROOM_CARD.assigneeGap }}
      >
        <Avatar uri={avatarUrl} name={name} size={ROOM_CARD.assigneeAvatar} />
        <View style={{ flexShrink: 1 }}>
          <Text
            style={{
              fontFamily: typography.fontFamily.primary,
              fontSize: cardPx(13),
              lineHeight: cardPx(14.9),
              fontWeight: '700',
              color: '#1e1e1e',
            }}
            numberOfLines={1}
          >
            {name}
          </Text>
          {statusText}
        </View>
      </Container>
    </RNView>
  );
}

export default RoomAssigneeBlock;
