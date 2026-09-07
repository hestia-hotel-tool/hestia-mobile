import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { STATUS_CONFIGS } from '../../types/allRooms.types';
import type { RoomCardData } from '../../types/allRooms.types';
import { scaleX } from '../../constants/allRoomsStyles';
import { RoomGroupHeader, RoomGroupStrip } from './RoomGroupHeader';
import type { RoomGroup } from '../../utils/roomGroups';

/** Figma 3838:1572 — the pinned band is 264 tall, cap included. */
const PINNED_HEIGHT = 264;
const CARD_RADIUS = 12;

export type GroupedRoomsListProps = {
  groups: RoomGroup[];
  /** The screen owns card refs and handlers, so it draws the cards. */
  renderRoom: (room: RoomCardData) => React.ReactNode;
  /** Forwarded to the outer ScrollView so the screen keeps its scroll wiring. */
  scrollProps?: React.ComponentProps<typeof ScrollView>;
  scrollRef?: React.Ref<ScrollView>;
};

/**
 * The Rooms list supervisors and room attendants see — Figma 3838:1117
 * and 3838:1623.
 *
 * Rooms are banded by housekeeping status instead of listed flat, and the
 * In Progress band pins to the top as the rest scrolls beneath it: the rooms
 * being worked right now stay in reach while you look through everything else.
 * That band scrolls inside itself, so a long shift does not push the list off
 * screen.
 */
export function GroupedRoomsList({
  groups,
  renderRoom,
  scrollProps,
  scrollRef,
}: GroupedRoomsListProps) {
  const pinnedIndex = groups.findIndex((g) => g.key === 'inProgress');
  const inProgress = STATUS_CONFIGS.InProgress;

  return (
    <ScrollView
      ref={scrollRef}
      {...scrollProps}
      /*
       * React Native has no `position: sticky`; this is its equivalent. The band
       * scrolls with the list until it reaches the top, then stays there — which
       * is what the design's `sticky top-0` means.
       */
      stickyHeaderIndices={pinnedIndex >= 0 ? [pinnedIndex] : undefined}
    >
      {groups.map((group) =>
        group.key === 'inProgress' ? (
          // Opaque and self-contained: a pinned child is drawn over the list, so
          // anything see-through would let the rooms behind it bleed in.
          <View key={group.key} style={styles.pinned}>
            <RoomGroupStrip
              label={group.label}
              color={group.color}
              iconName={inProgress.iconName}
              iconColor={group.color}
            />
            <ScrollView
              style={styles.pinnedScroll}
              contentContainerStyle={styles.pinnedContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {group.rooms.map((room) => (
                <React.Fragment key={room.id}>{renderRoom(room)}</React.Fragment>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View key={group.key}>
            <RoomGroupHeader label={group.label} color={group.color} />
            {group.rooms.map((room) => (
              <React.Fragment key={room.id}>{renderRoom(room)}</React.Fragment>
            ))}
          </View>
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pinned: {
    maxHeight: PINNED_HEIGHT * scaleX,
    marginBottom: 12 * scaleX,
    borderRadius: CARD_RADIUS * scaleX,
    backgroundColor: '#f9fafc',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90, 117, 157, 0.23)',
    overflow: 'hidden',
  },
  pinnedScroll: {
    flexGrow: 0,
  },
  pinnedContent: {
    paddingTop: 8 * scaleX,
    paddingBottom: 8 * scaleX,
  },
});

export default GroupedRoomsList;
