import React, { useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { View } from '@/tw';
import { Image } from '@/tw/image';
import { scaleX } from '@/utils/responsive';
import { LOST_AND_FOUND_CARD_LAYOUT as L } from './lostAndFoundCardLayout';

export type ItemPhotoProps = {
  /** A Supabase URL or a local source; absent means the item has no photo. */
  source?: { uri: string } | number;
};

/**
 * The item photograph — Figma node 3871:3671, 144x119.
 *
 * `overflow-hidden` is not decoration: Android does not clip children to
 * `borderRadius` without it, so the photo's square corners would poke out of
 * the rounded box.
 *
 * The pulse is kept from the previous implementation. These are remote Supabase
 * URLs over hotel wifi, and an empty rounded rectangle reads as "no photo"
 * rather than "loading" — which matters on a screen whose whole job is showing
 * you the object.
 */
export function ItemPhoto({ source }: ItemPhotoProps) {
  const [loading, setLoading] = useState(false);
  /*
   * `useState` with an initialiser, not `useRef(new Animated.Value()).current`.
   *
   * Both create the value once, but reading `.current` during render is a ref
   * access in the render path, which lint flags and which is genuinely unsafe
   * under concurrent rendering. This form has the same one-time semantics
   * without touching a ref.
   *
   * There is also no effect resetting `loading` when `source` changes: the
   * parent keys this component on the source, so a new photo is a new
   * component. See the note in `FoundInGuestRow`.
   */
  const [pulse] = useState(() => new Animated.Value(0.35));

  useEffect(() => {
    if (!loading) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.8, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [loading, pulse]);

  if (!source) return null;

  const box = {
    width: L.photo.width * scaleX,
    height: L.photo.height * scaleX,
    borderRadius: L.photo.radius * scaleX,
  };

  return (
    <View className="overflow-hidden bg-surface-secondary" style={box}>
      {loading ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#e3e8f0',
            opacity: pulse,
            zIndex: 1,
          }}
        />
      ) : null}
      <Image
        source={source}
        style={{ width: box.width, height: box.height }}
        contentFit="cover"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => setLoading(false)}
      />
    </View>
  );
}

export default ItemPhoto;
