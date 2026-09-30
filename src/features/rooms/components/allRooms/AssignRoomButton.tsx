import React, { useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { scaleX } from '../../constants/allRoomsStyles';

type Props = {
  /**
   * Card-relative position, for the absolutely laid out card (`StaffSection`).
   * Omit both to sit in normal flow (`RoomAssigneeBlock`).
   */
  left?: number;
  top?: number;
  roomNumber?: string;
  loading?: boolean;
  onPress?: () => void;
};

/** The brand blue-grey (#5a759d) the rest of the card's actions use. */
const BRAND = '#5a759d';
const INK = '#334866';

const B = {
  height: 36,
  /** The leading "+" disc. */
  disc: 20,
  paddingLeft: 8,
  paddingRight: 14,
  gap: 6,
  fontSize: 12,
} as const;

/**
 * "Assign room" on an unassigned room card — one control, not two shapes.
 *
 * A single tonal pill: a filled "+" disc and the label. It was an empty
 * avatar circle beside a separate grey pill, which read as two things and gave
 * the action no emphasis next to the grey badge tiles.
 *
 * - The whole pill is the target, with `hitSlop` taking it past 44pt.
 * - Pressed: the fill deepens and the pill springs to 96%.
 * - Saving: a spinner replaces the "+", the label reads "Assigning…", taps
 *   are ignored and the busy state is announced.
 * - Without `onPress` (no `rooms.reassign` — room attendants) it is a muted,
 *   non-interactive "Unassigned" chip in the same slot, so the card does not
 *   change shape by role.
 *
 * Content-sized, so the header can measure it (RoomCardHeader).
 */
export function AssignRoomButton({ left, top, roomNumber, loading = false, onPress }: Props) {
  // Created once; state rather than a ref so it is not read off a ref during render.
  const [scale] = useState(() => new Animated.Value(1));
  const placement = left != null && top != null ? [styles.absolute, { left: left * scaleX, top: top * scaleX }] : null;

  if (!onPress) {
    return (
      <View
        style={[styles.pill, styles.pillReadOnly, placement]}
        accessibilityLabel={roomNumber ? `Room ${roomNumber} is not assigned` : 'Not assigned'}
      >
        <Ionicons name="person-outline" size={14 * scaleX} color="#8a94a6" />
        <Text style={[styles.label, styles.labelReadOnly]} numberOfLines={1}>
          Unassigned
        </Text>
      </View>
    );
  }

  const springTo = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 6 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => springTo(0.96)}
      onPressOut={() => springTo(1)}
      disabled={loading}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={roomNumber ? `Assign room ${roomNumber}` : 'Assign room'}
      accessibilityHint="Choose a room attendant"
      accessibilityState={{ busy: loading, disabled: loading }}
      style={placement}
    >
      {({ pressed }) => (
        <Animated.View style={[styles.pill, pressed && styles.pillPressed, { transform: [{ scale }] }]}>
          <View style={styles.disc}>
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" style={styles.spinner} />
            ) : (
              <Icon name="action-plus" size={9 * scaleX} color="#ffffff" />
            )}
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {loading ? 'Assigning…' : 'Assign room'}
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: B.gap * scaleX,
    height: B.height * scaleX,
    paddingLeft: B.paddingLeft * scaleX,
    paddingRight: B.paddingRight * scaleX,
    borderRadius: (B.height / 2) * scaleX,
    backgroundColor: 'rgba(90, 117, 157, 0.12)',
  },
  pillPressed: {
    backgroundColor: 'rgba(90, 117, 157, 0.22)',
  },
  pillReadOnly: {
    paddingLeft: B.paddingRight * scaleX,
    backgroundColor: '#f3f5f8',
  },
  disc: {
    width: B.disc * scaleX,
    height: B.disc * scaleX,
    borderRadius: (B.disc / 2) * scaleX,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    transform: [{ scale: 0.6 }],
  },
  label: {
    fontSize: B.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: INK,
  },
  labelReadOnly: {
    fontWeight: '400',
    color: '#8a94a6',
  },
});

export default AssignRoomButton;
