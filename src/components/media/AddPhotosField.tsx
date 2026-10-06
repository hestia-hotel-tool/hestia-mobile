import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { typography } from '@/theme';
import { DESIGN_WIDTH } from '@/utils/responsive';
import { MAX_PHOTOS } from './photoPicker';

const GAP = 12;

type Props = {
  /** Picked photo URIs, in order. */
  photos: string[];
  /** Open the picker; the caller decides how many more are allowed. */
  onAdd: () => void;
  /** Remove (or ask to remove) the photo at `index`. */
  onRemove: (index: number) => void;
  /** The line under "Add Photo" on the empty card. */
  subtitle?: string;
  /** Required and missing: the dashed outline turns red. */
  error?: boolean;
};

/**
 * "Add Photo" — the photo field the Create Ticket form uses, shared so Lost &
 * Found's Register sheet draws the same thing.
 *
 * Empty, it is one dashed card: the add-photos glyph, "Add Photo" in pink and
 * a line of help. With photos it becomes a grid of tiles, each with a "×",
 * followed by a dashed "Add Photo" tile while more may be added.
 *
 * **Never more than two rows.** Up to four tiles it is two columns of
 * 120-high tiles; past that the columns grow (up to five for 8 photos plus
 * the add tile) and the tiles turn square, so the field keeps its height and
 * the form below it does not get pushed down. The "×", the glyph and the
 * add tile's label scale with the tile.
 *
 * Tiles are sized from the field's own measured width rather than the
 * window's, so the grid fits whatever padding the screen or sheet around it
 * has.
 */
export function AddPhotosField({
  photos,
  onAdd,
  onRemove,
  subtitle = 'Add photos of the item and our AI will do the rest',
  error = false,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const s = (n: number) => (n * windowWidth) / DESIGN_WIDTH;
  const [fieldWidth, setFieldWidth] = useState<number | null>(null);
  const canAdd = photos.length < MAX_PHOTOS;
  const tiles = photos.length + (canAdd ? 1 : 0);
  // Two rows at most: as many columns as that takes, never fewer than two.
  const columns = Math.max(2, Math.ceil(tiles / 2));
  const available = fieldWidth ?? windowWidth - s(48);
  const tileWidth = Math.floor((available - s(GAP) * (columns - 1)) / columns);
  const tileHeight = columns === 2 ? s(120) : tileWidth;
  const tile = { width: tileWidth, height: tileHeight, borderRadius: s(8) };
  // The add tile's glyph and label, and the "×", shrink with the tile.
  const glyph = Math.min(s(40), tileHeight * 0.4);
  const showAddLabel = tileWidth >= s(90);
  const removeSize = Math.min(s(24), tileWidth * 0.3);
  const outline = error ? styles.outlineError : null;

  return (
    <View onLayout={(e) => setFieldWidth(e.nativeEvent.layout.width)}>
      {photos.length === 0 ? (
        <TouchableOpacity
          style={[styles.empty, { paddingVertical: s(32), paddingHorizontal: s(16), borderRadius: s(8) }, outline]}
          onPress={onAdd}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add photos"
        >
          <Image
            source={require('../../../assets/icons/add-photos.png')}
            style={{ width: s(60), height: s(60), marginBottom: s(12) }}
            resizeMode="contain"
          />
          <Text style={[styles.title, { fontSize: s(19), marginBottom: s(8) }]}>Add Photo</Text>
          <Text style={[styles.subtitle, { fontSize: s(13), maxWidth: s(160) }]}>{subtitle}</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.grid, { gap: s(GAP) }]}>
          {photos.map((uri, index) => (
            <View key={`${uri}-${index}`} style={[styles.photo, tile]}>
              <Image source={{ uri }} style={styles.photoImage} />
              <TouchableOpacity
                style={[
                  styles.remove,
                  {
                    top: removeSize / 3,
                    right: removeSize / 3,
                    width: removeSize,
                    height: removeSize,
                    borderRadius: removeSize / 2,
                  },
                ]}
                onPress={() => onRemove(index)}
                activeOpacity={0.7}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${index + 1}`}
              >
                <Text style={[styles.removeText, { fontSize: removeSize * 0.75 }]}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
          {canAdd ? (
            <TouchableOpacity
              style={[styles.addTile, tile, outline]}
              onPress={onAdd}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Add more photos"
            >
              <Image
                source={require('../../../assets/icons/add-photos.png')}
                style={{ width: glyph, height: glyph, marginBottom: showAddLabel ? s(8) : 0 }}
                resizeMode="contain"
              />
              {showAddLabel ? <Text style={[styles.title, { fontSize: s(14) }]}>Add Photo</Text> : null}
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  outlineError: {
    borderColor: '#f92424',
  },
  title: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ff46a3',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photo: {
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  remove: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  addTile: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});

export default AddPhotosField;
