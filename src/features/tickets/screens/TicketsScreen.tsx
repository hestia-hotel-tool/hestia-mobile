import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
  Switch,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect , NativeStackNavigationProp } from 'expo-router';
import { BottomTabNavigationProp } from 'expo-router/js-tabs';
import type { RootStackParamList, MainTabsParamList as MainTabsParamListFromApp } from '@/types/navigation';
import BottomTabBar from '@/components/layout/BottomTabBar';
import { LoadingOverlay } from '@/components/feedback/LoadingOverlay';
import TicketsHeader from '../components/TicketsHeader';
import { TabBar } from '@/components/ui/TabBar';
import TicketCard from '../components/TicketCard';
import EmptyTicketsState from '../components/EmptyTicketsState';
import type { TicketStatusAnchorLayout } from '../components/TicketCard';
import { TicketTab, TicketData, TicketsScreenData, TicketStatus } from '../types/tickets.types';
import {
  getTicketsTopShift,
  TICKETS_SPACING,
  TICKETS_COLORS,
  TICKET_STATUS_POPOVER,
  scaleX,
} from '../constants/ticketsStyles';
import { dashboardService } from '@features/rooms/services/dashboard';
import { updateTicketStatus, updateTicketDueAt, updateTicketPriority, updateTicketAssignee } from '../services/tickets';
import TicketStaffSelectorModal from '../components/TicketStaffSelectorModal';
import { getUsersByDepartment } from '@features/account/services/user';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useUserStore } from '@features/account/store/useUserStore';
import type { User } from '@/types';
import { typography } from '@/theme';
import {
  markAllTicketTagNotificationsRead,
  invalidateNotificationBadges,
} from '@/lib/inAppNotifications';
import { Icon } from '@/components/Icon';
import { useToast } from '@/contexts/ToastContext';
import StatusPopover from '@features/rooms/components/StatusPopover';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Figma 667-3068: My Tickets / All / Open / Closed, in this order. */
const TICKET_TABS: readonly TicketTab[] = ['myTickets', 'all', 'open', 'closed'];
const TICKET_TAB_LABELS: Record<TicketTab, string> = {
  myTickets: 'My Tickets',
  all: 'All',
  open: 'Open',
  closed: 'Closed',
};

/** Change Status popover — height for vertical clamping (expanded when Due time fields visible). Figma ~295 / ~472. */
/**
 * Card height in **design px** — `StatusPopover` scales it and only uses it to
 * decide whether to open below the pill or flip above, so an estimate is fine.
 * Collapsed is the frame's own panel (3129:1649, 396 x 283); expanded is not
 * drawn anywhere, so the old estimate stands.
 */
/** Figma 667-3068 node 1085:2963 / 667:3096 — the header band. */
const TICKETS_HEADER_HEIGHT = 133;
const STATUS_POPOVER_HEIGHT_COLLAPSED = 283;
const STATUS_POPOVER_HEIGHT_EXPANDED = 455;

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
  const { session } = useAuth();
  const userProfile = useUserStore((s) => s.profile);
  const insets = useSafeAreaInsets();
  const toast = useToast();
  /** Header, tab row and scroll content all hang off absolute tops, so they move together. */
  const topShift = getTicketsTopShift(insets.top, scaleX);
  const [selectedTab, setSelectedTab] = useState<TicketTab>('myTickets');
  const [ticketsData, setTicketsData] = useState<TicketsScreenData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusMenuTicket, setStatusMenuTicket] = useState<TicketData | null>(null);
  /**
   * Which status option is mid-flight, so the tapped one can show a spinner.
   *
   * A single `statusUpdating` boolean could only disable all four, which is why
   * a change felt like it needed several hard taps: the first tap fired, the
   * options went silently inert for the length of a network round trip, and
   * nothing on screen said so.
   */
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  /**
   * Any write in flight. Was its own `statusUpdating` state that nothing ever
   * set to true after the due-time handlers stopped doing so, which left the
   * Switch and the H/M/DD/MM fields permanently enabled mid-write.
   */
  const statusUpdating = pendingAction !== null;
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

  // Refresh on return to the tab, and clear the tickets badge. This used to sit
  // alongside a dead `activeTab` resync that compared `route.name` against
  // 'Tickets' — a name the router never uses. The resync is gone; the refresh
  // is the part that was doing real work.
  useFocusEffect(
    React.useCallback(() => {
      const params = (route as any).params as { initialTab?: TicketTab } | undefined;
      // An explicit initialTab (e.g. after creating a ticket) wins over the
      // stored selection.
      loadTickets(params?.initialTab, { silent: true });
      void markAllTicketTagNotificationsRead().then(() => invalidateNotificationBadges());
    }, [route, loadTickets])
  );



  const handleBackPress = () => {
    navigation.goBack();
  };

  /*
   * Straight to location. This used to open `create-ticket/index`, a grid of the
   * eight departments, and only then reach the location screen. Figma 1085-2628
   * makes location the first and only step before the form, and the form already
   * owns a department strip — so the grid was asking for a choice that the form
   * then asked for again, and only the form's answer reached `createTicket`.
   */
  const handleCreatePress = () => {
    stackNavigation.navigate('select-ticket-location/index');
  };

  const handleTabChange = (tab: TicketTab) => {
    setSelectedTab(tab);
    // TODO: Filter tickets based on selected tab
  };

  const handleTicketPress = (ticket: TicketData) => {
    // TODO: Navigate to ticket detail screen
    // TODO: there is no ticket-detail screen to open yet.
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

  /*
   * Optimistic: the Switch and the fields flip immediately and the write
   * reports itself with the spinner beside them, rather than the control
   * sitting inert for a whole round trip with nothing to say it is working.
   */
  const handleDueTimeToggle = React.useCallback(
    async (value: boolean) => {
      if (!statusMenuTicket) {
        setDueTimeEnabled(value);
        return;
      }
      const ticketId = statusMenuTicket.id;
      const iso = value ? new Date().toISOString() : null;

      if (value) applyDueFieldsFromDate(new Date());
      setDueTimeEnabled(value);

      setPendingAction('dueTime');
      try {
        await updateTicketDueAt(ticketId, iso);
        if (!value) {
          setDueHour('');
          setDueMinute('');
          setDueDay('');
          setDueMonth('');
        }
        setStatusMenuTicket((t) => (t?.id === ticketId ? { ...t, dueAt: iso } : t));
        await loadTickets(selectedTab, { silent: true });
      } catch (e) {
        console.warn('[TicketsScreen] Failed to save due time', e);
        // Put the control back where it was — the write did not land.
        setDueTimeEnabled(!value);
        toast.show('Could not save the due time. Please try again.', { type: 'error' });
      } finally {
        setPendingAction(null);
      }
    },
    [statusMenuTicket, loadTickets, selectedTab, applyDueFieldsFromDate, toast]
  );

  /**
   * Run one status-grid action with feedback.
   *
   * Closes the popover only once the write has actually landed, keeps a spinner
   * on the tapped option until then, and surfaces a failure instead of only
   * logging it — a failed update used to look identical to a successful one.
   */
  const withBusy = async (key: string, work: () => Promise<void>) => {
    if (pendingAction) return false;
    setPendingAction(key);
    try {
      await work();
      return true;
    } catch (e) {
      console.warn('[TicketsScreen] Failed to update ticket', e);
      toast.show('Could not update the ticket. Please try again.', { type: 'error' });
      return false;
    } finally {
      setPendingAction(null);
    }
  };

  /** A grid action: on success the popover closes and the list refreshes. */
  const runStatusAction = async (key: string, work: () => Promise<void>) => {
    const ok = await withBusy(key, work);
    if (!ok) return;
    setStatusMenuTicket(null);
    // Refresh while keeping the current selected tab.
    await loadTickets(selectedTab);
  };

  /**
   * One status option: circle, label, spinner while it is the one in flight.
   *
   * A plain function, not a component — declaring a component inside render
   * remounts it (and loses the ActivityIndicator's animation) every pass.
   *
   * `hitSlop` matters here: the circle is 44 and the column 64, so the gaps
   * between the four options were dead space that swallowed near-misses.
   */
  const renderStatusOption = (
    key: string,
    label: string,
    circle: React.ReactNode,
    onPress: () => void
  ) => {
    const busy = pendingAction === key;
    const blocked = pendingAction !== null || statusUpdating;
    return (
      <TouchableOpacity
        key={key}
        style={[styles.statusGridItem, blocked && !busy && styles.statusGridItemDimmed]}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        disabled={blocked}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ busy, disabled: blocked }}
      >
        <View>
          {circle}
          {busy ? (
            <View style={styles.statusCircleBusy}>
              <ActivityIndicator size="small" color="#ffffff" />
            </View>
          ) : null}
        </View>
        <Text style={styles.statusGridLabel}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const handleStatusSelect = (nextStatus: TicketStatus) =>
    runStatusAction(nextStatus, async () => {
      if (!statusMenuTicket) return;
      await updateTicketStatus(statusMenuTicket.id, nextStatus);
    });

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

  return (
    <View style={styles.container}>
      {(loading || refreshing) && <LoadingOverlay fullScreen message={loading ? 'Loading tickets…' : 'Refreshing…'} />}
      <View style={styles.scrollContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: TICKETS_SPACING.contentPaddingTop * scaleX + topShift },
          ]}
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
      {/*
        The same popover the room status opens in (Figma 2365:49), not a second
        one. It already owns the modal, the blur that starts below the header,
        tap-outside-to-close, the tail pointing back at the tapped control, the
        slide-in, and the flip-above-when-there-is-no-room decision — all of
        which this screen had re-implemented by hand against a fixed 8pt offset.
        Only the width differs, and the frame gives it: 396 at x=21.
      */}
      <StatusPopover
        visible={!!statusMenuTicket}
        onClose={() => setStatusMenuTicket(null)}
        buttonPosition={statusAnchor}
        headerHeight={TICKETS_HEADER_HEIGHT + topShift / scaleX}
        backdrop="clear"
        /* 3129-1500 puts the notch tip 4 below the pill, plus the 13.5 tail. */
        spacing={17.5}
        width={TICKET_STATUS_POPOVER.width}
        left={TICKET_STATUS_POPOVER.left}
        contentHeight={dueTimeEnabled ? STATUS_POPOVER_HEIGHT_EXPANDED : STATUS_POPOVER_HEIGHT_COLLAPSED}
      >
        {() => (
          <>
            <Text style={styles.statusSectionTitle}>Change Status</Text>

            <View style={styles.statusGrid}>
              {renderStatusOption(
                'priority',
                'Priority',
                <View style={[styles.statusCircle, styles.statusCirclePriority]}>
                  {/* Red on the pale disc, matching TicketStatusCircle.priority. */}
                  <Icon name="action-priority" size={26 * scaleX} color="#f92424" />
                </View>,
                () =>
                  runStatusAction('priority', async () => {
                    if (!statusMenuTicket) return;
                    const next = statusMenuTicket.priority === 'urgent' ? 'notUrgent' : 'urgent';
                    await updateTicketPriority(statusMenuTicket.id, next);
                  })
              )}
              {renderStatusOption(
                'unsolved',
                'Unsolved',
                <View style={[styles.statusCircle, styles.statusCircleUnsolved]}>
                  <Icon name="action-thumbs-down-solid" size={24 * scaleX} color="#ffffff" />
                </View>,
                () => handleStatusSelect('unsolved')
              )}
              {renderStatusOption(
                'done',
                'Solved',
                <View style={[styles.statusCircle, styles.statusCircleSolved]}>
                  <Icon name="action-thumbs-up-solid" size={24 * scaleX} color="#ffffff" />
                </View>,
                () => handleStatusSelect('done')
              )}
              {renderStatusOption(
                'ofo',
                'OFO',
                <View style={styles.statusCircleOfoOuter}>
                  <View style={styles.statusCircleOfoInner} />
                </View>,
                () => handleStatusSelect('ofo')
              )}
            </View>

            <View style={styles.statusDivider} />

            <View style={styles.dueTimeRow}>
              <Text style={styles.statusSectionTitle}>Due time</Text>
              {pendingAction === 'dueTime' ? (
                <ActivityIndicator size="small" color="#5b769e" style={styles.dueTimeSpinner} />
              ) : null}
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
          </>
        )}
      </StatusPopover>

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
      {/*
        Figma 667-3068: labels x=25..403 at y=158, one rule 92x4 `#5a759d` at
        y=189 under whichever tab is active. The row this replaces carried a
        *per-tab* rule width (92 / 18 / 41 / 51) matched to each label's text —
        the frame draws one width, 92, so the other three were invented.
      */}
      <View style={[styles.tabsRow, { top: 158 * scaleX + topShift }]}>
        <TabBar<TicketTab>
          tabs={TICKET_TABS}
          activeTab={selectedTab}
          onTabPress={handleTabChange}
          ruleColor="#5a759d"
          ruleGap={13}
          labelColor="#5a759d"
          renderLabel={(tab) => TICKET_TAB_LABELS[tab]}
        />
      </View>

      {/* Bottom Navigation */}
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TICKETS_COLORS.background,
  },
  /** The slot the old absolute tab row occupied; gaps are K4's job. */
  tabsRow: {
    position: 'absolute',
    top: 158 * scaleX,
    left: 25 * scaleX,
    right: 37 * scaleX,
    zIndex: 10,
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
  statusSectionTitle: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
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
  /** The three options you did not tap, while one is in flight. */
  statusGridItemDimmed: {
    opacity: 0.4,
  },
  /** Sits over the tapped circle; the scrim keeps the spinner legible on any tone. */
  statusCircleBusy: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22 * scaleX,
    backgroundColor: 'rgba(0,0,0,0.35)',
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
  /** Priority / rush — full-color asset from Figma; do not tint. */
  /** Same glyph as ticket “done” state, white on green circle. */
  statusGridLabel: {
    marginTop: 8 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
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
  dueTimeSpinner: {
    marginRight: 10 * scaleX,
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
    fontFamily: typography.fontFamily.primary,
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
    fontFamily: typography.fontFamily.primary,
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
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: 'rgba(0,0,0,0.18)',
  },
});

