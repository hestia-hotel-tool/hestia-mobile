import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { scaleX } from '@/utils/responsive';

/**
 * The line between days in a list — Figma 3128:32 (4735:346), used by Lost &
 * Found and Tickets: "Today", "Yesterday", a weekday or a date
 * (`dayLabel` in utils/calendarDays), Inter 14 #b0c0c6, between two 0.5
 * #b0c0c6 rules, 364 wide at x=30.
 *
 * The default margins assume a list with a 15.5 gutter and a 16 gap between
 * rows; `style` adjusts them for a list spaced differently.
 */
export default function DaySeparator({ label, style }: { label: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.row, style]} accessibilityRole="header" accessibilityLabel={label}>
      <View style={styles.rule} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  /* The list's gutter is 15.5; the rules start 30 in. Cards sit 34 above and 36 below. */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14.5 * scaleX,
    marginTop: 18 * scaleX,
    marginBottom: 20 * scaleX,
    gap: 16 * scaleX,
  },
  rule: {
    flex: 1,
    height: 0.5,
    backgroundColor: '#b0c0c6',
  },
  label: {
    fontSize: 14 * scaleX,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: '#b0c0c6',
  },
});
