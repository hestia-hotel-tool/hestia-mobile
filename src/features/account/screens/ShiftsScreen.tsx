import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/contexts/ToastContext';
import { useNow } from '@/hooks/useNow';
import { typography } from '@/theme';
import { SETTINGS_COLORS as C } from '../components/SettingsList';
import { listRoster, listShifts, type RosterMember, type Shift } from '../services/shifts';
import { isOvernight, shiftLengthLabel, shiftNow } from '../utils/shiftClock';

/** The id the "no shift" group is opened with. */
export const NO_SHIFT_ID = 'none';

/**
 * Settings › Shifts — the hotel's shifts, for staff managers. Each card shows
 * the hours, how long the shift is, whether it is running now, and who is on
 * it; tap one to change its hours or its people. Staff on no shift get their
 * own card, so nobody is left out of the roster unseen.
 */
export default function ShiftsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const now = useNow();
  const [shifts, setShifts] = useState<Shift[] | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([listShifts(), listRoster()]);
      setShifts(s);
      setRoster(r);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Could not load shifts' });
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
        title: 'Shifts',
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: C.title,
        headerStyle: { backgroundColor: C.header },
        headerTitleStyle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 18, color: C.title },
        headerShadowVisible: false,
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

  const unassigned = roster.filter((m) => !m.shiftId || !shifts.some((s) => s.id === m.shiftId));

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
          Set each shift’s hours and who works it. Staff see their shift on their profile.
        </Text>

        {shifts.map((shift) => {
          const members = roster.filter((m) => m.shiftId === shift.id);
          const status = shiftNow(shift.start, shift.end, new Date(now));
          return (
            <Pressable
              key={shift.id}
              onPress={() => router.push({ pathname: '/settings/shifts/[id]', params: { id: shift.id } })}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${shift.name} shift, ${shift.start} to ${shift.end}, ${members.length} staff`}
            >
              <View style={styles.cardTop}>
                <View style={styles.nameBadge}>
                  <Text style={styles.nameBadgeText}>{shift.name}</Text>
                </View>
                {status.state === 'on' ? (
                  <View style={styles.liveChip}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Now</Text>
                  </View>
                ) : null}
                <View style={{ flex: 1 }} />
                <Ionicons name="chevron-forward" size={18} color="#b4bfd0" />
              </View>
              <Text style={styles.hours}>
                {shift.start} – {shift.end}
                {isOvernight(shift.start, shift.end) ? <Text style={styles.nextDay}>  +1 day</Text> : null}
              </Text>
              <View style={styles.cardBottom}>
                <Text style={styles.meta}>
                  {shiftLengthLabel(shift.start, shift.end)} · {members.length} {members.length === 1 ? 'person' : 'people'}
                </Text>
                <AvatarStack members={members} />
              </View>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => router.push({ pathname: '/settings/shifts/[id]', params: { id: NO_SHIFT_ID } })}
          style={({ pressed }) => [styles.card, styles.cardMuted, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <View style={styles.cardTop}>
            <Ionicons name="person-remove-outline" size={18} color={C.muted} />
            <Text style={styles.mutedTitle}>Not on a shift</Text>
            <View style={{ flex: 1 }} />
            <Text style={styles.meta}>{unassigned.length}</Text>
            <Ionicons name="chevron-forward" size={18} color="#b4bfd0" />
          </View>
          {unassigned.length > 0 ? (
            <Text style={styles.mutedBody}>
              These staff are not rostered, so they do not show under AM or PM when rooms are assigned.
            </Text>
          ) : null}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function AvatarStack({ members }: { members: RosterMember[] }) {
  const shown = members.slice(0, 5);
  const extra = members.length - shown.length;
  if (members.length === 0) return <Text style={styles.meta}>No one yet</Text>;
  return (
    <View style={styles.stack}>
      {shown.map((m, i) => (
        <View key={m.id} style={[styles.stackItem, { marginLeft: i === 0 ? 0 : -6 }]}>
          <Avatar uri={m.avatarUrl ?? undefined} name={m.name} size={28} />
        </View>
      ))}
      {extra > 0 ? (
        <View style={[styles.stackItem, styles.stackMore]}>
          <Text style={styles.stackMoreText}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.screen },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.screen },
  content: { padding: 16 },
  intro: { marginBottom: 4, marginHorizontal: 4, fontFamily: typography.fontFamily.primary, fontSize: 14, lineHeight: 20, color: C.muted },
  pressed: { opacity: 0.8 },
  card: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.divider,
  },
  cardMuted: { backgroundColor: '#fafbfd' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: C.title },
  nameBadgeText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 13, color: '#ffffff', letterSpacing: 0.4 },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#e6f7ee',
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#39b36b' },
  liveText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 12, color: '#2a8a52' },
  hours: { marginTop: 10, fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 26, color: C.ink },
  nextDay: { fontWeight: '400', fontSize: 14, color: C.muted },
  cardBottom: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { fontFamily: typography.fontFamily.primary, fontSize: 14, color: C.muted },
  mutedTitle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 16, color: C.ink },
  mutedBody: { marginTop: 8, fontFamily: typography.fontFamily.primary, fontSize: 13, lineHeight: 18, color: C.muted },
  stack: { flexDirection: 'row', alignItems: 'center' },
  stackItem: { borderRadius: 16, borderWidth: 2, borderColor: '#ffffff' },
  stackMore: {
    marginLeft: -6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.header,
  },
  stackMoreText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 11, color: C.title },
});
