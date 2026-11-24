import React, { useRef, useState } from 'react';
import { FlatList, Pressable, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeModal as Modal } from '@/components/ui/SafeModal';
import { typography } from '@/theme';
import { Icon } from '@/components/Icon';

type Props = {
  photos: string[];
  startIndex: number;
  visible: boolean;
  /** Called with the photo the viewer was on, so the gallery can follow. */
  onClose: (lastIndex: number) => void;
};

/**
 * Full-screen photos on black, swipe between them, "×" or back to close.
 * Mounted with a `key` per opening (see PhotoGallery), so each one starts on
 * the photo that was tapped.
 */
export function PhotoViewer({ photos, startIndex, visible, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);
  const listRef = useRef<FlatList<string>>(null);

  const close = () => onClose(index);
  /** The ‹ › arrows: to the photo before or after, as a swipe would. */
  const goTo = (next: number) => {
    const target = Math.max(0, Math.min(photos.length - 1, next));
    listRef.current?.scrollToIndex({ index: target, animated: true });
    setIndex(target);
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={close} statusBarTranslucent>
      <StatusBar barStyle="light-content" />
      <View style={styles.backdrop}>
        <FlatList
          ref={listRef}
          data={photos}
          keyExtractor={(uri, i) => `${i}-${uri}`}
          horizontal
          pagingEnabled
          initialScrollIndex={startIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item }}
              style={{ width, height }}
              contentFit="contain"
              transition={150}
              cachePolicy="memory-disk"
            />
          )}
        />

        {/* With more than one photo: ‹ and › on the sides, hidden at either end. */}
        {photos.length > 1 && index > 0 ? (
          <Pressable
            onPress={() => goTo(index - 1)}
            hitSlop={12}
            style={[styles.arrow, styles.arrowLeft]}
            accessibilityRole="button"
            accessibilityLabel="Previous photo"
          >
            <Icon name="action-chevron" size={20} color="#ffffff" />
          </Pressable>
        ) : null}
        {photos.length > 1 && index < photos.length - 1 ? (
          <Pressable
            onPress={() => goTo(index + 1)}
            hitSlop={12}
            style={[styles.arrow, styles.arrowRight]}
            accessibilityRole="button"
            accessibilityLabel="Next photo"
          >
            {/* `action-chevron` points left; turned, it is the "next" arrow. */}
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <Icon name="action-chevron" size={20} color="#ffffff" />
            </View>
          </Pressable>
        ) : null}

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <Text style={styles.counter}>
            {photos.length > 1 ? `${index + 1} / ${photos.length}` : ''}
          </Text>
          <Pressable
            onPress={close}
            hitSlop={12}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  counter: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    fontSize: 15,
    color: '#ffffff',
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  arrowLeft: {
    left: 12,
  },
  arrowRight: {
    right: 12,
  },
  closeText: {
    fontSize: 18,
    color: '#ffffff',
  },
});

export default PhotoViewer;
