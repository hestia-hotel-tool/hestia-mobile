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
  /** `alert` draws the status line in red — the room is over its expected time. */
  statusTone?: 'default' | 'alert';
  /** A second line, e.g. "Ready by 14:30" when a promise time is set. */
  secondaryLine?: string | null;
  onPress?: () => void;
};

/** The flag red used on the card header, for "over time". */
const ALERT_COLOR = '#f92424';
/** The accent pink, for a promise made to the guest. */
const PROMISE_COLOR = '#ff46a3';

/**
 * Who is working the room — Figma 3883:6158.
 *
 * A 35px photo, the name, and one line of assignment state. When nobody is
 * assigned it becomes the "Assign room" button (Figma 2702:7771).
 *
 * Deliberately no chevron: the design has none, and the whole card is already
 * a tap target for the room.
 */
export function RoomAssigneeBlock({
  name,
  avatarUrl,
  statusLine,
  statusTone = 'default',
  secondaryLine,
  onPress,
}: RoomAssigneeBlockProps) {
  const promise = secondaryLine ? (
    <Text
      className="font-hestia-primary text-hestia-sm font-bold"
      style={{ color: PROMISE_COLOR }}
      numberOfLines={1}
    >
      {secondaryLine}
    </Text>
  ) : null;

  const status = statusLine ? (
    <Text
      className={
        statusTone === 'alert'
          ? 'font-hestia-primary text-hestia-sm font-bold'
          : 'font-hestia-primary text-hestia-sm text-ink-primary'
      }
      style={statusTone === 'alert' ? { color: ALERT_COLOR } : undefined}
      numberOfLines={1}
      accessibilityLabel={statusTone === 'alert' ? `Over expected time: ${statusLine}` : undefined}
    >
      {statusLine}
    </Text>
  ) : null;

  if (!name) {
    // Figma 2702:7771: an empty circle where the photo will go, and an "Assign room" pill.
    // A room can be In Progress before anyone is assigned — its countdown and
    // promise still belong on the card, under the button.
    if (!status && !promise) return <AssignRoomButton onPress={onPress} />;
    return (
      <View className="gap-xs">
        <AssignRoomButton onPress={onPress} />
        {status}
        {promise}
      </View>
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
        {status}
        {promise}
      </View>
    </Container>
  );
}

export default RoomAssigneeBlock;
