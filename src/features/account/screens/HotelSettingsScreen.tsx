import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeKeyboardAvoidingView as KeyboardAvoidingView } from '@/components/ui/SafeKeyboardAvoidingView';
import { SafeModal as Modal } from '@/components/ui/SafeModal';
import { useToast } from '@/contexts/ToastContext';
import { useNow } from '@/hooks/useNow';
import { typography } from '@/theme';
import { SettingsRow, SettingsSection, SETTINGS_COLORS as C } from '../components/SettingsList';
import { fetchHotelSettings, updateHotelServiceRules, updateHotelSettings, type HotelSettings } from '../services/hotel';
import { TimeWheelPicker } from '@/components/ui/TimeWheelPicker';
import { formatMinutesSpan } from '@/utils/formatting';
import { TIME_ZONES, timeInZone, timeZoneCity } from '../utils/timeZones';

/**
 * Settings › Hotel — the hotel's name and time zone, for `settings.manage`.
 *
 * The time zone is the one the server writes times in (the "Return at 14:30"
 * in notifications), so the picker shows the time now in each zone: the right
 * one is the one showing the hotel's clock.
 */
export default function HotelSettingsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const navigation = useNavigation();
  const now = useNow();
  const [original, setOriginal] = useState<HotelSettings | null>(null);
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [recheck, setRecheck] = useState(60);
  const [cutoff, setCutoff] = useState('14:00');
  const [editingCutoff, setEditingCutoff] = useState(false);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const seeded = useRef(false);

  const load = useCallback(async () => {
    try {
      const h = await fetchHotelSettings();
      if (!h) return;
      setOriginal(h);
      // Seed the form once; a later reload must not wipe edits in progress.
      if (!seeded.current) {
        seeded.current = true;
        setName(h.name);
        setTimezone(h.timezone);
        setRecheck(h.dndRecheckMinutes);
        setCutoff(h.dndCutoff);
      }
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Could not load hotel' });
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const hotelDirty = !!original && (name.trim() !== original.name || timezone !== original.timezone);
  const rulesDirty = !!original && (recheck !== original.dndRecheckMinutes || cutoff !== original.dndCutoff);
  const dirty = hotelDirty || rulesDirty;
  const nameError = name.trim().length === 0 ? 'The hotel needs a name.' : null;
  const canSave = dirty && !nameError && !saving;

  const guardLeave = dirty && !saving;
  useEffect(() => {
    if (!guardLeave) return;
    return navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      Alert.alert('Discard changes?', 'Your changes to the hotel settings will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
  }, [navigation, guardLeave]);

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (hotelDirty) await updateHotelSettings(name.trim(), timezone);
      if (rulesDirty) await updateHotelServiceRules(recheck, cutoff);
      setOriginal((o) => (o ? { ...o, name: name.trim(), timezone, dndRecheckMinutes: recheck, dndCutoff: cutoff } : o));
      setEditingCutoff(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show('Hotel settings saved.', { type: 'success', title: 'Saved' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Not saved' });
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: 'Hotel',
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: C.title,
        headerStyle: { backgroundColor: C.header },
        headerTitleStyle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 18, color: C.title },
        headerShadowVisible: false,
        headerRight: () =>
          saving ? (
            <ActivityIndicator color={C.title} />
          ) : dirty ? (
            <Pressable onPress={save} disabled={!canSave} hitSlop={10} accessibilityRole="button">
              <Text style={[styles.headerSave, !canSave && { opacity: 0.35 }]}>Save</Text>
            </Pressable>
          ) : null,
      }}
    />
  );

  if (!original) {
    return (
      <View style={styles.center}>
        {header}
        <ActivityIndicator color={C.title} />
      </View>
    );
  }

  const clock = timeInZone(timezone, new Date(now));

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <SettingsSection title="Hotel name" footer="Shown on Settings and My Profile for everyone at the hotel.">
          <View style={styles.field}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Hotel name"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              maxLength={80}
              autoCapitalize="words"
              returnKeyType="done"
            />
            {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
          </View>
        </SettingsSection>

        <SettingsSection
          title="Time zone"
          footer="Times in notifications — return-later, promise and overdue times — are written in this time zone."
        >
          <SettingsRow
            icon="globe-outline"
            label={timeZoneCity(timezone)}
            detail={clock ? `${timezone} · ${clock} now` : timezone}
            onPress={() => setPicking(true)}
          />
        </SettingsSection>

        <SettingsSection
          title="Do Not Disturb"
          footer={`Staff are reminded to check a DND door every ${formatMinutesSpan(recheck * 60_000)}. A room still on DND at ${cutoff} (hotel time) sends supervisors a welfare-check alert.`}
        >
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Check the door every</Text>
            <View style={styles.chips}>
              {[30, 45, 60, 90, 120].map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setRecheck(m)}
                  style={[styles.chip, recheck === m && styles.chipSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: recheck === m }}
                >
                  <Text style={[styles.chipText, recheck === m && styles.chipTextSelected]}>{formatMinutesSpan(m * 60_000)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Welfare check after"
            value={cutoff}
            onPress={() => setEditingCutoff((v) => !v)}
          />
          {editingCutoff ? <TimeWheelPicker value={cutoff} onChange={setCutoff} minuteStep={15} /> : null}
        </SettingsSection>

        {dirty ? (
          <Pressable
            onPress={save}
            disabled={!canSave}
            style={({ pressed }) => [styles.saveButton, (!canSave || pressed) && { opacity: 0.6 }]}
            accessibilityRole="button"
          >
            {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveButtonText}>Save changes</Text>}
          </Pressable>
        ) : null}
      </ScrollView>

      <TimeZonePicker
        visible={picking}
        value={timezone}
        now={now}
        onClose={() => setPicking(false)}
        onPick={(z) => {
          setTimezone(z);
          setPicking(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

function TimeZonePicker({
  visible,
  value,
  now,
  onClose,
  onPick,
}: {
  visible: boolean;
  value: string;
  now: number;
  onClose: () => void;
  onPick: (zone: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TIME_ZONES.map((g) => ({
      title: g.region,
      data: g.zones.filter((z) => !q || z.toLowerCase().includes(q) || timeZoneCity(z).toLowerCase().includes(q)),
    })).filter((s) => s.data.length > 0);
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.pickScreen, { paddingBottom: insets.bottom }]}>
        <View style={styles.pickHeader}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.pickCancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.pickTitle}>Time zone</Text>
          <View style={{ width: 52 }} />
        </View>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={C.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search city or region"
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        <SectionList
          sections={sections}
          keyExtractor={(z) => z}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => <Text style={styles.pickSection}>{section.title}</Text>}
          ListEmptyComponent={<Text style={styles.empty}>No time zone matches “{query}”.</Text>}
          renderItem={({ item }) => {
            const selected = item === value;
            return (
              <Pressable
                onPress={() => onPick(item)}
                style={({ pressed }) => [styles.zone, pressed && { backgroundColor: '#f1f4f9' }]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.zoneCity, selected && { color: C.title, fontWeight: '700' }]}>{timeZoneCity(item)}</Text>
                  <Text style={styles.zoneId}>{item}</Text>
                </View>
                <Text style={styles.zoneTime}>{timeInZone(item, new Date(now))}</Text>
                {selected ? <Ionicons name="checkmark" size={20} color={C.title} /> : <View style={{ width: 20 }} />}
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
  headerSave: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 16, color: C.title },
  field: { padding: 14 },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(90,117,157,0.25)',
    backgroundColor: '#f9fafc',
    fontFamily: typography.fontFamily.primary,
    fontSize: 16,
    color: C.ink,
  },
  error: { marginTop: 6, fontFamily: typography.fontFamily.primary, fontSize: 12, color: C.danger },
  fieldLabel: {
    fontFamily: typography.fontFamily.primary,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: C.muted,
  },
  chips: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(90,117,157,0.25)',
    backgroundColor: '#f9fafc',
  },
  chipSelected: { borderColor: C.title, backgroundColor: C.title },
  chipText: { fontFamily: typography.fontFamily.primary, fontSize: 14, color: C.title },
  chipTextSelected: { fontWeight: '700', color: '#ffffff' },
  saveButton: { marginTop: 24, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.title },
  saveButtonText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 16, color: '#ffffff' },
  pickScreen: { flex: 1, backgroundColor: '#ffffff' },
  pickHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  pickTitle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 17, color: C.ink },
  pickCancel: { width: 52, fontFamily: typography.fontFamily.primary, fontSize: 16, color: C.title },
  search: {
    marginHorizontal: 16,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#f1f4f9',
  },
  searchInput: { flex: 1, fontFamily: typography.fontFamily.primary, fontSize: 15, color: C.ink },
  pickSection: {
    marginTop: 18,
    marginBottom: 4,
    marginHorizontal: 20,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: C.muted,
  },
  zone: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 11 },
  zoneCity: { fontFamily: typography.fontFamily.primary, fontSize: 16, color: C.ink },
  zoneId: { marginTop: 1, fontFamily: typography.fontFamily.primary, fontSize: 12, color: C.muted },
  zoneTime: { fontFamily: typography.fontFamily.primary, fontWeight: '600', fontSize: 15, color: C.muted },
  empty: { padding: 24, textAlign: 'center', fontFamily: typography.fontFamily.primary, fontSize: 14, color: C.muted },
});
