import React from 'react';
import { View, Text, Pressable } from '@/tw';
import { Avatar } from '@/components/ui/Avatar';
import { ROOM_CARD } from './roomCardLayout';
import { AssignRoomButton } from '../allRooms/AssignRoomButton';

export type RoomAssigneeBlockProps = {
  /** Null when nobody is on this room yet. */
  name?: string | null;
  avatarUrl?: string | null;
  /**
   * The line under the name — "Started: 40 mins", "Paused at 18:00",
   * "Not started", "Time: 60 mins". Derived by the caller, because it depends
   * on assignment state the view has no business reading.
   */
  statusLine?: string | null;
  onPress?: () => void;
};

/**
 * Who is working the room — Figma 3883:6158.
 *
 * A 35px photo, the name, and one line of assignment state. When nobody is
 * assigned it becomes the "Assign room" button (Figma 2702:7771).
 *
 * Deliberately no chevron: the design has none, and the whole card is already
 * a tap target for the room.
 */
export function RoomAssigneeBlock({ name, avatarUrl, statusLine, onPress }: RoomAssigneeBlockProps) {
  if (!name) {
    // Figma 2702:7771: an empty circle where the photo will go, and an "Assign room" pill.
    return <AssignRoomButton onPress={onPress} />;
  }

  const Container = onPress ? Pressable : View;

  return (
    <Container
      {...(onPress
        ? { onPress, accessibilityRole: 'button' as const, accessibilityLabel: `Assigned to ${name}` }
        : {})}
      className="flex-row items-center gap-md"
    >
      <Avatar uri={avatarUrl} name={name} size={ROOM_CARD.assigneeAvatar} />
      <View className="flex-1">
        <Text className="font-hestia-primary text-hestia-base font-bold text-ink-primary" numberOfLines={1}>
          {name}
        </Text>
        {!!statusLine && (
          <Text className="font-hestia-primary text-hestia-sm text-ink-primary" numberOfLines={1}>
            {statusLine}
          </Text>
        )}
      </View>
    </Container>
  );
}

export default RoomAssigneeBlock;
