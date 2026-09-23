import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation, useRoute, useRouter } from 'expo-router';
import { BottomTabNavigationProp } from 'expo-router/js-tabs';

import { View, Text } from '@/tw';
import BottomTabBar from '@/components/layout/BottomTabBar';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';
import { getDepartments, sortDepartmentsByDisplayOrder, type DepartmentRow } from '@/lib/departments';
import type { ReturnToTab } from '@/types/navigation';

import StaffHeader from '../components/StaffHeader';
import StaffTabs from '../components/StaffTabs';
import StaffDepartmentStrip from '../components/StaffDepartmentStrip';
import EmptyStaffState, { type StaffEmptyReason } from '../components/EmptyStaffState';
import StaffShiftCard from '../components/staffList/StaffShiftCard';
import StaffCompactRow from '../components/staffList/StaffCompactRow';
import ShiftGroupHeading from '../components/staffList/ShiftGroupHeading';
import { STAFF_LIST_LAYOUT as L } from '../components/staffList/staffListLayout';
import { useStaffRoster } from '../hooks/useStaffRoster';
import type { StaffTab } from '../types/staff.types';
import type { StaffRosterPerson } from '../types/staffRoster.types';

type MainTabsParamList = {
  '(home)/index': undefined;
  '(rooms)/index': undefined;
  '(chats)/index': undefined;
  '(tickets)/index': undefined;
  '(lost_and_found)/index': undefined;
  '(staff)/index': undefined;
  '(settings)/index': undefined;
};

type StaffScreenNavigationProp = BottomTabNavigationProp<MainTabsParamList, '(staff)/index'>;

/**
 * Departments whose people are measured in rooms rather than tickets.
 *
 * Lower-cased because the `departments` table is free text and has been seeded
 * with several spellings.
 */
const CLEANING_DEPARTMENTS = new Set(['hsk portier', 'laundry', 'housekeeping', 'hsk']);

/**
 * Departments the roster does not show.
 *
 * "Executive and Administration" is general management, not a shift-working
 * team — it has no rooms, no shifts and nothing for this screen to group, and
 * the frame never drew it.
 *
 * **Hidden here, not deleted, and not hidden globally.** The row has three real
 * users attached (including the account owner), so removing it from the
 * database would orphan them or fail on the foreign key. `getDepartments` is
 * also shared with the ticket department picker, where routing a ticket to
 * management is legitimate — filtering inside that helper would take it away
 * from Tickets too.
 *
 * The cost, stated: those three people are no longer reachable from this
 * screen. Delete this constant to bring the department back.
 */
const HIDDEN_DEPARTMENTS = new Set(['executive and administration']);

/**
 * The Staff roster — Figma 3240:561.
 *
 * ## What this replaces
 *
 * 592 lines with four raw effects, six pieces of state, a `useFocusEffect` that
 * double-fetched on mount, two competing `scaleX` values in one render tree,
 * and `StyleSheet.create` called inside the render body. Data now comes from
 * `useStaffRoster` already grouped; this file arranges it.
 *
 * **The AM and PM tabs previously showed identical rosters** — `onShift` was
 * hardcoded `true` and `shift` was never set, so both filters fell through
 * their own guards. They are real queries now.
 */
export default function StaffScreen() {
  const navigation = useNavigation<StaffScreenNavigationProp>();
  const route = useRoute();
  const router = useRouter();

  const [selectedTab, setSelectedTab] = useState<StaffTab>('am');
  const [departments, setDepartments] = useState<DepartmentRow[] | null>(null);
  const [activeDepartmentId, setActiveDepartmentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  /*
   * Which cards are open, by person id.
   *
   * Held here rather than in the card: the roster reloads on focus and on
   * every department switch, and a card owning its own state would silently
   * collapse each time. Closed is the default, so an empty set is correct on
   * first render and nothing has to be seeded.
   */
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());

  const toggleOpen = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /*
   * Departments load once. `null` means "not loaded"; an empty array means the
   * hotel genuinely has none, which is its own empty state rather than a
   * silently blank strip.
   */
  useEffect(() => {
    let cancelled = false;
    getDepartments()
      .then((res) => {
        if (cancelled) return;
        const visible = (res.data ?? []).filter(
          (d) => !HIDDEN_DEPARTMENTS.has((d.name ?? '').trim().toLowerCase()),
        );
        const sorted = sortDepartmentsByDisplayOrder(visible);
        setDepartments(sorted);
        setActiveDepartmentId((prev) => prev ?? sorted[0]?.id ?? null);
      })
      .catch((e) => {
        if (__DEV__) console.warn('[StaffScreen] Could not load departments', e);
        if (!cancelled) setDepartments([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeDepartment = useMemo(
    () => departments?.find((d) => d.id === activeDepartmentId) ?? null,
    [departments, activeDepartmentId],
  );

  const statKind: 'cleaning' | 'tickets' = CLEANING_DEPARTMENTS.has(
    (activeDepartment?.name ?? '').trim().toLowerCase(),
  )
    ? 'cleaning'
    : 'tickets';

  const { roster, loading, error } = useStaffRoster(
    activeDepartment
      ? {
          departmentId: activeDepartment.id,
          departmentName: activeDepartment.name,
          statKind,
          shift: selectedTab === 'am' ? 'AM' : 'PM',
        }
      : null,
  );

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const returnToTab =
      (route.params as { returnToTab?: ReturnToTab } | undefined)?.returnToTab ?? '(home)/index';
    navigation.navigate(returnToTab as keyof MainTabsParamList);
  }, [navigation, route.params]);

  /**
   * "See rooms" leaves for that person's full room list — Figma 3810:173.
   *
   * The display fields travel as params so the next screen's header can draw
   * immediately; only the rooms are re-fetched, because the roster holds their
   * numbers and statuses but not the guests and reservations those cards need.
   *
   * **Cleaning departments only.** A ticket department's control says "See
   * tickets" and there is no per-person tickets screen, so it closes the card
   * instead of navigating somewhere that does not exist. One line to repoint
   * when that screen is designed.
   */
  const handleSeeRooms = useCallback(
    (person: StaffRosterPerson) => {
      if (person.statKind !== 'cleaning') {
        toggleOpen(person.id);
        return;
      }
      router.push({
        pathname: '/staff-rooms',
        params: {
          staffId: person.id,
          name: person.name,
          avatarUrl: person.avatarUrl ?? '',
          // Both: the header shows the job title and falls back to the
          // department for the one user who has no `job_title_id`.
          jobTitle: person.jobTitle ?? '',
          departmentName: person.departmentName ?? '',
          state: person.state,
          shift: selectedTab === 'am' ? 'AM' : 'PM',
        },
      });
    },
    [router, selectedTab, toggleOpen],
  );

  const matchesSearch = useCallback(
    (person: StaffRosterPerson) => {
      const needle = searchQuery.trim().toLowerCase();
      if (!needle) return true;
      return (
        person.name.toLowerCase().includes(needle) ||
        (person.jobTitle ?? '').toLowerCase().includes(needle) ||
        (person.departmentName ?? '').toLowerCase().includes(needle)
      );
    },
    [searchQuery],
  );

  const sections = useMemo(
    () =>
      (roster?.sections ?? []).map((section) => ({
        ...section,
        people: section.people.filter(matchesSearch),
      })),
    [roster, matchesSearch],
  );

  const visibleCount = sections.reduce((n, s) => n + s.people.length, 0);

  /** Which empty state, if any. Order matters: most specific first. */
  const emptyReason: StaffEmptyReason | null = (() => {
    if (loading || error) return null;
    if (departments != null && departments.length === 0) return 'noDepartments';
    if (!roster) return null;
    if (roster.totalCount === 0) return 'noDepartmentStaff';
    if (visibleCount === 0) return 'noSearchMatch';
    return null;
  })();

  const s = (n: number) => n * scaleX;

  return (
    <View className="flex-1 bg-surface-primary">
      <StaffHeader onBackPress={handleBack} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: s(L.list.paddingBottom), flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          className="font-hestia-primary font-bold text-ink-primary"
          style={{
            marginTop: s(L.departments.headingMarginTop),
            marginHorizontal: s(L.gutter),
            fontSize: s(L.departments.headingFontSize),
            fontFamily: typography.fontFamily.primary,
          }}
        >
          Departments
        </Text>

        <StaffDepartmentStrip
          departments={departments ?? []}
          activeId={activeDepartmentId}
          onSelect={setActiveDepartmentId}
        />

        {/*
          The section header now sits **above** the tab row (node 4211:621,
          y=332); it used to be below it at y=427.
        */}
        <View
          className="flex-row items-center justify-between"
          style={{
            paddingHorizontal: s(L.gutter),
            marginTop: s(L.sectionHeader.marginTop),
            marginBottom: s(L.sectionHeader.marginBottom),
          }}
        >
          <Text
            className="font-hestia-primary text-ink-accent"
            style={{
              fontSize: s(L.sectionHeader.fontSize),
              fontFamily: typography.fontFamily.primary,
            }}
          >
            {activeDepartment?.name ?? 'Staff'} Staff and Shifts
          </Text>
          <Text
            className="font-hestia-primary text-ink-accent"
            style={{
              fontSize: s(L.sectionHeader.fontSize),
              fontFamily: typography.fontFamily.primary,
            }}
          >
            {roster?.totalCount ?? 0}
          </Text>
        </View>

        <View>
          {/* Nodes 3883:6785 (y=372) and 3240:571 (y=427) — both full bleed. */}
          <View className="h-px bg-border-medium" />
          <View
            style={{
              paddingLeft: s(L.tabRow.paddingLeft),
              paddingRight: s(L.tabRow.paddingRight),
              paddingTop: s(L.tabRow.paddingTop),
            }}
          >
            <StaffTabs
              selectedTab={selectedTab}
              onTabPress={setSelectedTab}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
            />
          </View>
          <View className="h-px bg-border-medium" />
        </View>

        {loading && !roster ? (
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
        ) : emptyReason ? (
          <EmptyStaffState reason={emptyReason} />
        ) : (
          <View style={{ paddingHorizontal: s(L.gutter) }}>
            {sections.map((section) =>
              /*
                An empty group hides its heading entirely. Printing "On Break"
                over nothing three times reads as a broken screen, and on a
                small department two of the three are routinely empty.
              */
              section.people.length === 0 ? null : (
                <View key={section.state}>
                  <ShiftGroupHeading state={section.state} />
                  <View style={{ gap: s(L.compactRow.gap) }}>
                    {section.people.map((person) =>
                      /*
                        Only On Shift gets the expandable card. Someone on a
                        break or finished has no live workload to open, which
                        is why the frame draws them as plain rows.
                      */
                      section.state === 'on_shift' ? (
                        <StaffShiftCard
                          key={person.id}
                          person={person}
                          isOpen={openIds.has(person.id)}
                          onToggle={() => toggleOpen(person.id)}
                          onSeeRooms={() => handleSeeRooms(person)}
                        />
                      ) : (
                        <StaffCompactRow key={person.id} person={person} />
                      ),
                    )}
                  </View>
                </View>
              ),
            )}
          </View>
        )}
      </ScrollView>

      <BottomTabBar />
    </View>
  );
}
