import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeModal as Modal } from '@/components/ui/SafeModal';
import { useToast } from '@/contexts/ToastContext';
import { typography } from '@/theme';
import { SETTINGS_COLORS as C } from '@features/account/components/SettingsList';
import { useAssistantScreen, type ScreenFact } from '@features/ai-agent/screenContext';
import {
  fetchStorageLocations,
  removeStorageLocation,
  reorderStorageLocations,
  saveStorageLocation,
  type StorageLocation,
} from '../services/storageLocations';

/**
 * Account › Lost & Found storage — the places a found item can be kept, as
 * the Register form's Stored Location dropdown offers them (migration
 * 20261026300000). For lost_and_found.manage.
 *
 * Tap a location to rename it, move it up or down, or remove it. Removing one
 * that items are stored in retires it: it leaves the dropdown, those items
 * keep its name, and it can be restored from the Retired list.
 */
export default function StorageLocationsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [all, setAll] = useState<StorageLocation[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  /** The name sheet: adding (id null) or renaming. */
  const [editing, setEditing] = useState<{ id: string | null; label: string } | null>(null);

  const active = useMemo(() => (all ?? []).filter((l) => l.active), [all]);
  const retired = useMemo(() => (all ?? []).filter((l) => !l.active), [all]);

  const assistantFacts = useMemo<ScreenFact[]>(
    () => [
      { label: 'Storage locations (dropdown order)', value: active.map((l) => l.label).join(', ') || 'none' },
      ...(retired.length ? [{ label: 'Retired', value: retired.map((l) => l.label).join(', ') }] : []),
    ],
    [active, retired]
  );
  useAssistantScreen('Lost & Found storage', assistantFacts);

  const load = useCallback(async () => {
    try {
      setAll(await fetchStorageLocations({ force: true }));
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Could not load' });
    } finally {
      setRefreshing(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const run = async (work: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      await work();
      if (done) toast.show(done, { type: 'success' });
      await load();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Not saved' });
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, by: -1 | 1) => {
    const ids = active.map((l) => l.id);
    const to = index + by;
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to], ids[index]];
    void run(() => reorderStorageLocations(ids));
  };

  const remove = (loc: StorageLocation) =>
    Alert.alert(`Remove "${loc.label}"?`, 'It will no longer be offered when registering an item. Items already stored there keep its name.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          void run(async () => {
            const result = await removeStorageLocation(loc.id);
            toast.show(result === 'retired' ? `"${loc.label}" retired — items stored there keep it` : `"${loc.label}" removed`, {
              type: 'success',
            });
          }),
      },
    ]);

  const openActions = (loc: StorageLocation, index: number) => {
    const options = [
      { label: 'Rename', run: () => setEditing({ id: loc.id, label: loc.label }) },
      ...(index > 0 ? [{ label: 'Move up', run: () => move(index, -1) }] : []),
      ...(index < active.length - 1 ? [{ label: 'Move down', run: () => move(index, 1) }] : []),
      { label: 'Remove', run: () => remove(loc), destructive: true },
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: loc.label,
          options: [...options.map((o) => o.label), 'Cancel'],
          destructiveButtonIndex: options.findIndex((o) => o.destructive),
          cancelButtonIndex: options.length,
        },
        (i) => options[i]?.run()
      );
      return;
    }
    Alert.alert(loc.label, undefined, [
      ...options.map((o) => ({ text: o.label, style: o.destructive ? ('destructive' as const) : ('default' as const), onPress: o.run })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: 'Lost & Found storage',
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: C.title,
        headerStyle: { backgroundColor: C.header },
        headerTitleStyle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 18, color: C.title },
        headerShadowVisible: false,
      }}
    />
  );

  if (!all) {
    return (
      <View style={[styles.screen, styles.center]}>
        {header}
        <ActivityIndicator color={C.title} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        <Text style={styles.intro}>
          Where found items are kept — the choices in Stored Location when an item is registered, in this order.
        </Text>

        <Text style={styles.sectionTitle}>Locations</Text>
        <View style={styles.card}>
          {active.map((loc, i) => (
            <React.Fragment key={loc.id}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <Pressable
                onPress={() => openActions(loc, i)}
                disabled={busy}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                accessibilityRole="button"
                accessibilityHint="Rename, reorder or remove"
              >
                <Ionicons name="location-outline" size={20} color={C.title} />
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {loc.label}
                </Text>
                <Ionicons name="ellipsis-horizontal" size={18} color="#9aa7bd" />
              </Pressable>
            </React.Fragment>
          ))}
          <View style={styles.divider} />
          <Pressable
            onPress={() => setEditing({ id: null, label: '' })}
            disabled={busy}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            accessibilityRole="button"
          >
            <Ionicons name="add-circle-outline" size={20} color={C.title} />
            <Text style={[styles.rowLabel, { color: C.title, fontWeight: '600' }]}>Add location</Text>
          </Pressable>
        </View>

        {retired.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Retired</Text>
            <View style={styles.card}>
              {retired.map((loc, i) => (
                <React.Fragment key={loc.id}>
                  {i > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.row}>
                    <Ionicons name="archive-outline" size={20} color="#9aa7bd" />
                    <Text style={[styles.rowLabel, { color: C.muted }]} numberOfLines={1}>
                      {loc.label}
                    </Text>
                    <Pressable
                      onPress={() => void run(() => saveStorageLocation(loc.id, loc.label), `"${loc.label}" restored`)}
                      disabled={busy}
                      hitSlop={8}
                      accessibilityRole="button"
                    >
                      <Text style={styles.link}>Restore</Text>
                    </Pressable>
                  </View>
                </React.Fragment>
              ))}
            </View>
            <Text style={styles.footer}>Retired locations still name the items stored in them.</Text>
          </>
        ) : null}
      </ScrollView>

      <NameSheet
        value={editing}
        busy={busy}
        onCancel={() => setEditing(null)}
        onSave={(label) => {
          const target = editing;
          setEditing(null);
          if (!target) return;
          void run(() => saveStorageLocation(target.id, label), target.id ? 'Location renamed' : 'Location added');
        }}
      />
    </View>
  );
}

/** Add or rename: one field, cross-platform (Alert.prompt is iOS-only). */
function NameSheet({
  value,
  busy,
  onCancel,
  onSave,
}: {
  value: { id: string | null; label: string } | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (label: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  useEffect(() => {
    if (value) setText(value.label);
  }, [value]);
  const trimmed = text.trim();
  return (
    <Modal visible={!!value} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.sheetTitle}>{value?.id ? 'Rename location' : 'New location'}</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="e.g. Concierge desk"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          maxLength={60}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => trimmed && onSave(trimmed)}
        />
        <View style={styles.sheetButtons}>
          <Pressable onPress={onCancel} style={styles.secondary} accessibilityRole="button">
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => onSave(trimmed)}
            disabled={!trimmed || busy}
            style={[styles.primary, (!trimmed || busy) && { opacity: 0.5 }]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.screen },
  center: { alignItems: 'center', justifyContent: 'center' },
  intro: { fontFamily: typography.fontFamily.primary, fontSize: 14, color: C.muted, marginHorizontal: 6, marginBottom: 8 },
  sectionTitle: {
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
  card: { borderRadius: 14, backgroundColor: C.card, borderWidth: StyleSheet.hairlineWidth, borderColor: C.divider, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  rowPressed: { backgroundColor: '#f1f4f9' },
  rowLabel: { flex: 1, fontFamily: typography.fontFamily.primary, fontSize: 16, color: C.ink },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.divider, marginLeft: 46 },
  link: { fontFamily: typography.fontFamily.primary, fontWeight: '600', fontSize: 14, color: C.title },
  footer: { marginTop: 8, marginHorizontal: 6, fontFamily: typography.fontFamily.primary, fontSize: 13, color: C.muted },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20 },
  sheetTitle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 18, color: C.ink, marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#d8dfea',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: typography.fontFamily.primary,
    fontSize: 16,
    color: C.ink,
  },
  sheetButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 18 },
  secondary: { paddingHorizontal: 18, paddingVertical: 11 },
  secondaryText: { fontFamily: typography.fontFamily.primary, fontWeight: '600', fontSize: 15, color: C.muted },
  primary: { paddingHorizontal: 22, paddingVertical: 11, borderRadius: 22, backgroundColor: C.title },
  primaryText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 15, color: '#ffffff' },
});
