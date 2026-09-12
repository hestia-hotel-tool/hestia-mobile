import React from 'react';
import { View, Text, Pressable } from '@/tw';
import { Avatar } from '@/components';
import { ROOM_CARD } from './roomCardLayout';

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
 * assigned it becomes the affordance to assign someone.
 *
 * Deliberately no chevron: the design has none, and the whole card is already
 * a tap target for the room.
 */
export function RoomAssigneeBlock({ name, avatarUrl, statusLine, onPress }: RoomAssigneeBlockProps) {
  if (!name) {
    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel="Assign staff"
        className="self-start rounded-sm border border-border-card px-md py-xs"
      >
        <Text className="font-hestia-primary text-hestia-base text-ink-accent">Not assigned</Text>
      </Pressable>
    );
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
