import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { colors, typography } from '@/theme';

type Props = {
  /** What is narrowing the list, e.g. ["Flagged", "Dirty", "2 floors"]. */
  parts: string[];
  /** How many rooms the filter leaves, if known. */
  resultCount?: number;
  onClear: () => void;
  /** Real px per design px of the screen it sits on. */
  scaleX?: number;
};

/**
 * "Filtered: Flagged · Dirty · 2 floors — Clear" under the Home and Rooms
 * headers, shown only while a filter is on.
 *
 * Both screens used to filter silently: once a filter was applied — or a Home
 * badge had carried one into Rooms — nothing said so, the filter sheet opened
 * blank, and there was no way back to all rooms. This says what is applied and
 * clears all of it in one tap.
 */
export function ActiveFiltersBar({ parts, resultCount, onClear, scaleX = 1 }: Props) {
  if (parts.length === 0) return null;
  const s = (n: number) => n * scaleX;
  const summary = parts.join(' · ');
  return (
    <View style={[styles.bar, { marginHorizontal: s(20), paddingVertical: s(8), paddingLeft: s(14), paddingRight: s(8) }]}>
      <Icon name="action-filter" size={s(10)} color={colors.primary.main} />
      <Text style={[styles.text, { fontSize: s(13), marginLeft: s(10) }]} numberOfLines={1}>
        <Text style={styles.label}>Filtered: </Text>
        {summary}
        {resultCount != null ? <Text style={styles.count}>{`  (${resultCount})`}</Text> : null}
      </Text>
      <Pressable
        onPress={onClear}
        hitSlop={10}
        style={({ pressed }) => [
          styles.clear,
          { paddingHorizontal: s(12), height: s(30), borderRadius: s(15), marginLeft: s(8) },
          pressed && styles.clearPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Clear filters: ${summary}`}
      >
        <Text style={[styles.clearText, { fontSize: s(13) }]}>Clear</Text>
        <View style={{ marginLeft: s(6), transform: [{ rotate: '45deg' }] }}>
          <Icon name="action-plus" size={s(10)} color="#ffffff" />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#e4eefe',
  },
  text: {
    flex: 1,
    minWidth: 0,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: '#1e1e1e',
  },
  label: {
    fontWeight: '700',
    color: colors.primary.main,
  },
  count: {
    fontWeight: '300',
    color: '#6b7a90',
  },
  clear: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.main,
  },
  clearPressed: {
    opacity: 0.85,
  },
  clearText: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default ActiveFiltersBar;
