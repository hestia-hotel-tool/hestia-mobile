import React from 'react';
import { StyleSheet } from 'react-native';
import { View, Text, Pressable, ScrollView } from '@/tw';
import { Checkbox } from '@/components/ui/Checkbox';

/**
 * The sheet's drop shadow — Figma node 2702:3186, whose filter is
 * feGaussianBlur stdDeviation 52.55 over rgb(100,131,176) at 40%. That is the
 * same shadow as the `shadow.nav` design token (105.1px = 52.55 x 2).
 *
 * Expressed as a StyleSheet rather than a `shadow-*` class because the two
 * platforms take different props, and the design's -35px spread has no React
 * Native equivalent — the radius here approximates it.
 */
const SHEET_SHADOW = StyleSheet.create({
  s: {
    shadowColor: 'rgb(100, 131, 176)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 26,
    elevation: 12,
  },
}).s;

export type FloorOption = {
  id: string;
  label: string;
  /** Rooms on this floor. Rendered as "N Rooms". */
  count: number;
  selected: boolean;
};

export type FloorsFilterSheetProps = {
  options: FloorOption[];
  /** Shown in the pill beside the title. */
  resultCount: number;
  onToggle: (id: string) => void;
  onSeeRooms: () => void;
};

/**
 * The floors filter — Figma node 2702:3009.
 *
 * Title and result count, a rule, then one checkbox row per floor with its room
 * count, and the confirm button.
 *
 * Laid out with flex rather than the design's absolute coordinates. The rows sit
 * at irregular y offsets in Figma (325, 370, 420, 474, 523, 576 — gaps of 45,
 * 50, 54, 49, 53) which is hand-placement noise, not a rhythm worth reproducing;
 * an even gap reads as intended and keeps working when a hotel has three floors
 * or twelve.
 */
export function FloorsFilterSheet({
  options,
  resultCount,
  onToggle,
  onSeeRooms,
}: FloorsFilterSheetProps) {
  return (
    // No `overflow-hidden` here: it would clip the drop shadow on iOS, and
    // nothing needs clipping — every child sits inside the padding.
    <View className="w-full rounded-4xl bg-surface-primary" style={SHEET_SHADOW}>
      {/* Title + result count — nodes 2702:3193 and 2702:3190 */}
      <View className="flex-row items-center justify-between px-2xl pb-lg pt-2xl">
        <Text className="font-hestia-primary text-hestia-4xl text-ink-primary">Floors Filter</Text>

        <View className="h-[33px] justify-center rounded-full bg-badge-results px-lg">
          <Text className="font-hestia-secondary text-hestia-md font-light text-ink-primary">
            {resultCount} results
          </Text>
        </View>
      </View>

      <View className="mx-md h-px bg-border-light" />

      <Text className="px-2xl pb-md pt-lg font-hestia-primary text-hestia-xl font-bold text-ink-primary">
        Select Floors
      </Text>

      {/* Scrolls when a hotel has more floors than fit — the design shows six. */}
      <ScrollView
        className="max-h-[340px]"
        contentContainerClassName="gap-2xl px-2xl pb-lg"
        showsVerticalScrollIndicator={false}
      >
        {options.map((option) => (
          <Pressable
            key={option.id}
            onPress={() => onToggle(option.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: option.selected }}
            accessibilityLabel={`${option.label}, ${option.count} rooms`}
            className="flex-row items-center gap-lg"
          >
            <Checkbox
              checked={option.selected}
              onToggle={() => onToggle(option.id)}
              accessibilityLabel={option.label}
            />
            <Text className="flex-1 font-hestia-secondary text-hestia-xl font-light text-ink-primary">
              {option.label}
            </Text>
            <Text className="font-hestia-secondary text-hestia-xs font-light text-ink-muted">
              {option.count} Rooms
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Confirm — node 2702:3215. No count badge here, unlike SeeRoomsButton. */}
      <View className="items-center px-2xl pb-3xl pt-lg">
        <Pressable
          onPress={onSeeRooms}
          accessibilityRole="button"
          accessibilityLabel={`See ${resultCount} rooms`}
          className="h-[66px] w-[231px] items-center justify-center rounded-full bg-primary"
        >
          <Text className="font-hestia-secondary text-hestia-3xl font-medium text-ink-white">
            See Rooms
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default FloorsFilterSheet;
