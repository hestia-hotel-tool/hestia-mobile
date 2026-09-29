import React, { useMemo, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { typography } from '@/theme';

const ITEM = 44;
const VISIBLE = 5;
const pad = (n: number) => String(n).padStart(2, '0');

type Props = {
  /** "HH:MM", 24-hour. */
  value: string;
  onChange: (value: string) => void;
  /** Minute step (5 → 00, 05, 10…). */
  minuteStep?: number;
};

/**
 * A 24-hour time as two wheels, hours and minutes, with the chosen row
 * highlighted. Each wheel starts on the current value (`contentOffset`, not a
 * scroll after mount, so nothing jumps); a snap onto a new row reports the
 * new time with a light tick.
 */
export function TimeWheelPicker({ value, onChange, minuteStep = 5 }: Props) {
  const [h, m] = value.split(':').map((x) => Number(x) || 0);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(
    () => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep),
    [minuteStep]
  );
  const minuteIndex = Math.max(0, minutes.findIndex((x) => x >= m));

  return (
    <View style={styles.wrap} accessibilityRole="adjustable" accessibilityLabel={`Time ${value}`}>
      <View style={styles.highlight} pointerEvents="none" />
      <Wheel
        items={hours}
        index={h}
        onSelect={(i) => onChange(`${pad(hours[i])}:${pad(m)}`)}
        label="Hours"
      />
      <Text style={styles.colon}>:</Text>
      <Wheel
        items={minutes}
        index={minuteIndex}
        onSelect={(i) => onChange(`${pad(h)}:${pad(minutes[i])}`)}
        label="Minutes"
      />
    </View>
  );
}

function Wheel({
  items,
  index,
  onSelect,
  label,
}: {
  items: number[];
  index: number;
  onSelect: (index: number) => void;
  label: string;
}) {
  const last = useRef(index);
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(items.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / ITEM)));
    if (i !== last.current) {
      last.current = i;
      void Haptics.selectionAsync();
      onSelect(i);
    }
  };
  return (
    <ScrollView
      style={styles.wheel}
      contentOffset={{ x: 0, y: index * ITEM }}
      contentContainerStyle={{ paddingVertical: ITEM * Math.floor(VISIBLE / 2) }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM}
      decelerationRate="fast"
      onMomentumScrollEnd={settle}
      onScrollEndDrag={(e) => {
        // A slow drag that stops exactly on a row fires no momentum end.
        if (!e.nativeEvent.velocity || Math.abs(e.nativeEvent.velocity.y) < 0.05) settle(e);
      }}
      accessibilityLabel={label}
    >
      {items.map((n, i) => (
        <View key={n} style={styles.item}>
          <Text style={[styles.itemText, i === index && styles.itemTextSelected]}>{pad(n)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { height: ITEM * VISIBLE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  highlight: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: ITEM,
    top: ITEM * Math.floor(VISIBLE / 2),
    borderRadius: 10,
    backgroundColor: '#e4eefe',
  },
  wheel: { width: 84, height: ITEM * VISIBLE, flexGrow: 0 },
  item: { height: ITEM, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontFamily: typography.fontFamily.primary, fontSize: 22, color: '#9aa7ba' },
  itemTextSelected: { fontWeight: '700', color: '#1e1e1e' },
  colon: { marginHorizontal: 4, fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 24, color: '#1e1e1e' },
});

export default TimeWheelPicker;
