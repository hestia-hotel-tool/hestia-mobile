import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { Icon, type IconName } from '@/components/Icon';
import { typography } from '@/theme';
import { PhotoViewer } from './PhotoViewer';

type Props = {
  photos: string[];
  /** The mark on the empty state. */
  emptyIcon?: IconName;
  /** Shown when there are no photos and the reader may add some. */
  onAddPhotos?: () => void;
};

/** 4:3 — how phone cameras shoot, so a photo fills the frame uncropped-ish. */
const ASPECT = 3 / 4;

/**
 * A record's photos (a lost & found item, a ticket), full width and swipeable, with a "2 / 5" counter and page
 * dots. Tapping one opens it full screen (PhotoViewer).
 */
export function PhotoGallery({ photos, emptyIcon = 'action-add-photo', onAddPhotos }: Props) {
  const { width } = useWindowDimensions();
  const height = Math.round(width * ASPECT);
  const [index, setIndex] = useState(0);
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const listRef = useRef<FlatList<string>>(null);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      if (next !== index) setIndex(next);
    },
    [index, width]
  );

  if (photos.length === 0) {
    return (
      <View style={[styles.empty, { height: Math.round(height * 0.6) }]}>
        <Icon name={emptyIcon} size={54} />
        <Text style={styles.emptyText}>No photos yet</Text>
        {onAddPhotos ? (
          <Pressable onPress={onAddPhotos} style={styles.emptyButton} accessibilityRole="button">
            <Text style={styles.emptyButtonText}>Add photos</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View>
      <FlatList
        ref={listRef}
        data={photos}
        keyExtractor={(uri, i) => `${i}-${uri}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index: i }) => (
          <Pressable
            onPress={() => setViewerAt(i)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Photo ${i + 1} of ${photos.length}. Double tap to view full screen.`}
          >
            <Image
              source={{ uri: item }}
              style={{ width, height }}
              contentFit="cover"
              transition={180}
              cachePolicy="memory-disk"
            />
          </Pressable>
        )}
      />

      {photos.length > 1 ? (
        <>
          <View style={styles.counter} pointerEvents="none">
            <Text style={styles.counterText}>
              {index + 1} / {photos.length}
            </Text>
          </View>
          <View style={styles.dots} pointerEvents="none">
            {photos.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        </>
      ) : null}

      <PhotoViewer
        key={viewerAt ?? 'closed'}
        photos={photos}
        startIndex={viewerAt ?? 0}
        visible={viewerAt != null}
        onClose={(last) => {
          setViewerAt(null);
          // Land the strip on the photo the viewer was left on.
          if (last !== index) {
            listRef.current?.scrollToIndex({ index: last, animated: false });
            setIndex(last);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#f1f4f9',
  },
  emptyText: {
    fontFamily: typography.fontFamily.primary,
    fontSize: 15,
    color: '#6b7a90',
  },
  emptyButton: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#5a759d',
  },
  emptyButtonText: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    fontSize: 14,
    color: '#ffffff',
  },
  counter: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  counterText: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    fontSize: 12,
    color: '#ffffff',
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#ffffff',
  },
});

export default PhotoGallery;
