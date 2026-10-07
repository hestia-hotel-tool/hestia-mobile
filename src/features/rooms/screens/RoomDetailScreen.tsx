/**
 * Room Detail Screen - Wrapper that transforms route params to props
 * Uses reusable RoomDetailContent component
 * Supports: Arrival, Departure, ArrivalDeparture, Stayover, Turndown
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRoute, useNavigation, useFocusEffect, router, NativeStackNavigationProp } from 'expo-router';
import { ROOM_DETAIL_HEADER, scaleX } from '../constants/roomDetailStyles';
import StatusChangeModal from '../components/StatusChangeModal';
import ReturnLaterModal from '../components/roomDetail/ReturnLaterModal';
import PromiseTimeModal from '../components/roomDetail/PromiseTimeModal';
import type { StaffMember } from '@features/staff/types/staff.types';
import { submitCleaningReport, type CleaningReport } from '../services/cleaningReports';
import RefuseServiceModal from '../components/roomDetail/RefuseServiceModal';
import ReassignModal from '../components/roomDetail/ReassignModal';
import AddNoteModal from '../components/roomDetail/AddNoteModal';
import AddTaskModal from '../components/roomDetail/AddTaskModal';
import ViewTaskModal from '../components/roomDetail/ViewTaskModal';
import RoomDetailContent from '../components/roomDetail/RoomDetailContent';
import { mapFrontOfficeToRoomType } from '../utils/roomType';
import type { RoomCardData, StatusChangeOption, RoomActivityState } from '../types/allRooms.types';
import { deriveRoomActivityState } from '../types/allRooms.types';
import type { Note, Task, RoomType, HistoryEvent } from '../types/roomDetail.types';
import { groupHistoryEvents } from '../utils/groupHistoryEvents';
import type { LostAndFoundItem } from '@features/lost-and-found/types/lostAndFound.types';
import type { RootStackParamList } from '@/types/navigation';
import { roomStateFromClock, useRoomsStore } from '../store/useRoomsStore';
import { useToast } from '@/contexts/ToastContext';
import { authService } from '@features/auth/services/auth';
import { colors } from '@/theme';
import { getMockHistoryEvents } from '@/mocks/mockHistoryData';
import { generateHistoryReport } from '../utils/generateHistoryReport';
import { showStayoverWithLinenBadge } from '../utils/stayoverLinen';
import { getDefaultTaskText } from '../utils/defaultTasks';
import { usePermissions } from '@/domain/rbac/usePermissions';
import { useRoomStatusAccess } from '../hooks/useRoomStatusAccess';
import { askReason } from '../utils/askReason';
import { OVERRIDE_REASONS, SEND_BACK_REASONS, workStatusAfter } from '../utils/roomStatusMachine';
import { PERMISSIONS } from '@/domain/rbac';
import { useMessageModal } from '@/contexts/MessageModalContext';
import { getRoomNotes, addRoomNote, getRoomDetailsById, fullRoomDetailsToRoomCardData, type FullRoomDetails, type RoomStateUpdate, assignRoomToStaff } from '../services/rooms';
import { formatDueTime } from '@/utils/formatting';
import { supabase } from '@/lib/supabase';
import { invalidateNotificationBadges, markRoomAssignmentNotificationsReadForRoom } from '@/lib/inAppNotifications';
import { buildFriendlyRoomHistoryMessage, getRoomHistoryEvents, logRoomHistoryEvent } from '../services/roomHistory';

type RoomDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'room/[roomId]'
>;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


function formatRegisteredTimestamp(iso?: string | null): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${hh}:${mm}, ${dt.getDate()} ${monthNames[dt.getMonth()]} ${dt.getFullYear()}`;
}

type ServiceBusy = 'dndSet' | 'dndStill' | 'dndCleared' | 'serviceResumed' | 'returnLaterCleared' | 'promiseRemoved' | null;

export default function RoomDetailScreen() {
  const navigation = useNavigation<RoomDetailScreenNavigationProp>();
  const route = useRoute();
  const params = route.params as { 
    room?: RoomCardData; 
    roomType?: RoomType; 
    roomId?: string;
    initialTab?: 'Overview' | 'Tickets' | 'Checklist' | 'History';
    departmentName?: string;
    /** Opened from the Rooms list's status menu: open this sheet on arrival. */
    openActivity?: 'returnLater' | 'refuseService' | 'promisedTime';
  } | undefined;
  const initialRoom = params?.room;
  const initialRoomType = params?.roomType ?? 'ArrivalDeparture';
  const roomId = params?.roomId;
  const initialTab = params?.initialTab;
  const departmentName = params?.departmentName;

  const { updateRoom, runRoomAction, updatingRoomId, data: roomsData } = useRoomsStore(
    useShallow((st) => ({
      updateRoom: st.updateRoom,
      runRoomAction: st.runRoomAction,
      updatingRoomId: st.updatingRoomId,
      data: st.data,
    }))
  );
  const { accessFor, canInspect: canInspectRooms } = useRoomStatusAccess();
  const { can } = usePermissions();
  /*
   * Only holders of rooms.reassign (not room attendants) may change who a room
   * is assigned to. Without it every Reassign control is withheld, not just
   * disabled, so the attendant sees who has the room and nothing to tap.
   */
  const canReassign = can(PERMISSIONS.ROOMS_REASSIGN);
  const messageModal = useMessageModal();
  const shift = roomsData?.selectedShift ?? 'AM';

  // If we already have a room object from navigation, keep it as the single source of truth
  // to avoid "correct first render -> wrong after refetch" UI flips.
  const [loadingDetails, setLoadingDetails] = useState(!!(roomId && UUID_REGEX.test(roomId) && !initialRoom));
  const [fetchedRoom, setFetchedRoom] = useState<RoomCardData | null>(null);
  const [fetchedRoomType, setFetchedRoomType] = useState<RoomType | null>(null);
  const [fetchedNotes, setFetchedNotes] = useState<Note[] | null>(null);
  const [fetchedAssignedStaff, setFetchedAssignedStaff] = useState<{
    id: string;
    name: string;
    avatar?: any;
    initials?: string;
    avatarColor?: string;
    department?: string;
  } | null>(null);
  const [fetchedLostAndFound, setFetchedLostAndFound] = useState<LostAndFoundItem[] | null>(null);

  /*
   * A task notification ("You have been assigned to Room 201") is read by
   * opening its room — from the Tasks list, the Rooms list or a push. Clears
   * it from the Tasks row and the Chat and Rooms tab badges.
   */
  const detailRoomId = roomId ?? initialRoom?.id;

  /**
   * The room's lost & found items, newest registered first.
   *
   * Loaded on its own, however the screen was opened: the full-details fetch
   * above is skipped when coming from a room card, so items used to appear
   * only on a deep link — and a made-up "Wrist Watch" stood in otherwise.
   * Re-run on focus, so an item added via "Add Item" is here on return.
   */
  const loadLostAndFound = useCallback(async () => {
    if (!detailRoomId || !UUID_REGEX.test(detailRoomId)) return;
    const { data, error } = await supabase
      .from('lost_and_found_items')
      .select('id, tracking_number, item_name, description, status, found_at, created_at, found_by_id, registered_by_id, storage_location, image_url')
      .eq('room_id', detailRoomId)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('[RoomDetail] lost & found items', error.message);
      return;
    }
    const rows = (data ?? []) as {
      id: string;
      tracking_number: string | null;
      item_name: string;
      description: string | null;
      status: string | null;
      found_at: string;
      created_at: string | null;
      found_by_id: string | null;
      registered_by_id: string | null;
      storage_location: string | null;
      image_url: string | null;
    }[];
    const staffIds = Array.from(
      new Set(rows.map((r) => r.registered_by_id ?? r.found_by_id).filter((id): id is string => Boolean(id)))
    );
    const userById = new Map<string, { full_name?: string | null; avatar_url?: string | null }>();
    if (staffIds.length > 0) {
      const { data: usersData } = await supabase.from('users').select('id, full_name, avatar_url').in('id', staffIds);
      (usersData ?? []).forEach((user: any) => userById.set(user.id, user));
    }
    setFetchedLostAndFound(
      rows.map((item) => {
        const user = userById.get((item.registered_by_id ?? item.found_by_id) as string);
        return {
          id: item.id,
          itemName: item.item_name,
          itemId: item.tracking_number ?? item.id,
          location: item.description ?? 'Room',
          image: item.image_url ? { uri: item.image_url } : undefined,
          storedLocation: item.storage_location ?? '',
          registeredBy: {
            name: user?.full_name ?? 'Staff',
            avatar: user?.avatar_url ? { uri: user.avatar_url } : undefined,
            timestamp: formatRegisteredTimestamp(item.found_at),
          },
          status: (item.status as 'stored' | 'shipped' | 'returned' | 'discarded') ?? 'stored',
          createdAt: item.created_at ?? item.found_at,
        };
      })
    );
  }, [detailRoomId]);

  useFocusEffect(
    useCallback(() => {
      void loadLostAndFound();
    }, [loadLostAndFound])
  );
  useEffect(() => {
    if (!detailRoomId || !UUID_REGEX.test(detailRoomId)) return;
    void markRoomAssignmentNotificationsReadForRoom(detailRoomId).then((n) => n && invalidateNotificationBadges());
  }, [detailRoomId]);

  useEffect(() => {
    // When we navigated here from the room card, do not refetch/overwrite the room payload.
    // That background update can change guest ordering/images and make the UI "flip".
    if (initialRoom) {
      setLoadingDetails(false);
      return;
    }
    if (!roomId || !UUID_REGEX.test(roomId)) {
      setLoadingDetails(false);
      return;
    }
    let cancelled = false;
    setLoadingDetails(true);
    getRoomDetailsById(roomId)
      .then(async (full: FullRoomDetails | null) => {
        if (cancelled || !full) {
          setLoadingDetails(false);
          return;
        }
        const roomCard = fullRoomDetailsToRoomCardData(full, shift as 'AM' | 'PM');
        setFetchedRoom(roomCard);
        const firstRes = full.reservations[0];
        const rawFrontOffice = firstRes?.front_office_status ?? 'Stayover';
        setFetchedRoomType(
          mapFrontOfficeToRoomType(rawFrontOffice, full.reservations.length)
        );
        setFetchedNotes(
          full.notes.map((n) => ({
            id: n.id,
            text: n.text,
            staff: { name: n.staff.name, avatar: n.staff.avatar_url ?? undefined },
            createdAt: n.created_at,
          }))
        );
        const assignment = full.assignedStaff[0];
        if (assignment) {
          setFetchedAssignedStaff({
            id: assignment.user_id,
            name: assignment.staff.full_name,
            avatar: assignment.staff.avatar_url ?? undefined,
            initials: assignment.staff.full_name.split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase() || '?',
            department: assignment.staff.department_name,
          });
        } else {
          setFetchedAssignedStaff(null);
        }
        setLoadingDetails(false);
      })
      .catch(() => setLoadingDetails(false));
    return () => { cancelled = true; };
  }, [roomId, shift]);

  /*
   * Stands in until the real room arrives, and is never null.
   *
   * It used to be built only while loading, so `room` went null the moment a
   * fetch finished empty — and the early return below it skipped the ~18 hooks
   * that follow. Going from null to a room then rendered a different number of
   * hooks than the previous pass, which React aborts with "Rendered more hooks
   * than during the previous render". That is the deep-link and
   * push-notification path, where there is no `room` param to fall back on.
   */
  const placeholderRoom: RoomCardData = {
    id: roomId ?? '',
    roomNumber: '—',
    roomCategory: '',
    credit: 0,
    frontOfficeStatus: 'Stayover',
    houseKeepingStatus: 'InProgress',
    reservationStatus: 'Occupied',
    guests: [],
    roomAttendantAssigned: null,
    isPriority: false,
    flagged: false,
    specialInstructions: null,
    roomNotes: null,
    noteMadeBy: null,
    notes: undefined,
    withLinen: false,
    promisedTime: null,
  };

  const room: RoomCardData = fetchedRoom ?? initialRoom ?? placeholderRoom;
  const roomType = fetchedRoomType ?? initialRoomType;
  /** Whether `room` is real data rather than the stand-in. Checked after the hooks. */
  const hasRoom = Boolean(fetchedRoom ?? initialRoom);

  const roomGuests = room.guests || [];
  const isUpdating = updatingRoomId === room.id;
  /**
   * The header's measured height in design px, for the status sheets.
   *
   * Both sheets place themselves flush under `headerHeight * scaleX`, and both
   * used to be told a literal 232 — the number the old absolutely-positioned
   * header asserted. The rebuilt header is a flex column, so its height depends
   * on its content (an activity line, a front-office row) and on the device's
   * top inset; 232 was only ever right for an iPhone-16-Pro-shaped device with
   * no subtitle. Falls back to 232 until the first layout pass.
   */
  const [headerDesignHeight, setHeaderDesignHeight] = useState<number | null>(null);
  const modalHeaderHeight = headerDesignHeight ?? 232;
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showReturnLaterModal, setShowReturnLaterModal] = useState(false);
  const [showPromiseTimeModal, setShowPromiseTimeModal] = useState(false);
  const [showRefuseServiceModal, setShowRefuseServiceModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showViewTaskModal, setShowViewTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isAssigningStaff, setIsAssigningStaff] = useState(false);
  const [statusButtonPosition, setStatusButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const statusButtonRef = useRef<React.ComponentRef<typeof TouchableOpacity>>(null);
  
  // Track current status to update header background color
  const [currentStatus, setCurrentStatus] = useState<RoomCardData['houseKeepingStatus']>(room.houseKeepingStatus);
  // Track room data locally to allow updates (e.g., flagged status)
  const [localRoom, setLocalRoom] = useState<RoomCardData>(room);
  /*
   * What the room is doing — paused, returning later, refused, or nothing.
   *
   * Was five separate useStates plus a `customStatusText` string rebuilt on every
   * render from which modal happened to be open. One derived value instead, so
   * the header can only ever show a state the data actually supports.
   */
  const [activity, setActivity] = useState<RoomActivityState>(() =>
    deriveRoomActivityState(room)
  );
  /**
   * The state whose modal is open but not yet confirmed, so the header can
   * preview it. Set only by the modals' own open/close handlers — never read off
   * a visibility flag.
   */
  const [pendingActivity, setPendingActivity] = useState<
    'returnLater' | 'refuseService' | 'promisedTime' | null
  >(null);

  // Track notes in state. For Supabase rooms we load via getRoomNotes; for mock we use room.roomNotes.
  const [notes, setNotes] = useState<Note[]>(() => {
    if (room.roomNotes && room.roomNotes.trim()) {
      const noteTexts = room.roomNotes.split(/\n\n+/).filter((text: string) => text.trim());
      return noteTexts.map((text: string, index: number) => ({
        id: `room-note-${index}`,
        text: text.trim(),
        staff: {
          name: room.noteMadeBy?.name || 'Staff',
          avatar: room.noteMadeBy?.avatar ?? require('../../../../assets/icons/profile-avatar.png'),
        },
        createdAt: new Date().toISOString(),
      }));
    }
    return [];
  });

  // Sync fetched full-details into state when load by roomId completes
  useEffect(() => {
    if (fetchedNotes !== null) setNotes(fetchedNotes);
    if (fetchedAssignedStaff !== null) setAssignedStaff(fetchedAssignedStaff);
    if (fetchedRoom) {
      setLocalRoom(fetchedRoom);
      setCurrentStatus(fetchedRoom.houseKeepingStatus);
      // Re-derive from the fetched room too. Seeding only from the initial `room`
      // meant a deep link or notification into a paused/refused room — which has
      // no `room` param, only a roomId — opened on a plain header.
      setActivity(deriveRoomActivityState(fetchedRoom));
    }
  }, [fetchedNotes, fetchedAssignedStaff, fetchedRoom]);

  // Load notes from room_notes when room is from Supabase and we did not load via getRoomDetailsById
  useEffect(() => {
    if (fetchedNotes !== null) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!room?.id || !uuidRegex.test(room.id)) return;
    getRoomNotes(room.id).then((loaded) => setNotes(loaded)).catch(() => {});
  }, [room?.id, fetchedNotes]);
  
  const [assignedStaff, setAssignedStaff] = useState<{
    id: string;
    name: string;
    avatar?: any;
    initials?: string;
    avatarColor?: string;
    department?: string;
  } | undefined>(
    room.roomAttendantAssigned
      ? {
          // The real user id: the status rules use it to tell the attendant
          // from everyone else (it was a placeholder '1').
          id: room.roomAttendantAssigned.userId ?? '',
          name: room.roomAttendantAssigned.name,
          avatar: room.roomAttendantAssigned.avatar || require('../../../../assets/icons/profile-avatar.png'),
          initials: room.roomAttendantAssigned.initials,
          avatarColor: room.roomAttendantAssigned.avatarColor,
          department: undefined,
        }
      : undefined
  );
  
  /** Who the status rules treat as this room's attendant: Room Detail's own load, else the card's. */
  const assigneeId = assignedStaff ? assignedStaff.id || room.roomAttendantAssigned?.userId || null : null;

  // Track tasks in state - initialize from room data if available
  const [tasks, setTasks] = useState<Task[]>(() => {
    // Initialize from room data if tasks are provided
    if (room.tasks && room.tasks.length > 0) {
      return room.tasks.map(task => ({
        id: task.id,
        text: task.text,
        createdAt: task.createdAt,
      }));
    }
    // Otherwise start with empty array
    return [];
  });
  
  // Track history events in state
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>(() => getMockHistoryEvents(room.roomNumber));

  const refreshHistory = React.useCallback(async () => {
    const id = room?.id;
    if (!id || !UUID_REGEX.test(id)) {
      setHistoryEvents(getMockHistoryEvents(room.roomNumber));
      return;
    }
    try {
      const events = await getRoomHistoryEvents(id);
      setHistoryEvents(events);
    } catch (e) {
      console.warn('[RoomDetailScreen] Failed to refresh room history', e);
    }
  }, [room?.id, room?.roomNumber]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);
  
  /*
   * The tasks to show, never empty.
   *
   * A room with no tasks falls back to the room type's standing task, which is
   * what keeps the Assigned/Task card on screen — the card is gated on having
   * an assignee or a task, so returning [] here would make it vanish for every
   * unassigned, task-less room.
   */
  const displayTasks: Task[] =
    tasks.length > 0
      ? tasks
      : [
          {
            id: 'default-task',
            text: getDefaultTaskText(roomType),
            createdAt: new Date().toISOString(),
          },
        ];

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleDownloadReport = async () => {
    if (isGeneratingReport) return; // Prevent multiple clicks
    
    try {
      setIsGeneratingReport(true);
      
      // One grouping function, shared with the History timeline — see
      // `groupHistoryEvents`. This used to be a ~50-line transcription of
      // HistorySection's `useMemo`, kept in step by hand.
      const sortedGroupedEvents = groupHistoryEvents(historyEvents);

      // Generate and download the PDF
      await generateHistoryReport({
        roomNumber: room.roomNumber,
        roomCode: `${room.roomCategory} - ${room.credit}`,
        events: historyEvents,
        groupedEvents: sortedGroupedEvents,
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      // TODO: Show error alert to user
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };
  
  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.navigate('/(tabs)/(rooms)');
    }
  };

  /**
   * Save to the room, then keep the cleaning clock the database worked out —
   * a trigger starts, stops and resets it on status and pause changes, so the
   * header's countdown follows what was actually stored.
   */
  // The latest local room, for callbacks that must not re-create on every edit.
  const localRoomRef = useRef(localRoom);
  useEffect(() => {
    localRoomRef.current = localRoom;
  }, [localRoom]);

  const saveRoom = useCallback(
    async (updates: RoomStateUpdate) => {
      const clock = await updateRoom(room.id, updates);
      if (clock) {
        /*
         * The database's word on the room, not what was sent: its triggers
         * drop In Progress to Dirty on a DND or refusal, end a DND when
         * cleaning starts, and count DND checks (migration 20260929000400).
         */
        const applied = roomStateFromClock(clock);
        setLocalRoom((prev) => ({ ...prev, ...applied }));
        if (applied.houseKeepingStatus) setCurrentStatus(applied.houseKeepingStatus);
        setActivity(deriveRoomActivityState({ ...localRoomRef.current, ...applied }));
      }
      return clock;
    },
    [room.id, updateRoom]
  );

  const handleStatusPress = () => {
    if (statusButtonRef.current) {
      statusButtonRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setStatusButtonPosition({
          x: pageX,
          y: pageY,
          width,
          height,
        });
        setShowStatusModal(true);
      });
    } else {
      setStatusButtonPosition({
        x: ROOM_DETAIL_HEADER.statusIndicator.left * scaleX,
        y: ROOM_DETAIL_HEADER.statusIndicator.top * scaleX,
        width: ROOM_DETAIL_HEADER.statusIndicator.width * scaleX,
        height: ROOM_DETAIL_HEADER.statusIndicator.height * scaleX,
      });
      setShowStatusModal(true);
    }
  };

  /*
   * One service action at a time, with its own spinner, a toast when it saves
   * and the database's reason when it does not (e.g. "Room 305 is already
   * cleaned: nothing left to service today.").
   */
  const toast = useToast();
  const [serviceBusy, setServiceBusy] = useState<ServiceBusy>(null);
  const runServiceAction = async (key: ServiceBusy, updates: RoomStateUpdate, done: string) => {
    if (serviceBusy) return;
    setServiceBusy(key);
    try {
      await saveRoom(updates);
      toast.show(done, { type: 'success' });
      void refreshHistory();
    } catch (e) {
      messageModal.show({
        title: 'Not saved',
        message: e instanceof Error ? e.message.replace(/^Could not update the room: /, '') : 'Please try again.',
        buttons: [{ text: 'OK' }],
      });
    } finally {
      setServiceBusy(null);
    }
  };
  /** Take the promise back: from the Overview panel or the status menu's row. */
  const handleRemovePromise = async () => {
    if (!localRoomRef.current.promiseTimeAt) return;
    await runServiceAction('promiseRemoved', { promise_time_at: null }, `Promise time removed from room ${room.roomNumber}.`);
    void logRoomHistoryEvent({ roomId: room.id, type: 'promise_time', description: 'Promise time removed' });
  };
  /*
   * A housekeeping status or service-state step — through `room_action()`, the
   * only path for those. The option is resolved against the room status rules
   * for this person (as the attendant, as an inspector, or for the attendant
   * with a reason), a reason is asked for where the rules need one, and the
   * room is then shown as the server left it.
   */
  const acting = useRef(false);
  const act = async (
    option: StatusChangeOption,
    extra: { reason?: string | null; until?: string | null; done?: string; busy?: ServiceBusy } = {}
  ): Promise<boolean> => {
    // One at a time: a second tap while the first is in flight does nothing.
    if (acting.current) return false;
    const current = localRoomRef.current;
    const resolved = accessFor({ ...current, houseKeepingStatus: currentStatus }, assigneeId).allowed.get(option);
    if (!resolved) {
      setPendingActivity(null);
      messageModal.show({
        title: 'Not available',
        message: `That is not available for Room ${room.roomNumber} right now.`,
        buttons: [{ text: 'OK' }],
      });
      return false;
    }
    let reason = extra.reason?.trim() || null;
    if (resolved.action === 'send_back' && !reason) {
      reason = await askReason(
        messageModal,
        currentStatus === 'Inspected' ? `Reopen Room ${room.roomNumber}?` : `Send Room ${room.roomNumber} back?`,
        'The attendant is told why and the room goes back to Dirty.',
        SEND_BACK_REASONS
      );
      if (!reason) {
        setPendingActivity(null);
        return false;
      }
    }
    if (resolved.viaOverride && !reason) {
      const attendant = assignedStaff?.name ?? 'the attendant';
      reason = await askReason(
        messageModal,
        `Act for ${attendant}?`,
        `This is ${attendant}'s step. It is recorded as done for them, and they are told.`,
        OVERRIDE_REASONS
      );
      if (!reason) {
        setPendingActivity(null);
        return false;
      }
    }
    acting.current = true;
    setServiceBusy(extra.busy ?? null);
    try {
      const result = await runRoomAction(room.id, resolved.action, { reason, until: extra.until ?? null });
      const applied = roomStateFromClock(result);
      const nextWork = workStatusAfter(resolved.action);
      setLocalRoom((prev) => ({
        ...prev,
        ...applied,
        ...(nextWork !== undefined && prev.roomAttendantAssigned
          ? { roomAttendantAssigned: { ...prev.roomAttendantAssigned, assignmentWorkStatus: nextWork } }
          : null),
      }));
      if (applied.houseKeepingStatus) setCurrentStatus(applied.houseKeepingStatus);
      setActivity(deriveRoomActivityState({ ...localRoomRef.current, ...applied }));
      setPendingActivity(null);
      if (extra.done) toast.show(extra.done, { type: 'success' });
      void refreshHistory();
      return true;
    } catch (e) {
      setActivity(deriveRoomActivityState(localRoomRef.current));
      setPendingActivity(null);
      messageModal.show({
        title: 'Not saved',
        message: e instanceof Error ? e.message : 'Please try again.',
        buttons: [{ text: 'OK' }],
      });
      return false;
    } finally {
      acting.current = false;
      setServiceBusy(null);
    }
  };

  const serviceActions = {
    onDndStill: () =>
      void act('DoNotDisturb', { busy: 'dndStill', done: 'Still Do Not Disturb — next check scheduled.' }),
    onDndCleared: () =>
      void act('Dirty', { busy: 'dndCleared', done: 'Sign removed — the room is ready to clean. Your supervisor has been told.' }),
    onServiceResumed: () =>
      void act('Dirty', { busy: 'serviceResumed', done: 'Service is back on — the room is ready to clean.' }),
    onReturnLaterCleared: () => void act('Dirty', { busy: 'returnLaterCleared', done: 'Return later cleared.' }),
    // Promise time is set and removed by managers and supervisors only.
    onPromiseChange: canInspectRooms ? () => handleStatusSelect('PromisedTime') : undefined,
    onPromiseRemoved: canInspectRooms ? () => void handleRemovePromise() : undefined,
    busy: serviceBusy === 'dndSet' ? null : serviceBusy,
  };

  const closeStatusMenu = () => {
    setShowStatusModal(false);
    setStatusButtonPosition(null);
  };

  const handleStatusSelect = (statusOption: StatusChangeOption) => {
    // These open a sheet and only take effect on confirm. `pendingActivity`
    // lets the header preview the state meanwhile.
    if (statusOption === 'PromisedTime') {
      setShowStatusModal(false);
      if (!canInspectRooms) {
        messageModal.show({
          title: 'Not available',
          message: 'Only a manager or supervisor can set a promise time.',
          buttons: [{ text: 'OK' }],
        });
        return;
      }
      setShowPromiseTimeModal(true);
      setPendingActivity('promisedTime');
      return;
    }
    if (statusOption === 'ReturnLater' || statusOption === 'RefuseService') {
      setShowStatusModal(false);
      const allowed = accessFor({ ...localRoomRef.current, houseKeepingStatus: currentStatus }, assigneeId)
        .allowed.has(statusOption);
      if (!allowed) {
        messageModal.show({
          title: 'Not available',
          message: `That is not available for Room ${room.roomNumber} right now.`,
          buttons: [{ text: 'OK' }],
        });
        return;
      }
      if (statusOption === 'ReturnLater') {
        setShowReturnLaterModal(true);
        setPendingActivity('returnLater');
      } else {
        setShowRefuseServiceModal(true);
        setPendingActivity('refuseService');
      }
      return;
    }

    // Priority is a mark, not a state: its own write, nothing else.
    if (statusOption === 'Priority') {
      const newIsPriority = !localRoom.isPriority;
      setLocalRoom((prev) => ({ ...prev, isPriority: newIsPriority }));
      saveRoom({ priority: newIsPriority ? 'high' : 'normal' }).catch((e) => {
        setLocalRoom((prev) => ({ ...prev, isPriority: !newIsPriority }));
        messageModal.show({
          title: 'Priority not changed',
          message: e instanceof Error ? e.message : 'Please try again.',
          buttons: [{ text: 'OK' }],
        });
      });
      closeStatusMenu();
      void refreshHistory();
      return;
    }

    closeStatusMenu();
    const done =
      statusOption === 'DoNotDisturb'
        ? activity.kind === 'dnd'
          ? 'Still Do Not Disturb — next check scheduled.'
          : 'Do Not Disturb recorded. Your supervisor has been told.'
        : undefined;
    void act(statusOption, { done, busy: statusOption === 'DoNotDisturb' ? 'dndSet' : null });
  };

  /*
   * Arriving from the Rooms list with Return Later / Refuse Service / Promised
   * Time picked: open that sheet, as if it had been picked here. Once, and
   * after the push has settled — iOS cannot present a sheet mid-transition.
   */
  const openedActivity = useRef(false);
  const openActivity = params?.openActivity;
  useEffect(() => {
    if (!openActivity || openedActivity.current || !hasRoom) return;
    openedActivity.current = true;
    const option: StatusChangeOption =
      openActivity === 'returnLater' ? 'ReturnLater' : openActivity === 'refuseService' ? 'RefuseService' : 'PromisedTime';
    const t = setTimeout(() => handleStatusSelect(option), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openActivity, hasRoom]);

  const handleReturnLaterConfirm = (
    returnTime: string,
    period: 'AM' | 'PM',
    reason?: string,
    _formattedDateTime?: string,
    returnAtTimestamp?: number
  ) => {
    /*
     * The reason is part of the activity now, not a task.
     *
     * This used to build a `Task` out of whatever the modal handed back — which
     * was always `dummyTaskText`, a hardcoded "Deep clean bathroom (heavy bath
     * use)..." string the reader could not edit. Every Return Later therefore
     * attached the same invented task to the room. The modal now asks why, and
     * the answer goes where the other activity reasons go.
     */
    setShowReturnLaterModal(false);
    if (returnAtTimestamp != null) {
      // Nobody is cleaning meanwhile (In Progress drops to Dirty in the
      // database); supervisors are told and the attendant reminded at the time.
      void act('ReturnLater', { until: new Date(returnAtTimestamp).toISOString(), reason: reason?.trim() || 'Guest asked' });
    } else {
      setPendingActivity(null);
    }
  };

  /*
   * The guest's time has come. This used to clear Return Later on the spot, so
   * the request vanished the moment it mattered. It stays until the room is
   * started (or cleared); the card and header say "go back now", the attendant
   * gets a reminder, and supervisors hear if it is missed by 30 minutes.
   */
  const handleReturnLaterElapsed = useCallback(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const handlePromiseTimeConfirm = (
    _promiseTime: string,
    _period: 'AM' | 'PM',
    _formattedDateTime?: string,
    promiseAtTimestamp?: number
  ) => {
    if (promiseAtTimestamp != null) {
      const promiseTimeAt = new Date(promiseAtTimestamp).toISOString();
      // A promise does not pause or replace anything else going on in the
      // room; the header shows it whenever nothing else is (committedActivity).
      setLocalRoom((prev) => ({ ...prev, promiseTimeAt }));
      // Persisted so it survives reloads and shows on the room's card; the
      // attendant is notified by a trigger.
      saveRoom({ promise_time_at: promiseTimeAt }).catch((e) =>
        console.warn('Failed to persist promise time in Supabase', e)
      );
      void logRoomHistoryEvent({
        roomId: room.id,
        type: 'promise_time',
        description: buildFriendlyRoomHistoryMessage({
          type: 'promise_time',
          promiseTimeLabel: formatDueTime(promiseAtTimestamp),
        }),
      });
    }
    setPendingActivity(null);
    setShowPromiseTimeModal(false);
    void refreshHistory();
  };

  const handleRefuseServiceConfirm = (reason: string) => {
    setShowRefuseServiceModal(false);
    void act('RefuseService', { reason }).then((saved) => {
      if (!saved) return;
      void logRoomHistoryEvent({
        roomId: room.id,
        type: 'refuse_service',
        description: buildFriendlyRoomHistoryMessage({ type: 'refuse_service', refuseReason: reason }),
      });
    });
  };

  // "In Progress" on a paused room resumes it; "Dirty" on a refused one ends the refusal.
  const handleResumePause = () => void act('InProgress');

  const handleClearRefuseService = () => void act('Dirty');

  const handleAddNote = () => {
    setShowAddNoteModal(true);
  };

  const handleAddTask = () => {
    setShowAddTaskModal(true);
  };

  const handleSeeMoreTask = (task: Task) => {
    setSelectedTask(task);
    setShowViewTaskModal(true);
  };

  const handleCloseViewTaskModal = () => {
    setShowViewTaskModal(false);
    setSelectedTask(null);
  };

  const handleSaveTask = (taskText: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      text: taskText,
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [...prev, newTask]);
    // TODO: persist the added task.
    void logRoomHistoryEvent({
      roomId: room.id,
      type: 'task',
      description: buildFriendlyRoomHistoryMessage({ type: 'task', taskText }),
    });
    void refreshHistory();
  };

  /*
   * Cleaned through the Clean Checklist: set the status, then file its report
   * (ticks, photos, note) in the background. The note joins the room's notes,
   * so the list and the bell pick it up.
   */
  const handleCleanComplete = async (report: CleaningReport) => {
    // The report is filed only once the room took the status.
    if (!(await act(report.kind === 'inspection' ? 'Inspected' : 'Cleaned'))) return;
    const extras = report.photoUris.length > 0 || !!report.note;
    submitCleaningReport(room.id, report)
      .then(async () => {
        if (report.note) {
          setNotes(await getRoomNotes(room.id));
          void useRoomsStore.getState().refreshRoomBadges(room.id);
        }
        void refreshHistory();
        if (extras) {
          toast.show(`Photos and note saved with the ${report.kind === 'inspection' ? 'inspection' : 'cleaning'}.`, {
            type: 'success',
          });
        }
      })
      .catch((e) => {
        const message = e instanceof Error ? e.message : 'Please try again.';
        toast.show(`The room is ${report.kind === 'inspection' ? 'Inspected' : 'Cleaned'}, but its photos and note were not saved. ${message}`, {
          type: 'error',
          duration: 5000,
        });
      });
  };

  /** Inspected through the Inspection Checklist: the same filing, as an inspection. */
  const handleInspectComplete = handleCleanComplete;

  /** The inspection failed: back to Dirty, and the attendant is told why. */
  const handleInspectReject = () => {
    void act('Dirty', { reason: 'Failed inspection' });
  };

  const handleSaveNote = async (noteText: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (room.id && uuidRegex.test(room.id)) {
      try {
        const newNote = await addRoomNote(room.id, noteText);
        setNotes((prev) => [...prev, newNote]);
        // The card on Rooms shows its bell now, not on the list's next refetch.
        void useRoomsStore.getState().refreshRoomBadges(room.id);
        setLocalRoom((prev) => ({
          ...prev,
          notes: { count: (prev.notes?.count ?? 0) + 1, hasRushed: prev.notes?.hasRushed || false },
          noteMadeBy: { name: newNote.staff.name, avatar: newNote.staff.avatar },
        }));
        void refreshHistory();
      } catch (e) {
        console.warn('Failed to save note to Supabase', e);
      }
      return;
    }
    // Mock path: append note with current user as author
    const [noteAuthorLabel, avatarUrl] = await Promise.all([
      authService.getCurrentUserNoteLabel(),
      authService.getCurrentUserAvatarUrl(),
    ]);
    const newNote: Note = {
      id: Date.now().toString(),
      text: noteText,
      staff: {
        name: noteAuthorLabel,
        avatar: avatarUrl || require('../../../../assets/icons/profile-avatar.png'),
      },
      createdAt: new Date().toISOString(),
    };
    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    setLocalRoom((prev) => ({
      ...prev,
      notes: { count: updatedNotes.length, hasRushed: prev.notes?.hasRushed || false },
      noteMadeBy: { name: noteAuthorLabel, avatar: avatarUrl || undefined },
    }));
    // Mock path: still write a history row when possible.
    void logRoomHistoryEvent({
      roomId: room.id,
      type: 'note',
      description: buildFriendlyRoomHistoryMessage({ type: 'note', noteText }),
    });
    void refreshHistory();
  };

  // "Add Item": Lost & Found's register sheet, preselected to this room, and
  // back to this room once the item is added (or the sheet is cancelled).
  // By path, like the other tab jumps here: this screen sits in the root stack,
  // where a bare '(tabs)/(lost_and_found)' route name matches no navigator.
  const handleAddPhotos = () => {
    router.navigate({
      pathname: '/(tabs)/(lost_and_found)',
      params: { openRegisterModal: 'true', preselectedRoomId: room.id, returnToRoomId: room.id },
    });
  };



  /** The sheet Reassign was opened from, to go back to once it closes. */
  const reassignReturnTo = useRef<'returnLater' | 'refuseService' | null>(null);

  // Return Later and Refuse Service offer Reassign from inside their sheet.
  // iOS can only present one top-level Modal at a time — opened on top, the
  // Reassign sheet never appeared and the screen seemed frozen. So step out of
  // the sheet (SafeModal waits for it to finish closing), and come back to it
  // when Reassign is done.
  const handleReassign = () => {
    if (showReturnLaterModal) {
      reassignReturnTo.current = 'returnLater';
      setShowReturnLaterModal(false);
    } else if (showRefuseServiceModal) {
      reassignReturnTo.current = 'refuseService';
      setShowRefuseServiceModal(false);
    }
    setShowReassignModal(true);
  };

  const closeReassign = () => {
    setShowReassignModal(false);
    const back = reassignReturnTo.current;
    reassignReturnTo.current = null;
    if (back === 'returnLater') setShowReturnLaterModal(true);
    else if (back === 'refuseService') setShowRefuseServiceModal(true);
  };

  const handleStaffSelect = (staffId: string, member?: StaffMember) => {
    if (!staffId) {
      closeReassign();
      return;
    }

    const name = member?.name?.trim() || 'Staff member';
    const initials =
      name
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '?';
    const previous = assignedStaff;

    // The picked attendant straight away — their name and photo come with the
    // row they were chosen from, not from the save's round trip.
    setAssignedStaff({
      id: staffId,
      name,
      avatar: member?.avatar ? { uri: member.avatar } : undefined,
      initials,
      department: member?.department,
      avatarColor: member?.avatarColor,
    });
    closeReassign();

    (async () => {
      try {
        setIsAssigningStaff(true);
        const info = await assignRoomToStaff(room.id, staffId, shift as 'AM' | 'PM');
        if (info) {
          setAssignedStaff({
            id: staffId,
            name: info.name,
            avatar: info.avatar ? { uri: info.avatar } : undefined,
            initials: info.initials,
            department: member?.department,
          });
          // The Rooms list shows the new attendant too, without a refetch.
          useRoomsStore.getState().setRoomAttendant(room.id, info);
        }
      } catch (e) {
        console.warn('[RoomDetailScreen] Failed to persist assignment', e);
        setAssignedStaff(previous);
        messageModal.show({
          title: 'Not reassigned',
          message: e instanceof Error ? e.message : 'The room could not be reassigned. Please try again.',
          buttons: [{ text: 'OK' }],
        });
      } finally {
        setIsAssigningStaff(false);
        void refreshHistory();
      }
    })();
  };

  const handleAutoAssign = () => {
    // TODO: auto-assign is not implemented.
    closeReassign();
  };

  // Lost & found: only the latest item registered in this room. With one, the
  // section shows it instead of the "Add Item" card.
  const lostAndFoundItems = fetchedLostAndFound?.slice(0, 1) ?? [];

  // Every hook above has run by now, so returning early here is safe.
  if (!hasRoom) {
    if (loadingDetails) {
      return (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.primary }]}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      );
    }
    console.warn('RoomDetailScreen: No room data provided');
    return null;
  }

  /*
   * What the header shows: the committed activity, unless a modal is open for a
   * different one — then preview that with no time yet, which is what the user
   * is in the middle of choosing.
   */
  const promiseDueAt = localRoom.promiseTimeAt ? Date.parse(localRoom.promiseTimeAt) : NaN;
  const committedActivity: RoomActivityState =
    (activity.kind === 'none' || activity.kind === 'promisedTime') && Number.isFinite(promiseDueAt)
      ? { kind: 'promisedTime', dueAt: promiseDueAt }
      : activity.kind === 'promisedTime'
        ? { kind: 'none' }
        : activity;

  const effectiveActivity: RoomActivityState =
    pendingActivity && pendingActivity !== committedActivity.kind
      ? ({
          returnLater: { kind: 'returnLater', dueAt: null, reason: null },
          promisedTime: { kind: 'promisedTime', dueAt: null },
          refuseService: { kind: 'refuseService', at: null, reason: null },
        } as const)[pendingActivity]
      : committedActivity;

  return (
    <View style={{ flex: 1 }}>
      {isUpdating && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      )}
      {/* Layout lives in RoomDetailContent (Figma 1772-104); this screen only fetches and passes props. */}
      <RoomDetailContent
        roomId={room.id}
        roomNumber={room.roomNumber}
        roomCode={`${room.roomCategory} - ${room.credit}`}
        status={currentStatus}
        isPriority={localRoom.isPriority === true}
        flagged={localRoom.flagged}
        frontOfficeStatus={room.frontOfficeStatus === 'Refresh' ? undefined : room.frontOfficeStatus}
        roomType={roomType}
        guests={roomGuests}
        specialInstructions={room.specialInstructions ?? undefined}
        assignedTo={assignedStaff}
        isAssigningStaff={isAssigningStaff}
        tasks={displayTasks}
        notes={notes}
        lostAndFoundItems={lostAndFoundItems}
        historyEvents={historyEvents}
        onBackPress={handleBackPress}
        onStatusPress={handleStatusPress}
        onReassign={canReassign ? handleReassign : undefined}
        onAddNote={handleAddNote}
        onAddTask={handleAddTask}
        onSeeMoreTask={handleSeeMoreTask}
        onAddLostAndFoundItem={handleAddPhotos}
        onOpenLostAndFound={() => router.navigate('/(tabs)/(lost_and_found)')}
        // Pushed over the room, so Back comes straight back here.
        onOpenLostAndFoundItem={(itemId) => router.push({ pathname: '/lost-and-found/[id]', params: { id: itemId } })}
        onDownloadHistoryReport={handleDownloadReport}
        onResumePause={handleResumePause}
        onReturnLaterElapsed={handleReturnLaterElapsed}
        cleaning={{
          credit: localRoom.credit,
          cleaningStartedAt: localRoom.cleaningStartedAt,
          cleaningElapsedSeconds: localRoom.cleaningElapsedSeconds,
        }}
        onHeaderHeightChange={setHeaderDesignHeight}
        onClearRefuseService={handleClearRefuseService}
        serviceActions={serviceActions}
        initialTab={initialTab}
        departmentName={departmentName}
        activity={effectiveActivity}
        showWithLinenBadge={room.frontOfficeStatus === 'Stayover' && showStayoverWithLinenBadge(room)}
      />

      {/* Modals */}
      <StatusChangeModal
        visible={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setStatusButtonPosition(null);
        }}
        onStatusSelect={handleStatusSelect}
        onInspectComplete={handleInspectComplete}
        onInspectReject={handleInspectReject}
        currentStatus={currentStatus}
        room={localRoom}
        onRemovePromise={() => void handleRemovePromise()}
        buttonPosition={statusButtonPosition}
        headerHeight={modalHeaderHeight}
        showTriangle={false}
        // Room attendants: no Priority, no Inspected, no Flag Room — see AllRoomsScreen.
        canSetPriority={can(PERMISSIONS.ROOMS_RUSH_TOGGLE)}
        canInspect={canInspectRooms}
        canStartCleaning={!!assignedStaff || currentStatus !== 'Dirty'}
        allowedOptions={accessFor({ ...localRoom, houseKeepingStatus: currentStatus }, assigneeId).allowed}
        overrideFor={assignedStaff?.name ?? null}
        canSetPromise={canInspectRooms}
        onCleanComplete={handleCleanComplete}
        onFlagToggle={!can(PERMISSIONS.ROOMS_FLAG_TOGGLE) ? undefined : async (flagged, reason, mentionIds) => {
          const flagReason = flagged ? reason : null;
          // One write for the flag, its reason and the tags. Awaited: the menu
          // shows a spinner and closes only once this has saved.
          try {
            await saveRoom({
              flagged,
              flag_reason: flagReason,
              flag_mention_ids: flagged ? mentionIds : [],
            });
          } catch (e) {
            messageModal.show({
              title: flagged ? 'Room not flagged' : 'Room not unflagged',
              message: e instanceof Error ? e.message : 'Please try again.',
              buttons: [{ text: 'OK' }],
            });
            throw e;
          }
          setLocalRoom((prev) => ({ ...prev, flagged, flagReason }));
        }}
      />

      <ReturnLaterModal
        top={modalHeaderHeight * scaleX}
        visible={showReturnLaterModal}
        onClose={() => {
          setShowReturnLaterModal(false);
          setPendingActivity(null);
        }}
        onConfirm={handleReturnLaterConfirm}
        roomNumber={room.roomNumber}
        assignedTo={assignedStaff}
        onReassignPress={canReassign ? handleReassign : undefined}
      />

      <PromiseTimeModal
        top={modalHeaderHeight * scaleX}
        visible={showPromiseTimeModal}
        onClose={() => {
          setShowPromiseTimeModal(false);
          setPendingActivity(null);
        }}
        onConfirm={handlePromiseTimeConfirm}
        roomNumber={room.roomNumber}
      />

      <RefuseServiceModal
        top={modalHeaderHeight * scaleX}
        visible={showRefuseServiceModal}
        onClose={() => {
          setShowRefuseServiceModal(false);
          // Cancelling drops the preview only. It used to also clear the reason
          // and time, so backing out of the modal wiped an already-confirmed
          // refusal — and left the DB row saying otherwise.
          setPendingActivity(null);
        }}
        onConfirm={handleRefuseServiceConfirm}
        roomNumber={room.roomNumber}
        assignedTo={assignedStaff}
        onReassignPress={canReassign ? handleReassign : undefined}
      />

      <ReassignModal
        visible={showReassignModal}
        onClose={closeReassign}
        onStaffSelect={handleStaffSelect}
        onAutoAssign={handleAutoAssign}
        currentAssignedStaffId={assignedStaff?.id}
        roomNumber={room.roomNumber}
        shift={shift === 'PM' ? 'PM' : 'AM'}
      />

      <AddNoteModal
        visible={showAddNoteModal}
        onClose={() => setShowAddNoteModal(false)}
        onSave={handleSaveNote}
        roomNumber={room.roomNumber}
      />

      <AddTaskModal
        visible={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        onSave={handleSaveTask}
      />

      <ViewTaskModal
        visible={showViewTaskModal}
        task={selectedTask}
        onClose={handleCloseViewTaskModal}
      />
    </View>
  );
}
