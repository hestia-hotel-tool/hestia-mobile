import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';

import { View, Text, Pressable } from '@/tw';
import { scaleX, DESIGN_WIDTH } from '@/utils/responsive';
import { typography } from '@/theme';
import { useLiveRoomChanges } from '@/hooks/useLiveRoomChanges';
import { isTheirs } from '../utils/isTheirs';
import { RoomListCard } from '@features/rooms/components/roomsList';
import { GroupedRoomsList } from '@features/rooms/components/allRooms/GroupedRoomsList';
import { groupRoomsByStatus, isActivePriority } from '@features/rooms/utils/roomGroups';
import { mapFrontOfficeToRoomType } from '@features/rooms/utils/roomType';
import { assignRoomToStaff, fetchAllRooms, unassignRoomsFromStaff } from '@features/rooms/services/rooms';
import ReassignModal from '@features/rooms/components/roomDetail/ReassignModal';
import type { RoomCardData } from '@features/rooms/types/allRooms.types';

import StaffRoomsHeader from '../components/staffRooms/StaffRoomsHeader';
import RoomSelectCheckbox from '../components/staffRooms/RoomSelectCheckbox';
import ReassignFooter from '../components/staffRooms/ReassignFooter';
import StaffActionMenu, { type StaffRoomsAction } from '../components/staffRooms/StaffActionMenu';
import StaffRoomsFilterSheet, { ALL_ROOM_FILTERS, type RoomFilterKey } from '../components/staffRooms/StaffRoomsFilterSheet';
import { Icon } from '@/components/Icon';
import EmptyStaffState from '../components/EmptyStaffState';
import { useStaffAssignedRooms } from '../hooks/useStaffAssignedRooms';
import type { StaffRosterPerson, StaffShiftState } from '../types/staffRoster.types';
import { STAFF_ROOMS_LAYOUT as L } from '../components/staffRooms/staffRoomsLayout';

/**
 * What the roster hands over when you tap "See rooms".
 *
 * **Display fields travel as params rather than being re-fetched.** The roster
 * has already loaded this person; re-querying to redraw a name and an avatar
 * that are on screen at the moment of the tap would mean a visible blank header
 * for the length of a round trip. The rooms *are* fetched, because the roster
 * only holds their numbers and statuses, not the guests, reservations and
 * assignment times these cards draw.
 *
 * All values arrive as strings — expo-router serialises params — so `state` and
 * `shift` are validated below rather than cast.
 */
export interface StaffRoomsParams {
  staffId: string;
  name: string;
  avatarUrl?: string;
  /** Shown under the name; `departmentName` is the fallback. */
  jobTitle?: string;
  departmentName?: string;
  state?: StaffShiftState;
  shift?: 'AM' | 'PM';
}

const SHIFT_STATES: ReadonlySet<string> = new Set(['on_shift', 'on_break', 'shift_end']);

/** First value only — expo-router gives `string | string[]` for repeated keys. */
function one(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.length > 0 ? v : undefined;
}

/**
 * Every room one member of staff holds this shift — Figma 3810:173.
 *
 * ## Almost all of this screen is the Rooms list
 *
 * The frame's body is not a new design: it is the supervisor Rooms list,
 * filtered to one person. Same band headings with the rules either side, same
 * coloured status cap, same card with the room number, category, front-office
 * status, guest panel and assignee block. So it is composed, not rebuilt —
 * `groupRoomsByStatus`, `GroupedRoomsList` and `RoomListCard`, unchanged.
 *
 * What is actually new is the header band and the query behind it. Everything
 * else that looks like work here is a prop.
 *
 * ## The cards are read-only
 *
 * Tapping one opens Room Detail; the status pill does nothing. The Rooms list's
 * inline status change drags ~300 lines of popover anchoring, an inspection
 * modal and a change-in-flight state with it, and none of that is on this
 * frame. Room Detail can change the status, and `refresh` picks the result up
 * on the way back.
 */
export default function StaffRoomsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<Record<string, string | string[]>>();

  const staffId = one(params.staffId) ?? '';
  const rawState = one(params.state);
  const rawShift = one(params.shift);
  const shift: 'AM' | 'PM' = rawShift === 'PM' ? 'PM' : 'AM';

  /*
   * A `StaffRosterPerson` rebuilt from the params, for the header alone.
   *
   * `StaffIdentityRow` reads five of its fields; the rest exist to satisfy the
   * type. It is not passed anywhere else, so a partial person cannot leak into
   * something that would expect the workload to be real.
   */
  const person: StaffRosterPerson = useMemo(
    () => ({
      id: staffId,
      name: one(params.name) ?? 'Staff',
      avatarUrl: one(params.avatarUrl),
      jobTitle: one(params.jobTitle),
      departmentName: one(params.departmentName),
      state: rawState && SHIFT_STATES.has(rawState) ? (rawState as StaffShiftState) : 'on_shift',
      shiftName: shift,
      statKind: 'cleaning',
      rooms: [],
      ticketList: [],
    }),
    [staffId, params.name, params.avatarUrl, params.jobTitle, params.departmentName, rawState, shift]
  );

  const { rooms, loading, error, refresh } = useStaffAssignedRooms(staffId || null, shift);
  // Live: reloads quietly when one of their rooms or assignments changes.
  const silentRefresh = useCallback(() => refresh({ silent: true }), [refresh]);
  useLiveRoomChanges(silentRefresh, {
    enabled: !!staffId,
    isRelevant: (change) => isTheirs(change, staffId || null, rooms),
  });


  /*
   * Reassign is a **mode on this screen**, not another screen.
   *
   * 3810:173 and 3831:99 are the same list, the same bands and the same cards;
   * what changes is a title, a column of checkboxes and a footer. Pushing a
   * route for that would rebuild and re-fetch everything to alter three things,
   * and would put a back stack between the selection and the list it came from.
   */
  /** The Action in progress, or null for the plain list. */
  const [mode, setMode] = useState<StaffRoomsAction | null>(null);
  const reassigning = mode != null;
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerBottom, setHeaderBottom] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<ReadonlySet<RoomFilterKey>>(ALL_ROOM_FILTERS);
  /** Assign Rooms lists the hotel's rooms for the shift that are not already this person's. */
  const [hotelRooms, setHotelRooms] = useState<RoomCardData[] | null>(null);

  const enterMode = useCallback(
    (action: StaffRoomsAction) => {
      setMenuOpen(false);
      setSelectedIds(new Set());
      setMode(action);
      if (action === 'assign') {
        setHotelRooms(null);
        fetchAllRooms(shift)
          .then((data) => setHotelRooms(shift === 'PM' ? (data.roomsPM ?? data.rooms) : data.rooms))
          .catch((e) => {
            if (__DEV__) console.warn('[StaffRoomsScreen] Could not load rooms', e);
            setHotelRooms([]);
          });
      }
    },
    [shift]
  );

  const exitReassign = useCallback(() => {
    setMode(null);
    setSelectedIds(new Set());
  }, []);

  const toggleSelected = useCallback((roomId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
      return next;
    });
  }, []);

  /**
   * Hand the selection to another member of staff.
   *
   * `assignRoomToStaff` upserts by `(room_id, shift_id)`, so one call per room
   * both moves it off this person and onto the next — there is no separate
   * unassign. Sequential rather than `Promise.all`: these are writes against
   * one table under RLS, and a partial failure that is easy to report beats a
   * faster one that is not.
   */
  const handleStaffChosen = useCallback(
    async (nextStaffId: string) => {
      const ids = [...selectedIds];
      setAssigning(true);
      // In parallel: one by one, ten rooms waited on 30-40 round trips in a row.
      const results = await Promise.allSettled(ids.map((roomId) => assignRoomToStaff(roomId, nextStaffId, shift)));
      const failed = results.filter((r) => r.status === 'rejected' || !r.value).length;
      if (__DEV__) results.forEach((r, i) => r.status === 'rejected' && console.warn('[StaffRoomsScreen] Could not reassign', ids[i], r.reason));
      setAssigning(false);
      exitReassign();
      // Whatever happened, the list is now stale — a room that moved is no
      // longer this person's.
      refresh();
      if (failed > 0) {
        Alert.alert(
          'Some rooms did not move',
          `${ids.length - failed} of ${ids.length} were reassigned. Try the rest again.`
        );
      }
    },
    [selectedIds, shift, exitReassign, refresh]
  );

  /** Unassign: the chosen rooms come off this person for the shift. */
  const handleUnassign = useCallback(async () => {
    const ids = [...selectedIds];
    setAssigning(true);
    try {
      await unassignRoomsFromStaff(ids, staffId, shift);
    } catch (e) {
      Alert.alert('Rooms not unassigned', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setAssigning(false);
      exitReassign();
      refresh();
    }
  }, [selectedIds, staffId, shift, exitReassign, refresh]);

  /** Assign Rooms: the chosen rooms go to this person. */
  const handleAssignHere = useCallback(async () => {
    const ids = [...selectedIds];
    setAssigning(true);
    const results = await Promise.allSettled(ids.map((roomId) => assignRoomToStaff(roomId, staffId, shift)));
    const failed = results.filter((r) => r.status === 'rejected' || !r.value).length;
    if (__DEV__) results.forEach((r, i) => r.status === 'rejected' && console.warn('[StaffRoomsScreen] Could not assign', ids[i], r.reason));
    setAssigning(false);
    exitReassign();
    refresh();
    if (failed > 0) {
      Alert.alert('Some rooms were not assigned', `${ids.length - failed} of ${ids.length} were assigned. Try the rest again.`);
    }
  }, [selectedIds, staffId, shift, exitReassign, refresh]);

  const handleFooterAction = useCallback(() => {
    if (mode === 'reassign') setPickerOpen(true);
    else if (mode === 'assign') void handleAssignHere();
    else if (mode === 'unassign') {
      const n = selectedIds.size;
      Alert.alert(
        `Unassign ${n} ${n === 1 ? 'room' : 'rooms'}?`,
        `${n === 1 ? 'It' : 'They'} will no longer be ${person.name}'s this shift.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Unassign', style: 'destructive', onPress: () => void handleUnassign() },
        ]
      );
    }
  }, [mode, selectedIds, person.name, handleAssignHere, handleUnassign]);

  // The list on screen: this person's rooms, or the hotel's for Assign, with the filter applied.
  const source = useMemo(() => {
    const base = mode === 'assign' ? (hotelRooms ?? []).filter((r) => r.roomAttendantAssigned?.userId !== staffId) : (rooms ?? []);
    if (filters.size === ALL_ROOM_FILTERS.size) return base;
    return base.filter((r) => (filters.has('Priority') && isActivePriority(r)) || filters.has(r.houseKeepingStatus as RoomFilterKey));
  }, [mode, hotelRooms, rooms, staffId, filters]);
  const groups = useMemo(() => groupRoomsByStatus(source), [source]);
  const filterCounts = useMemo(() => {
    const base = mode === 'assign' ? (hotelRooms ?? []).filter((r) => r.roomAttendantAssigned?.userId !== staffId) : (rooms ?? []);
    const count = (k: RoomFilterKey) =>
      base.filter((r) => (k === 'Priority' ? isActivePriority(r) : r.houseKeepingStatus === k)).length;
    return { Dirty: count('Dirty'), InProgress: count('InProgress'), Cleaned: count('Cleaned'), Inspected: count('Inspected'), Priority: count('Priority') };
  }, [mode, hotelRooms, rooms, staffId]);
  const listLoading = mode === 'assign' ? hotelRooms == null : loading && rooms == null;

  const handleBack = useCallback(() => {
    // In reassign mode, back leaves the mode rather than the screen — the
    // selection is the thing on screen, so it is the thing back undoes.
    if (reassigning) {
      exitReassign();
      return;
    }
    if (navigation.canGoBack()) navigation.goBack();
    else router.replace('/(tabs)/(staff)');
  }, [reassigning, exitReassign, navigation, router]);

  const handleRoomPress = useCallback(
    (room: RoomCardData) => {
      // The same three params the Rooms list passes, so Room Detail opens on
      // the layout it would have got from there.
      const roomType = mapFrontOfficeToRoomType(room.frontOfficeStatus, room.guests?.length ?? 0);
      (navigation as unknown as {
        navigate: (name: string, params: Record<string, unknown>) => void;
      }).navigate('room/[roomId]', { room, roomType, roomId: room.id });
    },
    [navigation]
  );

  const s = (n: number) => n * scaleX;

  /** What a card measures in the normal list: the window less the slot gutters. */
  const cardWidth = DESIGN_WIDTH * scaleX - L.list.cardSlot.paddingHorizontal * 2;

  /**
   * How much of the list the pinned footer covers.
   *
   * Computed from its parts rather than measured: `onLayout` would arrive a
   * frame after the mode switches, and the list would jump. Every term is the
   * same constant the footer lays itself out with, so the two cannot disagree
   * without someone editing one and not the other.
   */
  const footerHeight =
    s(
      L.reassign.footer.paddingTop +
        L.reassign.footer.buttonHeight +
        L.reassign.footer.cancelMarginTop +
        L.reassign.footer.cancelFontSize * 1.4 +
        L.reassign.footer.paddingBottom
    ) + insets.bottom;

  /**
   * One row of the list, in whichever mode the screen is in.
   *
   * Reassign mode wraps the *same* `RoomListCard` in a row with the checkbox
   * and moves the tap from "open this room" to "select this room". The card is
   * untouched — it does not know the mode exists, which is why the two states
   * cannot drift apart.
   *
   * The whole row is the target, not the 29pt box: that is under the 44pt
   * minimum, and the frame's own instruction is "Touch to select rooms".
   */
  const renderRoom = useCallback(
    (room: RoomCardData) => {
      if (!reassigning) {
        return (
          <View style={L.list.cardSlot}>
            <RoomListCard room={room} onPress={() => handleRoomPress(room)} />
          </View>
        );
      }

      const B = L.reassign.checkbox;
      const checked = selectedIds.has(room.id);
      return (
        <Pressable
          onPress={() => toggleSelected(room.id)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={`Room ${room.roomNumber}`}
          // Top-aligned: the box sits 12 below the card's top (4361:6099).
          className="flex-row items-start"
          style={{
            paddingLeft: s(B.left),
            paddingRight: L.list.cardSlot.paddingHorizontal,
            paddingBottom: L.list.cardSlot.paddingBottom,
          }}
        >
          <View style={{ marginTop: s(B.topOffset) }}>
            <RoomSelectCheckbox checked={checked} />
          </View>
          <View style={{ width: s(B.gapToCard) }} />
          {/*
            The card keeps its **full width and runs off the right edge**, which
            is what 3831:99 draws: its panels sit at x=71 and are 422 wide on a
            440 canvas, so they end at 493.

            That is deliberate here, not just faithful. Shrinking the card to fit
            beside the checkbox reflows its insides — the guest name wraps and
            truncates, the date range breaks mid-string — so the same room looks
            like a different room depending on the mode. Sliding it keeps every
            card identical to how it reads in the normal list; what clips is the
            status pill on the right, which does nothing in this mode anyway.

            `pointerEvents="none"`: the card is a `Pressable` internally and
            would otherwise swallow the tap and open Room Detail from inside a
            selection.
          */}
          <View style={{ width: cardWidth, flexShrink: 0 }} pointerEvents="none">
            <RoomListCard room={room} />
          </View>
        </Pressable>
      );
    },
    [reassigning, selectedIds, toggleSelected, handleRoomPress, cardWidth]
  );

  const scrollProps = useMemo(
    () => ({
      showsVerticalScrollIndicator: false,
      contentContainerStyle: {
        // The footer is pinned over the list, so its height has to be cleared
        // the way `BottomTabBar`'s is elsewhere — otherwise the last card sits
        // under it and cannot be selected.
        paddingBottom:
          insets.bottom + s(L.list.paddingBottom) + (reassigning ? footerHeight : 0),
      },
      refreshControl: <RefreshControl refreshing={loading && rooms != null} onRefresh={() => refresh()} />,
    }),
    [insets.bottom, loading, rooms, refresh, reassigning, footerHeight]
  );

  return (
    <View className="flex-1 bg-surface-primary">
      <View onLayout={(e) => setHeaderBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
        <StaffRoomsHeader
          person={person}
          onBackPress={handleBack}
          onActionPress={() => setMenuOpen(true)}
          actionLabel={mode === 'reassign' ? 'Reassign' : mode === 'assign' ? 'Assign' : mode === 'unassign' ? 'Unassign' : 'Action'}
        />
      </View>

      {/* 3810:173 — "‹Name› Rooms" (or "All Rooms" when assigning), the count selected, and Filter. */}
      <View
        className="flex-row items-start"
        style={{ marginTop: s(L.title.marginTop), marginBottom: s(L.title.marginBottom), marginHorizontal: s(L.gutter) }}
      >
        <View className="flex-1">
          <Text
            className="font-hestia-primary font-bold"
            numberOfLines={1}
            // 4361:6074 — bold 19, black.
            style={{ fontSize: s(19), fontFamily: typography.fontFamily.primary, color: '#000000' }}
          >
            {mode === 'assign' ? 'All Rooms' : `${person.name} Rooms`}
          </Text>
          {reassigning ? (
            <Text
              className="font-hestia-primary"
              // 4364:6111 — "2 Rooms Selected", regular 16.
              style={{ marginTop: s(6), fontSize: s(16), fontWeight: '400', fontFamily: typography.fontFamily.primary, color: '#000000' }}
            >
              {selectedIds.size} {selectedIds.size === 1 ? 'Room' : 'Rooms'} Selected
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => setFilterOpen(true)}
          hitSlop={10}
          className="flex-row items-center"
          style={{ gap: s(15), marginTop: s(2) }}
          accessibilityRole="button"
          accessibilityLabel={filters.size === ALL_ROOM_FILTERS.size ? 'Filter rooms' : 'Filter rooms, filtered'}
        >
          {/* 4361:6079 / 6075 — "Filter" light 17 in #5a759d, then the 26x12 glyph. */}
          <Text style={{ fontSize: s(17), fontWeight: '300', fontFamily: typography.fontFamily.primary, color: '#5a759d' }}>
            Filter
          </Text>
          <Icon name="action-filter" size={s(12)} color="#5a759d" />
        </Pressable>
      </View>

      {listLoading ? (
        <View style={{ paddingVertical: s(48) }}>
          <ActivityIndicator size="large" color="#5a759d" />
        </View>
      ) : error ? (
        <Text
          className="text-center font-hestia-primary text-ink-tertiary"
          style={{ paddingVertical: s(40), fontSize: s(14) }}
        >
          {error}
        </Text>
      ) : groups.length === 0 ? (
        /*
         * Reachable despite the roster hiding "See rooms" for someone with
         * nothing: the last room can be reassigned while this screen is open,
         * and `refresh` would then land here.
         */
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <EmptyStaffState reason="noAssignedRooms" />
        </ScrollView>
      ) : (
        <GroupedRoomsList groups={groups} renderRoom={renderRoom} scrollProps={scrollProps} />
      )}

      {reassigning ? (
        <ReassignFooter
          count={selectedIds.size}
          verb={mode === 'reassign' ? 'Reassign' : mode === 'assign' ? 'Assign' : 'Unassign'}
          busy={assigning}
          onAssign={handleFooterAction}
          onCancel={exitReassign}
        />
      ) : null}

      {/*
        The staff picker is `roomDetail/ReassignModal`, unchanged — it is
        already a full-screen list of staff with On Shift / AM / PM tabs and a
        search, and it reports a chosen id and closes. Its `roomNumber` prop is
        declared but never rendered, so there is nothing to tell it about a
        selection of several rooms.

        `showAutoAssign={false}`: Auto Assign picks the least-loaded person for
        *one* room. Handing it a batch would pile the whole selection onto that
        one person, which is the opposite of balancing.
      */}
      <ReassignModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onStaffSelect={handleStaffChosen}
        onAutoAssign={() => setPickerOpen(false)}
        showAutoAssign={false}
        currentAssignedStaffId={staffId}
      />

      <StaffActionMenu
        visible={menuOpen}
        top={headerBottom}
        onClose={() => setMenuOpen(false)}
        onSelect={enterMode}
      />
      <StaffRoomsFilterSheet
        visible={filterOpen}
        selected={filters}
        counts={filterCounts}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setFilterOpen(false);
        }}
      />
    </View>
  );
}
