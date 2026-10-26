import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeModal as Modal } from '@/components/ui/SafeModal';
import { Icon } from '@/components/Icon';
import { getDepartments } from '@/lib/departments';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import { fetchRoomAttendants } from '@features/staff/services/staff';
import type { StaffMember } from '@features/staff/types/staff.types';
import type { StaffRosterPerson } from '@features/staff/types/staffRoster.types';
import { useStaffRoster } from '@features/staff/hooks/useStaffRoster';
import StaffHeader from '@features/staff/components/StaffHeader';
import StaffTabs from '@features/staff/components/StaffTabs';
import ShiftGroupHeading from '@features/staff/components/staffList/ShiftGroupHeading';
import StaffIdentityRow from '@features/staff/components/staffList/StaffIdentityRow';
import StaffWorkloadBar from '@features/staff/components/staffList/StaffWorkloadBar';
import { STAFF_LIST_LAYOUT as L } from '@features/staff/components/staffList/staffListLayout';

interface ReassignModalProps {
  visible: boolean;
  onClose: () => void;
  /** The chosen attendant's id, and their row (name, photo) so callers can show them at once. */
  onStaffSelect: (staffId: string, member?: StaffMember) => void;
  onAutoAssign: () => void;
  currentAssignedStaffId?: string;
  roomNumber?: string;
  /** When false, hides the Auto Assign button (e.g. for "Assign Staff" flow). Default true. */
  showAutoAssign?: boolean;
  /**
   * The shift the room is being worked on: the sheet opens on it. Each tab lists
   * only the attendants rostered on that shift.
   */
  shift?: 'AM' | 'PM';
}

type Tab = 'am' | 'pm';

/**
 * Pick who cleans a room — drawn like the Staff roster, so the two read as one
 * app: the same blue band, AM / PM tabs, On Shift / On Break / Shift End
 * groups, identity rows with the presence dot, and the "3/7" workload bar.
 * Each tab lists only that shift's attendants.
 *
 * Data is the Staff roster's too (`useStaffRoster`, Housekeeping, the chosen
 * shift), narrowed to Room Attendants — the only people rooms go to. It
 * replaces a sheet with its own tabs (an "On Shift" tab that duplicated AM/PM)
 * and a workload bar that always read 0: the list it drew never loaded
 * anyone's rooms, so "Auto Assign" picked blindly.
 */
export default function ReassignModal({
  visible,
  onClose,
  onStaffSelect,
  onAutoAssign,
  currentAssignedStaffId,
  roomNumber,
  showAutoAssign = true,
  shift,
}: ReassignModalProps) {
  const s = (n: number) => n * scaleX;
  const [tab, setTab] = useState<Tab>(shift === 'PM' ? 'pm' : 'am');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [attendants, setAttendants] = useState<StaffMember[] | null>(null);
  const [department, setDepartment] = useState<{ id: string; name: string } | null>(null);

  // Loaded each time it opens, so a newly rostered attendant shows.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void Promise.all([fetchRoomAttendants(), getDepartments()]).then(([people, depts]) => {
      if (cancelled) return;
      setAttendants(people);
      const rows = depts.data ?? [];
      const hk =
        rows.find((d) => (d as { key?: string | null }).key === 'housekeeping') ??
        rows.find((d) => (d.name ?? '').trim().toLowerCase() === 'housekeeping');
      setDepartment(hk ? { id: hk.id, name: hk.name ?? 'Housekeeping' } : null);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // Reopen on the room's shift, with no search.
  useEffect(() => {
    if (!visible) {
      setSearchOpen(false);
      setQuery('');
      setTab(shift === 'PM' ? 'pm' : 'am');
    }
  }, [visible, shift]);

  const { roster, loading, error } = useStaffRoster(
    visible && department
      ? { departmentId: department.id, departmentName: department.name, statKind: 'cleaning', shift: tab === 'am' ? 'AM' : 'PM' }
      : null
  );

  const attendantIds = useMemo(() => new Set((attendants ?? []).map((a) => a.id)), [attendants]);

  const sections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (roster?.sections ?? [])
      .map((section) => ({
        ...section,
        data: section.people
          .filter((p) => attendantIds.has(p.id))
          .filter(
            (p) =>
              !needle ||
              p.name.toLowerCase().includes(needle) ||
              (p.jobTitle ?? '').toLowerCase().includes(needle)
          )
          // Lightest load first: the natural pick is at the top of each group.
          .sort((a, b) => (a.work?.total ?? 0) - (b.work?.total ?? 0)),
      }))
      .filter((section) => section.data.length > 0);
  }, [roster, attendantIds, query]);

  const select = (person: StaffRosterPerson) => {
    onStaffSelect(person.id, attendants?.find((a) => a.id === person.id));
    onClose();
  };

  /** The on-shift attendant with the fewest rooms; else ask the caller. */
  const autoAssign = () => {
    const onShift = sections.find((sec) => sec.state === 'on_shift')?.data ?? [];
    const pick = [...onShift].sort((a, b) => (a.work?.total ?? 0) - (b.work?.total ?? 0))[0];
    if (pick) select(pick);
    else onAutoAssign();
  };

  if (!visible) return null;

  const busy = attendants == null || (loading && !roster);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
        <StaffHeader
          onBackPress={onClose}
          title={roomNumber ? `Assign Room ${roomNumber}` : 'Assign Room'}
          searchOpen={searchOpen}
          onSearchPress={() => {
            if (searchOpen) setQuery('');
            setSearchOpen(!searchOpen);
          }}
        />

        {searchOpen ? (
          <View
            className="bg-surface-header"
            style={{ flexDirection: 'row', paddingHorizontal: s(L.gutter), paddingBottom: s(14) }}
          >
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                height: s(42),
                borderRadius: s(21),
                paddingHorizontal: s(16),
                gap: s(10),
              }}
            >
              <Icon name="action-search" size={s(16)} color="#5a759d" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search attendants"
                placeholderTextColor="#9aa7bd"
                autoFocus
                returnKeyType="search"
                style={{ flex: 1, fontSize: s(16), fontFamily: typography.fontFamily.primary, color: '#334866', paddingVertical: 0 }}
                accessibilityLabel="Search attendants"
              />
            </View>
          </View>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: s(L.gutter),
            paddingTop: s(16),
          }}
        >
          <StaffTabs selectedTab={tab} onTabPress={setTab} />
          {showAutoAssign ? (
            <Pressable
              onPress={autoAssign}
              disabled={busy}
              accessibilityRole="button"
              accessibilityHint="Assigns the on-shift attendant with the fewest rooms"
              style={({ pressed }) => ({
                paddingHorizontal: s(16),
                paddingVertical: s(8),
                borderRadius: s(18),
                backgroundColor: '#e4eefe',
                opacity: pressed || busy ? 0.6 : 1,
              })}
            >
              <Text style={{ fontSize: s(14), fontFamily: typography.fontFamily.primary, fontWeight: '700', color: '#5a759d' }}>
                Auto Assign
              </Text>
            </Pressable>
          ) : null}
        </View>

        <SectionList
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: s(40), flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          sections={busy || error ? [] : sections}
          keyExtractor={(p) => p.id}
          renderSectionHeader={({ section }) => (
            <View style={{ paddingHorizontal: s(L.gutter) }}>
              <ShiftGroupHeading state={section.state} />
            </View>
          )}
          renderItem={({ item: person }) => {
            const current = person.id === currentAssignedStaffId;
            return (
              <View style={{ paddingHorizontal: s(L.gutter) }}>
                <Pressable
                  onPress={() => select(person)}
                  accessibilityRole="button"
                  accessibilityLabel={`Assign to ${person.name}`}
                  accessibilityState={{ selected: current }}
                  style={({ pressed }) => ({
                    borderRadius: s(L.card.radius),
                    borderWidth: 1,
                    borderColor: current ? '#5a759d' : '#e3e3e3',
                    backgroundColor: pressed ? '#eef2f8' : '#f9fafc',
                    paddingVertical: s(14),
                    paddingHorizontal: s(L.card.paddingHorizontal),
                    gap: s(12),
                  })}
                >
                  <StaffIdentityRow
                    person={person}
                    showChevron={false}
                    trailing={
                      current ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(4) }}>
                          <Ionicons name="checkmark-circle" size={s(20)} color="#5a759d" />
                          <Text style={{ fontSize: s(12), fontFamily: typography.fontFamily.primary, color: '#5a759d', fontWeight: '700' }}>
                            Assigned
                          </Text>
                        </View>
                      ) : undefined
                    }
                  />
                  {person.work ? <StaffWorkloadBar work={person.work} /> : null}
                </Pressable>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: s(10) }} />}
          ListEmptyComponent={
            busy ? (
              <View style={{ paddingVertical: s(48) }}>
                <ActivityIndicator size="large" color="#5a759d" />
              </View>
            ) : (
              <Text
                style={{
                  textAlign: 'center',
                  paddingVertical: s(40),
                  paddingHorizontal: s(24),
                  fontSize: s(14),
                  fontFamily: typography.fontFamily.primary,
                  color: '#a0a0a0',
                }}
              >
                {error
                  ? error
                  : query.trim()
                    ? 'No attendant matches your search.'
                    : `No room attendants are rostered on the ${tab === 'am' ? 'AM' : 'PM'} shift.`}
              </Text>
            )
          }
        />
      </View>
    </Modal>
  );
}
