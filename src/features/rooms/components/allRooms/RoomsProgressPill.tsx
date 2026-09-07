import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '@/theme';
import { scaleX } from '../../constants/allRoomsStyles';

/** Figma 3883:4995 — 87x41, radius 53, 1px outline. */
const PILL_WIDTH = 87;
const PILL_HEIGHT = 41;
const PILL_RADIUS = 53;

export type RoomsProgressPillProps = {
  /** Rooms taken to Cleaned or Inspected. */
  finished: number;
  /** Rooms assigned to this person for the shift. */
  total: number;
};

/**
 * How far through their assigned rooms an attendant is — Figma 3883:4994.
 *
 * Counted over everything assigned for the shift, not over what is currently on
 * screen: a search or a filter narrows the list, and the number of rooms left to
 * clean does not change because you searched for one of them.
 */
export function RoomsProgressPill({ finished, total }: RoomsProgressPillProps) {
  return (
    <View
      style={styles.pill}
      accessibilityRole="text"
      accessibilityLabel={`${finished} of ${total} rooms finished`}
    >
      <Text style={styles.label}>
        {finished}/{total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: PILL_WIDTH * scaleX,
    height: PILL_HEIGHT * scaleX,
    borderRadius: PILL_RADIUS * scaleX,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.text.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.text.primary,
    includeFontPadding: false,
  },
});

export default RoomsProgressPill;
