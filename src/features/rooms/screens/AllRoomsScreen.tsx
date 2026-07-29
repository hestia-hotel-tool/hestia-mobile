import React, { useState, useRef, useMemo } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, useWindowDimensions, Text, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from 'expo-router';
import { NativeStackNavigationProp } from 'expo-router';
import { BottomTabNavigationProp } from 'expo-router/js-tabs';
import { colors } from '@shared/theme';
import { ShiftType } from '@features/home';
import { type RoomStateUpdate } from '../services/dashboard';
import { useRoomsStore } from '../store/useRoomsStore';
import { dashboardService } from '../services/dashboard';
import { LoadingOverlay } from '@shared/ui/LoadingOverlay';
import { useAIChatOverlay } from '@features/ai-agent';
import { RoomCardData, StatusChangeOption } from '../types/allRooms.types';
import AllRoomsHeader from '../components/allRooms/AllRoomsHeader';
import RoomCard from '../components/allRooms/RoomCard';
import BottomTabBar from '@/components/BottomTabBar';
import StatusChangeModal from '../components/allRooms/StatusChangeModal';
import InspectedStatusSlideModal from '../components/allRooms/InspectedStatusSlideModal';
import CleanChecklistModal from '../components/allRooms/CleanChecklistModal';
import type { RootStackParamList, MainTabsParamList } from '@/types/navigation';
import { useAuth } from '@features/auth';
import {
  invalidateNotificationBadges,
  markAllRoomAssignmentNotificationsRead,
} from '@shared/lib/inAppNotifications';
import {
  getAssignedRoomIdsForUserAndShiftOrderedByAssignmentCreatedAt,
  getDistinctAssignedRoomIdsOrderedByAssignmentCreatedAt,
} from '../services/rooms';
import { BlurView } from 'expo-blur';
import { FilterState, FilterCounts } from '@shared/types/filter.types';
import type { CategoryName } from '@features/home';
import AllRoomsFilterModal from '../components/allRooms/AllRoomsFilterModal';
import ReassignModal from '../components/roomDetail/ReassignModal';
import { CARD_DIMENSIONS, CARD_COLORS } from '../constants/allRoomsStyles';
import { getShiftFromTime } from '@shared/utils/shiftUtils';
import { getStayoverWithLinen } from '../utils/stayoverLinen';
import { getFloorFromRoomNumber } from '@shared/utils/formatting';

/** When user taps a status badge or priority badge on Home. */
export type CategoryFilterParam = {
  category: CategoryName;
  roomState?: 'dirty' | 'inProgress' | 'cleaned' | 'inspected' | 'priority';
};

const DESIGN_WIDTH = 440;

type AllRoomsScreenNavigationProp = BottomTabNavigationProp<MainTabsParamList, 'Rooms'> &
  NativeStackNavigationProp<RootStackParamList>;

export default function AllRoomsScreen() {
  const navigation = useNavigation<AllRoomsScreenNavigationProp>();
  const { session } = useAuth();
  const { open: openAIChatOverlay } = useAIChatOverlay();
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
  const [showCleanChecklistModal, setShowCleanChecklistModal] = useState(false);
  const [roomForCleaning, setRoomForCleaning] = useState<RoomCardData | null>(null);
  const [buttonPositionForCleaning, setButtonPositionForCleaning] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
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
  const prioritizeMyAssignedRooms =
    (route.params as { prioritizeMyAssignedRooms?: boolean } | undefined)?.prioritizeMyAssignedRooms === true;
  /** Filter/sort list while param is true (decoupled from badge count so list stays after notifications are marked read). */
  const shouldPrioritizeAssignedOnly = prioritizeMyAssignedRooms;

  const [assignedRoomIdsOrdered, setAssignedRoomIdsOrdered] = useState<string[]>([]);
  const [assignedRoomOrderLoading, setAssignedRoomOrderLoading] = useState(false);
  const [assignedRoomIdsForShiftOrdered, setAssignedRoomIdsForShiftOrdered] = useState<string[]>([]);
  const markedRoomAssignmentNotificationsReadRef = useRef(false);

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
  const hasActiveFilters = useMemo(() => {
    if (!activeFilters) return false;
    const hasRoomStateFilter = Object.values(activeFilters.roomStates || {}).some(v => v);
    const hasGuestFilter = Object.values(activeFilters.guests || {}).some(v => v);
    const hasReservationFilter = Object.values(activeFilters.reservations || {}).some(v => v);
    const hasFloorFilter = Object.values(activeFilters.floors || {}).some(v => v);
    return hasRoomStateFilter || hasGuestFilter || hasReservationFilter || hasFloorFilter || !!searchQuery;
  }, [activeFilters, searchQuery]);

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
      if (room.roomAttendantAssigned?.assignmentWorkStatus === 'paused') roomStates.paused++;
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

  const handleGoToHomeWithFilters = (appliedFilters: FilterState) => {
    setShowFilterModal(false);
    navigation.navigate('Home' as any, { filters: appliedFilters } as any);
  };

  const handleAdvanceFilter = () => {
    // TODO: Navigate to advanced filter screen when implemented
    console.log('Advanced filter');
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleRoomPress = (room: RoomCardData) => {
    // Map room category to RoomType
    const mapCategoryToRoomType = (category: string) => {
      switch (category) {
        case 'Arrival':
          return 'Arrival';
        case 'Departure':
          return 'Departure';
        case 'Arrival/Departure':
          return 'ArrivalDeparture';
        case 'Stayover':
          return 'Stayover';
        case 'Turndown':
          return 'Turndown';
        case 'No Task':
          return 'Stayover'; // Reuse Stayover layout for No Task
        default:
          return 'ArrivalDeparture'; // Default fallback
      }
    };

    const roomType = mapCategoryToRoomType(room.frontOfficeStatus);
    
    // Navigate to Room Detail; pass roomId so screen can fetch full details via getRoomDetailsById
    navigation.navigate('RoomDetail', { room, roomType, roomId: room.id } as any);
  };

  const handleStatusPress = (room: RoomCardData) => {
    // Store current scroll position before any changes
    const savedScrollY = currentScrollYRef.current;
    
    // Measure status button position
    const statusButtonRef = statusButtonRefs.current[room.id];
    if (statusButtonRef) {
      statusButtonRef.measureInWindow((x: number, y: number, width: number, height: number) => {
        const buttonBottom = y + height;
        const spacing = 50 * scaleX; // Spacing between button and modal (matches StatusChangeModal)
        const modalHeight = 324.185 * scaleX; // Modal height from StatusChangeModal
        const modalTop = buttonBottom + spacing;
        const modalBottom = modalTop + modalHeight;
        const marginFromBottom = 20 * scaleX; // Desired margin from bottom nav
        const maxModalBottom = SCREEN_HEIGHT - BOTTOM_NAV_HEIGHT - marginFromBottom;
        
        // Check if modal would be cut off at the bottom
        const wouldBeCutOff = modalBottom > maxModalBottom;
        
        // Store room and position
        const roomData = room;
        const initialPosition = { x, y, width, height };
        
        if (wouldBeCutOff && scrollViewRef.current) {
          // Calculate how much we need to scroll up
          // We want modal bottom to be at maxModalBottom
          const desiredModalBottom = maxModalBottom;
          const desiredModalTop = desiredModalBottom - modalHeight;
          const desiredButtonBottom = desiredModalTop - spacing;
          const desiredButtonTop = desiredButtonBottom - height;
          
          // Calculate how much the button needs to move up
          const buttonMoveUp = y - desiredButtonTop;
          
          if (buttonMoveUp > 0) {
            // Store original scroll position
            setOriginalScrollY(savedScrollY);
            
            // Calculate new scroll position (scroll up by the amount button needs to move)
            const newScrollY = Math.max(0, savedScrollY + buttonMoveUp);
            
            // Scroll up to make room for modal
            scrollViewRef.current?.scrollTo({
              y: newScrollY,
              animated: true,
            });
            
            // Wait for scroll to complete, then measure button again and show modal
            setTimeout(() => {
              const buttonRefAfterScroll = statusButtonRefs.current[roomData.id];
              if (buttonRefAfterScroll) {
                try {
                  buttonRefAfterScroll.measureInWindow((x2: number, y2: number, width2: number, height2: number) => {
                    if (x2 !== undefined && y2 !== undefined && !isNaN(x2) && !isNaN(y2)) {
                      setStatusButtonPosition({ x: x2, y: y2, width: width2, height: height2 });
                      setSelectedRoomForStatusChange(roomData);
                      setShowStatusModal(true);
                    } else {
                      // Fallback: use original position
                      setStatusButtonPosition(initialPosition);
                      setSelectedRoomForStatusChange(roomData);
                      setShowStatusModal(true);
                    }
                  });
                } catch (error) {
                  console.log('Error measuring button after scroll:', error);
                  setStatusButtonPosition(initialPosition);
                  setSelectedRoomForStatusChange(roomData);
                  setShowStatusModal(true);
                }
              } else {
                setStatusButtonPosition(initialPosition);
                setSelectedRoomForStatusChange(roomData);
                setShowStatusModal(true);
              }
            }, 400);
          } else {
            // No scroll needed
            setOriginalScrollY(0);
            setStatusButtonPosition(initialPosition);
            setSelectedRoomForStatusChange(roomData);
            setShowStatusModal(true);
          }
        } else {
          // Modal fits, no scroll needed
          setOriginalScrollY(0);
          setStatusButtonPosition(initialPosition);
          setSelectedRoomForStatusChange(roomData);
          setShowStatusModal(true);
        }
      });
    } else {
      // Fallback: use card position if button ref not available
      const cardRef = cardRefs.current[room.id];
      if (cardRef) {
        cardRef.measureInWindow((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
          // Estimate button position from card position
          const isArrivalDeparture = room.frontOfficeStatus === 'Arrival/Departure';
          let buttonLeft: number;
          let buttonTop: number;
          if (isArrivalDeparture) {
            buttonLeft = 255;
            buttonTop = 114;
          } else if (room.notes) {
            buttonLeft = 256;
            buttonTop = 74;
          } else if (room.frontOfficeStatus === 'Departure') {
            buttonLeft = 262;
            buttonTop = 81;
          } else {
            buttonLeft = 270;
            buttonTop = 87;
          }
          const buttonX = pageX + buttonLeft * scaleX;
          const buttonY = pageY + buttonTop * scaleX;
          setStatusButtonPosition({ 
            x: buttonX, 
            y: buttonY, 
            width: 134 * scaleX, 
            height: 70 * scaleX 
          });
          setSelectedRoomForStatusChange(room);
          setShowStatusModal(true);
        });
      } else {
        setSelectedRoomForStatusChange(room);
        setShowStatusModal(true);
      }
    }
  };

  const mapStatusOptionToRoomStatus = (option: StatusChangeOption): RoomCardData['houseKeepingStatus'] => {
    switch (option) {
      case 'Dirty':
        return 'Dirty';
      case 'InProgress':
        return 'InProgress';
      case 'Cleaned':
        return 'Cleaned';
      case 'Inspected':
        return 'Inspected';
      case 'Priority':
      case 'Pause':
      case 'ReturnLater':
      case 'RefuseService':
      case 'PromisedTime':
        return 'InProgress';
      default:
        return 'InProgress';
    }
  };

  const handleStatusSelect = async (statusOption: StatusChangeOption, roomOverride?: RoomCardData | null) => {
    const roomToUpdate = roomOverride ?? selectedRoomForStatusChange;
    if (!roomToUpdate) return;

    // Map status option to RoomStatus
    const newStatus = mapStatusOptionToRoomStatus(statusOption);

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

  const handleTabPress = (tab: string, options?: { fromRoomsAssignmentBadge?: boolean }) => {
    if (tab === 'AIHome') {
      openAIChatOverlay();
      return;
    }
    setActiveTab(tab); // Update immediately
    const currentScreen = (route.params as any)?.showBackButton ? 'Rooms' : (route.name as string);
    const returnToTab = currentScreen as 'Home' | 'Rooms' | 'Chat' | 'Tickets' | 'LostAndFound' | 'Staff' | 'Settings';
    if (tab === 'Home') {
      navigation.navigate('Home' as any);
    } else if (tab === 'Rooms') {
      navigation.navigate('Rooms' as any, {
        prioritizeMyAssignedRooms: !!options?.fromRoomsAssignmentBadge,
      });
    } else if (tab === 'Chat') {
      navigation.navigate('Chat' as any);
    } else if (tab === 'Tickets') {
      navigation.navigate('Tickets' as any);
    } else if (tab === 'LostAndFound') {
      (navigation as any).navigate('LostAndFound', { returnToTab });
    } else if (tab === 'Staff') {
      (navigation as any).navigate('Staff', { returnToTab });
    } else if (tab === 'Settings') {
      (navigation as any).navigate('Settings', { returnToTab });
    }
  };

  const onRefresh = React.useCallback(() => {
    fetchRooms(uiShift);
  }, [fetchRooms, uiShift]);

  const filteredRooms = useMemo(() => {
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

    // Apply filters if provided
    if (activeFilters) {
      const hasRoomStateFilter = Object.values(activeFilters.roomStates).some(v => v);
      const hasGuestFilter = Object.values(activeFilters.guests).some(v => v);
      const hasReservationFilter = Object.values(activeFilters.reservations || {}).some(v => v);
      const hasFloorFilter = Object.values(activeFilters.floors || {}).some(v => v);

      // Apply floor filter (first digit of room number = floor: 101->1, 305->3, 507->5)
      if (hasFloorFilter) {
        const floorFilters = activeFilters.floors || {};
        const isAllSelected = floorFilters.all;

        if (!isAllSelected) {
          const allowedFloors = new Set<number>();
          Object.entries(floorFilters).forEach(([key, selected]) => {
            if (key !== 'all' && selected) {
              const floorNum = parseInt(key, 10);
              if (!isNaN(floorNum)) allowedFloors.add(floorNum);
            }
          });

          rooms = rooms.filter((room) => {
            const floor = getFloorFromRoomNumber(room.roomNumber);
            return floor !== null && allowedFloors.has(floor);
          });
        }
      }

      // Apply room state, guest, and reservation filters (any combination)
      if (hasRoomStateFilter || hasGuestFilter || hasReservationFilter) {
        rooms = rooms.filter((room) => {
          // Check room state filters
          if (hasRoomStateFilter) {
            const matchesRoomState =
              (activeFilters.roomStates.dirty && room.houseKeepingStatus === 'Dirty') ||
              (activeFilters.roomStates.inProgress && room.houseKeepingStatus === 'InProgress') ||
              (activeFilters.roomStates.cleaned && room.houseKeepingStatus === 'Cleaned') ||
              (activeFilters.roomStates.inspected && room.houseKeepingStatus === 'Inspected') ||
              (activeFilters.roomStates.priority && room.isPriority) ||
              (activeFilters.roomStates.paused && room.roomAttendantAssigned?.assignmentWorkStatus === 'paused') ||
              (activeFilters.roomStates.returnLater && !!(room as any)?.returnLaterAt) ||
              (activeFilters.roomStates.refused && (!!(room as any)?.refuseServiceReason || !!(room as any)?.refuseServiceAt));

            if (!matchesRoomState) {
              return false;
            }
          }

          // Check guest filters (Arrival/Departure/Stayover/Turndown/No Task)
          if (hasGuestFilter) {
            const matchesGuest =
              (activeFilters.guests.arrivals && (room.frontOfficeStatus === 'Arrival' || room.frontOfficeStatus === 'Arrival/Departure')) ||
              (activeFilters.guests.departures && (room.frontOfficeStatus === 'Departure' || room.frontOfficeStatus === 'Arrival/Departure')) ||
              (activeFilters.guests.turnDown && room.frontOfficeStatus === 'Turndown') ||
              (activeFilters.guests.noTask && room.frontOfficeStatus === 'No Task') ||
              (activeFilters.guests.stayOver && room.frontOfficeStatus === 'Stayover') ||
              (activeFilters.guests.stayOverWithLinen && room.frontOfficeStatus === 'Stayover' && getStayoverWithLinen(room) === true) ||
              (activeFilters.guests.stayOverNoLinen && room.frontOfficeStatus === 'Stayover' && getStayoverWithLinen(room) === false);

            if (!matchesGuest) {
              return false;
            }
          }

          // Check reservation filters (case-insensitive for robustness)
          if (hasReservationFilter) {
            const res = (room.reservationStatus || '').toLowerCase();
            const matchesReservation =
              (activeFilters.reservations?.occupied && res === 'occupied') ||
              (activeFilters.reservations?.vacant && res === 'vacant');

            if (!matchesReservation) {
              return false;
            }
          }

          return true;
        });
      }
    }

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
    activeFilters,
    searchQuery,
    routeCategoryFilter,
    shouldPrioritizeAssignedOnly,
    assignedRoomOrderLoading,
    assignedRoomIdsOrdered,
    assignedRoomIdsForShiftOrdered,
  ]);

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
        {/* Scrollable Content with conditional blur */}
        <View style={styles.scrollContainer}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!showStatusModal}
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            onScroll={(event) => {
              // Track current scroll position
              currentScrollYRef.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
          {showNoMatchingRoomsEmptyState ? (
            // Empty state card when filters don't match any rooms
            <View style={[
              styles.emptyStateCard,
            ]}>
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
              <Text style={[
                styles.emptyStateTitle,
              ]}>
                No rooms found
              </Text>
              <Text style={[
                styles.emptyStateMessage,
              ]}>
                {shouldPrioritizeAssignedOnly
                  ? 'No assigned rooms match this shift or filters.\nTry another shift or clear filters.'
                  : `The chosen filter options do not match any rooms.${'\n'}Try adjusting your filters or search query.`}
              </Text>
            </View>
          ) : (
            filteredRooms.map((room) => (
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
            ))
          )}
        </ScrollView>
        
        {/* Blur Overlay for Status Modal - starts from bottom of target card, covers everything below including tabs */}
        {showStatusModal && selectedCardTop > 0 && (
          <BlurView 
            intensity={80} 
            style={[
              styles.statusModalBlurOverlay,
              { top: selectedCardTop + selectedCardHeight }
            ]} 
            tint="light"
          >
            <View style={styles.blurOverlayDarkener} />
          </BlurView>
        )}
        </View>

        {/* Header - Fixed at top (no blur) */}
        <AllRoomsHeader
          selectedShift={displayData.selectedShift}
          onShiftToggle={handleShiftToggle}
          onSearch={handleSearch}
          searchQuery={searchQuery}
          onFilterPress={handleFilterPress}
          onBackPress={handleBackPress}
          showFilterModal={showFilterModal}
        />
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
        onCleanedSelect={() => {
          if (selectedRoomForStatusChange) {
            setRoomForCleaning(selectedRoomForStatusChange);
            setButtonPositionForCleaning(statusButtonPosition);
            setShowCleanChecklistModal(true);
          }
        }}
        currentStatus={selectedRoomForStatusChange?.houseKeepingStatus || 'InProgress'}
        room={selectedRoomForStatusChange || undefined}
        buttonPosition={statusButtonPosition}
        headerHeight={217} // AllRoomsScreen header height
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
        buttonPosition={buttonPositionForInspection}
        headerHeight={217}
        showTriangle={true}
      />

      {/* Clean Checklist Modal - shown when changing to Cleaned */}
      <CleanChecklistModal
        visible={showCleanChecklistModal}
        onClose={() => {
          setShowCleanChecklistModal(false);
          setRoomForCleaning(null);
          setButtonPositionForCleaning(null);
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
        onComplete={() => handleStatusSelect('Cleaned', roomForCleaning)}
        buttonPosition={buttonPositionForCleaning}
        headerHeight={217}
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
        headerHeight={217}
        onFilterIconPress={handleFilterPress}
        actualFilteredCount={filteredRooms.length}
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
  contentBlurOverlay: {
    position: 'absolute',
    top: 217 * scaleX, // Start below header
    left: 0,
    right: 0,
    bottom: 152 * scaleX, // Stop above bottom nav
    zIndex: 1,
  },
  statusModalBlurOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0, // Extends to bottom of screen, covering tabs
    zIndex: 1,
  },
  blurOverlayDarkener: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(200, 200, 200, 0.6)',
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

