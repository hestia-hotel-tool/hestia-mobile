import React from 'react';
import { ScrollView } from 'react-native';
import { View } from '@/tw';
import type { RoomCardData } from '../../types/allRooms.types';
import { RoomGroupHeader } from './RoomGroupHeader';
import type { RoomGroup } from '../../utils/roomGroups';

export type GroupedRoomsListProps = {
  groups: RoomGroup[];
  /** The screen owns card refs and handlers, so it draws the cards. */
  renderRoom: (room: RoomCardData) => React.ReactNode;
  /** Forwarded to the ScrollView so the screen keeps its scroll wiring. */
  scrollProps?: React.ComponentProps<typeof ScrollView>;
  scrollRef?: React.Ref<ScrollView>;
};

/**
 * The Rooms list housekeeping leadership and supervisors see — Figma 3883:5570
 * and 3838:1117.
 *
 * Rooms are banded by housekeeping status: Paused, In Progress, Priority, Dirty,
 * Cleaned, Inspected. Every band is a heading followed by its cards.
 *
 * There is no pinned band, and this is a correction rather than a design change.
 * The previous version pinned the In Progress band via `stickyHeaderIndices`,
 * capped it with a coloured strip and scrolled it inside itself at
 * `maxHeight: 264`, citing "Figma 3838:1572 — the pinned band is 264 tall, cap
 * included". But 3838:1572 is *Frame 37, a single room card* measuring 422x264,
 * and 3838:1575 is Rectangle 171, the 73px status cap **inside** that card. One
 * card had been read as a whole band. Neither frame contains a pinned band or a
 * band-level cap; the caps belong to individual Paused and In Progress cards.
 *
 * That misreading was also visibly broken: with the header moved into the flex
 * flow the capped band collapsed to a 1px line — a `rgba(90,117,157,0.23)`
 * hairline with a sliver of `#f0be1b` at its centre — hiding every In Progress
 * room behind it.
 */
export function GroupedRoomsList({
  groups,
  renderRoom,
  scrollProps,
  scrollRef,
}: GroupedRoomsListProps) {
  return (
    <ScrollView ref={scrollRef} {...scrollProps}>
      {groups.map((group) => (
        <View key={group.key}>
          <RoomGroupHeader label={group.label} color={group.color} />
          {group.rooms.map((room) => (
            <React.Fragment key={room.id}>{renderRoom(room)}</React.Fragment>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

export default GroupedRoomsList;
