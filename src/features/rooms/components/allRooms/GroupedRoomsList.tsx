import React, { useCallback, useRef, useState } from 'react';
import {
  ScrollView,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { View } from '@/tw';
import type { RoomCardData } from '../../types/allRooms.types';
import { RoomGroupHeader } from './RoomGroupHeader';
import type { RoomGroup } from '../../utils/roomGroups';

/**
 * How much of the window the floating band may take before it scrolls inside
 * itself.
 *
 * Nine in-progress rooms measure ~2767pt against an 874pt screen, so it has to
 * be bounded by something. A fraction of the window keeps the list beneath it
 * usable at any device size; the band this replaces used a flat `maxHeight: 264`
 * that came from reading a single 422x264 card as a whole band.
 */
const PINNED_MAX_FRACTION = 0.4;

export type GroupedRoomsListProps = {
  groups: RoomGroup[];
  /** The screen owns card refs and handlers, so it draws the cards. */
  renderRoom: (room: RoomCardData) => React.ReactNode;
  /**
   * Float the In Progress band once it scrolls off the top. Supervisors only —
   * see `ROOMS_LIST_CHROME`.
   */
  stickyInProgress?: boolean;
  /** Forwarded to the ScrollView so the screen keeps its scroll wiring. */
  scrollProps?: React.ComponentProps<typeof ScrollView>;
  scrollRef?: React.Ref<ScrollView>;
};

/**
 * The Rooms list housekeeping leadership and supervisors see — Figma 3883:5570
 * and 3838:1117.
 *
 * Rooms are banded by housekeeping status: Paused, In Progress, Priority, Dirty,
 * Cleaned, Inspected. Every band is a heading followed by its cards, and both
 * variants render exactly the same list.
 *
 * For supervisors the In Progress band additionally floats: the screen is
 * identical at rest, and once the band scrolls off the top a copy of it pins
 * over the list so the rooms being worked stay in reach. That is what the frame
 * means by marking the card `sticky top-0` (node 3838:1572), and it is why the
 * list itself is left alone — the only difference from the leadership screen
 * should be the floating, not the layout.
 *
 * Two approaches were tried and abandoned, both worth not repeating:
 *
 *  - **`stickyHeaderIndices`** is built for a short fixed-height header. Handed
 *    a whole band it squashed the cards into a few pixels of overlapping lines.
 *    Removing the nested scroll view changed nothing, so the sticky wrapper is
 *    the limit, not the nesting.
 *  - **Hoisting the band above the list** worked, but permanently reserved the
 *    top of the screen, so a supervisor's layout differed from leadership's
 *    before a finger touched it.
 */
export function GroupedRoomsList({
  groups,
  renderRoom,
  stickyInProgress = false,
  scrollProps,
  scrollRef,
}: GroupedRoomsListProps) {
  const { height: windowHeight } = useWindowDimensions();

  /*
   * Derived, never a constant: `groupRoomsByStatus` drops empty bands, so the
   * In Progress band's position shifts as filters change.
   */
  const pinnedIndex = stickyInProgress
    ? groups.findIndex((group) => group.key === 'inProgress')
    : -1;
  const pinnedGroup = pinnedIndex >= 0 ? groups[pinnedIndex] : undefined;

  /*
   * Where the band sits in the scroll content, so we know when it has left the
   * top. A ref rather than state: the scroll handler reads it every frame and
   * should not re-subscribe when it changes.
   */
  const bandTop = useRef<number | null>(null);
  const floatingRef = useRef(false);
  const [floating, setFloating] = useState(false);

  /*
   * The floating copy's height, driven by what its cards measure.
   *
   * A vertical ScrollView has no intrinsic height: in a column parent it lays
   * out at zero, and `maxHeight` does not save it — a maximum is not a size.
   * The collapse is silent, because the content still measures while the view
   * around it never lays out at all.
   */
  const [contentHeight, setContentHeight] = useState(0);
  const cap = Math.round(windowHeight * PINNED_MAX_FRACTION);
  const floatHeight = contentHeight > 0 ? Math.min(cap, contentHeight) : cap;

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollProps?.onScroll?.(event);
      const top = bandTop.current;
      if (top == null) return;
      // Engages the moment the band's own top passes the viewport's, which is
      // where `position: sticky` would take hold.
      const next = event.nativeEvent.contentOffset.y > top;
      if (next !== floatingRef.current) {
        floatingRef.current = next;
        setFloating(next);
      }
    },
    [scrollProps]
  );

  const rememberBandTop = useCallback((event: LayoutChangeEvent) => {
    bandTop.current = event.nativeEvent.layout.y;
  }, []);

  const renderCards = (group: RoomGroup) =>
    group.rooms.map((room) => <React.Fragment key={room.id}>{renderRoom(room)}</React.Fragment>);

  return (
    <View className="flex-1">
      <ScrollView
        ref={scrollRef}
        {...scrollProps}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {groups.map((group, index) => (
          <View key={group.key} onLayout={index === pinnedIndex ? rememberBandTop : undefined}>
            <RoomGroupHeader label={group.label} color={group.color} />
            {renderCards(group)}
          </View>
        ))}
      </ScrollView>

      {floating && pinnedGroup && (
        // Opaque: it is painted over the list, so rows passing beneath it must
        // not show through.
        <View className="absolute left-0 right-0 top-0 bg-surface-primary">
          <RoomGroupHeader label={pinnedGroup.label} color={pinnedGroup.color} />
          <ScrollView
            style={{ height: floatHeight }}
            onContentSizeChange={(_width, height) => setContentHeight(height)}
            // Android hands vertical drags to a nested list only with this;
            // iOS decides by hit-testing.
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {renderCards(pinnedGroup)}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default GroupedRoomsList;
