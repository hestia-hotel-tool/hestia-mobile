/**
 * Room Detail Screen - Wrapper that transforms route params to props
 * Uses reusable RoomDetailContent component
 * Supports: Arrival, Departure, ArrivalDeparture, Stayover, Turndown
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRoute, useNavigation, router } from 'expo-router';
import { NativeStackNavigationProp } from 'expo-router';
import { ROOM_DETAIL_HEADER, scaleX } from '../constants/roomDetailStyles';
import StatusChangeModal from '../components/StatusChangeModal';
import InspectedStatusSlideModal from '../components/allRooms/InspectedStatusSlideModal';
import ReturnLaterModal from '../components/roomDetail/ReturnLaterModal';
import PromiseTimeModal from '../components/roomDetail/PromiseTimeModal';
import RefuseServiceModal from '../components/roomDetail/RefuseServiceModal';
import ReassignModal from '../components/roomDetail/ReassignModal';
import AddNoteModal from '../components/roomDetail/AddNoteModal';
import AddTaskModal from '../components/roomDetail/AddTaskModal';
import ViewTaskModal from '../components/roomDetail/ViewTaskModal';
import RoomDetailContent from '../components/roomDetail/RoomDetailContent';
import { getRoomTypeConfig } from '../constants/roomTypeConfigs';
import { mapFrontOfficeToRoomType } from '../utils/roomType';
import type { RoomCardData, StatusChangeOption, RoomActivityState } from '../types/allRooms.types';
import {
  mapStatusOptionToRoomStatus,
  deriveRoomActivityState,
  activityStateToUpdate,
} from '../types/allRooms.types';
import type { Note, Task, RoomType, HistoryEvent, HistoryGroup } from '../types/roomDetail.types';
import type { LostAndFoundItem } from '@features/lost-and-found';
import type { RootStackParamList } from '@/types/navigation';
import { useRoomsStore } from '../store/useRoomsStore';
import { authService } from '@features/auth';
import { notifyServer } from '@/lib/notifications';
import { colors } from '@/theme';
import { getMockHistoryEvents } from '@/mocks/mockHistoryData';
import { generateHistoryReport } from '../utils/generateHistoryReport';
import { showStayoverWithLinenBadge } from '../utils/stayoverLinen';
import { getDefaultTaskText } from '../utils/defaultTasks';
import { getRoomNotes, addRoomNote, getRoomDetailsById, fullRoomDetailsToRoomCardData, type FullRoomDetails, assignRoomToStaff } from '../services/rooms';
import { fetchStaffFromSupabase } from '@features/staff';
import { supabase } from '@/lib/supabase';
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

export default function RoomDetailScreen() {
  const navigation = useNavigation<RoomDetailScreenNavigationProp>();
  const route = useRoute();
  const params = route.params as { 
    room?: RoomCardData; 
    roomType?: RoomType; 
    roomId?: string;
    initialTab?: 'Overview' | 'Tickets' | 'Checklist' | 'History';
    departmentName?: string;
  } | undefined;
  const initialRoom = params?.room;
  const initialRoomType = params?.roomType ?? 'ArrivalDeparture';
  const roomId = params?.roomId;
  const initialTab = params?.initialTab;
  const departmentName = params?.departmentName;

  const { updateRoom, updatingRoomId, data: roomsData } = useRoomsStore();
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
        const staffIds = Array.from(
          new Set(
            full.lostAndFoundItems
              .map((item) => item.registered_by_id ?? item.found_by_id)
              .filter((id): id is string => Boolean(id))
          )
        );
        const userById = new Map<string, { full_name?: string | null; avatar_url?: string | null }>();
        if (staffIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, full_name, avatar_url')
            .in('id', staffIds);
          (usersData ?? []).forEach((user: any) => {
            userById.set(user.id, user);
          });
        }

        setFetchedLostAndFound(
          full.lostAndFoundItems.map((item) => {
            const user = userById.get(item.registered_by_id ?? item.found_by_id);
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
              createdAt: item.found_at,
            };
          })
        );
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
  const config = React.useMemo(() => getRoomTypeConfig(roomType), [roomType]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showInspectedModal, setShowInspectedModal] = useState(false);
  const [buttonPositionForInspection, setButtonPositionForInspection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
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
          id: '1',
          name: room.roomAttendantAssigned.name,
          avatar: room.roomAttendantAssigned.avatar || require('../../../../assets/icons/profile-avatar.png'),
          initials: room.roomAttendantAssigned.initials,
          avatarColor: room.roomAttendantAssigned.avatarColor,
          department: undefined,
        }
      : undefined
  );
  
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
      
      // Group events for the report (same logic as HistorySection)
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const normalizeDate = (date: Date): Date => {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      };

      const sortedEvents = [...historyEvents].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const dateMap = new Map<string, HistoryEvent[]>();

      sortedEvents.forEach((event) => {
        const eventDate = normalizeDate(event.timestamp);
        const key = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
        if (!dateMap.has(key)) {
          dateMap.set(key, []);
        }
        dateMap.get(key)!.push(event);
      });

      const groupedEvents: HistoryGroup[] = [];
      dateMap.forEach((events, key) => {
        const [year, month, day] = key.split('-').map(Number);
        const eventDate = new Date(year, month, day);
        const todayNormalized = normalizeDate(today);
        const yesterdayNormalized = normalizeDate(yesterday);
        const eventDateNormalized = normalizeDate(eventDate);

        let dateLabel: string;
        if (eventDateNormalized.getTime() === todayNormalized.getTime()) {
          dateLabel = 'Today';
        } else if (eventDateNormalized.getTime() === yesterdayNormalized.getTime()) {
          dateLabel = 'Yesterday';
        } else {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthName = monthNames[eventDate.getMonth()];
          const yearNum = eventDate.getFullYear();
          if (yearNum === now.getFullYear()) {
            dateLabel = `${monthName} ${day}`;
          } else {
            dateLabel = `${monthName} ${day} ${yearNum}`;
          }
        }

        groupedEvents.push({
          dateLabel,
          date: eventDate,
          events: events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
        });
      });

      const sortedGroupedEvents = groupedEvents.sort((a, b) => b.date.getTime() - a.date.getTime());

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

  const handleStatusSelect = (statusOption: StatusChangeOption) => {
    // These three open a modal and only take effect on confirm. `pendingActivity`
    // lets the header preview the state meanwhile, without anything downstream
    // having to inspect which modal is open.
    if (statusOption === 'ReturnLater') {
      setShowStatusModal(false);
      setShowReturnLaterModal(true);
      setPendingActivity('returnLater');
      return;
    }

    if (statusOption === 'PromisedTime') {
      setShowStatusModal(false);
      setShowPromiseTimeModal(true);
      setPendingActivity('promisedTime');
      return;
    }

    if (statusOption === 'RefuseService') {
      setShowStatusModal(false);
      setShowRefuseServiceModal(true);
      setPendingActivity('refuseService');
      return;
    }

    // Priority only toggles rush icon on room card; do not change room detail background or status icon
    if (statusOption === 'Priority') {
      const newIsPriority = !localRoom.isPriority;
      setLocalRoom((prev) => ({ ...prev, isPriority: newIsPriority }));
      const priorityPayload = newIsPriority ? 'high' : 'normal';
      updateRoom(room.id, {
        ...(localRoom.houseKeepingStatus && { house_keeping_status: localRoom.houseKeepingStatus }),
        priority: priorityPayload,
      }).catch((e) => console.warn('Failed to update room status in Supabase', e));
      setShowStatusModal(false);
      setStatusButtonPosition(null);
      void refreshHistory();
      return;
    }

    const newStatus = mapStatusOptionToRoomStatus(statusOption);
    setCurrentStatus(newStatus);

    // Pause enters an activity; every other status clears back to none. Either
    // way activityStateToUpdate writes all four columns, so no stale one is left.
    const nextActivity: RoomActivityState =
      statusOption === 'Pause'
        ? { kind: 'paused', since: Date.now(), assignmentPaused: false }
        : { kind: 'none' };

    setActivity(nextActivity);
    setPendingActivity(null);
    updateRoom(room.id, {
      house_keeping_status: newStatus,
      ...activityStateToUpdate(nextActivity),
    }).catch((e) => console.warn('Failed to update room status in Supabase', e));

    setShowStatusModal(false);
    setStatusButtonPosition(null);
    void refreshHistory();
  };

  const handleReturnLaterConfirm = (returnTime: string, period: 'AM' | 'PM', taskDescription?: string, _formattedDateTime?: string, returnAtTimestamp?: number) => {
    console.log('Return Later confirmed for room:', room.roomNumber, 'at:', returnTime, period);
    
    if (taskDescription && taskDescription.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        text: taskDescription,
        createdAt: new Date().toISOString(),
      };
      setTasks(prev => [...prev, newTask]);
      console.log('Task saved from Return Later modal:', taskDescription);
    }
    if (returnAtTimestamp != null) {
      const next: RoomActivityState = { kind: 'returnLater', dueAt: returnAtTimestamp };
      setActivity(next);
      // Persist to DB so Return Later survives reloads.
      updateRoom(room.id, {
        house_keeping_status: 'InProgress',
        ...activityStateToUpdate(next),
      }).catch((e) => console.warn('Failed to persist return later in Supabase', e));
    }
    setPendingActivity(null);
    setShowReturnLaterModal(false);
    void refreshHistory();
  };

  const handleReturnLaterElapsed = useCallback(() => {
    // Time elapsed: clear Return Later and revert header to normal state.
    setActivity({ kind: 'none' });
    setPendingActivity(null);
    updateRoom(room.id, activityStateToUpdate({ kind: 'none' })).catch((e) =>
      console.warn('Failed to clear return later in Supabase', e)
    );
    void refreshHistory();
  }, [room.id, updateRoom, refreshHistory]);

  const handlePromiseTimeConfirm = (promiseTime: string, period: 'AM' | 'PM', _formattedDateTime?: string, promiseAtTimestamp?: number) => {
    console.log('Promise Time confirmed for room:', room.roomNumber, 'at:', promiseTime, period);
    if (promiseAtTimestamp != null) {
      setActivity({ kind: 'promisedTime', dueAt: promiseAtTimestamp });
    }
    setPendingActivity(null);
    // TODO: Promised Time has no column, so unlike its three peers in
    // RoomActivityState it does not survive a reload. Only room_history records
    // it. Add `promise_time_at` to `rooms` to make it persist.
    void logRoomHistoryEvent({
      roomId: room.id,
      type: 'promise_time',
      description: buildFriendlyRoomHistoryMessage({ type: 'promise_time', promiseTimeLabel: `${promiseTime} ${period}` }),
    });
    setShowPromiseTimeModal(false);
    void refreshHistory();
  };

  const handleRefuseServiceConfirm = (reason: string) => {
    const next: RoomActivityState = { kind: 'refuseService', at: Date.now(), reason };
    setActivity(next);
    setPendingActivity(null);
    // Persist to DB so Refuse Service survives reloads.
    updateRoom(room.id, {
      house_keeping_status: 'InProgress',
      ...activityStateToUpdate(next),
    }).catch((e) => console.warn('Failed to persist refuse service in Supabase', e));
    void logRoomHistoryEvent({
      roomId: room.id,
      type: 'refuse_service',
      description: buildFriendlyRoomHistoryMessage({ type: 'refuse_service', refuseReason: reason }),
    });
    setShowRefuseServiceModal(false);
    void refreshHistory();
  };

  const handleResumePause = () => {
    setActivity({ kind: 'none' });
    setPendingActivity(null);
    updateRoom(room.id, activityStateToUpdate({ kind: 'none' })).catch((e) =>
      console.warn('Failed to resume pause in Supabase', e)
    );
    void refreshHistory();
  };

  const handleClearRefuseService = useCallback(() => {
    setActivity({ kind: 'none' });
    setPendingActivity(null);
    updateRoom(room.id, activityStateToUpdate({ kind: 'none' })).catch((e) =>
      console.warn('Failed to clear refuse service in Supabase', e)
    );
    void refreshHistory();
  }, [room.id, updateRoom, refreshHistory]);

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
    console.log('Task added for room:', room.roomNumber, 'task:', taskText);
    void logRoomHistoryEvent({
      roomId: room.id,
      type: 'task',
      description: buildFriendlyRoomHistoryMessage({ type: 'task', taskText }),
    });
    void refreshHistory();
  };

  const handleSaveNote = async (noteText: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (room.id && uuidRegex.test(room.id)) {
      try {
        const newNote = await addRoomNote(room.id, noteText);
        setNotes((prev) => [...prev, newNote]);
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

  const handleAddPhotos = () => {
    navigation.navigate('(tabs)/(lost_and_found)' as any, {
      openRegisterModal: true,
      preselectedRoomId: room.id,
    } as any);
  };

  const handleLostAndFoundTitlePress = () => {
    navigation.navigate('(tabs)/(lost_and_found)' as any, {});
  };

  const handleLostAndFoundItemPress = (item: LostAndFoundItem) => {
    console.log('Lost & Found item pressed:', item.itemName);
    // TODO: Navigate to item detail or show modal
  };

  const handleReassign = () => {
    console.log('handleReassign called, opening ReassignModal');
    setShowReassignModal(true);
  };

  const handleStaffSelect = (staffId: string) => {
    console.log('Staff selected:', staffId);

    // Important: never reference variables that don't exist in this scope.
    // iOS was crashing because `selectedStaff` was undefined here.
    if (!staffId) {
      setShowReassignModal(false);
      return;
    }

    const safeName = 'Staff Member';
    const initials =
      safeName
        .split(/\s+/)
        .filter(Boolean)
        .map((s) => s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '?';

    const colors = ['#ff4dd8', '#5a759d', '#607aa1', '#f0be1b'];
    const index = safeName.charCodeAt(0) % colors.length;
    const avatarColor = colors[index];

    // Set immediately with safe placeholder so the UI doesn't crash.
    setAssignedStaff({
      id: staffId,
      name: safeName,
      avatar: require('../../../../assets/icons/profile-avatar.png'),
      initials,
      department: undefined,
      avatarColor,
    });
    setShowReassignModal(false);

    // Persist assignment + refresh history (best-effort).
    (async () => {
      try {
        setIsAssigningStaff(true);
        const info = await assignRoomToStaff(room.id, staffId, shift as 'AM' | 'PM');
        if (info) {
          setAssignedStaff({
            id: staffId,
            name: info.name,
            avatar: info.avatar ? { uri: info.avatar } : require('../../../../assets/icons/profile-avatar.png'),
            initials: info.initials,
            department: undefined,
          });
        }
      } catch (e) {
        // Keep placeholder assignment; do not crash the flow.
        console.warn('[RoomDetailScreen] Failed to persist assignment', e);
      } finally {
        setIsAssigningStaff(false);
        void refreshHistory();
      }
    })();
  };

  const handleAutoAssign = () => {
    console.log('Auto assign requested');
    setShowReassignModal(false);
  };

  // Lost & found: use fetched items when loaded by roomId, else mock when config says withItems
  const lostAndFoundItems =
    fetchedLostAndFound !== null
      ? fetchedLostAndFound.slice(0, 1)
      : config.lostAndFoundType === 'withItems'
        ? [
            {
              id: 'lf1',
              itemName: 'Wrist Watch',
              itemId: 'FH31390',
              location: 'Guest bathroom while cleaning',
              storedLocation: 'Office',
              registeredBy: {
                name: 'Stella Kitou',
                avatar: require('../../../../assets/icons/profile-avatar.png'),
                timestamp: '15:00, 11 November 2025',
              },
              status: 'stored' as const,
              createdAt: new Date().toISOString(),
            },
          ]
        : undefined;

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
  const effectiveActivity: RoomActivityState =
    pendingActivity && pendingActivity !== activity.kind
      ? ({
          returnLater: { kind: 'returnLater', dueAt: null },
          promisedTime: { kind: 'promisedTime', dueAt: null },
          refuseService: { kind: 'refuseService', at: null, reason: null },
        } as const)[pendingActivity]
      : activity;

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
        onReassign={handleReassign}
        onAddNote={handleAddNote}
        onAddTask={handleAddTask}
        onSeeMoreTask={handleSeeMoreTask}
        onAddLostAndFoundItem={handleAddPhotos}
        onDownloadHistoryReport={handleDownloadReport}
        onResumePause={handleResumePause}
        onReturnLaterElapsed={handleReturnLaterElapsed}
        onClearRefuseService={handleClearRefuseService}
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
        onInspectedSelect={() => {
          setButtonPositionForInspection(statusButtonPosition);
          setShowInspectedModal(true);
        }}
        currentStatus={currentStatus}
        room={localRoom}
        buttonPosition={statusButtonPosition}
        showTriangle={false}
        onFlagToggle={(flagged) => {
          setLocalRoom((prev) => ({ ...prev, flagged }));
          updateRoom(room.id, { flagged }).catch((e) => console.warn('Failed to update room flag in Supabase', e));
        }}
      />

      <InspectedStatusSlideModal
        visible={showInspectedModal}
        onClose={() => {
          setShowInspectedModal(false);
          setButtonPositionForInspection(null);
        }}
        onComplete={() => {
          handleStatusSelect('Inspected');
          setShowInspectedModal(false);
          setButtonPositionForInspection(null);
        }}
        onReject={() => {
          setShowInspectedModal(false);
          setButtonPositionForInspection(null);
          updateRoom(room.id, { house_keeping_status: 'Dirty' }).catch((e) =>
            console.warn('[RoomDetailScreen] Failed to reject room', e)
          );
          const assignedUserId = room.roomAttendantAssigned?.userId ?? localRoom.roomAttendantAssigned?.userId;
          if (assignedUserId) {
            notifyServer({
              type: 'room_assignment',
              roomId: room.id,
              shiftId: shift,
              assignedUserId,
            }).catch(() => {});
          }
        }}
        buttonPosition={buttonPositionForInspection}
        headerHeight={232}
        showTriangle={false}
      />

      <ReturnLaterModal
        visible={showReturnLaterModal}
        onClose={() => {
          setShowReturnLaterModal(false);
          setPendingActivity(null);
        }}
        onConfirm={handleReturnLaterConfirm}
        roomNumber={room.roomNumber}
        assignedTo={assignedStaff}
        onReassignPress={handleReassign}
        taskDescription={tasks.length > 0 ? tasks[0].text : undefined}
      />

      <PromiseTimeModal
        visible={showPromiseTimeModal}
        onClose={() => {
          setShowPromiseTimeModal(false);
          setPendingActivity(null);
        }}
        onConfirm={handlePromiseTimeConfirm}
        roomNumber={room.roomNumber}
      />

      <RefuseServiceModal
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
        onReassignPress={handleReassign}
      />

      <ReassignModal
        visible={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        onStaffSelect={handleStaffSelect}
        onAutoAssign={handleAutoAssign}
        currentAssignedStaffId={assignedStaff?.id}
        roomNumber={room.roomNumber}
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
