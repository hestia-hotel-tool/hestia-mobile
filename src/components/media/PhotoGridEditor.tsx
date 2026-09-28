import React from 'react';
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useToast } from '@/contexts/ToastContext';
import { typography } from '@/theme';
import { MAX_PHOTOS, pickPhotos } from './photoPicker';

/** A photo on a form: already stored (`remote`), or just picked on the device. */
export type EditablePhoto = { uri: string; remote: boolean };

type Props = {
  photos: EditablePhoto[];
  onChange: (photos: EditablePhoto[]) => void;
  /** Horizontal padding of the screen the grid sits in, to size the tiles. */
  gutter?: number;
};

const GRID_GAP = 10;
const COLUMNS = 3;

const C = {
  title: '#5a759d',
  ink: '#1e1e1e',
  muted: '#6b7a90',
  field: '#f9fafc',
} as const;

/**
 * The photo section of an edit form: a 3-column grid with a Cover badge on the
 * first, "×" to remove, tap for Make cover / Remove, and an Add tile (camera or
 * library) until MAX_PHOTOS. Used by the lost & found and ticket edit sheets.
 */
export function PhotoGridEditor({ photos, onChange, gutter = 20 }: Props) {
  const toast = useToast();
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - gutter * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS);

  const addPhotos = async (source: 'library' | 'camera') => {
    const result = await pickPhotos(source, MAX_PHOTOS - photos.length);
    if ('error' in result) {
      toast.show(result.error, { type: 'error', title: 'Photos' });
      return;
    }
    if (result.uris.length > 0) {
      onChange([...photos, ...result.uris.map((uri) => ({ uri, remote: false }))].slice(0, MAX_PHOTOS));
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

  const remove = (index: number) => onChange(photos.filter((_, i) => i !== index));

  const photoActions = (index: number) => {
    const makeCover = () => {
      const next = [...photos];
      const [p] = next.splice(index, 1);
      onChange([p, ...next]);
    };
    const isCover = index === 0;
    if (Platform.OS === 'ios') {
      const options = isCover ? ['Remove Photo', 'Cancel'] : ['Make Cover Photo', 'Remove Photo', 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: options.length - 2 },
        (i) => {
          if (options[i] === 'Remove Photo') remove(index);
          if (options[i] === 'Make Cover Photo') makeCover();
        }
      );
    } else {
      Alert.alert('Photo', undefined, [
        ...(isCover ? [] : [{ text: 'Make cover photo', onPress: makeCover }]),
        { text: 'Remove photo', style: 'destructive' as const, onPress: () => remove(index) },
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.label}>Photos</Text>
        <Text style={styles.count}>
          {photos.length} / {MAX_PHOTOS}
        </Text>
      </View>
      <View style={styles.grid}>
        {photos.map((p, i) => (
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
              onPress={() => remove(i)}
              hitSlop={8}
              style={styles.remove}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <Text style={styles.removeText}>✕</Text>
            </Pressable>
          </Pressable>
        ))}
        {photos.length < MAX_PHOTOS ? (
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
      {photos.length > 0 ? <Text style={styles.hint}>Tap a photo to make it the cover or remove it.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 14, color: C.ink },
  count: { fontFamily: typography.fontFamily.primary, fontSize: 13, color: C.muted },
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
});

export default PhotoGridEditor;
