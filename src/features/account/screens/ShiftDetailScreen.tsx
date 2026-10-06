import React, { useCallback, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { SafeModal as Modal } from '@/components/ui/SafeModal';
import { TimeWheelPicker } from '@/components/ui/TimeWheelPicker';
import { useToast } from '@/contexts/ToastContext';
import { typography } from '@/theme';
import { SettingsRow, SettingsSection, SETTINGS_COLORS as C } from '../components/SettingsList';
import {
  listRoster,
  listShifts,
  setStaffShift,
  updateShiftHours,
  type RosterMember,
  type Shift,
} from '../services/shifts';
import { isOvernight, shiftLengthLabel } from '../utils/shiftClock';
import { BreakRuleSheet } from '../components/BreakRuleSheet';
import { fetchOpenBreaks, listBreakRules, type BreakRule, type StaffBreak } from '../services/breaks';
import { formatMinutesSpan } from '@/utils/formatting';
import { NO_SHIFT_ID } from './ShiftsScreen';

type Editing = { which: 'start' | 'end'; value: string } | null;

/**
 * One shift: its hours and its people.
 *
 * - Start / End open a time wheel; the change is saved at once, with the new
 *   length shown before saving.
 * - Each person has Move to another shift / Remove from shift.
 * - Add Staff lists everyone not on this shift, with search and multi-select.
 *
 * Opened with `id = none`, the same screen lists staff on no shift (no hours).
 */
export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const isNone = id === NO_SHIFT_ID;

  const [shifts, setShifts] = useState<Shift[] | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const [savingHours, setSavingHours] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [rules, setRules] = useState<BreakRule[]>([]);
  const [onBreak, setOnBreak] = useState<Map<string, StaffBreak>>(new Map());
  // undefined = sheet closed; null = adding; a rule = editing it.
  const [editingRule, setEditingRule] = useState<BreakRule | null | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const [s, r, b, open] = await Promise.all([
        listShifts(),
        listRoster(),
        isNone ? Promise.resolve([]) : listBreakRules(id!),
        fetchOpenBreaks(),
      ]);
      setShifts(s);
      setRoster(r);
      setRules(b);
      setOnBreak(open);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Could not load shift' });
    }
  }, [toast, id, isNone]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const shift = shifts?.find((s) => s.id === id) ?? null;
  const onThisShift = (m: RosterMember) =>
    isNone ? !m.shiftId || !shifts?.some((s) => s.id === m.shiftId) : m.shiftId === id;
  const members = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roster
      .filter(onThisShift)
      .filter((m) => !q || m.name.toLowerCase().includes(q) || (m.jobTitle ?? '').toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, query, id, shifts]);

  const move = async (people: RosterMember[], to: Shift | null) => {
    const ids = people.map((p) => p.id);
    setBusyIds((b) => new Set([...b, ...ids]));
    try {
      await setStaffShift(ids, to?.id ?? null);
      // Show the move at once; the next focus reload confirms it.
      setRoster((r) => r.map((m) => (ids.includes(m.id) ? { ...m, shiftId: to?.id ?? null } : m)));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const who = people.length === 1 ? people[0].name : `${people.length} people`;
      toast.show(to ? `${who} now on the ${to.name} shift.` : `${who} removed from the shift.`, { type: 'success' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Roster not changed' });
    } finally {
      setBusyIds((b) => {
        const next = new Set(b);
        ids.forEach((i) => next.delete(i));
        return next;
      });
    }
  };

  const personActions = (m: RosterMember) => {
    const others = (shifts ?? []).filter((s) => s.id !== m.shiftId);
    const options = [...others.map((s) => `Move to ${s.name} (${s.start}–${s.end})`), ...(isNone ? [] : ['Remove from shift'])];
    const run = (i: number) => {
      if (i < others.length) void move([m], others[i]);
      else if (!isNone && i === others.length) void move([m], null);
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: m.name,
          options: [...options, 'Cancel'],
          cancelButtonIndex: options.length,
          destructiveButtonIndex: isNone ? undefined : options.length - 1,
        },
        (i) => {
          if (i < options.length) run(i);
        }
      );
    } else {
      Alert.alert(m.name, undefined, [
        ...options.map((label, i) => ({ text: label, onPress: () => run(i), style: (!isNone && i === others.length ? 'destructive' : 'default') as 'destructive' | 'default' })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const saveHours = async () => {
    if (!shift || !editing) return;
    const start = editing.which === 'start' ? editing.value : shift.start;
    const end = editing.which === 'end' ? editing.value : shift.end;
    if (start === end) {
      toast.show('A shift cannot start and end at the same time.', { type: 'error' });
      return;
    }
    setSavingHours(true);
    try {
      await updateShiftHours(shift.id, start, end);
      setShifts((s) => (s ? s.map((x) => (x.id === shift.id ? { ...x, start, end } : x)) : s));
      setEditing(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show(`${shift.name} shift is now ${start}–${end}.`, { type: 'success', title: 'Hours saved' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Hours not saved' });
    } finally {
      setSavingHours(false);
    }
  };

  const title = isNone ? 'Not on a shift' : shift ? `${shift.name} shift` : 'Shift';
  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        title,
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: C.title,
        headerStyle: { backgroundColor: C.header },
        headerTitleStyle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 18, color: C.title },
        headerShadowVisible: false,
        headerRight: !isNone && shifts
          ? () => (
              <Pressable onPress={() => setAdding(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Add staff">
                <Ionicons name="person-add-outline" size={22} color={C.title} />
              </Pressable>
            )
          : undefined,
      }}
    />
  );

  if (!shifts) {
    return (
      <View style={styles.center}>
        {header}
        <ActivityIndicator color={C.title} />
      </View>
    );
  }
  if (!isNone && !shift) {
    return (
      <View style={styles.center}>
        {header}
        <Text style={styles.emptyTitle}>This shift is no longer here</Text>
      </View>
    );
  }

  const pendingStart = editing?.which === 'start' ? editing.value : shift?.start ?? '';
  const pendingEnd = editing?.which === 'end' ? editing.value : shift?.end ?? '';
  const total = roster.filter(onThisShift).length;

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {shift ? (
          <SettingsSection
            title="Hours"
            footer={
              isOvernight(shift.start, shift.end)
                ? `Runs overnight: starts at ${shift.start} and ends at ${shift.end} the next morning.`
                : `${shiftLengthLabel(shift.start, shift.end)} shift. Applies every day.`
            }
          >
            <SettingsRow icon="play-outline" label="Starts" value={shift.start} onPress={() => setEditing({ which: 'start', value: shift.start })} />
            <SettingsRow icon="stop-outline" label="Ends" value={shift.end} onPress={() => setEditing({ which: 'end', value: shift.end })} />
          </SettingsSection>
        ) : null}

        {shift ? (
          <SettingsSection
            title="Breaks"
            footer={
              rules.length === 0
                ? 'No breaks set: staff on this shift can still take a short 15-minute break.'
                : 'Staff start and end these from My Shift on their Settings screen.'
            }
          >
            {rules.map((r) => (
              <SettingsRow
                key={r.id}
                icon="cafe-outline"
                label={r.name}
                detail={`${formatMinutesSpan(r.minutes * 60_000)} · ${
                  r.windowStart && r.windowEnd ? `${r.windowStart}–${r.windowEnd}` : 'any time'
                }`}
                onPress={() => setEditingRule(r)}
              />
            ))}
            <SettingsRow icon="add-circle-outline" label="Add break" onPress={() => setEditingRule(null)} />
          </SettingsSection>
        ) : null}

        <View style={styles.staffHeader}>
          <Text style={styles.sectionTitle}>
            {isNone ? 'Staff' : 'On this shift'} · {total}
          </Text>
          {!isNone ? (
            <Pressable onPress={() => setAdding(true)} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>Add staff</Text>
            </Pressable>
          ) : null}
        </View>

        {total > 6 ? (
          <View style={styles.search}>
            <Ionicons name="search" size={16} color={C.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or job"
              placeholderTextColor="#9ca3af"
              style={styles.searchInput}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
        ) : null}

        <View style={styles.list}>
          {members.length === 0 ? (
            <Text style={styles.empty}>
              {query ? 'No one matches that search.' : isNone ? 'Everyone is on a shift.' : 'No one is on this shift yet.'}
            </Text>
          ) : (
            members.map((m, i) => (
              <React.Fragment key={m.id}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  onPress={() => personActions(m)}
                  disabled={busyIds.has(m.id)}
                  style={({ pressed }) => [styles.person, pressed && styles.personPressed]}
                  accessibilityRole="button"
                  accessibilityHint="Move to another shift"
                >
                  <Avatar uri={m.avatarUrl ?? undefined} name={m.name} size={38} />
                  <View style={styles.personText}>
                    <Text style={styles.personName} numberOfLines={1}>
                      {m.name}
                    </Text>
                    <Text style={styles.personSub} numberOfLines={1}>
                      {[m.jobTitle, m.department].filter(Boolean).join(' · ') || '—'}
                    </Text>
                  </View>
                  {onBreak.has(m.id) ? (
                    <View style={styles.breakChip}>
                      <Text style={styles.breakChipText}>On break</Text>
                    </View>
                  ) : null}
                  {busyIds.has(m.id) ? (
                    <ActivityIndicator color={C.title} />
                  ) : (
                    <Ionicons name="swap-horizontal" size={18} color="#b4bfd0" />
                  )}
                </Pressable>
              </React.Fragment>
            ))
          )}
        </View>
      </ScrollView>

      {/* Hours: one wheel at a time, the new length shown before saving. */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.backdrop} onPress={() => (savingHours ? null : setEditing(null))} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHeader}>
            <Pressable onPress={() => setEditing(null)} disabled={savingHours} hitSlop={10}>
              <Text style={styles.sheetCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.sheetTitle}>{editing?.which === 'start' ? 'Shift starts' : 'Shift ends'}</Text>
            {savingHours ? (
              <ActivityIndicator color={C.title} />
            ) : (
              <Pressable onPress={saveHours} hitSlop={10}>
                <Text style={styles.sheetSave}>Save</Text>
              </Pressable>
            )}
          </View>
          {editing ? (
            <TimeWheelPicker
              key={editing.which}
              value={editing.value}
              onChange={(value) => setEditing((e) => (e ? { ...e, value } : e))}
            />
          ) : null}
          {shift ? (
            <Text style={[styles.sheetPreview, pendingStart === pendingEnd && { color: C.danger }]}>
              {pendingStart === pendingEnd
                ? 'Start and end cannot be the same.'
                : `${pendingStart} – ${pendingEnd} · ${shiftLengthLabel(pendingStart, pendingEnd)}${
                    isOvernight(pendingStart, pendingEnd) ? ' · overnight' : ''
                  }`}
            </Text>
          ) : null}
        </View>
      </Modal>

      {shift ? (
        <BreakRuleSheet
          visible={editingRule !== undefined}
          shiftId={shift.id}
          shiftName={shift.name}
          shiftStart={shift.start}
          shiftEnd={shift.end}
          rule={editingRule ?? null}
          onClose={() => setEditingRule(undefined)}
          onSaved={() => {
            setEditingRule(undefined);
            void load();
          }}
        />
      ) : null}

      {shift ? (
        <AddStaffSheet
          visible={adding}
          shift={shift}
          shifts={shifts}
          candidates={roster.filter((m) => m.shiftId !== shift.id)}
          onClose={() => setAdding(false)}
          onAdd={async (people) => {
            setAdding(false);
            await move(people, shift);
          }}
        />
      ) : null}
    </View>
  );
}

/** Everyone not on this shift — search, tick, Add. Shows where each person is now. */
function AddStaffSheet({
  visible,
  shift,
  shifts,
  candidates,
  onClose,
  onAdd,
}: {
  visible: boolean;
  shift: Shift;
  shifts: Shift[];
  candidates: RosterMember[];
  onClose: () => void;
  onAdd: (people: RosterMember[]) => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const shiftName = (id: string | null) => shifts.find((s) => s.id === id)?.name ?? null;

  const q = query.trim().toLowerCase();
  const list = candidates.filter(
    (m) => !q || m.name.toLowerCase().includes(q) || (m.jobTitle ?? '').toLowerCase().includes(q)
  );
  const close = () => {
    setPicked(new Set());
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={[styles.addScreen, { paddingBottom: insets.bottom }]}>
        <View style={styles.sheetHeader}>
          <Pressable onPress={close} hitSlop={10}>
            <Text style={styles.sheetCancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.sheetTitle}>Add to {shift.name}</Text>
          <Pressable
            onPress={() => {
              const people = candidates.filter((m) => picked.has(m.id));
              setPicked(new Set());
              setQuery('');
              onAdd(people);
            }}
            disabled={picked.size === 0}
            hitSlop={10}
          >
            <Text style={[styles.sheetSave, picked.size === 0 && { opacity: 0.35 }]}>
              Add{picked.size > 0 ? ` ${picked.size}` : ''}
            </Text>
          </Pressable>
        </View>
        <View style={[styles.search, { marginHorizontal: 16 }]}>
          <Ionicons name="search" size={16} color={C.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or job"
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <FlatList
          data={list}
          keyExtractor={(m) => m.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          ListEmptyComponent={<Text style={styles.empty}>{q ? 'No one matches that search.' : 'Everyone is already on this shift.'}</Text>}
          renderItem={({ item: m }) => {
            const on = picked.has(m.id);
            const now = shiftName(m.shiftId);
            return (
              <Pressable
                onPress={() =>
                  setPicked((p) => {
                    const next = new Set(p);
                    if (next.has(m.id)) next.delete(m.id);
                    else next.add(m.id);
                    return next;
                  })
                }
                style={({ pressed }) => [styles.person, pressed && styles.personPressed]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
              >
                <Avatar uri={m.avatarUrl ?? undefined} name={m.name} size={38} />
                <View style={styles.personText}>
                  <Text style={styles.personName} numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Text style={styles.personSub} numberOfLines={1}>
                    {[m.jobTitle, now ? `now ${now}` : 'no shift'].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? C.title : '#c3ccd9'} />
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.screen },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.screen },
  content: { paddingHorizontal: 16, paddingTop: 0 },
  emptyTitle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 17, color: C.ink },
  staffHeader: { marginTop: 24, marginBottom: 8, marginHorizontal: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: C.muted,
  },
  link: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 14, color: C.title },
  search: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.divider,
  },
  searchInput: { flex: 1, fontFamily: typography.fontFamily.primary, fontSize: 15, color: C.ink },
  list: {
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.divider,
    overflow: 'hidden',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.divider, marginLeft: 64 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#ffffff' },
  personPressed: { backgroundColor: '#f1f4f9' },
  personText: { flex: 1, minWidth: 0 },
  personName: { fontFamily: typography.fontFamily.primary, fontWeight: '600', fontSize: 16, color: C.ink },
  personSub: { marginTop: 1, fontFamily: typography.fontFamily.primary, fontSize: 13, color: C.muted },
  empty: { padding: 20, textAlign: 'center', fontFamily: typography.fontFamily.primary, fontSize: 14, color: C.muted },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sheetTitle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 17, color: C.ink },
  sheetCancel: { fontFamily: typography.fontFamily.primary, fontSize: 16, color: C.title },
  sheetSave: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 16, color: C.title },
  sheetPreview: { marginTop: 8, textAlign: 'center', fontFamily: typography.fontFamily.primary, fontSize: 14, color: C.muted },
  addScreen: { flex: 1, backgroundColor: '#ffffff' },
  breakChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#fff6e5' },
  breakChipText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 11, color: '#d98a00' },
});
