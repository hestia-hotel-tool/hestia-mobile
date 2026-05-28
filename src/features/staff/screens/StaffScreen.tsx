import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography } from '@shared/theme';
import BottomTabBar from '@app/components/BottomTabBar';
import { useAIChatOverlay } from '@features/ai-agent';
import StaffHeader from '../components/StaffHeader';
import StaffTabs from '../components/StaffTabs';
import StaffListRow from '../components/StaffListRow';
import StaffCard from '../components/StaffCard';
import StaffTicketCard from '../components/StaffTicketCard';
import { StaffTab, StaffMember } from '../types/staff.types';
import { STAFF_TABS, STAFF_DEPT_CHIP } from '../constants/staffStyles';
import type { MainTabsParamList, ReturnToTab } from '@app/navigation/types';
import { getUsersByDepartmentId } from '@features/account';
import { getDepartments, DEPARTMENT_NAME_TO_ICON } from '@shared/lib/departments';
import { isSupabaseConfigured } from '@shared/lib/supabase';
import type { User } from '@shared/types';
import { fetchStaffRoomStatsForShift, fetchStaffTicketStats, type StaffTicketStats } from '../services/staff';

/** Departments whose card shows cleaning stats; everything else shows ticket stats. */
const CLEANING_DEPARTMENTS = new Set(['HSK Portier', 'Laundry']);

const DESIGN_WIDTH = 440;

type StaffScreenNavigationProp = NativeStackNavigationProp<MainTabsParamList, 'Staff'>;

/**
 * A department chip, sourced dynamically from the DB `departments` table (same
 * source the Tickets feature uses), so Staff and Tickets always share the exact
 * same department set. Icon comes from the shared DEPARTMENT_NAME_TO_ICON map.
 */
interface DepartmentChip {
  id: string; // departments.id (UUID)
  name: string; // departments.name
  icon: any;
}

const FALLBACK_DEPT_ICON = require('../../../../assets/icons/in-progress-icon.png');

function mapUserToStaffMember(u: User): StaffMember {
  const name = u.name ?? 'Staff';
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (name[0] || '?').toUpperCase();
  return {
    id: u.id,
    name,
    avatar: u.avatar?.trim() ? { uri: u.avatar.trim() } : undefined,
    initials,
    avatarColor: '#5a759d',
    department: u.department,
    role: u.role,
    onShift: true,
  };
}

export default function StaffScreen() {
  const navigation = useNavigation<StaffScreenNavigationProp>();
  const route = useRoute();
  const { open: openAIChatOverlay } = useAIChatOverlay();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;
  
  const [activeTab, setActiveTab] = useState('Staff');
  const [selectedTab, setSelectedTab] = useState<StaffTab>('shifts');
  const [departmentStaff, setDepartmentStaff] = useState<StaffMember[]>([]);
  const [departmentLoading, setDepartmentLoading] = useState(true);
  const [departmentError, setDepartmentError] = useState<string | null>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [departments, setDepartments] = useState<DepartmentChip[]>([]);
  const [activeDepartmentId, setActiveDepartmentId] = useState<string>('');
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [staffStatsById, setStaffStatsById] = useState<Map<string, any>>(new Map());
  const [staffTicketStatsById, setStaffTicketStatsById] = useState<Map<string, StaffTicketStats>>(new Map());

  const activeDepartmentName = useMemo(
    () => departments.find((d) => d.id === activeDepartmentId)?.name ?? '',
    [departments, activeDepartmentId]
  );
  const activeStatKind: 'cleaning' | 'tickets' = CLEANING_DEPARTMENTS.has(activeDepartmentName)
    ? 'cleaning'
    : 'tickets';

  const toggleStaffExpand = (id: string) => {
    setExpandedStaffId((prev) => (prev === id ? null : id));
  };

  // Load the department list from the DB (same source as Tickets) so the chips
  // and the Tickets department picker always match.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured) {
        if (!cancelled) setDepartmentError('Supabase is not configured.');
        if (!cancelled) setDepartmentLoading(false);
        return;
      }
      const { data, error } = await getDepartments();
      if (cancelled) return;
      if (error) {
        setDepartmentError('Could not load departments');
        setDepartmentLoading(false);
        return;
      }
      const chips: DepartmentChip[] = data.map((d) => ({
        id: d.id,
        name: d.name,
        icon: DEPARTMENT_NAME_TO_ICON[d.name]?.icon ?? FALLBACK_DEPT_ICON,
      }));
      setDepartments(chips);
      if (chips.length === 0) {
        setDepartmentStaff([]);
        setDepartmentLoading(false);
        return;
      }
      setActiveDepartmentId((prev) => (prev && chips.some((c) => c.id === prev) ? prev : chips[0].id));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the staff for the active department, scoped by department_id (UUID) —
  // precise, no name-matching fallback to all users.
  useEffect(() => {
    if (!activeDepartmentId) return;
    setExpandedStaffId(null);
    let cancelled = false;
    (async () => {
      setDepartmentLoading(true);
      setDepartmentError(null);
      if (!isSupabaseConfigured) {
        if (!cancelled) setDepartmentError('Supabase is not configured.');
        if (!cancelled) setDepartmentLoading(false);
        return;
      }
      try {
        const res = await getUsersByDepartmentId(activeDepartmentId, { limit: 100 });
        if (!cancelled) {
          setDepartmentStaff(res.data.map(mapUserToStaffMember));
        }
      } catch {
        if (!cancelled) {
          setDepartmentError('Could not load staff');
          setDepartmentStaff([]);
        }
      } finally {
        if (!cancelled) setDepartmentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeDepartmentId]);

  // Load per-staff stats for AM/PM tabs. Cleaning departments (HSK Portier,
  // Laundry) load room-assignment stats for the shift; all other departments
  // load ticket throughput.
  useEffect(() => {
    let cancelled = false;
    if (selectedTab === 'shifts') {
      setStaffStatsById(new Map());
      setStaffTicketStatsById(new Map());
      return;
    }
    const ids = departmentStaff.map((s) => s.id).filter(Boolean);
    if (ids.length === 0) {
      setStaffStatsById(new Map());
      setStaffTicketStatsById(new Map());
      return;
    }
    if (activeStatKind === 'cleaning') {
      const shift = selectedTab === 'pm' ? 'PM' : 'AM';
      void fetchStaffRoomStatsForShift(ids, shift).then((map) => {
        if (!cancelled) {
          setStaffStatsById(map);
          setStaffTicketStatsById(new Map());
        }
      });
    } else {
      void fetchStaffTicketStats(ids).then((map) => {
        if (!cancelled) {
          setStaffTicketStatsById(map);
          setStaffStatsById(new Map());
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [selectedTab, departmentStaff, activeStatKind]);

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
    if (tab === 'Rooms') {
      navigation.navigate('Rooms', {
        prioritizeMyAssignedRooms: !!options?.fromRoomsAssignmentBadge,
      });
      return;
    }
    if (tab === 'Home' || tab === 'Chat' || tab === 'Tickets' || tab === 'LostAndFound' || tab === 'Staff' || tab === 'Settings') {
      navigation.navigate(tab as keyof MainTabsParamList);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      const returnToTab = (route.params as { returnToTab?: ReturnToTab } | undefined)?.returnToTab ?? 'Home';
      navigation.navigate(returnToTab as keyof MainTabsParamList);
    }
  };

  const handleSearch = () => {
    // TODO: Implement search functionality
    console.log('Search pressed');
  };

  const handleStaffTabPress = (tab: StaffTab) => {
    setSelectedTab(tab);
  };

  const handleSearchPress = () => {
    setExpandedStaffId(null);
    setSearchExpanded(true);
  };
  const handleSearchClose = () => {
    setSearchExpanded(false);
    setSearchQuery('');
  };

  const filteredStaffForSearch = useMemo(() => {
    if (!searchQuery.trim()) return departmentStaff;
    const q = searchQuery.trim().toLowerCase();
    return departmentStaff.filter((s) => s.name.toLowerCase().includes(q));
  }, [departmentStaff, searchQuery]);

  /** Staff is already scoped to the selected department; apply Shifts / AM / PM tab rules. */
  const displayedStaff = useMemo(() => {
    const base = departmentStaff;
    const hasShift = base.some((s) => !!s.shift?.trim());
    if (selectedTab === 'am') {
      if (!hasShift) return base;
      return base.filter((s) => (s.shift ?? '').toUpperCase() === 'AM');
    }
    if (selectedTab === 'pm') {
      if (!hasShift) return base;
      return base.filter((s) => (s.shift ?? '').toUpperCase() === 'PM');
    }
    return base.filter((s) => s.onShift !== false);
  }, [selectedTab, departmentStaff]);

  const sectionTitle = useMemo(() => {
    const chip = departments.find((c) => c.id === activeDepartmentId);
    const label = chip?.name ?? 'Staff';
    return `${label} Staff and Shifts`;
  }, [activeDepartmentId, departments]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    content: {
      flex: 1,
    },
    staffList: {
      marginTop: (STAFF_TABS.container.top + STAFF_TABS.container.height + 1) * scaleX,
      paddingBottom: 152 * scaleX, // Space for bottom tab bar
    },
    staffListContent: {
      paddingBottom: 152 * scaleX, // Space for bottom tab bar
    },
    searchEmptyText: {
      paddingHorizontal: 24 * scaleX,
      paddingTop: 24 * scaleX,
      fontSize: 14 * scaleX,
      color: STAFF_TABS.tab.inactiveColor,
    },
    searchSection: {
      marginTop: 16 * scaleX,
    },
    searchSectionTitle: {
      fontSize: 12 * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: '700',
      color: STAFF_TABS.tab.inactiveColor,
      marginBottom: 12 * scaleX,
      paddingHorizontal: 17 * scaleX,
    },
    deptScrollerWrap: {
      paddingTop: 16 * scaleX,
      paddingBottom: 12 * scaleX,
    },
    deptScroller: {
      paddingHorizontal: 12 * scaleX,
      gap: 14 * scaleX,
      alignItems: 'flex-start',
    },
    deptItem: {
      width: 92 * scaleX,
      alignItems: 'center',
    },
    deptIconWrap: {
      width: STAFF_DEPT_CHIP.iconWrapSize * scaleX,
      height: STAFF_DEPT_CHIP.iconWrapSize * scaleX,
      borderRadius: STAFF_DEPT_CHIP.borderRadius * scaleX,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8 * scaleX,
    },
    deptIcon: {
      width: STAFF_DEPT_CHIP.iconInnerSize * scaleX,
      height: STAFF_DEPT_CHIP.iconInnerSize * scaleX,
    },
    deptLoading: {
      paddingVertical: 28 * scaleX,
      alignItems: 'center',
    },
    deptError: {
      paddingHorizontal: 21 * scaleX,
      paddingBottom: 8 * scaleX,
      fontSize: 13 * scaleX,
      color: '#9ca3af',
    },
    deptLabel: {
      fontSize: 14 * scaleX,
      fontFamily: typography.fontFamily.secondary,
      fontWeight: typography.fontWeights.light as any,
      color: '#000000',
      textAlign: 'center',
    },
    sectionHeader: {
      paddingHorizontal: 21 * scaleX,
      paddingTop: 16 * scaleX,
      paddingBottom: 10 * scaleX,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontSize: 17 * scaleX,
      fontFamily: typography.fontFamily.secondary,
      fontWeight: typography.fontWeights.semibold as any,
      color: '#607aa1',
    },
    sectionCount: {
      fontSize: 16 * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: typography.fontWeights.bold as any,
      color: '#5a759d',
    },
    listDivider: {
      height: 1,
      backgroundColor: '#e3e3e3',
      marginHorizontal: 0,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header - Absolutely positioned at top */}
        <StaffHeader
          onBackPress={handleBack}
          onAddPress={() => {
            // TODO: Wire to "add staff" / invite flow when available
          }}
        />

        {/* Tabs - Absolutely positioned below header (or search input when search open) */}
        <StaffTabs
          selectedTab={selectedTab}
          onTabPress={handleStaffTabPress}
          searchExpanded={searchExpanded}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchPress={handleSearchPress}
          onSearchClose={handleSearchClose}
        />

        {/* Staff List, Departments, or Search results - Scrollable content starting after date */}
        <ScrollView
          style={styles.staffList}
          contentContainerStyle={styles.staffListContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {searchExpanded ? (
            <>
              {filteredStaffForSearch.length === 0 ? (
                <Text style={styles.searchEmptyText}>
                  {searchQuery.trim() ? 'No staff match your search' : 'Type to search staff'}
                </Text>
              ) : null}
              {filteredStaffForSearch.length > 0 ? (
                <View style={styles.searchSection}>
                  <Text style={styles.searchSectionTitle}>Staff</Text>
                  {filteredStaffForSearch.map((staff) => {
                    const chip = departments.find((c) => c.id === activeDepartmentId);
                    const dept = staff.department ?? chip?.name ?? 'Staff';
                    return (
                      <View key={staff.id}>
                        <StaffListRow
                          staffId={staff.id}
                          name={staff.name}
                          departmentLabel={dept}
                          avatar={staff.avatar}
                          initials={staff.initials}
                          isOnline={!!staff.onShift}
                          expanded={expandedStaffId === staff.id}
                          onToggleExpand={() => toggleStaffExpand(staff.id)}
                          scaleX={scaleX}
                        />
                        <View style={styles.listDivider} />
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.deptScrollerWrap}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.deptScroller}
                >
                  {departments.map((dept) => {
                    const active = activeDepartmentId === dept.id;
                    return (
                      <TouchableOpacity
                        key={dept.id}
                        style={styles.deptItem}
                        activeOpacity={0.7}
                        onPress={() => setActiveDepartmentId(dept.id)}
                      >
                        <View
                          style={[
                            styles.deptIconWrap,
                            {
                              backgroundColor: active
                                ? STAFF_DEPT_CHIP.activeBackgroundColor
                                : STAFF_DEPT_CHIP.inactiveBackgroundColor,
                            },
                          ]}
                        >
                          <Image
                            source={dept.icon}
                            style={[
                              styles.deptIcon,
                              {
                                tintColor: active
                                  ? STAFF_DEPT_CHIP.activeIconTint
                                  : STAFF_DEPT_CHIP.inactiveIconTint,
                              },
                            ]}
                            resizeMode="contain"
                          />
                        </View>
                        <Text style={styles.deptLabel} numberOfLines={2}>
                          {dept.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{sectionTitle}</Text>
                <Text style={styles.sectionCount}>
                  {departmentLoading ? '—' : displayedStaff.length}
                </Text>
              </View>
              {departmentError ? <Text style={styles.deptError}>{departmentError}</Text> : null}
              <View style={styles.listDivider} />

              {departmentLoading ? (
                <View style={styles.deptLoading}>
                  <ActivityIndicator size="small" color="#5a759d" />
                </View>
              ) : displayedStaff.length === 0 ? (
                <Text style={styles.searchEmptyText}>No staff in this department</Text>
              ) : (
                displayedStaff.map((staff) => {
                  const chip = departments.find((c) => c.id === activeDepartmentId);
                  const dept = staff.department ?? chip?.name ?? 'Staff';
                  const isCardTab = selectedTab === 'am' || selectedTab === 'pm';
                  const stats = staffStatsById.get(staff.id);
                  const ticketStats = staffTicketStatsById.get(staff.id);
                  const staffForCard: StaffMember = !isCardTab
                    ? staff
                    : activeStatKind === 'cleaning'
                      ? {
                          ...staff,
                          statKind: 'cleaning',
                          taskStats: {
                            inProgress: stats?.inProgress ?? 0,
                            cleaned: stats?.cleaned ?? 0,
                            dirty: stats?.dirty ?? 0,
                          },
                          progressRatio: {
                            completed: stats?.completed ?? 0,
                            total: stats?.total ?? 0,
                          },
                          currentTask: stats?.currentRoomNumber
                            ? {
                                roomNumber: String(stats.currentRoomNumber),
                                roomId: stats.currentRoomId,
                                isActive: !stats.isPaused,
                                startTimeIso: stats.currentRoomStartTimeIso ?? null,
                                isPaused: !!stats.isPaused,
                                pauseReason: stats.pauseReason ?? null,
                              }
                            : undefined,
                        }
                      : {
                          ...staff,
                          statKind: 'tickets',
                          ticketStats: {
                            resolved: ticketStats?.resolved ?? 0,
                            open: ticketStats?.open ?? 0,
                            total: ticketStats?.total ?? 0,
                            avgResolutionMins: ticketStats?.avgResolutionMins,
                            currentTicket: ticketStats?.currentTicket,
                          },
                        };
                  return (
                    <View key={staff.id}>
                      {isCardTab ? (
                        staffForCard.statKind === 'tickets' ? (
                          <StaffTicketCard staff={staffForCard} />
                        ) : (
                          <StaffCard
                            staff={staffForCard}
                            onAssignRoomPress={(s) => {
                              const roomId = s.currentTask?.roomId;
                              if (roomId) {
                                (navigation as any).navigate('RoomDetail', { roomId, initialTab: 'Overview' });
                              }
                            }}
                          />
                        )
                      ) : (
                        <StaffListRow
                          staffId={staff.id}
                          name={staff.name}
                          departmentLabel={dept}
                          avatar={staff.avatar}
                          initials={staff.initials}
                          isOnline={!!staff.onShift}
                          expanded={expandedStaffId === staff.id}
                          onToggleExpand={() => toggleStaffExpand(staff.id)}
                          scaleX={scaleX}
                        />
                      )}
                      <View style={styles.listDivider} />
                    </View>
                  );
                })
              )}
            </>
          )}
        </ScrollView>

      </View>

      <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}
