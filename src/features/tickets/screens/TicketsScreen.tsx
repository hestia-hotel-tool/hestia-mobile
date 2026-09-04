import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Modal,
  TouchableOpacity,
  Pressable,
  Text,
  Image,
  Switch,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from 'expo-router';
import { BottomTabNavigationProp } from 'expo-router/js-tabs';
import { NativeStackNavigationProp } from 'expo-router';
import type { RootStackParamList, MainTabsParamList as MainTabsParamListFromApp } from '@/types/navigation';
import BottomTabBar from '@/components/BottomTabBar';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import TicketsHeader from '../components/TicketsHeader';
import TicketsTabs from '../components/TicketsTabs';
import TicketCard from '../components/TicketCard';
import EmptyTicketsState from '../components/EmptyTicketsState';
import type { TicketStatusAnchorLayout } from '../components/TicketCard';
import { useAIChatOverlay } from '@features/ai-agent';
import { TicketTab, TicketData, TicketsScreenData, TicketStatus } from '../types/tickets.types';
import {
  TICKETS_HEADER,
  TICKETS_TABS,
  TICKETS_SPACING,
  TICKETS_COLORS,
  TICKET_DIVIDER,
  TICKET_STATUS_POPOVER,
  scaleX,
} from '../constants/ticketsStyles';
import { dashboardService } from '@features/rooms';
import { updateTicketStatus, updateTicketDueAt, updateTicketPriority, updateTicketAssignee } from '../services/tickets';
import TicketStaffSelectorModal from '../components/TicketStaffSelectorModal';
import { getUsersByDepartment } from '@features/account/services/user';
import { useAuth } from '@features/auth';
import { useUserStore } from '@features/account/store/useUserStore';
import type { User } from '@/types';
import { typography } from '@/theme';
import {
  markAllTicketTagNotificationsRead,
  invalidateNotificationBadges,
} from '@/lib/inAppNotifications';

/** Change Status popover — height for vertical clamping (expanded when Due time fields visible). Figma ~295 / ~472. */
const STATUS_POPOVER_HEIGHT_COLLAPSED = 268 * scaleX;
const STATUS_POPOVER_HEIGHT_EXPANDED = 455 * scaleX;
const STATUS_POPOVER_NOTCH_SIZE = 12 * scaleX;

/** Figma 3129:2033–2034 — Time / Date field boxes. */
const DUE_TIME_BOX_W = 134 * scaleX;
const DUE_DATE_BOX_W = 175 * scaleX;
const DUE_FIELDS_GAP = 37 * scaleX;

type MainTabsParamList = MainTabsParamListFromApp & {
  '(tickets)/index':
    | {
        initialTab?: TicketTab;
        /** If true, only show tickets assignedTo the signed-in user (stricter than myTickets). */
        assignedToMeOnly?: boolean;
        /** Optional category filter (e.g. 'engineering'). */
        category?: string;
        /** Optional status filter (supports 'priority' for urgent tickets). */
        statusFilter?: TicketStatus | 'priority';
      }
    | undefined;
};

type TicketsScreenNavigationProp = BottomTabNavigationProp<MainTabsParamList, '(tickets)/index'>;
type StackNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TicketsScreen() {
  const navigation = useNavigation<TicketsScreenNavigationProp>();
  const stackNavigation = useNavigation<StackNavigationProp>();
  const route = useRoute();
  const { open: openAIChatOverlay } = useAIChatOverlay();
  const { session } = useAuth();
  const userProfile = useUserStore((s) => s.profile);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState('Tickets');
  const [selectedTab, setSelectedTab] = useState<TicketTab>('myTickets');
  const [ticketsData, setTicketsData] = useState<TicketsScreenData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMenuTicket, setStatusMenuTicket] = useState<TicketData | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [dueTimeEnabled, setDueTimeEnabled] = useState(false);
  const [dueHour, setDueHour] = useState('');
  const [dueMinute, setDueMinute] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [dueMonth, setDueMonth] = useState('');
  const [statusAnchor, setStatusAnchor] = useState<TicketStatusAnchorLayout | null>(null);
  const [assigneeModalTicket, setAssigneeModalTicket] = useState<TicketData | null>(null);
  const [departmentStaff, setDepartmentStaff] = useState<User[]>([]);
  const [assigneeStaffLoading, setAssigneeStaffLoading] = useState(false);

  const dueYearDisplay = React.useMemo(() => new Date().getFullYear(), []);

  const applyDueFieldsFromDate = React.useCallback((d: Date) => {
    setDueHour(String(d.getHours()).padStart(2, '0'));
    setDueMinute(String(d.getMinutes()).padStart(2, '0'));
    setDueDay(String(d.getDate()).padStart(2, '0'));
    setDueMonth(String(d.getMonth() + 1).padStart(2, '0'));
  }, []);

  React.useEffect(() => {
    if (!statusMenuTicket) return;
    const iso = statusMenuTicket.dueAt;
    setDueTimeEnabled(!!iso);
    if (iso) {
      const d = new Date(iso);
      if (Number.isFinite(d.getTime())) {
        applyDueFieldsFromDate(d);
        return;
      }
    }
    setDueHour('');
    setDueMinute('');
    setDueDay('');
    setDueMonth('');
  }, [statusMenuTicket, applyDueFieldsFromDate]);

  const loadTickets = useCallback(async (overrideInitialTab?: TicketTab, opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    try {
      if (!silent) setLoading(true);
      const data = await dashboardService.getTicketsData();
      setTicketsData(data);
      // If we came here with an explicit initial tab (e.g. after creating a ticket),
      // prefer that over the stored/dashboard selection.
      if (overrideInitialTab) {
        setSelectedTab(overrideInitialTab);
      } else if (data.selectedTab) {
        setSelectedTab(data.selectedTab);
      }
    } catch (e) {
      console.warn('[TicketsScreen] Failed to load tickets', e);
      const fallbackTab = overrideInitialTab ?? 'myTickets';
      setTicketsData({ selectedTab: fallbackTab, tickets: [] });
      setSelectedTab(fallbackTab);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Sync activeTab with current route
  useFocusEffect(
    React.useCallback(() => {
      const routeName = route.name as string;
      if (routeName === 'Home' || routeName === 'Rooms' || routeName === 'Chat' || routeName === 'Tickets') {
        setActiveTab(routeName);
      }

      // When navigated with an explicit initialTab (e.g. after creating a ticket),
      // prefer that over the stored selection.
      const params = (route as any).params as { initialTab?: TicketTab } | undefined;
      const overrideInitialTab = params?.initialTab;

      // Refresh when returning to the tab (no full-screen loader).
      loadTickets(overrideInitialTab, { silent: true });
      void markAllTicketTagNotificationsRead().then(() => invalidateNotificationBadges());
    }, [route, loadTickets])
  );

  const handleTabPress = (tab: string, _options?: { fromRoomsAssignmentBadge?: boolean }) => {
    if (tab === 'AIHome') {
      openAIChatOverlay();
      return;
    }
    setActiveTab(tab); // Update immediately
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleCreatePress = () => {
    stackNavigation.navigate('create-ticket/index');
  };

  const handleTabChange = (tab: TicketTab) => {
    setSelectedTab(tab);
    // TODO: Filter tickets based on selected tab
  };

  const handleTicketPress = (ticket: TicketData) => {
    // TODO: Navigate to ticket detail screen
    console.log('Ticket pressed:', ticket.id);
    // navigation.navigate('TicketDetail', { ticketId: ticket.id });
  };

  const handleAssigneePress = async (ticket: TicketData) => {
    const deptName = ticket.category;
    if (!deptName) return;
    setAssigneeStaffLoading(true);
    setAssigneeModalTicket(ticket);
    try {
      const res = await getUsersByDepartment(deptName, { limit: 100 });
      setDepartmentStaff(res.data);
    } catch (e) {
      console.warn('[TicketsScreen] Failed to load staff for department', deptName, e);
      setDepartmentStaff([]);
    } finally {
      setAssigneeStaffLoading(false);
    }
  };

  const handleAssigneeSelect = async (staffIds: string[]) => {
    const ticket = assigneeModalTicket;
    if (!ticket) return;
    const assignedToId = staffIds.length > 0 ? staffIds[0] : null;
    try {
      await updateTicketAssignee(ticket.id, assignedToId);
      await loadTickets(selectedTab, { silent: true });
    } catch (e) {
      console.warn('[TicketsScreen] Failed to assign ticket', e);
    }
  };

  const handleStatusPress = (ticket: TicketData, anchor?: TicketStatusAnchorLayout) => {
    setStatusMenuTicket(ticket);
    setStatusAnchor(anchor ?? null);
  };

  const buildDueAtIsoFromFields = React.useCallback((): string | null => {
    const h = parseInt(dueHour, 10);
    const mi = parseInt(dueMinute, 10);
    const d = parseInt(dueDay, 10);
    const mo = parseInt(dueMonth, 10);
    const y = dueYearDisplay;
    if (![h, mi, d, mo].every((n) => Number.isFinite(n))) return null;
    if (h < 0 || h > 23 || mi < 0 || mi > 59 || d < 1 || d > 31 || mo < 1 || mo > 12) return null;
    const dt = new Date(y, mo - 1, d, h, mi, 0, 0);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dt.toISOString();
  }, [dueHour, dueMinute, dueDay, dueMonth, dueYearDisplay]);

  const persistDueAt = React.useCallback(async () => {
    if (!statusMenuTicket || !dueTimeEnabled) return;
    const iso = buildDueAtIsoFromFields();
    if (!iso) return;
    const ticketId = statusMenuTicket.id;
    try {
      await updateTicketDueAt(ticketId, iso);
      setStatusMenuTicket((t) => (t?.id === ticketId ? { ...t, dueAt: iso } : t));
      // Avoid freezing the UI with a full-screen loader while the popover is open.
      await loadTickets(selectedTab, { silent: true });
    } catch (e) {
      console.warn('[TicketsScreen] Failed to save due time', e);
    }
  }, [statusMenuTicket, dueTimeEnabled, buildDueAtIsoFromFields, loadTickets, selectedTab]);

  const handleDueTimeToggle = React.useCallback(
    async (value: boolean) => {
      if (value && statusMenuTicket) {
        const ticketId = statusMenuTicket.id;
        const now = new Date();
        applyDueFieldsFromDate(now);
        setDueTimeEnabled(true);
        try {
          const iso = now.toISOString();
          await updateTicketDueAt(ticketId, iso);
          setStatusMenuTicket((t) => (t?.id === ticketId ? { ...t, dueAt: iso } : t));
          await loadTickets(selectedTab, { silent: true });
        } catch (e) {
          console.warn('[TicketsScreen] Failed to save default due time', e);
        }
        return;
      }
      setDueTimeEnabled(false);
      if (!value && statusMenuTicket) {
        const ticketId = statusMenuTicket.id;
        try {
          await updateTicketDueAt(ticketId, null);
          setDueHour('');
          setDueMinute('');
          setDueDay('');
          setDueMonth('');
          setStatusMenuTicket((t) => (t?.id === ticketId ? { ...t, dueAt: null } : t));
          await loadTickets(selectedTab, { silent: true });
        } catch (e) {
          console.warn('[TicketsScreen] Failed to clear due time', e);
        }
      }
    },
    [statusMenuTicket, loadTickets, selectedTab, applyDueFieldsFromDate]
  );

  const handleStatusSelect = async (nextStatus: TicketStatus) => {
    if (!statusMenuTicket) return;
    setStatusUpdating(true);
    try {
      await updateTicketStatus(statusMenuTicket.id, nextStatus);
      setStatusMenuTicket(null);
      // Refresh while keeping the current selected tab.
      await loadTickets(selectedTab);
    } catch (e) {
      console.warn('[TicketsScreen] Failed to update ticket status', e);
    } finally {
      setStatusUpdating(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadTickets().finally(() => setRefreshing(false));
  }, []);

  const tickets: TicketData[] = ticketsData?.tickets ?? [];
  const currentUserId = session?.user?.id;

  // Filter tickets based on selected tab
  const filteredTickets = tickets.filter((ticket) => {
    const params = (route as any).params as
      | {
          assignedToMeOnly?: boolean;
          category?: string;
          statusFilter?: TicketStatus | 'priority';
        }
      | undefined;
    const assignedToMeOnly = params?.assignedToMeOnly === true;
    const categoryFilter = String(params?.category ?? '').trim().toLowerCase();
    const statusFilter = params?.statusFilter;

    if (categoryFilter) {
      if (String((ticket as any)?.category ?? '').trim().toLowerCase() !== categoryFilter) return false;
    }
    if (assignedToMeOnly) {
      if (!currentUserId) return false;
      if (ticket.assignedToId !== currentUserId) return false;
    }
    if (statusFilter) {
      if (statusFilter === 'priority') {
        if (ticket.priority !== 'urgent') return false;
      } else {
        if (ticket.status !== statusFilter) return false;
      }
    }

    if (selectedTab === 'myTickets') {
      if (!currentUserId) return false;
      return ticket.assignedToId === currentUserId;
    } else if (selectedTab === 'open') {
      return ticket.status === 'unsolved' || ticket.status === 'ofo';
    } else if (selectedTab === 'closed') {
      return ticket.status === 'done';
    }
    return true; // 'all' shows all tickets
  });

  const statusPopoverPosition = React.useMemo(() => {
    if (!statusAnchor) return null;
    const left = TICKET_STATUS_POPOVER.left * scaleX;
    const popoverW = TICKET_STATUS_POPOVER.width * scaleX;
    const popoverH = dueTimeEnabled ? STATUS_POPOVER_HEIGHT_EXPANDED : STATUS_POPOVER_HEIGHT_COLLAPSED;

    const desiredTop = statusAnchor.y + statusAnchor.height + 8 * scaleX;
    const top = Math.max(left, Math.min(windowHeight - popoverH - left, desiredTop));

    const notchSize = STATUS_POPOVER_NOTCH_SIZE;
    const anchorCenterX = statusAnchor.x + statusAnchor.width / 2;
    const notchCenterX = anchorCenterX - left;
    const notchLeft = Math.max(14 * scaleX, Math.min(popoverW - 14 * scaleX - notchSize, notchCenterX - notchSize / 2));

    return { left, top, notchLeft, width: popoverW };
  }, [statusAnchor, windowWidth, windowHeight, dueTimeEnabled]);

  return (
    <View style={styles.container}>
      {(loading || refreshing) && <LoadingOverlay fullScreen message={loading ? 'Loading tickets…' : 'Refreshing…'} />}
      <View style={styles.scrollContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Ticket Cards or Empty State */}
          {filteredTickets.length === 0 ? (
            <EmptyTicketsState selectedTab={selectedTab} />
          ) : (
            filteredTickets.map((ticket, index) => (
              <React.Fragment key={ticket.id}>
                <TicketCard
                  ticket={ticket}
                  onPress={() => handleTicketPress(ticket)}
                  onStatusPress={(anchor) => handleStatusPress(ticket, anchor)}
                  onAssigneePress={() => handleAssigneePress(ticket)}
                />
              </React.Fragment>
            ))
          )}
        </ScrollView>

        {/* Blur Overlay for content only */}
      </View>

      {/* Status dropdown */}
      <Modal
        visible={!!statusMenuTicket}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusMenuTicket(null)}
      >
        <View style={styles.statusModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!statusUpdating) setStatusMenuTicket(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss status menu"
          />
          <View
            style={[
              styles.statusPopover,
              statusPopoverPosition
                ? {
                    position: 'absolute',
                    left: statusPopoverPosition.left,
                    top: statusPopoverPosition.top,
                    width: statusPopoverPosition.width,
                  }
                : null,
            ]}
          >
            <View
              style={[
                styles.statusPopoverNotch,
                statusPopoverPosition ? { left: statusPopoverPosition.notchLeft } : null,
              ]}
            />

            <Text style={styles.statusSectionTitle}>Change Status</Text>

            <View style={styles.statusGrid}>
              <TouchableOpacity
                style={styles.statusGridItem}
                activeOpacity={0.8}
                disabled={statusUpdating}
                onPress={() => {
                  if (!statusMenuTicket || statusUpdating) return;
                  const newPriority = statusMenuTicket.priority === 'urgent' ? 'notUrgent' : 'urgent';
                  setStatusUpdating(true);
                  updateTicketPriority(statusMenuTicket.id, newPriority).then(() => {
                    setStatusMenuTicket(null);
                    loadTickets(selectedTab);
                  }).catch((e) => {
                    console.warn('[TicketsScreen] Failed to update priority', e);
                  }).finally(() => {
                    setStatusUpdating(false);
                  });
                }}
              >
                <View style={[styles.statusCircle, styles.statusCirclePriority]}>
                  <Image
                    source={require('../../../../assets/icons/priority-status.png')}
                    style={styles.statusCircleIconRush}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.statusGridLabel}>Priority</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statusGridItem}
                activeOpacity={0.8}
                disabled={statusUpdating}
                onPress={() => handleStatusSelect('unsolved')}
              >
                <View style={[styles.statusCircle, styles.statusCircleUnsolved]}>
                  <Image
                    source={require('../../../../assets/icons/unsolved.png')}
                    style={styles.statusCircleIconOnDark}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.statusGridLabel}>Unsolved</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statusGridItem}
                activeOpacity={0.8}
                disabled={statusUpdating}
                onPress={() => handleStatusSelect('done')}
              >
                <View style={[styles.statusCircle, styles.statusCircleSolved]}>
                  <Image
                    source={require('../../../../assets/icons/done.png')}
                    style={styles.statusCircleIconSolved}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.statusGridLabel}>Solved</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statusGridItem}
                activeOpacity={0.8}
                disabled={statusUpdating}
                onPress={() => handleStatusSelect('ofo')}
              >
                <View style={styles.statusCircleOfoOuter}>
                  <View style={styles.statusCircleOfoInner} />
                </View>
                <Text style={styles.statusGridLabel}>OFO</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statusDivider} />

            <View style={styles.dueTimeRow}>
              <Text style={styles.statusSectionTitle}>Due time</Text>
              <Switch
                value={dueTimeEnabled}
                onValueChange={handleDueTimeToggle}
                disabled={statusUpdating}
                trackColor={{ false: '#eef2f7', true: '#5b769e' }}
                thumbColor="#ffffff"
                style={styles.dueTimeSwitch}
              />
            </View>

            {dueTimeEnabled && (
              <View style={styles.dueTimeFields}>
                <View style={styles.dueTimeColumns}>
                  <View style={{ width: DUE_TIME_BOX_W }}>
                    <Text style={styles.dueTimeColLabel}>Time</Text>
                    <View style={[styles.dueTimeBox, { width: DUE_TIME_BOX_W }]}>
                      <TextInput
                        style={styles.dueTimeInput}
                        value={dueHour}
                        onChangeText={(t) => setDueHour(t.replace(/\D/g, '').slice(0, 2))}
                        onBlur={persistDueAt}
                        placeholder="H"
                        placeholderTextColor="rgba(0,0,0,0.35)"
                        keyboardType="number-pad"
                        maxLength={2}
                        editable={!statusUpdating}
                      />
                      <View style={styles.dueTimeInnerDivider} />
                      <TextInput
                        style={styles.dueTimeInput}
                        value={dueMinute}
                        onChangeText={(t) => setDueMinute(t.replace(/\D/g, '').slice(0, 2))}
                        onBlur={persistDueAt}
                        placeholder="M"
                        placeholderTextColor="rgba(0,0,0,0.35)"
                        keyboardType="number-pad"
                        maxLength={2}
                        editable={!statusUpdating}
                      />
                    </View>
                  </View>
                  <View style={{ width: DUE_DATE_BOX_W }}>
                    <Text style={styles.dueTimeColLabel}>Date</Text>
                    <View style={[styles.dueTimeBox, { width: DUE_DATE_BOX_W }]}>
                      <TextInput
                        style={styles.dueTimeInput}
                        value={dueDay}
                        onChangeText={(t) => setDueDay(t.replace(/\D/g, '').slice(0, 2))}
                        onBlur={persistDueAt}
                        placeholder="DD"
                        placeholderTextColor="rgba(0,0,0,0.35)"
                        keyboardType="number-pad"
                        maxLength={2}
                        editable={!statusUpdating}
                      />
                      <View style={styles.dueTimeInnerDivider} />
                      <TextInput
                        style={styles.dueTimeInput}
                        value={dueMonth}
                        onChangeText={(t) => setDueMonth(t.replace(/\D/g, '').slice(0, 2))}
                        onBlur={persistDueAt}
                        placeholder="MM"
                        placeholderTextColor="rgba(0,0,0,0.35)"
                        keyboardType="number-pad"
                        maxLength={2}
                        editable={!statusUpdating}
                      />
                      <View style={styles.dueTimeInnerDivider} />
                      <Text style={styles.dueYearStatic}>{dueYearDisplay}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <TicketStaffSelectorModal
        visible={!!assigneeModalTicket}
        onClose={() => setAssigneeModalTicket(null)}
        onSelect={handleAssigneeSelect}
        staff={departmentStaff}
        selectedStaffIds={assigneeModalTicket?.assignedToId ? [assigneeModalTicket.assignedToId] : []}
        departmentName={assigneeModalTicket?.category ?? ''}
        loading={assigneeStaffLoading}
      />

      {/* Header - Fixed at top */}
      <TicketsHeader
        onBackPress={handleBackPress}
        onCreatePress={handleCreatePress}
      />

      {/* Tabs - Fixed below header */}
      <TicketsTabs selectedTab={selectedTab} onTabPress={handleTabChange} />

      {/* Bottom Navigation */}
      <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TICKETS_COLORS.background,
  },
  scrollContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: TICKETS_SPACING.contentPaddingTop * scaleX,
    paddingBottom: TICKETS_SPACING.contentPaddingBottom * scaleX,
    minHeight: '100%',
  },
  divider: {
    height: TICKET_DIVIDER.height,
    backgroundColor: TICKET_DIVIDER.color,
    marginHorizontal: 16 * scaleX,
    marginVertical: 8 * scaleX,
  },
  contentBlurOverlay: {
    position: 'absolute',
    top: (TICKETS_HEADER.height + TICKETS_TABS.container.height) * scaleX, // Start below header and tabs
    left: 0,
    right: 0,
    bottom: 152 * scaleX, // Stop above bottom nav
    zIndex: 1,
  },
  blurOverlayDarkener: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(200, 200, 200, 0.6)',
  },
  statusModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  statusPopover: {
    zIndex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e3e3',
    borderRadius: 10 * scaleX,
    paddingHorizontal: 16 * scaleX,
    paddingTop: 16 * scaleX,
    paddingBottom: 14 * scaleX,
    shadowColor: '#6483B0',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  statusPopoverNotch: {
    position: 'absolute',
    top: -6 * scaleX,
    width: STATUS_POPOVER_NOTCH_SIZE,
    height: STATUS_POPOVER_NOTCH_SIZE,
    backgroundColor: '#ffffff',
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: '#e3e3e3',
    transform: [{ rotate: '45deg' }],
  },
  statusSectionTitle: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
    color: '#5b769e',
  },
  statusGrid: {
    marginTop: 14 * scaleX,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusGridItem: {
    width: 64 * scaleX,
    alignItems: 'center',
  },
  statusCircle: {
    width: 44 * scaleX,
    height: 44 * scaleX,
    borderRadius: 22 * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCirclePriority: {
    backgroundColor: '#ffebeb',
  },
  statusCircleUnsolved: {
    backgroundColor: '#f92424',
  },
  statusCircleSolved: {
    backgroundColor: '#41d541',
  },
  /** Thick grey ring + white center (Figma OFO), not a thin outline. */
  statusCircleOfoOuter: {
    width: 44 * scaleX,
    height: 44 * scaleX,
    borderRadius: 22 * scaleX,
    backgroundColor: '#c6c5c5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCircleOfoInner: {
    width: 20 * scaleX,
    height: 20 * scaleX,
    borderRadius: 10 * scaleX,
    backgroundColor: '#ffffff',
  },
  statusCircleIcon: {
    width: 24 * scaleX,
    height: 24 * scaleX,
    tintColor: '#f92424',
  },
  /** Priority / rush — full-color asset from Figma; do not tint. */
  statusCircleIconRush: {
    width: 26 * scaleX,
    height: 26 * scaleX,
  },
  statusCircleIconOnDark: {
    width: 24 * scaleX,
    height: 24 * scaleX,
    tintColor: '#ffffff',
  },
  /** Same glyph as ticket “done” state, white on green circle. */
  statusCircleIconSolved: {
    width: 24 * scaleX,
    height: 24 * scaleX,
    tintColor: '#ffffff',
  },
  statusGridLabel: {
    marginTop: 8 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: '300',
    color: '#000000',
    textAlign: 'center',
  },
  statusDivider: {
    height: 1,
    backgroundColor: '#e3e3e3',
    marginTop: 14 * scaleX,
    marginBottom: 10 * scaleX,
  },
  dueTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dueTimeSwitch: {
    transform: [{ scaleX: 0.88 }, { scaleY: 0.88 }],
  },
  dueTimeFields: {
    marginTop: 12 * scaleX,
  },
  dueTimeColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: DUE_FIELDS_GAP,
  },
  dueTimeColLabel: {
    marginBottom: 8 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: '300',
    color: '#000000',
  },
  dueTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58 * scaleX,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 0,
    overflow: 'hidden',
  },
  dueTimeInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: '300',
    color: '#000000',
    textAlign: 'center',
  },
  dueTimeInnerDivider: {
    width: 1,
    height: 28 * scaleX,
    backgroundColor: '#e5e5e5',
  },
  dueYearStatic: {
    flexShrink: 0,
    paddingHorizontal: 10 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: '300',
    color: 'rgba(0,0,0,0.18)',
  },
});

