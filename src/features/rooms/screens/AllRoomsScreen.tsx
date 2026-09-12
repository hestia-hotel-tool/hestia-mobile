import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, useWindowDimensions, Text, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from 'expo-router';
import { NativeStackNavigationProp } from 'expo-router';
import { BottomTabNavigationProp } from 'expo-router/js-tabs';
import { colors } from '@/theme';
import { ShiftType } from '@features/home';
import { type RoomStateUpdate } from '../services/dashboard';
import { useRoomsStore } from '../store/useRoomsStore';
import { dashboardService } from '../services/dashboard';
import { LoadingOverlay } from '@/components/feedback/LoadingOverlay';
import { useAIChatOverlay } from '@features/ai-agent';
import { RoomCardData, StatusChangeOption, mapStatusOptionToRoomStatus, isRoomPaused } from '../types/allRooms.types';
import AllRoomsHeader from '../components/allRooms/AllRoomsHeader';
import { RoomsHeader } from '../components/allRooms/RoomsHeader';
import { useUser } from '@features/account';
import RoomCard from '../components/allRooms/RoomCard';
import { RoomListCard } from '../components/roomsList';
import BottomTabBar from '@/components/layout/BottomTabBar';
import StatusChangeModal, { STATUS_MODAL_HEIGHT, STATUS_MODAL_SPACING } from '../components/StatusChangeModal';
import InspectedStatusSlideModal from '../components/allRooms/InspectedStatusSlideModal';
import type { RootStackParamList, MainTabsParamList } from '@/types/navigation';
import { useAuth } from '@features/auth';
import {
  invalidateNotificationBadges,
  markAllRoomAssignmentNotificationsRead,
} from '@/lib/inAppNotifications';
import { notifyServer } from '@/lib/notifications';
import { useUserStore } from '@features/account/store/useUserStore';
import {
  getAssignedRoomIdsForUserAndShiftOrderedByAssignmentCreatedAt,
  getDistinctAssignedRoomIdsOrderedByAssignmentCreatedAt,
} from '../services/rooms';
import { FilterState, FilterCounts } from '@/types/filter.types';
import type { CategoryName } from '@features/home';
import AllRoomsFilterModal from '../components/allRooms/AllRoomsFilterModal';
import ReassignModal from '../components/roomDetail/ReassignModal';
import { CARD_DIMENSIONS, CARD_COLORS } from '../constants/allRoomsStyles';
import { getShiftFromTime } from '@/utils/shiftUtils';
import { getStayoverWithLinen } from '../utils/stayoverLinen';
import { getFloorFromRoomNumber } from '@/utils/formatting';
import { applyRoomFilters, hasAnyActiveFilter } from '../utils/roomFilters';
import { mapFrontOfficeToRoomType } from '../utils/roomType';
import { groupRoomsByStatus } from '../utils/roomGroups';
import GroupedRoomsList from '../components/allRooms/GroupedRoomsList';
import { usePermissions } from '@/domain/rbac';
import { findBlockingInProgressRoom } from '../utils/attendantRules';
import { useMessageModal } from '@/contexts/MessageModalContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** When user taps a status badge or priority badge on Home. */
export type CategoryFilterParam = {
  category: CategoryName;
  roomState?: 'dirty' | 'inProgress' | 'cleaned' | 'inspected' | 'priority';
};

const DESIGN_WIDTH = 440;

type AllRoomsScreenNavigationProp = BottomTabNavigationProp<MainTabsParamList, '(rooms)/index'> &
  NativeStackNavigationProp<RootStackParamList>;

export default function AllRoomsScreen() {
  const navigation = useNavigation<AllRoomsScreenNavigationProp>();
  const { session } = useAuth();
  const userProfile = useUserStore((s) => s.profile);
  const { open: openAIChatOverlay } = useAIChatOverlay();
  const messageModal = useMessageModal();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const routeShift = (route.params as any)?.selectedShift as ShiftType | undefined;
  const initialShift = routeShift || getShiftFromTime();
  const { data: allRoomsData, loading, refreshing, fetchRooms, updateRoom, setSelectedShift, setRoomAttendant } = useRoomsStore();

  const displayData = allRoomsData ?? { selectedShift: initialShift, rooms: [], roomsPM: [] };
  // UI shift follows the selected shift. Do not coerce PM->AM during AM hours; that breaks
  // assignment-based navigation (HSK Portier) and can lead to empty results.
  const uiShift: ShiftType = (displayData.selectedShift ?? initialShift) as ShiftType;

  React.useEffect(() => {
    fetchRooms(initialShift);
  }, [initialShift, fetchRooms]);

  const loadRoomsData = React.useCallback((shift: ShiftType) => { fetchRooms(shift); }, [fetchRooms]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Rooms');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showInspectedModal, setShowInspectedModal] = useState(false);
  const [roomForInspection, setRoomForInspection] = useState<RoomCardData | null>(null);
  const [buttonPositionForInspection, setButtonPositionForInspection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedRoomForStatusChange, setSelectedRoomForStatusChange] = useState<RoomCardData | null>(null);
  const [roomToAssign, setRoomToAssign] = useState<RoomCardData | null>(null);
  const [showAssignStaffModal, setShowAssignStaffModal] = useState(false);
  const [selectedCardTop, setSelectedCardTop] = useState<number>(0);
  const [selectedCardHeight, setSelectedCardHeight] = useState<number>(0);
  const [statusButtonPosition, setStatusButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [originalScrollY, setOriginalScrollY] = useState<number>(0); // Store original scroll position before modal opens
  const [changingStatusRoomId, setChangingStatusRoomId] = useState<string | null>(null); // Track which room is updating status
  const [assigningStaffRoomId, setAssigningStaffRoomId] = useState<string | null>(null); // Track which room is assigning staff
  const currentScrollYRef = useRef<number>(0); // Track current scroll position
  const cardRefs = useRef<{ [key: string]: any }>({});
  const statusButtonRefs = useRef<{ [key: string]: any }>({});
  const scrollViewRef = useRef<ScrollView>(null);
  const { width: windowWidth, height: SCREEN_HEIGHT } = useWindowDimensions();
  const scaleX = windowWidth / DESIGN_WIDTH;
  const BOTTOM_NAV_HEIGHT = 152 * scaleX;
  const styles = useMemo(() => buildAllRoomsStyles(scaleX), [scaleX]);

  // Check if we came from a stack navigation (show back button) or tab navigation (don't show)
  const showBackButton = (route.params as any)?.showBackButton ?? false;
  const routeFilters = (route.params as any)?.filters as FilterState | undefined;
  const routeCategoryFilter = (route.params as any)?.categoryFilter as CategoryFilterParam | undefined;
  /*
   * Which Rooms list this person reads. Keyed off the job title rather than a
   * permission: supervisors and attendants hold the same rights as the managers
   * above them, only their day differs.
   */
  const { roomsVariant } = usePermissions();
  const { user: profile } = useUser();
  /**
   * Supervisors and housekeeping leadership get the profile header — Figma
   * 3883:5570 / 3838:1117. It has no back arrow and no "All Rooms" title, and
   * it sits in the flex flow, so the list needs no top padding. The other
   * variants stay on the legacy absolute header until their own design pass.
   */
  const useProfileHeader = roomsVariant === 'supervisor';
  const [profileHeaderHeight, setProfileHeaderHeight] = useState<number | null>(null);
  /**
   * Both status modals take `headerHeight` in *design* pixels and multiply it by
   * `scaleX` themselves, so a measured real-px height has to be divided back out
   * or the modals shrink by the scale factor. Dividing here keeps the modals
   * untouched; removing their internal `* scaleX` is the tidier fix and is
   * tracked with the rest of the scaleX removal.
   */
  const modalHeaderHeight =
    useProfileHeader && profileHeaderHeight != null ? profileHeaderHeight / scaleX : 217;
  /**
   * Window y where the status popover's blur begins — the tapped card's bottom
   * edge, so that card stays sharp (Figma 406-1783). Null until measured, which
   * makes the popover fall back to blurring from below the screen header.
   */
  const statusBlurTop =
    selectedCardTop > 0 && selectedCardHeight > 0 ? selectedCardTop + selectedCardHeight : null;
  /*
   * Measure the tapped card when the popover opens, not when the pill is
   * pressed.
   *
   * `handleStatusPress` may scroll the list first to make room for the popover,
   * and that moves the card — but every one of its branches only flips
   * `showStatusModal` once the scroll has settled and the pill has been
   * re-measured. Hanging off that flag therefore measures the card in its final
   * position, in one place, instead of at all eight call sites.
   */
  React.useEffect(() => {
    if (!showStatusModal || !selectedRoomForStatusChange) {
      setSelectedCardTop(0);
      setSelectedCardHeight(0);
      return;
    }
    const cardRef = cardRefs.current[selectedRoomForStatusChange.id];
    if (!cardRef?.measureInWindow) return;
    cardRef.measureInWindow((_x: number, y: number, _w: number, height: number) => {
      // Android returns zeros for a view it has collapsed out of the native
      // tree; leaving the state at 0 falls the popover back to a header-anchored
      // blur rather than putting the seam in the wrong place.
      if (typeof y === 'number' && !Number.isNaN(y) && height > 0) {
        setSelectedCardTop(y);
        setSelectedCardHeight(height);
      }
    });
  }, [showStatusModal, selectedRoomForStatusChange]);

  /** Banded by housekeeping status with In Progress pinned — Figma 3838:1117 / 3838:1623. */
  const isGroupedRooms = roomsVariant !== 'default';
  const isAttendant = roomsVariant === 'attendant';

  const prioritizeMyAssignedRooms =
    (route.params as { prioritizeMyAssignedRooms?: boolean } | undefined)?.prioritizeMyAssignedRooms === true;
  /**
   * Show only this user's rooms.
   *
   * Route param for everyone else — the Rooms tab sets it when you arrive from
   * an assignment notification, and clears it on a normal tap. Attendants are
   * never shown anyone else's rooms, so for them it is always on.
   */
  const shouldPrioritizeAssignedOnly = prioritizeMyAssignedRooms || isAttendant;

  const [assignedRoomIdsOrdered, setAssignedRoomIdsOrdered] = useState<string[]>([]);
  const [assignedRoomOrderLoading, setAssignedRoomOrderLoading] = useState(false);
  const [assignedRoomIdsForShiftOrdered, setAssignedRoomIdsForShiftOrdered] = useState<string[]>([]);
  const markedRoomAssignmentNotificationsReadRef = useRef(false);

  /**
   * Every room assigned to this user for the shift, before search or filters.
   *
   * The one-in-progress guard and the progress pill both read this rather than
   * `filteredRooms`: a search must not be able to hide the room that is blocking,
   * and filtering must not appear to change how much work is left.
   */
  const assignedRooms = useMemo(() => {
    const roomsPM = displayData.roomsPM ?? [];
    const usePMRooms = uiShift === 'PM' && Array.isArray(roomsPM) && roomsPM.length > 0;
    const shiftRooms = usePMRooms ? roomsPM : (displayData.rooms ?? []);
    const assignedIds = new Set(assignedRoomIdsForShiftOrdered.map(String));
    return shiftRooms.filter((room) => assignedIds.has(String(room.id)));
  }, [displayData.rooms, displayData.roomsPM, uiShift, assignedRoomIdsForShiftOrdered]);

  React.useEffect(() => {
    if (!shouldPrioritizeAssignedOnly || !session?.user?.id) {
      setAssignedRoomIdsOrdered([]);
      setAssignedRoomOrderLoading(false);
      setAssignedRoomIdsForShiftOrdered([]);
      return;
    }
    let cancelled = false;
    setAssignedRoomOrderLoading(true);
    void Promise.all([
      getDistinctAssignedRoomIdsOrderedByAssignmentCreatedAt(session.user.id),
      getAssignedRoomIdsForUserAndShiftOrderedByAssignmentCreatedAt(session.user.id, uiShift),
    ]).then(([anyShiftIds, shiftIds]) => {
      if (!cancelled) {
        setAssignedRoomIdsOrdered(anyShiftIds);
        setAssignedRoomIdsForShiftOrdered(shiftIds);
        setAssignedRoomOrderLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [shouldPrioritizeAssignedOnly, session?.user?.id, uiShift]);

  // Opening Rooms from the assignment badge: mark inbox rows read once so the tab badge clears (like Tickets).
  useFocusEffect(
    React.useCallback(() => {
      if (route.name !== 'Rooms') return;
      if (!prioritizeMyAssignedRooms) {
        markedRoomAssignmentNotificationsReadRef.current = false;
        return;
      }
      if (markedRoomAssignmentNotificationsReadRef.current) return;
      markedRoomAssignmentNotificationsReadRef.current = true;
      void markAllRoomAssignmentNotificationsRead().then(() => invalidateNotificationBadges());
    }, [route.name, prioritizeMyAssignedRooms])
  );

  // Initialize local filters: merge route filters with categoryFilter.roomState when coming from Home badge tap
  const [localFilters, setLocalFilters] = useState<FilterState | undefined>(() => {
    const rf = routeFilters;
    const cf = routeCategoryFilter;
    if (cf) {
      const baseRoomStates = { dirty: false, inProgress: false, cleaned: false, inspected: false, priority: false };
      const roomStates = {
        ...baseRoomStates,
        ...(rf?.roomStates || {}),
        ...(cf.roomState ? { [cf.roomState]: true } : {}),
      };
      return {
        ...(rf || {}),
        roomStates,
        guests: rf?.guests ?? { arrivals: false, departures: false, turnDown: false, noTask: false, stayOver: false, stayOverWithLinen: false, stayOverNoLinen: false, checkedIn: false, checkedOut: false, checkedOutDueIn: false, outOfOrder: false, outOfService: false },
        reservations: rf?.reservations ?? { occupied: false, vacant: false },
        floors: rf?.floors ?? { all: false },
      } as FilterState;
    }
    return rf;
  });

  useFocusEffect(
    React.useCallback(() => {
      const params = route.params as any;
      const currentRouteShift = params?.selectedShift as ShiftType | undefined;
      if (currentRouteShift && currentRouteShift !== allRoomsData?.selectedShift) {
        setSelectedShift(currentRouteShift);
        fetchRooms(currentRouteShift);
        setLocalFilters(undefined);
        setSearchQuery('');
      }
    }, [route.params, allRoomsData?.selectedShift, fetchRooms, setSelectedShift])
  );

  // Sync local filters with route params when navigating (e.g. from Home with categoryFilter)
  React.useEffect(() => {
    if (routeCategoryFilter) {
      setLocalFilters((prev) => {
        const baseRoomStates = { dirty: false, inProgress: false, cleaned: false, inspected: false, priority: false };
        const roomStates = {
          ...baseRoomStates,
          ...(prev?.roomStates || routeFilters?.roomStates || {}),
          ...(routeCategoryFilter.roomState ? { [routeCategoryFilter.roomState]: true } : {}),
        };
        return {
          ...(prev || routeFilters || {}),
          roomStates,
          guests: prev?.guests ?? routeFilters?.guests ?? { arrivals: false, departures: false, turnDown: false, noTask: false, stayOver: false, stayOverWithLinen: false, stayOverNoLinen: false, checkedIn: false, checkedOut: false, checkedOutDueIn: false, outOfOrder: false, outOfService: false },
          reservations: prev?.reservations ?? routeFilters?.reservations ?? { occupied: false, vacant: false },
          floors: prev?.floors ?? routeFilters?.floors ?? { all: false },
        } as FilterState;
      });
    } else if (routeFilters) {
      setLocalFilters(routeFilters);
    }
  }, [routeFilters, routeCategoryFilter]);
  
  // Prefer local filters (user's current selection) over route filters (initial state)
  // This allows reset to work properly by overriding route filters
  const activeFilters = localFilters !== undefined ? localFilters : routeFilters;
  
  // Check if there are active filters
  const hasActiveFilters = useMemo(
    () => hasAnyActiveFilter(activeFilters) || !!searchQuery,
    [activeFilters, searchQuery]
  );

  const handleShiftToggle = (shift: ShiftType) => {
    setSelectedShift(shift);
    fetchRooms(shift);
    setLocalFilters(undefined);
    setSearchQuery('');
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleFilterPress = () => {
    setShowFilterModal(true);
  };

  const handleAssignStaffPress = (room: RoomCardData) => {
    setRoomToAssign(room);
    setShowAssignStaffModal(true);
  };

  const handleAssignStaffSelect = async (staffId: string) => {
    if (!roomToAssign) return;
    const shift = displayData.selectedShift ?? 'AM';
    
    // Show loading indicator
    setAssigningStaffRoomId(roomToAssign.id);
    
    try {
      const staffInfo = await dashboardService.assignRoomToStaff(roomToAssign.id, staffId, shift);
      if (staffInfo) setRoomAttendant(roomToAssign.id, staffInfo);
    } catch (e) {
      console.warn('Assign room failed', e);
    } finally {
      // Hide loading indicator
      setAssigningStaffRoomId(null);
    }
    
    setShowAssignStaffModal(false);
    setRoomToAssign(null);
  };

  // Calculate filter counts from current shift's room list (AM: rooms, PM: roomsPM)
  const filterCounts: FilterCounts = useMemo(() => {
    const roomsPM = displayData.roomsPM ?? [];
    const usePMRooms = uiShift === 'PM' && Array.isArray(roomsPM) && roomsPM.length > 0;
    const sourceRooms = usePMRooms ? roomsPM : (displayData.rooms ?? []);

    const roomStates = {
      dirty: 0,
      inProgress: 0,
      cleaned: 0,
      inspected: 0,
      priority: 0,
      paused: 0,
      refused: 0,
      returnLater: 0,
    };

    const guests = {
      arrivals: 0,
      departures: 0,
      turnDown: 0,
      noTask: 0,
      stayOver: 0,
      stayOverWithLinen: 0,
      stayOverNoLinen: 0,
      checkedIn: 0,
      checkedOut: 0,
      checkedOutDueIn: 0,
      outOfOrder: 0,
      outOfService: 0,
    };
    const reservations = {
      occupied: 0,
      vacant: 0,
    };
    const totalRooms = sourceRooms.length;

    sourceRooms.forEach((room) => {
      // Room state counts
      if (room.houseKeepingStatus === 'Dirty') roomStates.dirty++;
      if (room.houseKeepingStatus === 'InProgress') roomStates.inProgress++;
      if (room.houseKeepingStatus === 'Cleaned') roomStates.cleaned++;
      if (room.houseKeepingStatus === 'Inspected') roomStates.inspected++;
      if (room.isPriority) roomStates.priority++;
      if (isRoomPaused(room)) roomStates.paused++;
      if ((room as any)?.returnLaterAt) roomStates.returnLater++;
      if ((room as any)?.refuseServiceReason || (room as any)?.refuseServiceAt) roomStates.refused++;

      // Guest counts based on category
      if (room.frontOfficeStatus === 'Arrival' || room.frontOfficeStatus === 'Arrival/Departure') {
        guests.arrivals++;
      }
      if (room.frontOfficeStatus === 'Departure' || room.frontOfficeStatus === 'Arrival/Departure') {
        guests.departures++;
      }
      if (room.frontOfficeStatus === 'Turndown') {
        guests.turnDown++;
      }
      if (room.frontOfficeStatus === 'No Task') {
        guests.noTask++;
      }
      if (room.frontOfficeStatus === 'Stayover') {
        guests.stayOver++;
        const withLinen = getStayoverWithLinen(room);
        if (withLinen === true) guests.stayOverWithLinen++;
        else if (withLinen === false) guests.stayOverNoLinen++;
      }

      // Reservation status counts (normalize casing for comparison)
      const res = (room.reservationStatus || '').toLowerCase();
      if (res === 'occupied') {
        reservations.occupied++;
      } else if (res === 'vacant') {
        reservations.vacant++;
      }
    });

    // Calculate floor counts from first digit of room number (101->1, 305->3, 507->5)
    const floorCounts: Record<number, number> = {};
    sourceRooms.forEach((room) => {
      const floor = getFloorFromRoomNumber(room.roomNumber);
      if (floor !== null) {
        floorCounts[floor] = (floorCounts[floor] || 0) + 1;
      }
    });

    const floors: Record<string, number> = {
      all: Object.values(floorCounts).reduce((sum, n) => sum + n, 0),
      ...Object.fromEntries(Object.entries(floorCounts).map(([k, v]) => [k, v])),
    };

    return { roomStates, guests, reservations, floors, totalRooms };
  }, [displayData.rooms, displayData.roomsPM, uiShift]);

  const handleApplyFilters = (appliedFilters: FilterState) => {
    setLocalFilters(appliedFilters);
    setShowFilterModal(false);
  };

  const handleGoToResults = (appliedFilters: FilterState) => {
    setLocalFilters(appliedFilters);
    setShowFilterModal(false);
    // Filters are already applied via activeFilters, no need to navigate
  };


  const handleAdvanceFilter = () => {
    // TODO: Navigate to advanced filter screen when implemented
    console.log('Advanced filter');
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleRoomPress = (room: RoomCardData) => {
    // Shared with RoomDetailScreen, so the list and the detail screen can no
    // longer disagree about which layout a room gets.
    const roomType = mapFrontOfficeToRoomType(room.frontOfficeStatus, room.guests?.length ?? 0);

    // Navigate to Room Detail; pass roomId so screen can fetch full details via getRoomDetailsById
    navigation.navigate('room/[roomId]', { room, roomType, roomId: room.id } as any);
  };

  /**
   * The room whose pill was tapped, held for one layout pass before the popover
   * opens.
   *
   * Tapping hides the "Rooms" title, which shortens the header and reflows the
   * list beneath it. Measuring the pill inside the tap handler — as this used
   * to — read a position the card no longer occupied by the time the popover
   * drew, so the tail pointed at empty space. Staging the room here lets the
   * reflow land first; the effect below measures once the layout has settled.
   */
  const [pendingStatusRoom, setPendingStatusRoom] = useState<RoomCardData | null>(null);

  const handleStatusPress = (room: RoomCardData) => {
    setPendingStatusRoom(room);
  };

  React.useEffect(() => {
    if (!pendingStatusRoom) return;
    const room = pendingStatusRoom;
    const savedScrollY = currentScrollYRef.current;
    let cancelled = false;

    /** A ref's window rect, or null when it cannot be measured. */
    const measure = (ref: any): Promise<{ x: number; y: number; width: number; height: number } | null> =>
      new Promise((resolve) => {
        if (!ref?.measureInWindow) {
          resolve(null);
          return;
        }
        try {
          ref.measureInWindow((x: number, y: number, width: number, height: number) => {
            const bad = [x, y, width, height].some(
              (v) => typeof v !== 'number' || Number.isNaN(v)
            );
            // Android reports zeros for a view it has collapsed out of the
            // native tree; treat that as unmeasurable rather than as the origin.
            resolve(bad || height <= 0 ? null : { x, y, width, height });
          });
        } catch {
          resolve(null);
        }
      });

    /** Two frames: one for the title to unmount, one for the list to settle. */
    const afterLayout = () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );

    const open = (anchor: { x: number; y: number; width: number; height: number } | null) => {
      if (cancelled) return;
      setStatusButtonPosition(anchor);
      setSelectedRoomForStatusChange(room);
      setShowStatusModal(true);
      setPendingStatusRoom(null);
    };

    const run = async () => {
      await afterLayout();
      if (cancelled) return;

      const pill = await measure(statusButtonRefs.current[room.id]);
      if (cancelled) return;
      if (!pill) {
        // No anchor: the popover falls back to sitting flush under the header.
        setOriginalScrollY(0);
        open(null);
        return;
      }

      const spacing = STATUS_MODAL_SPACING * scaleX;
      const modalHeight = STATUS_MODAL_HEIGHT * scaleX;
      /*
       * The same bound StatusPopover clamps to, so the screen's prediction and
       * the popover's placement cannot disagree. They used to: this side
       * reserved the bottom nav plus 20, the popover only the safe area plus 12.
       */
      const maxModalBottom = SCREEN_HEIGHT - insets.bottom - 12 * scaleX;
      const overflow = pill.y + pill.height + spacing + modalHeight - maxModalBottom;

      if (overflow <= 0 || !scrollViewRef.current) {
        setOriginalScrollY(0);
        open(pill);
        return;
      }

      /*
       * Scroll up so the popover fits, but never so far that the card it points
       * at leaves the viewport — the blur seam is anchored to that card's bottom
       * edge, and a card behind the header would put the seam above the list.
       */
      const headerBottom =
        useProfileHeader && profileHeaderHeight != null ? profileHeaderHeight : 0;
      const card = await measure(cardRefs.current[room.id]);
      if (cancelled) return;
      const cardBottom = card ? card.y + card.height : pill.y + pill.height;
      const maxMoveUp = Math.max(0, cardBottom - headerBottom);
      const moveUp = Math.min(overflow, maxMoveUp);

      if (moveUp <= 0) {
        setOriginalScrollY(0);
        open(pill);
        return;
      }

      setOriginalScrollY(savedScrollY);
      scrollViewRef.current.scrollTo({ y: Math.max(0, savedScrollY + moveUp), animated: true });

      // No scroll-end callback on a plain ScrollView, so wait out the animation
      // and re-measure; the pre-scroll rect is the fallback.
      await new Promise<void>((resolve) => setTimeout(resolve, 350));
      if (cancelled) return;
      const settled = await measure(statusButtonRefs.current[room.id]);
      if (cancelled) return;
      open(settled ?? pill);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    pendingStatusRoom,
    scaleX,
    SCREEN_HEIGHT,
    insets.bottom,
    useProfileHeader,
    profileHeaderHeight,
  ]);

  const handleStatusSelect = async (statusOption: StatusChangeOption, roomOverride?: RoomCardData | null) => {
    const roomToUpdate = roomOverride ?? selectedRoomForStatusChange;
    if (!roomToUpdate) return;

    // Map status option to RoomStatus
    const newStatus = mapStatusOptionToRoomStatus(statusOption);

    // An attendant works one room at a time. Checked against every assigned room,
    // not the filtered view, so a search cannot hide the room that is blocking.
    if (isAttendant && newStatus === 'InProgress') {
      const blocking = findBlockingInProgressRoom(assignedRooms, roomToUpdate.id);
      if (blocking) {
        setShowStatusModal(false);
        setStatusButtonPosition(null);
        messageModal.show({
          title: 'Finish your current room first',
          message: `Room ${blocking.roomNumber} is already in progress. Pause or complete it before starting Room ${roomToUpdate.roomNumber}.`,
          buttons: [{ text: 'OK' }],
        });
        return;
      }
    }

    // Priority toggles: if already priority, clicking Priority resets to normal
    const isPriorityToggle = statusOption === 'Priority';
    const newIsPriority = isPriorityToggle ? !roomToUpdate.isPriority : roomToUpdate.isPriority;
    const priorityPayload = isPriorityToggle ? (newIsPriority ? 'high' : 'normal') : undefined;

    const supabaseUpdates: RoomStateUpdate = {
      house_keeping_status: newStatus,
    };
    if (priorityPayload !== undefined) {
      supabaseUpdates.priority = priorityPayload;
    }

    // Show loading indicator
    setChangingStatusRoomId(roomToUpdate.id);

    try {
      await updateRoom(roomToUpdate.id, supabaseUpdates);
    } catch (e) {
      console.warn('Failed to update room status in Supabase', e);
    } finally {
      // Hide loading indicator
      setChangingStatusRoomId(null);
    }

    // Reset state
    setShowStatusModal(false);
    setSelectedRoomForStatusChange(null);
    setShowInspectedModal(false);
    setRoomForInspection(null);
    setButtonPositionForInspection(null);
  };

  // Sync activeTab with current route
  useFocusEffect(
    React.useCallback(() => {
      const routeName = route.name as string;
      if (routeName === 'Home' || routeName === 'Rooms' || routeName === 'Chat' || routeName === 'Tickets') {
        setActiveTab(routeName);
      }
    }, [route.name])
  );

  const handleTabPress = (tab: string, _options?: { fromRoomsAssignmentBadge?: boolean }) => {
    if (tab === 'AIHome') {
      openAIChatOverlay();
      return;
    }
    setActiveTab(tab); // Update immediately
  };

  const onRefresh = React.useCallback(() => {
    fetchRooms(uiShift);
  }, [fetchRooms, uiShift]);

  /**
   * The list a given selection produces.
   *
   * Takes the filters as an argument instead of closing over `activeFilters` so
   * the filter sheet can ask what a *pending* selection would leave, through the
   * exact pipeline that renders it — category, filters, search, shift and
   * assignment rules included. Anything less and the two disagree.
   */
  const computeRooms = useCallback((selection: FilterState | undefined) => {
    const roomsPM = displayData.roomsPM ?? [];
    const usePMRooms = uiShift === 'PM' && Array.isArray(roomsPM) && roomsPM.length > 0;
    let rooms = usePMRooms ? roomsPM : (displayData.rooms ?? []);

    // When user tapped a status badge or priority badge on Home
    if (routeCategoryFilter) {
      const { category, roomState } = routeCategoryFilter;
      rooms = rooms.filter((room) => {
        const matchesCategory =
          category === 'Flagged' ? !!room.flagged
          : category === 'Arrivals' ? (room.frontOfficeStatus === 'Arrival' || room.frontOfficeStatus === 'Arrival/Departure')
          : category === 'Departures' ? (room.frontOfficeStatus === 'Departure' || room.frontOfficeStatus === 'Arrival/Departure')
          : category === 'StayOvers' ? room.frontOfficeStatus === 'Stayover'
          : category === 'Turndown' ? room.frontOfficeStatus === 'Turndown'
          : category === 'No Task' ? room.frontOfficeStatus === 'No Task'
          : category === 'Vacant' ? (room.reservationStatus || '').toLowerCase() === 'vacant'
          : false;
        if (!roomState) {
          return matchesCategory;
        }
        if (roomState === 'priority') {
          return matchesCategory && !!room.isPriority;
        }
        const statusToHouseKeeping: Record<string, string> = { dirty: 'Dirty', inProgress: 'InProgress', cleaned: 'Cleaned', inspected: 'Inspected' };
        const targetStatus = statusToHouseKeeping[roomState];
        return matchesCategory && room.houseKeepingStatus === targetStatus;
      });
    }

    rooms = applyRoomFilters(rooms, selection);

    // Apply search query filter
    if (searchQuery) {
      rooms = rooms.filter(
        (room) =>
          room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          room.guests.some((guest) =>
            guest.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    if (uiShift === 'AM') {
      rooms = rooms.filter((room) => room.frontOfficeStatus !== 'Turndown');
    }

    // Tab badge: show only rooms assigned to this user, newest assignment first (room_assignments.created_at).
    if (shouldPrioritizeAssignedOnly && !assignedRoomOrderLoading) {
      // Authoritative: filter by assignments from DB for the current shift.
      if (assignedRoomIdsForShiftOrdered.length > 0) {
        const idSet = new Set(assignedRoomIdsForShiftOrdered.map(String));
        rooms = rooms.filter((r) => idSet.has(String(r.id)));
        const orderIndex = new Map(assignedRoomIdsForShiftOrdered.map((id, i) => [String(id), i]));
        rooms.sort((a, b) => (orderIndex.get(String(a.id))! - orderIndex.get(String(b.id))!));
      } else {
        // Fallback: use the assignment info already embedded on the room card.
        const uid = session?.user?.id;
        const assignedByUserId =
          uid ? rooms.filter((r) => String(r.roomAttendantAssigned?.userId ?? '') === String(uid)) : [];

        const sessionName = String(
          (session as any)?.user?.user_metadata?.full_name ??
            (session as any)?.user?.user_metadata?.name ??
            ''
        )
          .trim()
          .toLowerCase();
        const assignedByName = sessionName
          ? rooms.filter((r) => String(r.roomAttendantAssigned?.name ?? '').trim().toLowerCase() === sessionName)
          : [];

        const assignedOnly = assignedByUserId.length > 0 ? assignedByUserId : assignedByName;
        rooms = assignedOnly;

        // Optional sort by recency across any shift.
        if (assignedRoomIdsOrdered.length > 0) {
          const orderIndex = new Map(assignedRoomIdsOrdered.map((id, i) => [String(id), i]));
          rooms.sort((a, b) => {
            const ai = orderIndex.get(String(a.id));
            const bi = orderIndex.get(String(b.id));
            if (ai === undefined && bi === undefined) return 0;
            if (ai === undefined) return 1;
            if (bi === undefined) return -1;
            return ai - bi;
          });
        }
      }
    }

    return rooms;
  }, [
    displayData.rooms,
    displayData.roomsPM,
    uiShift,
    searchQuery,
    routeCategoryFilter,
    shouldPrioritizeAssignedOnly,
    assignedRoomOrderLoading,
    assignedRoomIdsOrdered,
    assignedRoomIdsForShiftOrdered,
    // The assigned-only fallback reads the signed-in user off the session.
    session,
  ]);

  const filteredRooms = useMemo(
    () => computeRooms(activeFilters),
    [computeRooms, activeFilters]
  );

  /** What the filter sheet's confirm button describes, as the user ticks boxes. */
  const countMatching = useCallback(
    (selection: FilterState) => computeRooms(selection).length,
    [computeRooms]
  );

  const roomGroups = useMemo(
    () => (isGroupedRooms ? groupRoomsByStatus(filteredRooms) : []),
    [isGroupedRooms, filteredRooms]
  );

  /*
   * How far through the shift an attendant is — Figma 3883:4994.
   *
   * Counted over everything assigned for the shift rather than over
   * `filteredRooms`, so searching or filtering does not appear to change how much
   * work is left. Held back while the assignment query is still running, since
   * until it lands the denominator would read 0.
   */
  const attendantProgress = useMemo(() => {
    if (!isAttendant || assignedRoomOrderLoading) return undefined;
    const finished = assignedRooms.filter(
      (room) => room.houseKeepingStatus === 'Cleaned' || room.houseKeepingStatus === 'Inspected'
    ).length;
    return { finished, total: assignedRooms.length };
  }, [isAttendant, assignedRoomOrderLoading, assignedRooms]);

  const showNoMatchingRoomsEmptyState =
    filteredRooms.length === 0 &&
    (hasActiveFilters || (shouldPrioritizeAssignedOnly && !assignedRoomOrderLoading));

  return (
    <View style={[
      styles.container,
      displayData?.selectedShift === 'PM' && styles.containerPM
    ]}>
      {loading && !allRoomsData && <LoadingOverlay fullScreen message="Loading rooms…" />}
      {shouldPrioritizeAssignedOnly && assignedRoomOrderLoading && allRoomsData && (
        <LoadingOverlay fullScreen message="Loading your assigned rooms…" />
      )}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {useProfileHeader && !showFilterModal && (
          <View onLayout={(e) => setProfileHeaderHeight(e.nativeEvent.layout.height)}>
            <RoomsHeader
              name={profile?.name}
              role={profile?.role}
              avatarUrl={profile?.avatar}
              shift={displayData.selectedShift}
              onShiftChange={handleShiftToggle}
              searchQuery={searchQuery}
              onSearch={handleSearch}
              onFilterPress={handleFilterPress}
              progress={attendantProgress}
              titleHidden={pendingStatusRoom != null || showStatusModal || showInspectedModal}
            />
          </View>
        )}

        {/* Scrollable Content with conditional blur */}
        <View
          style={[
            styles.scrollContainer,
            // The list must be clipped once the header is a real sibling above
            // it. `scrollContainer` carries `overflow: 'visible'`, which was
            // there because the legacy header was absolutely positioned *over*
            // the list — with the header in the flow, the same rule let list
            // content paint upward across it, so a card overlapped the profile
            // band and the "Rooms" title landed on top of a band heading.
            useProfileHeader && styles.scrollContainerClipped,
          ]}
        >
          {(() => {
            // Shared by both variants so scroll tracking, the refresh control
            // and the modal scroll-lock cannot drift between them.
            const scrollProps = {
              style: styles.scrollView,
              contentContainerStyle: [
                styles.scrollContent,
                // The in-flow header already occupies this space.
                useProfileHeader && styles.scrollContentInFlowHeader,
              ],
              showsVerticalScrollIndicator: false,
              scrollEnabled: !showStatusModal,
              // 'never' with the header in the flow: the header owns the
              // safe area (HomeHeader pads by insets.top), so letting iOS
              // adjust the list as well inset it twice.
              contentInsetAdjustmentBehavior: (useProfileHeader
                ? 'never'
                : 'automatic') as 'never' | 'automatic',
              keyboardShouldPersistTaps: 'handled' as const,
              onScroll: (event: any) => {
                currentScrollYRef.current = event.nativeEvent.contentOffset.y;
              },
              scrollEventThrottle: 16,
              refreshControl: (
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              ),
            };

            const renderRoomCard = (room: RoomCardData) =>
              useProfileHeader ? (
                <View key={room.id} style={styles.roomCardSlot}>
                  <RoomListCard
                    room={room}
                    onPress={() => handleRoomPress(room)}
                    onStatusPress={() => handleStatusPress(room)}
                    onAssignPress={() => handleAssignStaffPress(room)}
                    isChangingStatus={changingStatusRoomId === room.id}
                    measureRef={(ref) => {
                      if (ref) cardRefs.current[room.id] = ref;
                    }}
                    statusPillRef={(ref) => {
                      if (ref) statusButtonRefs.current[room.id] = ref;
                    }}
                  />
                </View>
              ) : (
                <RoomCard
                  key={room.id}
                  ref={(ref) => {
                    if (ref) {
                      cardRefs.current[room.id] = ref;
                    }
                  }}
                  room={room}
                  onPress={() => handleRoomPress(room)}
                  onStatusPress={() => handleStatusPress(room)}
                  onAssignStaffPress={handleAssignStaffPress}
                  statusButtonRef={(ref) => {
                    if (ref) {
                      statusButtonRefs.current[room.id] = ref;
                    }
                  }}
                  selectedShift={displayData.selectedShift}
                  isChangingStatus={changingStatusRoomId === room.id}
                  isAssigningStaff={assigningStaffRoomId === room.id}
                />
              );

            const emptyState = (
              <View style={styles.emptyStateCard}>
                <View style={styles.emptyStateIconContainer}>
                  <View style={styles.emptyStateIconCircle}>
                    <Image
                      source={require('../../../../assets/icons/menu-icon.png')}
                      style={styles.emptyStateIcon}
                      resizeMode="contain"
                      tintColor="#5a759d"
                    />
                  </View>
                </View>
                <Text style={styles.emptyStateTitle}>No rooms found</Text>
                <Text style={styles.emptyStateMessage}>
                  {shouldPrioritizeAssignedOnly
                    ? 'No assigned rooms match this shift or filters.\nTry another shift or clear filters.'
                    : 'The chosen filter options do not match any rooms.\nTry adjusting your filters or search query.'}
                </Text>
              </View>
            );

            if (isGroupedRooms && !showNoMatchingRoomsEmptyState) {
              return (
                <GroupedRoomsList
                  groups={roomGroups}
                  renderRoom={renderRoomCard}
                  scrollProps={scrollProps}
                  scrollRef={scrollViewRef}
                />
              );
            }

            return (
              <ScrollView ref={scrollViewRef} {...scrollProps}>
                {showNoMatchingRoomsEmptyState
                  ? emptyState
                  : filteredRooms.map(renderRoomCard)}
              </ScrollView>
            );
          })()}
        {/* The status modal's blur is drawn by StatusPopover, anchored at
            `statusBlurTop`. A second copy used to be sketched here, gated on
            `selectedCardTop > 0` while nothing ever set it — so it never
            rendered once. The measurement it wanted now lives in the effect
            above and is passed down instead. */}
        </View>

        {/* Header. The legacy one is absolute and painted last so it sits over
            the list; the profile header is a normal flex child, rendered above
            the list further up this tree. */}
        {!useProfileHeader && (
          <AllRoomsHeader
            selectedShift={displayData.selectedShift}
            onShiftToggle={handleShiftToggle}
            onSearch={handleSearch}
            searchQuery={searchQuery}
            onFilterPress={handleFilterPress}
            onBackPress={handleBackPress}
            showFilterModal={showFilterModal}
            progress={attendantProgress}
          />
        )}
      </KeyboardAvoidingView>

      {/* Bottom Navigation - Outside KeyboardAvoidingView to prevent movement */}
      <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />

      {/* Status Change Modal */}
      <StatusChangeModal
        visible={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setSelectedRoomForStatusChange(null);
          setStatusButtonPosition(null);
          
          // Restore original scroll position if we scrolled
          if (originalScrollY > 0 && scrollViewRef.current) {
            setTimeout(() => {
              scrollViewRef.current?.scrollTo({
                y: originalScrollY,
                animated: true,
              });
              setOriginalScrollY(0); // Reset after restoring
            }, 100); // Small delay to ensure modal close animation completes
          }
        }}
        onStatusSelect={handleStatusSelect}
        onInspectedSelect={() => {
          if (selectedRoomForStatusChange) {
            setRoomForInspection(selectedRoomForStatusChange);
            setButtonPositionForInspection(statusButtonPosition);
            setShowInspectedModal(true);
          }
        }}
        currentStatus={selectedRoomForStatusChange?.houseKeepingStatus || 'InProgress'}
        room={selectedRoomForStatusChange || undefined}
        buttonPosition={statusButtonPosition}
        headerHeight={modalHeaderHeight}
        blurTop={statusBlurTop}
        onFlagToggle={(flagged) => {
          if (selectedRoomForStatusChange) {
            setSelectedRoomForStatusChange((prev) => (prev ? { ...prev, flagged } : null));
            updateRoom(selectedRoomForStatusChange.id, { flagged }).catch((e) =>
              console.warn('Failed to update room flag in Supabase', e)
            );
          }
        }}
      />

      {/* Inspection Checklist Modal - shown when changing to Inspected */}
      <InspectedStatusSlideModal
        visible={showInspectedModal}
        onClose={() => {
          setShowInspectedModal(false);
          setRoomForInspection(null);
          setButtonPositionForInspection(null);
          if (originalScrollY > 0 && scrollViewRef.current) {
            setTimeout(() => {
              scrollViewRef.current?.scrollTo({
                y: originalScrollY,
                animated: true,
              });
              setOriginalScrollY(0);
            }, 100);
          }
        }}
        onComplete={() => handleStatusSelect('Inspected', roomForInspection)}
        onReject={() => {
          if (!roomForInspection) return;
          updateRoom(roomForInspection.id, { house_keeping_status: 'Dirty' }).catch((e) =>
            console.warn('[AllRoomsScreen] Failed to reject room', e)
          );
          const assignedUserId = roomForInspection.roomAttendantAssigned?.userId;
          if (assignedUserId) {
            notifyServer({
              type: 'room_assignment',
              roomId: roomForInspection.id,
              shiftId: displayData.selectedShift ?? 'AM',
              assignedUserId,
            }).catch(() => {});
          }
        }}
        buttonPosition={buttonPositionForInspection}
        headerHeight={modalHeaderHeight}
        showTriangle={true}
      />

      {/* Assign Staff Modal - staff list when room has no assignee */}
      <ReassignModal
        visible={showAssignStaffModal}
        onClose={() => {
          setShowAssignStaffModal(false);
          setRoomToAssign(null);
        }}
        onStaffSelect={handleAssignStaffSelect}
        onAutoAssign={() => {}}
        roomNumber={roomToAssign?.roomNumber}
        showAutoAssign={false}
      />

      {/* Filter Modal */}
      <AllRoomsFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApplyFilters={handleApplyFilters}
        initialFilters={activeFilters || undefined}
        filterCounts={filterCounts}
        onFilterIconPress={() => setShowFilterModal(false)}
        countMatching={countMatching}
      />

    </View>
  );
}

function buildAllRoomsStyles(scaleX: number) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  containerPM: {
    backgroundColor: '#38414F', // Dark slate gray for PM mode
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'visible', // Allow content to overflow on iOS
  },
  scrollView: {
    flex: 1,
    overflow: 'visible', // Allow content to overflow on iOS
  },
  scrollContent: {
    paddingTop: (217 + 23) * scaleX, // Header height (217px) + spacing from search input (23px)
    paddingBottom: 152 * scaleX + 20 * scaleX, // Bottom nav height + extra padding
    overflow: 'visible', // Allow content to overflow on iOS
  },
  scrollContentInFlowHeader: {
    paddingTop: 0,
  },
  scrollContainerClipped: {
    overflow: 'hidden',
  },
  roomCardSlot: {
    // The design insets cards 9px and stacks them 16px apart. The card this
    // replaces carried its own marginHorizontal/marginBottom; the new one is
    // `w-full` and lets the list own the gutter.
    paddingHorizontal: 9,
    paddingBottom: 16,
  },
  emptyStateCard: {
    width: CARD_DIMENSIONS.width * scaleX,
    alignSelf: 'center',
    backgroundColor: '#f8faff',
    borderWidth: 2,
    borderColor: '#d4e3f7',
    borderRadius: 16 * scaleX,
    padding: 32 * scaleX,
    marginTop: 20 * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220 * scaleX,
    shadowColor: 'rgba(90, 117, 157, 0.25)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
    // Gradient-like effect using multiple layers
    overflow: 'hidden',
  },
  emptyStateIconContainer: {
    marginBottom: 20 * scaleX,
  },
  emptyStateIconCircle: {
    width: 80 * scaleX,
    height: 80 * scaleX,
    borderRadius: 40 * scaleX,
    backgroundColor: 'rgba(90, 117, 157, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#5a759d',
    shadowColor: '#5a759d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyStateIcon: {
    width: 40 * scaleX,
    height: 40 * scaleX,
  },
  emptyStateTitle: {
    fontSize: 22 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700' as any,
    color: '#5a759d',
    marginBottom: 12 * scaleX,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 15 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '400' as any,
    color: '#607AA1',
    textAlign: 'center',
    lineHeight: 22 * scaleX,
    paddingHorizontal: 10 * scaleX,
  },
  emptyStateCardPM: {
    backgroundColor: '#3A3D49', // Dark gray for PM mode
    borderColor: '#4A4D59', // Darker border for PM mode
  },
  emptyStateTitlePM: {
    color: colors.text.white,
  },
  emptyStateMessagePM: {
    color: colors.text.white,
  },
});
}

