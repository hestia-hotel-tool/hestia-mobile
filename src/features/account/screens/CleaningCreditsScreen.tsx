import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeModal as Modal } from '@/components/ui/SafeModal';
import { useToast } from '@/contexts/ToastContext';
import { typography } from '@/theme';
import { formatMinutesSpan } from '@/utils/formatting';
import { useRoomsStore } from '@features/rooms/store/useRoomsStore';
import { SETTINGS_COLORS as C } from '../components/SettingsList';
import { listRoomCategories, setCategoryCredit, type RoomCategory } from '../services/hotel';

const PRESETS = [30, 45, 60, 75, 90, 120];
const STEP = 5;
const MIN = 5;
const MAX = 600;

const span = (m: number) => formatMinutesSpan(m * 60_000);

/**
 * Settings › Cleaning credits — how long each type of room is expected to
 * take to clean, for `rooms.credits.manage`.
 *
 * A room's credit is what its In Progress countdown runs against ("32 min
 * left", then "8 min late"). Rooms are grouped by category; setting one
 * applies to every room of that category. A category whose rooms differ says
 * so ("45–60 min"), and saving brings them into line.
 */
export default function CleaningCreditsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [categories, setCategories] = useState<RoomCategory[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<RoomCategory | null>(null);

  const load = useCallback(async () => {
    try {
      setCategories(await listRoomCategories());
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Could not load rooms' });
    } finally {
      setRefreshing(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: 'Cleaning credits',
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: C.title,
        headerStyle: { backgroundColor: C.header },
        headerTitleStyle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 18, color: C.title },
        headerShadowVisible: false,
      }}
    />
  );

  if (!categories) {
    return (
      <View style={styles.center}>
        {header}
        <ActivityIndicator color={C.title} />
      </View>
    );
  }

  const totalRooms = categories.reduce((n, c) => n + c.rooms, 0);

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        <Text style={styles.intro}>
          How long each room type should take to clean. When a room is In Progress, its countdown starts from this time.
        </Text>
        <Text style={styles.count}>
          {categories.length} room types · {totalRooms} rooms
        </Text>

        <View style={styles.list}>
          {categories.map((c, i) => {
            const mixed = c.minCredit != null && c.maxCredit != null && c.minCredit !== c.maxCredit;
            return (
              <React.Fragment key={c.category ?? '—'}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  onPress={() => setEditing(c)}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#f1f4f9' }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.category ?? 'No category'}, ${c.rooms} rooms, ${
                    mixed ? `${c.minCredit} to ${c.maxCredit} minutes` : `${c.minCredit ?? 'no'} minutes`
                  }`}
                >
                  <View style={styles.codeTile}>
                    <Text style={styles.code} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                      {c.category ?? '—'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rooms}>
                      {c.rooms} {c.rooms === 1 ? 'room' : 'rooms'}
                    </Text>
                    {mixed ? <Text style={styles.mixed}>Rooms differ</Text> : null}
                  </View>
                  <Text style={[styles.credit, mixed && { color: '#d98a00' }]}>
                    {c.minCredit == null ? 'Not set' : mixed ? `${c.minCredit}–${c.maxCredit} min` : span(c.minCredit)}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#b4bfd0" />
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>

      <CreditSheet
        category={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void load();
        }}
      />
    </View>
  );
}

function CreditSheet({
  category,
  onClose,
  onSaved,
}: {
  category: RoomCategory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (!category) return null;
  return <CreditForm key={category.category ?? '—'} category={category} onClose={onClose} onSaved={onSaved} />;
}

function CreditForm({ category, onClose, onSaved }: { category: RoomCategory; onClose: () => void; onSaved: () => void }) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [minutes, setMinutes] = useState(category.typicalCredit ?? 60);
  const [saving, setSaving] = useState(false);
  const fetchRooms = useRoomsStore((s) => s.fetchRooms);

  const clamp = (n: number) => Math.max(MIN, Math.min(MAX, n));
  const unchanged = category.minCredit === minutes && category.maxCredit === minutes;

  const save = async () => {
    setSaving(true);
    try {
      const changed = await setCategoryCredit(category.category, minutes);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show(
        changed === 0
          ? `${category.category ?? 'These rooms'} already take ${span(minutes)}.`
          : `${changed} ${changed === 1 ? 'room' : 'rooms'} now ${span(minutes)}.`,
        { type: 'success', title: 'Credits saved' }
      );
      // Room cards and countdowns pick up the new credit.
      void fetchRooms(undefined, { force: true });
      onSaved();
    } catch (e) {
      setSaving(false);
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Credits not saved' });
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={() => (saving ? null : onClose())} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.sheetHeader}>
          <Pressable onPress={onClose} disabled={saving} hitSlop={10}>
            <Text style={styles.sheetCancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.sheetTitle}>{category.category ?? 'No category'}</Text>
          <View style={{ width: 52 }} />
        </View>

        <Text style={styles.sheetSub}>
          {category.rooms} {category.rooms === 1 ? 'room' : 'rooms'}
          {category.minCredit != null && category.minCredit !== category.maxCredit
            ? ` · now ${category.minCredit}–${category.maxCredit} min`
            : category.minCredit != null
              ? ` · now ${span(category.minCredit)}`
              : ''}
        </Text>

        <View style={styles.stepper}>
          <Pressable
            onPress={() => setMinutes((m) => clamp(m - STEP))}
            style={({ pressed }) => [styles.stepButton, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={`${STEP} minutes less`}
          >
            <Ionicons name="remove" size={26} color={C.title} />
          </Pressable>
          <View style={styles.stepValue} accessibilityLiveRegion="polite">
            <Text style={styles.stepNumber}>{minutes}</Text>
            <Text style={styles.stepUnit}>minutes · {span(minutes)}</Text>
          </View>
          <Pressable
            onPress={() => setMinutes((m) => clamp(m + STEP))}
            style={({ pressed }) => [styles.stepButton, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={`${STEP} minutes more`}
          >
            <Ionicons name="add" size={26} color={C.title} />
          </Pressable>
        </View>

        <View style={styles.presets}>
          {PRESETS.map((p) => (
            <Pressable
              key={p}
              onPress={() => setMinutes(p)}
              style={[styles.preset, minutes === p && styles.presetSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected: minutes === p }}
            >
              <Text style={[styles.presetText, minutes === p && styles.presetTextSelected]}>{span(p)}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={save}
          disabled={saving || unchanged}
          style={({ pressed }) => [styles.apply, (saving || unchanged || pressed) && { opacity: 0.6 }]}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.applyText}>
              {unchanged ? 'No change' : `Apply to ${category.rooms} ${category.rooms === 1 ? 'room' : 'rooms'}`}
            </Text>
          )}
        </Pressable>
        <Text style={styles.note}>Rooms being cleaned now keep counting; the new time applies to their countdown straight away.</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.screen },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.screen },
  content: { padding: 16 },
  intro: { marginHorizontal: 4, fontFamily: typography.fontFamily.primary, fontSize: 14, lineHeight: 20, color: C.muted },
  count: {
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 6,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: C.muted,
  },
  list: { borderRadius: 14, backgroundColor: C.card, borderWidth: StyleSheet.hairlineWidth, borderColor: C.divider, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.divider, marginLeft: 86 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  codeTile: { width: 60, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.header, paddingHorizontal: 4 },
  code: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 13, color: C.title },
  rooms: { fontFamily: typography.fontFamily.primary, fontSize: 16, color: C.ink },
  mixed: { marginTop: 1, fontFamily: typography.fontFamily.primary, fontSize: 12, color: '#d98a00' },
  credit: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 15, color: C.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  sheetTitle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 17, color: C.ink },
  sheetCancel: { width: 52, fontFamily: typography.fontFamily.primary, fontSize: 16, color: C.title },
  sheetSub: { textAlign: 'center', fontFamily: typography.fontFamily.primary, fontSize: 14, color: C.muted },
  stepper: { marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  stepButton: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: C.header },
  stepValue: { alignItems: 'center', minWidth: 120 },
  stepNumber: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 48, color: C.ink },
  stepUnit: { fontFamily: typography.fontFamily.primary, fontSize: 13, color: C.muted },
  presets: { marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  preset: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(90,117,157,0.25)',
    backgroundColor: '#f9fafc',
  },
  presetSelected: { borderColor: C.title, backgroundColor: C.title },
  presetText: { fontFamily: typography.fontFamily.primary, fontSize: 14, color: C.title },
  presetTextSelected: { fontWeight: '700', color: '#ffffff' },
  apply: { marginTop: 24, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.title },
  applyText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 16, color: '#ffffff' },
  note: { marginTop: 10, textAlign: 'center', fontFamily: typography.fontFamily.primary, fontSize: 12, lineHeight: 17, color: C.muted },
});
