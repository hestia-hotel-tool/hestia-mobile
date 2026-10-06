import React, { useCallback, useRef, useState } from 'react';
import {
  ScrollView,
  SectionList,
  useWindowDimensions,
  type LayoutChangeEvent,
  type ViewToken,
} from 'react-native';
import { View } from '@/tw';
import type { RoomCardData } from '../../types/allRooms.types';
import { RoomGroupHeader } from './RoomGroupHeader';
import { GROUP_ORDER, type RoomGroup } from '../../utils/roomGroups';
import { scrollTargetOf, type ScrollTarget } from '../../utils/scrollTarget';

/**
 * How much of the *list* the floating band may take before it scrolls inside
 * itself.
 *
 * Nine in-progress rooms measure ~2767pt against an 874pt screen, so it has to
 * be bounded by something. The band this replaces used a flat `maxHeight: 264`
 * that came from reading a single 422x264 card as a whole band.
 *
 * The fraction is of the list's own height, not the window's, because the two
 * are far apart here: the profile header, search field and "Rooms" title take
 * the top third of the screen, so on an iPhone 16 Pro the list measures 562pt
 * against an 874pt window. Against the window the cap came out at 350 and the
 * band, heading included, stood 428pt tall — over three quarters of the list it
 * was supposed to leave usable. Against the list it is 225, and the band is
 * 303pt: one In Progress card pinned with ~260pt still scrolling beneath it.
 *
 * The cap bounds the cards, not the whole band — the heading sits above it. A
 * card runs to ~264pt, so netting the heading off would pin less than one whole
 * card, which defeats the point of pinning.
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
  /** Forwarded to the list so the screen keeps its scroll wiring. */
  scrollProps?: React.ComponentProps<typeof ScrollView>;
  /** Filled with the list's `scrollTo`, for the screen's scroll hooks. */
  scrollRef?: React.RefObject<ScrollTarget | null>;
};

type RoomSection = RoomGroup & { data: RoomCardData[] };

/** Viewability with no minimum: a header one pixel on screen still counts. */
const VIEWABILITY = { itemVisiblePercentThreshold: 0, minimumViewTime: 0 };

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
 * The list is a SectionList, so only the cards near the screen are mounted.
 * Whether the band has left the top is read from viewability rather than a
 * measured offset: a section header reports as a token with a `null` index,
 * so the band is floating once the first thing on screen is past its header.
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

  /*
   * The list's own height, so the cap is a fraction of the space the band
   * actually shares. Falls back to the window for the first frame only.
   */
  const [listHeight, setListHeight] = useState(0);

  const measureList = useCallback((event: LayoutChangeEvent) => {
    setListHeight(event.nativeEvent.layout.height);
  }, []);

  const cap = Math.round((listHeight || windowHeight) * PINNED_MAX_FRACTION);
  const floatHeight = contentHeight > 0 ? Math.min(cap, contentHeight) : cap;

  /*
   * Floating once the first token on screen sits past the band's heading:
   * one of its cards, or anything in a later band. Tokens arrive in list
   * order, so the first is the topmost.
   *
   * No dependencies on purpose: VirtualizedList keeps the callback it was
   * mounted with. Band order is the fixed `GROUP_ORDER`, so nothing here goes
   * stale when the groups change; the render below still requires the band
   * to exist before it floats anything.
   */
  const handleViewable = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<RoomCardData>[] }) => {
      const first = viewableItems[0];
      const key = (first?.section as RoomSection | undefined)?.key;
      const at = key ? GROUP_ORDER.indexOf(key) : -1;
      const pinnedAt = GROUP_ORDER.indexOf('inProgress');
      const next = at > pinnedAt || (at === pinnedAt && first?.index != null);
      if (next !== floatingRef.current) {
        floatingRef.current = next;
        setFloating(next);
      }
    },
    []
  );

  const sections: RoomSection[] = groups.map((group) => ({ ...group, data: group.rooms }));

  const renderCards = (group: RoomGroup) =>
    group.rooms.map((room) => <React.Fragment key={room.id}>{renderRoom(room)}</React.Fragment>);

  return (
    <View className="flex-1" onLayout={measureList}>
      <SectionList<RoomCardData, RoomSection>
        ref={(list) => {
          if (scrollRef) scrollRef.current = scrollTargetOf(list);
        }}
        {...(scrollProps as object)}
        sections={sections}
        keyExtractor={(room) => room.id}
        renderSectionHeader={({ section }) => <RoomGroupHeader label={section.label} color={section.color} />}
        renderItem={({ item }) => <>{renderRoom(item)}</>}
        stickySectionHeadersEnabled={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={11}
        // Read once at mount, so a key remounts the list if sticky toggles.
        key={stickyInProgress ? 'sticky' : 'plain'}
        onViewableItemsChanged={stickyInProgress ? handleViewable : undefined}
        viewabilityConfig={VIEWABILITY}
      />

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
