import React, { useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { scaleX } from '../../constants/allRoomsStyles';

type Props = {
  /**
   * Card-relative position of the empty avatar circle, for the absolutely laid
   * out card (`StaffSection`). Omit both to sit in normal flow (`RoomAssigneeBlock`).
   */
  left?: number;
  top?: number;
  roomNumber?: string;
  loading?: boolean;
  onPress?: () => void;
};

/** Design px — Figma 2702:7771 (nodes 3907:100, 3907:121, 3907:125). */
const B = {
  circle: 35,
  /** Pill x300 against the circle's x260: 40 on, and 2 higher (y2018 vs y2020). */
  pillOffsetX: 40,
  pillOffsetY: -2,
  pillWidth: 101,
  pillHeight: 36,
  fill: '#f8f8f8',
  fontSize: 12,
} as const;

/**
 * "Assign room" on an unassigned room card — Figma 2702:7771.
 *
 * An empty avatar circle where the attendant's photo will go, and a pill
 * labelled "Assign room" where their name will go, so the card does not shift
 * once someone is assigned. One touch target for both, with a faint "+" in the
 * circle to read as an action, a spring press, and a spinner in the pill while
 * the assignment saves.
 *
 * Replaces a bordered "Not assigned" box, which read as a status rather than
 * something to tap.
 */
export function AssignRoomButton({ left, top, roomNumber, loading = false, onPress }: Props) {
  // Created once; state rather than a ref so it is not read off a ref during render.
  const [scale] = useState(() => new Animated.Value(1));
  const springTo = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => springTo(0.95)}
      onPressOut={() => springTo(1)}
      disabled={loading || !onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={roomNumber ? `Assign room ${roomNumber}` : 'Assign room'}
      accessibilityState={{ busy: loading }}
      style={
        left != null && top != null
          ? [styles.hit, { left: left * scaleX, top: (top + B.pillOffsetY) * scaleX }]
          : styles.inline
      }
    >
      <Animated.View style={[styles.row, { transform: [{ scale }] }]}>
        <View style={styles.circle}>
          <Icon name="action-plus" size={12 * scaleX} color="#b7c2d3" />
        </View>
        <View style={styles.pill}>
          {loading ? (
            <ActivityIndicator size="small" color="#5a759d" />
          ) : (
            <Text style={styles.label} numberOfLines={1}>
              Assign room
            </Text>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    position: 'absolute',
  },
  inline: {
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  circle: {
    width: B.circle * scaleX,
    height: B.circle * scaleX,
    borderRadius: (B.circle / 2) * scaleX,
    backgroundColor: B.fill,
    alignItems: 'center',
    justifyContent: 'center',
    // The circle's top is 2 below the pill's, as in the frame.
    marginTop: -B.pillOffsetY * scaleX,
  },
  pill: {
    marginLeft: (B.pillOffsetX - B.circle) * scaleX,
    width: B.pillWidth * scaleX,
    height: B.pillHeight * scaleX,
    borderRadius: (B.pillHeight / 2) * scaleX,
    backgroundColor: B.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: B.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
  },
});

export default AssignRoomButton;
