import React, { useEffect, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeKeyboardAvoidingView as KeyboardAvoidingView } from '@/components/ui/SafeKeyboardAvoidingView';
import { KeyboardDoneBar, KEYBOARD_DONE_BAR_ID } from '@/components/ui/KeyboardDoneBar';
import { useToast } from '@/contexts/ToastContext';
import { typography } from '@/theme';
import {
  fetchLostAndFoundItemDetail,
  removeLostAndFoundPhotos,
  updateLostAndFoundItem,
  uploadLostAndFoundPhotos,
} from '../services/lostAndFound';
import { MAX_ITEM_PHOTOS, pickItemPhotos } from '../utils/photoPicker';
import { STORED_LOCATIONS } from '../utils/storedLocations';

const C = {
  title: '#5a759d',
  ink: '#1e1e1e',
  muted: '#6b7a90',
  field: '#f9fafc',
  border: 'rgba(90,117,157,0.25)',
  accent: '#ff46a3',
  danger: '#e5484d',
} as const;

/** A photo on the form: already stored (`remote`), or just picked. */
type Photo = { uri: string; remote: boolean };

type Form = { itemName: string; description: string; storageLocation: string; photos: Photo[] };

const GRID_GAP = 10;
const COLUMNS = 3;

/**
 * Edit a lost & found item — its title, notes, where it is kept, and its
 * photos (add from the library or camera, remove, or make one the cover).
 *
 * Opened as a sheet from the item's detail screen. Only managers reach it
 * (route gated on `lost_and_found.manage`, and the database refuses edits from
 * anyone else). Leaving with unsaved changes asks first.
 */
export default function LostAndFoundEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - 40 - GRID_GAP * (COLUMNS - 1)) / COLUMNS);

  const [original, setOriginal] = useState<Form | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const item = id ? await fetchLostAndFoundItemDetail(id) : null;
        if (cancelled) return;
        if (!item) {
          toast.show('This item is no longer here.', { type: 'error' });
          router.back();
          return;
        }
        const initial: Form = {
          itemName: item.itemName,
          description: item.description ?? '',
          storageLocation: item.storageLocation ?? '',
          photos: item.photos.map((uri) => ({ uri, remote: true })),
        };
        setOriginal(initial);
        setForm(initial);
      } catch (e) {
        if (!cancelled) {
          toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Could not load item' });
          router.back();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, toast]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(original), [form, original]);
  const canSave = !!form && form.itemName.trim().length > 0 && dirty && !saving;

  const update = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const addPhotos = async (source: 'library' | 'camera') => {
    if (!form) return;
    const result = await pickItemPhotos(source, MAX_ITEM_PHOTOS - form.photos.length);
    if ('error' in result) {
      toast.show(result.error, { type: 'error', title: 'Photos' });
      return;
    }
    if (result.uris.length > 0) {
      update({ photos: [...form.photos, ...result.uris.map((uri) => ({ uri, remote: false }))].slice(0, MAX_ITEM_PHOTOS) });
    }
  };

  const chooseSource = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Take Photo', 'Choose from Library', 'Cancel'], cancelButtonIndex: 2 },
        (i) => {
          if (i === 0) void addPhotos('camera');
          if (i === 1) void addPhotos('library');
        }
      );
    } else {
      Alert.alert('Add photos', undefined, [
        { text: 'Take Photo', onPress: () => void addPhotos('camera') },
        { text: 'Choose from Library', onPress: () => void addPhotos('library') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const photoActions = (index: number) => {
    if (!form) return;
    const remove = () => update({ photos: form.photos.filter((_, i) => i !== index) });
    const makeCover = () => {
      const next = [...form.photos];
      const [p] = next.splice(index, 1);
      update({ photos: [p, ...next] });
    };
    const isCover = index === 0;
    if (Platform.OS === 'ios') {
      const options = isCover ? ['Remove Photo', 'Cancel'] : ['Make Cover Photo', 'Remove Photo', 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: options.length - 2 },
        (i) => {
          if (options[i] === 'Remove Photo') remove();
          if (options[i] === 'Make Cover Photo') makeCover();
        }
      );
    } else {
      Alert.alert('Photo', undefined, [
        ...(isCover ? [] : [{ text: 'Make cover photo', onPress: makeCover }]),
        { text: 'Remove photo', style: 'destructive' as const, onPress: remove },
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const cancel = () => {
    if (!dirty) return router.back();
    Alert.alert('Discard changes?', 'Your edits to this item will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const save = async () => {
    if (!form || !original || !id || !canSave) return;
    setSaving(true);
    try {
      // Upload the new photos, then write the list in the order on screen.
      const fresh = form.photos.filter((p) => !p.remote).map((p) => p.uri);
      const uploaded = await uploadLostAndFoundPhotos(fresh);
      let next = 0;
      const photoUrls = form.photos.map((p) => (p.remote ? p.uri : uploaded[next++]));

      await updateLostAndFoundItem(id, {
        itemName: form.itemName,
        description: form.description,
        storageLocation: form.storageLocation,
        photoUrls,
      });

      // Only after the row no longer points at them.
      const kept = new Set(photoUrls);
      void removeLostAndFoundPhotos(original.photos.filter((p) => !kept.has(p.uri)).map((p) => p.uri));

      toast.show('Changes saved.', { type: 'success', title: 'Item updated' });
      router.back();
    } catch (e) {
      setSaving(false);
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Item not saved' });
    }
  };

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: 'Edit Item',
        headerTintColor: C.title,
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 17, color: C.ink },
        headerShadowVisible: false,
        gestureEnabled: !dirty,
        headerLeft: () => (
          <Pressable onPress={cancel} hitSlop={10} accessibilityRole="button">
            <Text style={styles.headerCancel}>Cancel</Text>
          </Pressable>
        ),
        headerRight: () =>
          saving ? (
            <ActivityIndicator color={C.title} />
          ) : (
            <Pressable onPress={save} disabled={!canSave} hitSlop={10} accessibilityRole="button">
              <Text style={[styles.headerSave, !canSave && styles.headerSaveDisabled]}>Save</Text>
            </Pressable>
          ),
      }}
    />
  );

  if (!form) {
    return (
      <View style={styles.center}>
        {header}
        <ActivityIndicator color={C.title} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <View style={styles.photosHeader}>
          <Text style={styles.label}>Photos</Text>
          <Text style={styles.count}>
            {form.photos.length} / {MAX_ITEM_PHOTOS}
          </Text>
        </View>
        <View style={styles.grid}>
          {form.photos.map((p, i) => (
            <Pressable
              key={`${i}-${p.uri}`}
              onPress={() => photoActions(i)}
              style={[styles.tile, { width: tile, height: tile }]}
              accessibilityRole="button"
              accessibilityLabel={`${i === 0 ? 'Cover photo' : `Photo ${i + 1}`}. Double tap for options.`}
            >
              <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} />
              {i === 0 ? (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverText}>Cover</Text>
                </View>
              ) : null}
              <Pressable
                onPress={() => update({ photos: form.photos.filter((_, j) => j !== i) })}
                hitSlop={8}
                style={styles.remove}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
              >
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </Pressable>
          ))}
          {form.photos.length < MAX_ITEM_PHOTOS ? (
            <Pressable
              onPress={chooseSource}
              style={[styles.tile, styles.addTile, { width: tile, height: tile }]}
              accessibilityRole="button"
              accessibilityLabel="Add photos"
            >
              <Text style={styles.addPlus}>+</Text>
              <Text style={styles.addText}>Add</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.hint}>Tap a photo to make it the cover or remove it.</Text>

        <Text style={[styles.label, styles.gap]}>Title</Text>
        <TextInput
          value={form.itemName}
          onChangeText={(itemName) => update({ itemName })}
          placeholder="e.g. Wrist Watch"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          maxLength={80}
          returnKeyType="next"
        />
        {form.itemName.trim().length === 0 ? <Text style={styles.error}>A title is required.</Text> : null}

        <Text style={[styles.label, styles.gap]}>Stored location</Text>
        {/* The same four places the register form offers (the column holds their keys). */}
        <View style={styles.chips}>
          {STORED_LOCATIONS.map((o) => {
            const selected = form.storageLocation === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => update({ storageLocation: o.value })}
                style={[styles.chip, selected && styles.chipSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, styles.gap]}>Notes</Text>
        <TextInput
          value={form.description}
          onChangeText={(description) => update({ description })}
          placeholder="Where exactly it was found, what it looks like…"
          placeholderTextColor="#9ca3af"
          style={[styles.input, styles.notes]}
          multiline
          inputAccessoryViewID={KEYBOARD_DONE_BAR_ID}
          textAlignVertical="top"
          maxLength={1000}
        />
        <KeyboardDoneBar />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  content: { padding: 20 },
  headerCancel: { fontFamily: typography.fontFamily.primary, fontSize: 16, color: C.title },
  headerSave: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 16, color: C.title },
  headerSaveDisabled: { opacity: 0.35 },
  photosHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 14, color: C.ink },
  count: { fontFamily: typography.fontFamily.primary, fontSize: 13, color: C.muted },
  gap: { marginTop: 22 },
  grid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  tile: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#eef2f8' },
  coverBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  coverText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 11, color: '#ffffff' },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  removeText: { fontSize: 12, color: '#ffffff' },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(90,117,157,0.5)',
    backgroundColor: C.field,
  },
  addPlus: { fontFamily: typography.fontFamily.primary, fontWeight: '300', fontSize: 34, lineHeight: 38, color: '#39d47f' },
  addText: { fontFamily: typography.fontFamily.primary, fontSize: 13, color: C.title },
  hint: { marginTop: 8, fontFamily: typography.fontFamily.primary, fontSize: 12, color: C.muted },
  input: {
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.field,
    fontFamily: typography.fontFamily.primary,
    fontSize: 16,
    color: C.ink,
  },
  notes: { minHeight: 120 },
  chips: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.field,
  },
  chipSelected: { borderColor: C.title, backgroundColor: C.title },
  chipText: { fontFamily: typography.fontFamily.primary, fontSize: 14, color: C.title },
  chipTextSelected: { fontWeight: '700', color: '#ffffff' },
  error: { marginTop: 6, fontFamily: typography.fontFamily.primary, fontSize: 12, color: C.danger },
});
