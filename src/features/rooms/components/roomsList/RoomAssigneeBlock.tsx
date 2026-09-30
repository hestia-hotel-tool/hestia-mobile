import React from 'react';
import { View, Text, Pressable } from '@/tw';
import { Avatar } from '@/components/ui/Avatar';
import { typography } from '@/theme';
import { ROOM_CARD, cardPx } from './roomCardLayout';
import { AssignRoomButton } from '../allRooms/AssignRoomButton';
import type { AssigneeStatus } from '../../utils/cleaningClock';

export type RoomAssigneeBlockProps = {
  /** Null when nobody is on this room yet. */
  name?: string | null;
  avatarUrl?: string | null;
  /** The line under the name, already styled for its state — see `assigneeStatus`. */
  status?: AssigneeStatus | null;
  onPress?: () => void;
};

/** Figma's line heights: Helvetica at 115%. */
const STATUS_LINE_HEIGHT = { 10: cardPx(11.5), 12: cardPx(13.8), 13: cardPx(14.9) } as const;
/** Status top 17.5 under the name's (3883:6009 → 3883:6012). */
const STATUS_GAP = cardPx(17.5 - 14.9);

/**
 * Who is working the room — Figma 3883:6158.
 *
 * A 35px photo, 8 to the name (Helvetica bold 13, #1e1e1e), and one line of
 * assignment state under it. When nobody is assigned it becomes the "Assign
 * room" button (Figma 2702:7771).
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

  if (!name) {
    // Figma 2702:7771: an empty circle where the photo will go, and an "Assign room" pill.
    // A room can be In Progress before anyone is assigned — its line still
    // belongs on the card, under the button.
    if (!statusText) return <AssignRoomButton onPress={onPress} />;
    return (
      <View className="gap-xs">
        <AssignRoomButton onPress={onPress} />
        {statusText}
      </View>
    );
  }

  const Container = onPress ? Pressable : View;

  return (
    <Container
      {...(onPress
        ? { onPress, accessibilityRole: 'button' as const, accessibilityLabel: `Assigned to ${name}` }
        : {})}
      className="flex-row items-center"
      style={{ gap: ROOM_CARD.assigneeGap }}
    >
      <Avatar uri={avatarUrl} name={name} size={ROOM_CARD.assigneeAvatar} />
      <View className="flex-1">
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
  );
}

export default RoomAssigneeBlock;
