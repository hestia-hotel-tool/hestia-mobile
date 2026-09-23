import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';

import { View, Text, Pressable } from '@/tw';
import { scaleX, DESIGN_WIDTH } from '@/utils/responsive';
import { typography } from '@/theme';
import { RoomListCard } from '@features/rooms/components/roomsList';
import { GroupedRoomsList } from '@features/rooms/components/allRooms/GroupedRoomsList';
import { groupRoomsByStatus } from '@features/rooms/utils/roomGroups';
import { mapFrontOfficeToRoomType } from '@features/rooms/utils/roomType';
import { assignRoomToStaff } from '@features/rooms/services/rooms';
import ReassignModal from '@features/rooms/components/roomDetail/ReassignModal';
import type { RoomCardData } from '@features/rooms/types/allRooms.types';

import StaffRoomsHeader from '../components/staffRooms/StaffRoomsHeader';
import RoomSelectCheckbox from '../components/staffRooms/RoomSelectCheckbox';
import ReassignFooter from '../components/staffRooms/ReassignFooter';
import EmptyStaffState from '../components/EmptyStaffState';
import { useStaffAssignedRooms } from '../hooks/useStaffAssignedRooms';
import type { StaffRosterPerson, StaffShiftState } from '../types/staffRoster.types';
import { STAFF_ROOMS_LAYOUT as L, STAFF_ROOMS_CHROME as C } from '../components/staffRooms/staffRoomsLayout';

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

  const groups = useMemo(() => groupRoomsByStatus(rooms ?? []), [rooms]);

  /*
   * Reassign is a **mode on this screen**, not another screen.
   *
   * 3810:173 and 3831:99 are the same list, the same bands and the same cards;
   * what changes is a title, a column of checkboxes and a footer. Pushing a
   * route for that would rebuild and re-fetch everything to alter three things,
   * and would put a back stack between the selection and the list it came from.
   */
  const [reassigning, setReassigning] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const enterReassign = useCallback(() => {
    setSelectedIds(new Set());
    setReassigning(true);
  }, []);

  const exitReassign = useCallback(() => {
    setReassigning(false);
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
      let failed = 0;
      for (const roomId of ids) {
        try {
          const result = await assignRoomToStaff(roomId, nextStaffId, shift);
          if (!result) failed += 1;
        } catch (e) {
          failed += 1;
          if (__DEV__) console.warn('[StaffRoomsScreen] Could not reassign', roomId, e);
        }
      }
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
   * The whole row is the target, not the 37pt circle: that is under the 44pt
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
          className="flex-row items-center"
          style={{
            paddingLeft: s(B.left),
            paddingRight: L.list.cardSlot.paddingHorizontal,
            paddingBottom: L.list.cardSlot.paddingBottom,
          }}
        >
          <RoomSelectCheckbox checked={checked} />
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
      refreshControl: <RefreshControl refreshing={loading && rooms != null} onRefresh={refresh} />,
    }),
    [insets.bottom, loading, rooms, refresh, reassigning, footerHeight]
  );

  return (
    <View className="flex-1 bg-surface-primary">
      <StaffRoomsHeader
        person={person}
        onBackPress={handleBack}
        onReassignPress={enterReassign}
        showReassign={!reassigning}
      />

      <View
        style={{
          marginTop: s(L.title.marginTop),
          marginBottom: s(L.title.marginBottom),
          marginHorizontal: s(L.gutter),
        }}
      >
        <Text
          className="font-hestia-primary font-bold"
          style={{
            fontSize: s(reassigning ? L.title.reassignFontSize : L.title.fontSize),
            fontFamily: typography.fontFamily.primary,
            color: C.title,
          }}
        >
          {reassigning ? 'Reassign Rooms' : 'Rooms'}
        </Text>
        {reassigning ? (
          /* Node 3831:1054 — the instruction, and the only one the mode gives. */
          <Text
            className="font-hestia-primary"
            style={{
              marginTop: s(L.title.subtitleMarginTop),
              fontSize: s(L.title.subtitleFontSize),
              fontFamily: typography.fontFamily.primary,
              color: C.title,
            }}
          >
            Touch to select rooms
          </Text>
        ) : null}
      </View>

      {loading && rooms == null ? (
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
          busy={assigning}
          onAssign={() => setPickerOpen(true)}
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
    </View>
  );
}
