import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

interface FlagToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Scale factor applied by the caller (allRooms' scaleX system). */
  scaleX: number;
}

/**
 * The Flag Room switch — Figma 2365:48. A native <Switch> can't produce this
 * geometry (78x39 track, 28px red thumb), so this is a drop-in with the same
 * value / onValueChange / disabled contract.
 *
 * Figma only draws the off state, so the on state slides the same red thumb to
 * the far side rather than inventing a second colour treatment.
 */
const TRACK_WIDTH = 78;
const TRACK_HEIGHT = 39;
const THUMB_SIZE = 28;
const THUMB_INSET = 7;

export default function FlagToggle({ value, onValueChange, disabled = false, scaleX }: FlagToggleProps) {
  const [offset] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.timing(offset, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [value, offset]);

  const translateX = offset.interpolate({
    inputRange: [0, 1],
    outputRange: [THUMB_INSET * scaleX, (TRACK_WIDTH - THUMB_INSET - THUMB_SIZE) * scaleX],
  });

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={[
        styles.track,
        {
          width: TRACK_WIDTH * scaleX,
          height: TRACK_HEIGHT * scaleX,
          borderRadius: (TRACK_HEIGHT / 2) * scaleX,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            width: THUMB_SIZE * scaleX,
            height: THUMB_SIZE * scaleX,
            borderRadius: (THUMB_SIZE / 2) * scaleX,
            transform: [{ translateX }],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: '#eef2f7',
    borderWidth: 1,
    borderColor: '#fefefe',
    justifyContent: 'center',
  },
  thumb: {
    backgroundColor: '#f92424',
  },
});
