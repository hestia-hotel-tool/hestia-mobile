import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { useDesignScale } from '@/hooks/useDesignScale';
import { HOME_HEADER_HEIGHT_DESIGN_PX } from '../constants/homeLayout';
import { useNavigation, useRoute, useFocusEffect } from 'expo-router';
import { CompositeNavigationProp } from 'expo-router/react-navigation';
import { BottomTabNavigationProp } from 'expo-router/js-tabs';
import { NativeStackNavigationProp } from 'expo-router';
import { colors } from '@/theme';

import type { ShiftType } from '../types/home.types';
import { useAuth } from '@features/auth';
import { useUserStore } from '@features/account';
import { userProfileFromSession } from '@features/account';
import { useAIChatOverlay } from '@features/ai-agent';
import { useRoomsStore } from '@features/rooms';
import { LoadingOverlay } from '@/components/feedback/LoadingOverlay';
import type { MoreMenuItemId } from '@/types/more.types';
import type { RootStackParamList } from '@/types/navigation';
import HomeHeader from '../components/HomeHeader';
import HousekeepingDashboard from '../components/HousekeepingDashboard';
import { usePermissions } from '@/domain/rbac';
import { SearchAndFilterBar } from '@/components/ui/SearchAndFilterBar';
import EngineeringTicketsOverviewCard from '../components/EngineeringTicketsOverviewCard';
import EngineeringRecentActivityItem from '../components/EngineeringRecentActivityItem';
import HskPortierTasksOverviewCard from '../components/HskPortierTasksOverviewCard';
import HskPortierCategoryListCard from '../components/HskPortierCategoryListCard';
import BottomTabBar from '@/components/layout/BottomTabBar';
import HomeFilterModal from '../components/HomeFilterModal';
import { FilterState, FilterCounts } from '@/types/filter.types';
import type { CategorySection } from '../types/home.types';
import type { RoomCardData } from '@features/rooms';
import { getShiftFromTime } from '@/utils/shiftUtils';
import { getFloorFromRoomNumber } from '@/utils/formatting';
import { getRecentActivityLogs } from '@/lib/activityLogs';
import { dashboardService } from '@features/rooms';
import { getDistinctAssignedRoomIdsOrderedByAssignmentCreatedAt, getRoomNumbersByIds } from '@features/rooms';
import { getLatestPausedAssignment } from '../services/home';

import type { MainTabsParamList } from '@/types/navigation';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList, '(home)/index'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen() {
  const { scaleX } = useDesignScale();
  const styles = useMemo(() => buildHomeScreenStyles(scaleX), [scaleX]);
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const route = useRoute();
  const { open: openAIChatOverlay } = useAIChatOverlay();
  const { session } = useAuth();
  const { homeVariant } = usePermissions();
  const [homeData, setHomeData] = useState(() => ({
    // Avoid mock fallbacks — hydrate from Supabase stores/session only.
    user: undefined as any,
    selectedShift: getShiftFromTime(),
    categories: [] as any[],
  }));
  const { data: roomsStoreData, loading: roomsLoading, fetchRooms, updateRoom } = useRoomsStore();
  const roomsForHome = useMemo(
    () => ({
      rooms: roomsStoreData?.rooms ?? [],
      roomsPM: roomsStoreData?.roomsPM ?? [],
    }),
    [roomsStoreData?.rooms, roomsStoreData?.roomsPM]
  );
  const [activeFilters, setActiveFilters] = useState<FilterState | undefined>(
    (route.params as any)?.filters as FilterState | undefined
  );
  const [activeTab, setActiveTab] = useState('Home');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [assignedRoomIdsOrdered, setAssignedRoomIdsOrdered] = useState<string[]>([]);

  // PM should behave like AM during AM hours; PM home categories differ from AM (see derivedCategories).
  const currentShiftFromClock = useMemo(() => getShiftFromTime(), []);
  const effectiveShift: ShiftType =
    homeData.selectedShift === 'PM' && currentShiftFromClock === 'AM'
      ? 'AM'
      : homeData.selectedShift;

  const { profile, loading: userLoading, fetchProfile } = useUserStore();
  const sessionFallback = useMemo(
    () =>
      session?.user
        ? userProfileFromSession(session.user.user_metadata, session.user.email, false)
        : undefined,
    [session?.user]
  );
  // useFocusEffect already fires on mount, so the separate useEffect that used
  // to sit here fetched the same profile a second time on every cold start.
  useFocusEffect(
    React.useCallback(() => {
      if (session?.user && sessionFallback) fetchProfile(session.user.id, sessionFallback);
    }, [session?.user?.id, sessionFallback, fetchProfile])
  );

  useEffect(() => {
    let cancelled = false;
    const uid = session?.user?.id;
    if (!uid) {
      setAssignedRoomIdsOrdered([]);
      return;
    }
    void getDistinctAssignedRoomIdsOrderedByAssignmentCreatedAt(uid).then((ids) => {
      if (!cancelled) setAssignedRoomIdsOrdered(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);
  useEffect(() => {
    setHomeData((prev) => ({
      ...prev,
      user: session ? (profile ?? sessionFallback) : undefined,
    }));
  }, [session, profile, sessionFallback]);

  const safeUser = useMemo(
    () =>
      (homeData.user as any) ?? {
        name: '',
        role: '',
        avatar: '',
        hasFlag: false,
        department: '',
      },
    [homeData.user]
  );

  // Which dashboard this person sees comes from their job title
  // (job_titles.home_variant -> get_my_home_variant()), not from comparing the
  // department's display string. AGENT.md forbids branching on role or
  // department names, and the old comparison broke the moment a hotel renamed
  // "HSK Portier" or a title moved department.
  const isEngineeringUser = homeVariant === 'engineering';
  const isHskPortierUser = homeVariant === 'hsk_portier';

  const [engineeringCounts, setEngineeringCounts] = useState<{
    total: number;
    priority: number;
    unsolved: number;
    solved: number;
    outOfOrder: number;
  }>({ total: 0, priority: 0, unsolved: 0, solved: 0, outOfOrder: 0 });

  const [engineeringRecent, setEngineeringRecent] = useState<
    Array<{
      id: string;
      roomLabel: string;
      message: string;
      timeLabel: string;
      state: 'solved' | 'unsolved' | 'neutral';
    }>
  >([]);

  const refreshEngineeringHome = React.useCallback(async () => {
    if (!isEngineeringUser) return;

    try {
      const ticketsData = await dashboardService.getTicketsData();
      const uid = session?.user?.id;
      const engineeringTickets = (ticketsData?.tickets ?? [])
        .filter((t: any) => (t?.category ?? '').toLowerCase() === 'engineering')
        // Engineering Home: only tickets assigned to the signed-in user.
        .filter((t: any) => (!!uid ? String(t?.assignedToId ?? '') === String(uid) : false));

      const total = engineeringTickets.length;
      const priority = engineeringTickets.reduce(
        (sum: number, t: any) => sum + ((t?.priority ?? '').toLowerCase() === 'urgent' ? 1 : 0),
        0
      );
      const unsolved = engineeringTickets.reduce((sum: number, t: any) => sum + (t?.status === 'unsolved' ? 1 : 0), 0);
      const solved = engineeringTickets.reduce((sum: number, t: any) => sum + (t?.status === 'done' ? 1 : 0), 0);
      const outOfOrder = engineeringTickets.reduce((sum: number, t: any) => sum + (t?.status === 'ofo' ? 1 : 0), 0);
      setEngineeringCounts({ total, priority, unsolved, solved, outOfOrder });
    } catch (e) {
      console.warn('[HomeScreen] Failed to load engineering ticket counts', e);
    }

    try {
      // Ticket activity now records the ticket as the entity and the room as
      // the correlation, so read table_name='tickets' and map by room_id.
      const logs = await getRecentActivityLogs({ tableName: 'tickets', limit: 10 });
      const roomIds = Array.from(new Set((logs ?? []).map((l: any) => l.room_id).filter(Boolean)));
      const roomNumberById = await getRoomNumbersByIds(roomIds);

      const items = (logs ?? [])
        .map((l: any) => {
          const roomNum = l.room_id ? roomNumberById.get(l.room_id) : undefined;
          const staffName = l.users?.full_name ?? 'Staff';
          const action = String(l.action ?? '').trim();

          const createdAt = l.created_at ? new Date(l.created_at) : null;
          const nowMs = Date.now();
          const ageMs = createdAt && Number.isFinite(createdAt.getTime()) ? nowMs - createdAt.getTime() : NaN;
          const timeLabel =
            Number.isFinite(ageMs) && ageMs < 60_000 ? 'now' :
            createdAt && Number.isFinite(createdAt.getTime())
              ? `${String(createdAt.getHours()).padStart(2, '0')}:${String(createdAt.getMinutes()).padStart(2, '0')}`
              : '';

          const state =
            /status to\s+solved|status to\s+done/i.test(action) ? 'solved' :
            /out of order|status to\s+ofo/i.test(action) ? 'unsolved' :
            'neutral';

          return {
            id: l.id,
            roomLabel: roomNum ? `Room ${roomNum}` : 'Room',
            message: `${staffName} ${action.charAt(0).toLowerCase()}${action.slice(1)}`,
            timeLabel,
            state,
          };
        })
        .filter((x: any) => x.roomLabel && x.message)
        .slice(0, 2);

      setEngineeringRecent(items as any);
    } catch (e) {
      console.warn('[HomeScreen] Failed to load engineering recent activity', e);
    }
  }, [isEngineeringUser, session?.user?.id]);

  useEffect(() => {
    void refreshEngineeringHome();
  }, [refreshEngineeringHome]);

  const [portierOverview, setPortierOverview] = useState<{
    total: number;
    dirty: number;
    inProgress: number;
    cleaned: number;
    inspected: number;
    priority: number;
    progressText: string;
    latestPill?: {
      type: 'paused' | 'returnLater' | 'refused';
      roomLabel: string;
      /** The room to resume. Without it HskPortierTasksOverviewCard cannot
          wire its Resume tap — see the gate at that component's onPress. */
      roomId?: string;
      /** ISO time used for elapsed/countdown when relevant */
      timeIso?: string;
      /** Secondary line text (timer or message) */
      subText?: string;
    };
  }>({ total: 0, dirty: 0, inProgress: 0, cleaned: 0, inspected: 0, priority: 0, progressText: '0/0' });

  const [portierRows, setPortierRows] = useState<
    Array<{
      label: string;
      count: number;
      icon: any;
      circleBg: string;
      iconTint?: string;
      flipIconHorizontal?: boolean;
    }>
  >([]);

  const refreshPortierHome = React.useCallback(async () => {
    if (!isHskPortierUser) return;

    const roomsPM = roomsForHome.roomsPM ?? [];
    const usePMRooms = homeData.selectedShift === 'PM' && Array.isArray(roomsPM) && roomsPM.length > 0;
    const sourceRooms = usePMRooms ? roomsPM : (roomsForHome.rooms ?? []);

    // HSK Portier: badge figures should reflect only rooms assigned to the logged-in user.
    // Prefer assignment userId from Supabase; fall back to matching the assigned staff name.
    const uid = session?.user?.id;
    const assignedByUserId =
      uid ? sourceRooms.filter((r) => String(r.roomAttendantAssigned?.userId ?? '') === String(uid)) : [];
    const normalizedUserName = String(safeUser?.name ?? '').trim().toLowerCase();
    const assignedByName =
      normalizedUserName.length > 0
        ? sourceRooms.filter((r) => String(r.roomAttendantAssigned?.name ?? '').trim().toLowerCase() === normalizedUserName)
        : [];
    const workingRooms = assignedByUserId.length > 0 ? assignedByUserId : assignedByName;

    const dirty = workingRooms.filter((r) => r.houseKeepingStatus === 'Dirty').length;
    const inProgress = workingRooms.filter((r) => r.houseKeepingStatus === 'InProgress').length;
    const cleaned = workingRooms.filter((r) => r.houseKeepingStatus === 'Cleaned').length;
    const inspected = workingRooms.filter((r) => r.houseKeepingStatus === 'Inspected').length;
    const total = dirty + inProgress + cleaned + inspected;
    const priority = workingRooms.filter((r) => !!r.isPriority).length;

    // Figma shows "2/8" as progress text (completed-ish). We treat Cleaned+Inspected as "done".
    const done = cleaned + inspected;
    const progressText = `${done}/${total || 0}`;

    // Latest pill (under progress bar): choose most recent of Pause / Return Later / Refuse Service.
    let pausedRoomLabel: string | undefined;
    let pausedStartedAtIso: string | undefined;
    try {
      const uid = session?.user?.id;
      if (uid) {
        const paused = await getLatestPausedAssignment(uid, homeData.selectedShift);
        if (paused) {
          const room = workingRooms.find((r) => r.id === paused.roomId);
          if (room?.roomNumber) pausedRoomLabel = `Room ${room.roomNumber}`;
          // Prefer the persisted pause start time on the room record when available; fallback to assignment updated_at.
          const roomPausedAt = (room as any)?.pausedAt as string | null | undefined;
          pausedStartedAtIso = roomPausedAt ?? paused.updatedAt ?? undefined;
        }
      }
    } catch (e) {
      // Non-blocking; UI can render without paused row.
    }

    // Fallback: show any paused room (persisted on room record) even when assignment isn't paused.
    if (!pausedRoomLabel) {
      const pausedRooms = workingRooms
        .filter((r) => Boolean((r as any)?.pausedAt))
        .map((r) => ({ r, t: new Date(String((r as any).pausedAt)).getTime() }))
        .filter((x) => Number.isFinite(x.t))
        .sort((a, b) => b.t - a.t);
      const top = pausedRooms[0]?.r;
      if (top?.roomNumber) {
        pausedRoomLabel = `Room ${top.roomNumber}`;
        pausedStartedAtIso = String((top as any).pausedAt);
      }
    }

    // Return Later candidate (most recent returnLaterAt)
    let returnLaterRoomLabel: string | undefined;
    let returnLaterAtIso: string | undefined;
    const returnLaterRooms = workingRooms
      .filter((r) => Boolean((r as any)?.returnLaterAt))
      .map((r) => ({ r, t: new Date(String((r as any).returnLaterAt)).getTime() }))
      .filter((x) => Number.isFinite(x.t))
      .sort((a, b) => b.t - a.t);
    const topReturnLater = returnLaterRooms[0]?.r;
    if (topReturnLater?.roomNumber) {
      returnLaterRoomLabel = `Room ${topReturnLater.roomNumber}`;
      returnLaterAtIso = String((topReturnLater as any).returnLaterAt);
    }

    // Refuse Service candidate (most recent refuse_service_at, fallback to any with reason)
    let refuseServiceRoomLabel: string | undefined;
    let refuseServiceTimeIso: string | undefined;
    let refuseServiceText: string | undefined;
    const refusedRooms = workingRooms
      .filter((r) => Boolean((r as any)?.refuseServiceReason) || Boolean((r as any)?.refuseServiceAt))
      .map((r) => ({ r, t: new Date(String((r as any).refuseServiceAt ?? 0)).getTime() }))
      .sort((a, b) => (Number.isFinite(b.t) ? b.t : 0) - (Number.isFinite(a.t) ? a.t : 0));
    const topRefused = refusedRooms[0]?.r;
    if (topRefused?.roomNumber) {
      refuseServiceRoomLabel = `Room ${topRefused.roomNumber}`;
      const tIso = (topRefused as any).refuseServiceAt as string | null | undefined;
      refuseServiceTimeIso = tIso ? String(tIso) : undefined;
      const reason = (topRefused as any).refuseServiceReason as string | null | undefined;
      refuseServiceText = reason ? String(reason) : '—';
    }

    const candidates: Array<{
      type: 'paused' | 'returnLater' | 'refused';
      roomId?: string;
      roomLabel?: string;
      timeIso?: string;
      timeMs: number;
      subText?: string;
    }> = [
      {
        type: 'paused',
        roomId: pausedRoomLabel ? (workingRooms.find((r) => `Room ${r.roomNumber}` === pausedRoomLabel)?.id ?? undefined) : undefined,
        roomLabel: pausedRoomLabel,
        timeIso: pausedStartedAtIso,
        timeMs: pausedStartedAtIso ? new Date(pausedStartedAtIso).getTime() : -1,
      },
      {
        type: 'returnLater',
        roomId: returnLaterRoomLabel ? (workingRooms.find((r) => `Room ${r.roomNumber}` === returnLaterRoomLabel)?.id ?? undefined) : undefined,
        roomLabel: returnLaterRoomLabel,
        timeIso: returnLaterAtIso,
        timeMs: returnLaterAtIso ? new Date(returnLaterAtIso).getTime() : -1,
      },
      {
        type: 'refused',
        roomId: refuseServiceRoomLabel ? (workingRooms.find((r) => `Room ${r.roomNumber}` === refuseServiceRoomLabel)?.id ?? undefined) : undefined,
        roomLabel: refuseServiceRoomLabel,
        timeIso: refuseServiceTimeIso,
        timeMs: refuseServiceTimeIso ? new Date(refuseServiceTimeIso).getTime() : -1,
        subText: refuseServiceText,
      },
    ].filter((c) => Boolean(c.roomLabel)) as any;

    candidates.sort((a, b) => (Number.isFinite(b.timeMs) ? b.timeMs : -1) - (Number.isFinite(a.timeMs) ? a.timeMs : -1));
    const latest = candidates[0];

    setPortierOverview({
      total,
      dirty,
      inProgress,
      cleaned,
      inspected,
      priority,
      progressText,
      latestPill: latest?.roomLabel
        ? {
            type: latest.type,
            roomLabel: latest.roomLabel,
            roomId: latest.roomId,
            timeIso: latest.timeIso,
            subText: latest.subText,
          }
        : undefined,
    });

    const flagged = workingRooms.filter((r) => !!r.flagged).length;
    const stayover = workingRooms.filter((r) => r.frontOfficeStatus === 'Stayover').length;
    const turndown = workingRooms.filter((r) => r.frontOfficeStatus === 'Turndown').length;
    const departures = workingRooms.filter((r) => r.frontOfficeStatus === 'Departure' || r.frontOfficeStatus === 'Arrival/Departure').length;
    const arrivals = workingRooms.filter((r) => r.frontOfficeStatus === 'Arrival' || r.frontOfficeStatus === 'Arrival/Departure').length;
    const baseRows = [
      { label: 'Flagged', count: flagged, icon: require('../../../../assets/icons/flag.png'), circleBg: '#ffebeb', iconTint: '#f92424' },
      {
        label: 'Stayover',
        count: stayover,
        icon: require('../../../../assets/icons/rooms-icon.png'),
        circleBg: '#4a91fc',
        iconTint: '#ffffff',
      },
      {
        label: 'Turndowns',
        count: turndown,
        icon: require('../../../../assets/icons/moon.png'),
        circleBg: '#7c3aed',
      },
      {
        label: 'Departures',
        count: departures,
        icon: require('../../../../assets/icons/spear-arrow.png'),
        circleBg: '#ffebeb',
        iconTint: '#f92424',
      },
      {
        label: 'Arrivals',
        count: arrivals,
        icon: require('../../../../assets/icons/spear-arrow.png'),
        circleBg: '#daf4e8',
        iconTint: '#41d541',
        flipIconHorizontal: true,
      },
    ];

    setPortierRows(baseRows);
  }, [isHskPortierUser, roomsForHome, homeData.selectedShift, session?.user?.id, safeUser?.name]);

  useEffect(() => {
    void refreshPortierHome();
  }, [refreshPortierHome]);

  // Sync activeTab with current route
  useFocusEffect(
    React.useCallback(() => {
      const routeName = route.name as string;
      if (routeName === 'Home' || routeName === 'Rooms' || routeName === 'Chat' || routeName === 'Tickets') {
        setActiveTab(routeName);
      }
    }, [route.name])
  );

  const handleShiftToggle = (shift: ShiftType) => {
    setHomeData(prev => ({ ...prev, selectedShift: shift }));
    // Reset filters and search when shift changes
    setActiveFilters(undefined);
    setSearchQuery('');
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleFilterPress = () => {
    setShowFilterModal(true);
  };

  const handleBellPress = () => {
    navigation.navigate('(chats)/index' as any);
  };

  const handleProfilePress = () => {
    navigation.navigate('user-profile/index', { user: safeUser });
  };

  const handleTabPress = (tab: string, _options?: { fromRoomsAssignmentBadge?: boolean }) => {
    if (tab === 'AIHome') {
      openAIChatOverlay();
      return;
    }
    setActiveTab(tab); // Update immediately
  };

  const handleCategoryPress = (category: CategorySection) => {
    const uiShift = homeData.selectedShift;
    const roomsPM = roomsForHome.roomsPM ?? [];
    const usePMRooms = uiShift === 'PM' && Array.isArray(roomsPM) && roomsPM.length > 0;
    const sourceRooms = usePMRooms ? roomsPM : (roomsForHome.rooms ?? []);
    const uid = session?.user?.id;
    const hasAssignedRooms =
      !!uid && Array.isArray(sourceRooms) && sourceRooms.some((r) => String(r.roomAttendantAssigned?.userId ?? '') === String(uid));
    navigation.navigate('(rooms)/index', {
      showBackButton: true,
      filters: activeFilters,
      categoryFilter: { category: category.name },
      selectedShift: effectiveShift,
      prioritizeMyAssignedRooms: isHskPortierUser ? true : false,
    } as any);
  };

  /** When user taps a status badge (e.g. cleaned[2] under Flagged), filter and show only those rooms. */
  const handleStatusPress = (category: CategorySection, roomState: keyof import('../types/home.types').RoomStatus) => {
    const uiShift = homeData.selectedShift;
    const roomsPM = roomsForHome.roomsPM ?? [];
    const usePMRooms = uiShift === 'PM' && Array.isArray(roomsPM) && roomsPM.length > 0;
    const sourceRooms = usePMRooms ? roomsPM : (roomsForHome.rooms ?? []);
    const uid = session?.user?.id;
    const hasAssignedRooms =
      !!uid && Array.isArray(sourceRooms) && sourceRooms.some((r) => String(r.roomAttendantAssigned?.userId ?? '') === String(uid));
    navigation.navigate('(rooms)/index', {
      showBackButton: true,
      filters: activeFilters,
      categoryFilter: { category: category.name, roomState },
      selectedShift: effectiveShift,
      prioritizeMyAssignedRooms: isHskPortierUser ? true : false,
    } as any);
  };

  /** When user taps priority badge, filter and show only priority rooms for that category. */
  const handlePriorityPress = (category: CategorySection) => {
    const uiShift = homeData.selectedShift;
    const roomsPM = roomsForHome.roomsPM ?? [];
    const usePMRooms = uiShift === 'PM' && Array.isArray(roomsPM) && roomsPM.length > 0;
    const sourceRooms = usePMRooms ? roomsPM : (roomsForHome.rooms ?? []);
    const uid = session?.user?.id;
    const hasAssignedRooms =
      !!uid && Array.isArray(sourceRooms) && sourceRooms.some((r) => String(r.roomAttendantAssigned?.userId ?? '') === String(uid));
    navigation.navigate('(rooms)/index', {
      showBackButton: true,
      filters: activeFilters,
      categoryFilter: { category: category.name, roomState: 'priority' },
      selectedShift: effectiveShift,
      prioritizeMyAssignedRooms: isHskPortierUser ? true : false,
    } as any);
  };

  const buildCategory = (name: CategorySection['name'], id: string, borderColor: string, rooms: RoomCardData[]): CategorySection => {
    const status = {
      dirty: 0,
      inProgress: 0,
      cleaned: 0,
      inspected: 0,
    };

    rooms.forEach((room) => {
      if (room.houseKeepingStatus === 'Dirty') status.dirty += 1;
      if (room.houseKeepingStatus === 'InProgress') status.inProgress += 1;
      if (room.houseKeepingStatus === 'Cleaned') status.cleaned += 1;
      if (room.houseKeepingStatus === 'Inspected') status.inspected += 1;
    });

    const priority = rooms.reduce((sum, r) => sum + (r.isPriority ? 1 : 0), 0);

    return {
      id,
      name,
      total: rooms.length,
      priority,
      borderColor,
      status,
    };
  };

  const derivedCategories = useMemo(() => {
    const roomsPM = roomsForHome.roomsPM ?? [];
    // Match the AM/PM toggle, not `effectiveShift` (which can force AM during morning hours for fetch).
    const uiShift = homeData.selectedShift;
    const usePMRooms = uiShift === 'PM' && Array.isArray(roomsPM) && roomsPM.length > 0;
    const sourceRooms = usePMRooms ? roomsPM : (roomsForHome.rooms ?? []);
    
    // Home category stats should not be affected by the Home filter modal or search input.
    let rooms = sourceRooms;

    // Only HSK Portier stats are scoped to the signed-in user's assigned rooms.
    if (isHskPortierUser) {
      // Prefer assignment userId from Supabase; fall back to assigned name match.
      const uid = session?.user?.id;
      const assignedByUserId =
        uid ? rooms.filter((r) => String(r.roomAttendantAssigned?.userId ?? '') === String(uid)) : [];
      const normalizedName = String(safeUser?.name ?? '').trim().toLowerCase();
      const assignedByName =
        normalizedName
          ? rooms.filter((r) => String(r.roomAttendantAssigned?.name ?? '').trim().toLowerCase() === normalizedName)
          : [];
      const assignedOnly = assignedByUserId.length > 0 ? assignedByUserId : assignedByName;
      rooms = assignedOnly;
    }

    const categories: CategorySection[] = [];

    if (uiShift === 'PM') {
      // PM shift: Flagged, Arrivals, Departures, Turndown
      const flaggedRooms = rooms.filter((r) => !!r.flagged);
      const arrivalRooms = rooms.filter(
        (r) => r.frontOfficeStatus === 'Arrival' || r.frontOfficeStatus === 'Arrival/Departure'
      );
      const departureRooms = rooms.filter(
        (r) => r.frontOfficeStatus === 'Departure' || r.frontOfficeStatus === 'Arrival/Departure'
      );
      const turndownRooms = rooms.filter((r) => r.frontOfficeStatus === 'Turndown');
      categories.push(buildCategory('Flagged', 'flagged', '#6e1eee', flaggedRooms));
      categories.push(buildCategory('Arrivals', 'arrivals', '#41d541', arrivalRooms));
      categories.push(buildCategory('Departures', 'departures', '#f92424', departureRooms));
      categories.push(buildCategory('Turndown', 'turndown', '#4a91fc', turndownRooms));
    } else {
      // AM shift: Flagged, Arrivals, Departures, StayOvers — hide Turndown from AM buckets
      rooms = rooms.filter((r) => r.frontOfficeStatus !== 'Turndown');
      const flaggedRooms = rooms.filter((r) => !!r.flagged);
      const arrivalRooms = rooms.filter((r) => r.frontOfficeStatus === 'Arrival' || r.frontOfficeStatus === 'Arrival/Departure');
      const departureRooms = rooms.filter((r) => r.frontOfficeStatus === 'Departure' || r.frontOfficeStatus === 'Arrival/Departure');
      const stayOverRooms = rooms.filter((r) => r.frontOfficeStatus === 'Stayover');
      categories.push(buildCategory('Flagged', 'flagged', '#6e1eee', flaggedRooms));
      categories.push(buildCategory('Arrivals', 'arrivals', '#41d541', arrivalRooms));
      categories.push(buildCategory('Departures', 'departures', '#f92424', departureRooms));
      categories.push(buildCategory('StayOvers', 'stayovers', '#8d908d', stayOverRooms));
    }

    return categories;
  }, [homeData.selectedShift, roomsForHome, assignedRoomIdsOrdered, session?.user?.id, safeUser?.name, isHskPortierUser]);

  // Sync route filters -> local state
  useEffect(() => {
    const routeFilters = (route.params as any)?.filters as FilterState | undefined;
    if (routeFilters) setActiveFilters(routeFilters);
  }, [(route.params as any)?.filters]);

  // Update visible home categories based on derived data
  useEffect(() => {
    setHomeData((prev) => ({ ...prev, categories: derivedCategories }));
  }, [derivedCategories]);

  React.useEffect(() => {
    fetchRooms(effectiveShift);
  }, [effectiveShift, fetchRooms]);

  useFocusEffect(
    React.useCallback(() => {
      fetchRooms(effectiveShift);
    }, [effectiveShift, fetchRooms])
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchRooms(effectiveShift);
    await refreshEngineeringHome();
    await refreshPortierHome();
    setRefreshing(false);
  }, [fetchRooms, effectiveShift, refreshEngineeringHome, refreshPortierHome]);

  // Calculate filter counts from homeData (use derivedCategories when categories not yet synced for current shift)
  const filterCounts: FilterCounts = useMemo(() => {
    const categoriesForCounts = homeData.categories.length > 0 ? homeData.categories : derivedCategories;

    // Aggregate counts from all categories
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
      stayOver: 0,
    };
    let totalRooms = 0;

    const roomsPM = roomsForHome.roomsPM ?? [];
    const usePMRooms = homeData.selectedShift === 'PM' && Array.isArray(roomsPM) && roomsPM.length > 0;
    const sourceRooms = usePMRooms ? roomsPM : (roomsForHome.rooms ?? []);

    // HSK Portier: filter stats should reflect rooms assigned to the logged-in staff member.
    const normalizedUserName = String(homeData.user?.name ?? '').trim().toLowerCase();
    const roomsAssignedByName =
      isHskPortierUser && normalizedUserName.length > 0
        ? sourceRooms.filter(
            (r) => String(r.roomAttendantAssigned?.name ?? '').trim().toLowerCase() === normalizedUserName
          )
        : [];
    const workingRooms = roomsAssignedByName.length > 0 ? roomsAssignedByName : sourceRooms;

    if (!isHskPortierUser) {
      categoriesForCounts.forEach((category) => {
        // Room state counts
        roomStates.dirty += category.status.dirty;
        roomStates.inProgress += category.status.inProgress;
        roomStates.cleaned += category.status.cleaned;
        roomStates.inspected += category.status.inspected;
        if (category.priority) {
          roomStates.priority += category.priority;
        }

        // Guest counts based on category name
        if (category.name === 'Arrivals') {
          guests.arrivals += category.total;
        } else if (category.name === 'StayOvers') {
          guests.stayOver += category.total;
        } else if (category.name === 'Turndown') {
          guests.turnDown += category.total;
        }
        totalRooms += category.total;
      });
    } else {
      roomStates.dirty = workingRooms.filter((r) => r.houseKeepingStatus === 'Dirty').length;
      roomStates.inProgress = workingRooms.filter((r) => r.houseKeepingStatus === 'InProgress').length;
      roomStates.cleaned = workingRooms.filter((r) => r.houseKeepingStatus === 'Cleaned').length;
      roomStates.inspected = workingRooms.filter((r) => r.houseKeepingStatus === 'Inspected').length;
      roomStates.priority = workingRooms.filter((r) => !!r.isPriority).length;

      guests.arrivals = workingRooms.filter((r) => r.frontOfficeStatus === 'Arrival' || r.frontOfficeStatus === 'Arrival/Departure').length;
      guests.stayOver = workingRooms.filter((r) => r.frontOfficeStatus === 'Stayover').length;
      guests.turnDown = workingRooms.filter((r) => r.frontOfficeStatus === 'Turndown').length;
      totalRooms = workingRooms.length;
    }

    // Persisted room state badges (Pause / Refuse Service / Return Later) live on the room record.
    workingRooms.forEach((r) => {
      if ((r as any)?.pausedAt) roomStates.paused += 1;
      if ((r as any)?.returnLaterAt) roomStates.returnLater += 1;
      if ((r as any)?.refuseServiceReason || (r as any)?.refuseServiceAt) roomStates.refused += 1;
    });

    const reservations = {
      occupied: 0,
      vacant: 0,
    };
    workingRooms.forEach((r) => {
      if (r.reservationStatus === 'Vacant') reservations.vacant += 1;
      else if (r.reservationStatus === 'Occupied') reservations.occupied += 1;
    });

    // Calculate departures from actual room data for current shift
    const departureRooms = workingRooms.filter(
      (r) => r.frontOfficeStatus === 'Departure' || r.frontOfficeStatus === 'Arrival/Departure'
    );
    guests.departures = departureRooms.length;

    // Calculate floor counts from first digit of room number (101->1, 305->3, 507->5)
    const floorCounts: Record<number, number> = {};
    workingRooms.forEach((room) => {
      const floor = getFloorFromRoomNumber(room.roomNumber);
      if (floor !== null) {
        floorCounts[floor] = (floorCounts[floor] || 0) + 1;
      }
    });

    const floors: Record<string, number> = {
      all: Object.values(floorCounts).reduce((sum, n) => sum + n, 0),
      ...Object.fromEntries(Object.entries(floorCounts).map(([k, v]) => [k, v])),
    };

    return { roomStates, guests, floors, totalRooms, reservations };
  }, [homeData.categories, derivedCategories, homeData.selectedShift, roomsForHome]);

  const handleGoToResults = (filters: FilterState) => {
    // Apply filters to Home stats/cards in both AM and PM modes
    setActiveFilters(filters);
  };

  const handleAdvanceFilter = () => {
    // TODO: Navigate to advanced filter screen when implemented
    console.log('Advanced filter');
  };

  return (
    <View style={[
      styles.container,
      homeData.selectedShift === 'PM' && styles.containerPM
    ]}>
      {(roomsLoading && !roomsStoreData) ? <LoadingOverlay fullScreen message="Loading…" /> : null}
      {(session && userLoading && !profile) ? <LoadingOverlay fullScreen message="Loading profile…" /> : null}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header and search sit in the flex flow. They used to be absolutely
            positioned on top of the ScrollView, which forced the content to
            compensate with paddingTop: (180 + 14 + 59) * scaleX — a magic sum
            repeated in three more places. */}
        <HomeHeader
          name={safeUser?.name}
          role={safeUser?.role}
          avatarUrl={safeUser?.avatar}
          shift={homeData.selectedShift}
          onShiftChange={handleShiftToggle}
        />

        {!showFilterModal && (
          <SearchAndFilterBar
            value={searchQuery}
            onChangeText={handleSearch}
            onFilterPress={handleFilterPress}
            placeholderLead="Search"
            placeholderRest="Rooms, Guests, Floors etc"
            className="px-lg py-md"
          />
        )}

        {/* Scrollable Content with conditional blur */}
        <View style={styles.scrollContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {isEngineeringUser ? (
              <>
                <View style={{ paddingTop: 12 * scaleX, paddingBottom: 24 * scaleX }}>
                  <Text style={[styles.engineeringTitle]}>Tickets Overview</Text>
                  <EngineeringTicketsOverviewCard
                    total={engineeringCounts.total}
                    priority={engineeringCounts.priority}
                    unsolved={engineeringCounts.unsolved}
                    solved={engineeringCounts.solved}
                    outOfOrder={engineeringCounts.outOfOrder}
                    onPressPriority={() => {
                      navigation.navigate('(tickets)/index' as any, {
                        initialTab: 'myTickets',
                        assignedToMeOnly: true,
                        category: 'engineering',
                        statusFilter: 'priority',
                      });
                    }}
                    onPressUnsolved={() => {
                      navigation.navigate('(tickets)/index' as any, {
                        initialTab: 'myTickets',
                        assignedToMeOnly: true,
                        category: 'engineering',
                        statusFilter: 'unsolved',
                      });
                    }}
                    onPressSolved={() => {
                      navigation.navigate('(tickets)/index' as any, {
                        initialTab: 'myTickets',
                        assignedToMeOnly: true,
                        category: 'engineering',
                        statusFilter: 'done',
                      });
                    }}
                    onPressOutOfOrder={() => {
                      navigation.navigate('(tickets)/index' as any, {
                        initialTab: 'myTickets',
                        assignedToMeOnly: true,
                        category: 'engineering',
                        statusFilter: 'ofo',
                      });
                    }}
                  />

                  <Text style={styles.engineeringRecentTitle}>Recent Activity</Text>
                  {engineeringRecent.length === 0 ? (
                    <EngineeringRecentActivityItem
                      roomLabel="—"
                      message="No recent ticket activity"
                      timeLabel=""
                      state="neutral"
                    />
                  ) : (
                    engineeringRecent.map((it) => (
                      <EngineeringRecentActivityItem
                        key={it.id}
                        roomLabel={it.roomLabel}
                        message={it.message}
                        timeLabel={it.timeLabel}
                        state={it.state}
                      />
                    ))
                  )}
                </View>
              </>
            ) : isHskPortierUser ? (
              <View style={{ paddingTop: 12 * scaleX, paddingBottom: 24 * scaleX }}>
                <Text style={styles.portierTitle}>Tasks Overview</Text>
                <HskPortierTasksOverviewCard
                  total={portierOverview.total}
                  dirty={portierOverview.dirty}
                  inProgress={portierOverview.inProgress}
                  cleaned={portierOverview.cleaned}
                  inspected={portierOverview.inspected}
                  priority={portierOverview.priority}
                  progressText={portierOverview.progressText}
                  latestPill={portierOverview.latestPill}
                  onResumePause={(roomId) => {
                    // Match Room Detail "Resume": clear paused_at on the room record.
                    updateRoom(roomId, { paused_at: null }).catch((e) =>
                      console.warn('[HomeScreen] Failed to resume pause', e)
                    );
                  }}
                  onPriorityPress={() => {
                    const baseRoomStates = {
                      dirty: false,
                      inProgress: false,
                      cleaned: false,
                      inspected: false,
                      priority: false,
                      paused: false,
                      returnLater: false,
                      refused: false,
                    };
                    const nextFilters: FilterState = {
                      ...(activeFilters ?? {
                        roomStates: baseRoomStates,
                        guests: {
                          arrivals: false,
                          departures: false,
                          turnDown: false,
                          noTask: false,
                          stayOver: false,
                          stayOverWithLinen: false,
                          stayOverNoLinen: false,
                          checkedIn: false,
                          checkedOut: false,
                          checkedOutDueIn: false,
                          outOfOrder: false,
                          outOfService: false,
                        },
                        reservations: { occupied: false, vacant: false },
                        floors: { all: false },
                      }),
                      roomStates: { ...baseRoomStates, ...(activeFilters?.roomStates ?? {}), priority: true },
                    };
                    navigation.navigate('(rooms)/index', {
                      showBackButton: true,
                      filters: nextFilters,
                      selectedShift: homeData.selectedShift,
                      prioritizeMyAssignedRooms: true,
                    } as any);
                  }}
                  onStatusPress={(roomState) => {
                    const baseRoomStates = {
                      dirty: false,
                      inProgress: false,
                      cleaned: false,
                      inspected: false,
                      priority: false,
                      paused: false,
                      returnLater: false,
                      refused: false,
                    };
                    const nextFilters: FilterState = {
                      ...(activeFilters ?? {
                        roomStates: baseRoomStates,
                        guests: {
                          arrivals: false,
                          departures: false,
                          turnDown: false,
                          noTask: false,
                          stayOver: false,
                          stayOverWithLinen: false,
                          stayOverNoLinen: false,
                          checkedIn: false,
                          checkedOut: false,
                          checkedOutDueIn: false,
                          outOfOrder: false,
                          outOfService: false,
                        },
                        reservations: { occupied: false, vacant: false },
                        floors: { all: false },
                      }),
                      roomStates: { ...baseRoomStates, ...(activeFilters?.roomStates ?? {}), [roomState]: true },
                    };
                    navigation.navigate('(rooms)/index', {
                      showBackButton: true,
                      filters: nextFilters,
                      selectedShift: homeData.selectedShift,
                      prioritizeMyAssignedRooms: true,
                    } as any);
                  }}
                />
                <HskPortierCategoryListCard
                  rows={portierRows}
                  onRowPress={(row) => {
                    const category =
                      row.label === 'Flagged'
                        ? 'Flagged'
                        : row.label === 'Arrivals'
                          ? 'Arrivals'
                          : row.label === 'Departures'
                            ? 'Departures'
                            : row.label === 'Stayover'
                              ? 'StayOvers'
                              : row.label === 'Turndowns'
                                ? 'Turndown'
                                : row.label;
                    navigation.navigate('(rooms)/index', {
                      showBackButton: true,
                      categoryFilter: { category },
                      // Use the UI-selected shift; AllRooms will apply the "PM behaves like AM during AM hours" rule internally.
                      selectedShift: homeData.selectedShift,
                      prioritizeMyAssignedRooms: true,
                    } as any);
                  }}
                />
              </View>
            ) : (
              <HousekeepingDashboard
                categories={derivedCategories}
                onCategoryPress={handleCategoryPress}
                onStatusPress={handleStatusPress}
                onPriorityPress={handlePriorityPress}
              />
            )}
          </ScrollView>
          
        </View>

      </KeyboardAvoidingView>

      {/* Bottom Navigation - Outside KeyboardAvoidingView to prevent movement */}
      <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />

      {/* Filter Modal */}
      <HomeFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onGoToResults={handleGoToResults}
        onAdvanceFilter={handleAdvanceFilter}
        filterCounts={filterCounts}
        onFilterIconPress={handleFilterPress}
        selectedShift={homeData.selectedShift}
      />
    </View>
  );
}

function buildHomeScreenStyles(scaleX: number) {
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 172, // clears the bottom tab bar
  },
  engineeringTitle: {
    fontSize: 20 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700' as any,
    color: '#1e1e1e',
    marginLeft: 20 * scaleX,
    marginTop: 0,
    marginBottom: 16 * scaleX,
  },
  engineeringRecentTitle: {
    fontSize: 14 * scaleX,
    fontFamily: 'Inter',
    fontWeight: '400' as any,
    color: '#000000',
    marginTop: 16 * scaleX,
    marginBottom: 12 * scaleX,
    marginLeft: 20 * scaleX,
  },
  portierTitle: {
    fontSize: 20 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700' as any,
    color: '#1e1e1e',
    marginLeft: 20 * scaleX,
    marginBottom: 16 * scaleX,
    marginTop: 0,
  },
});
}

