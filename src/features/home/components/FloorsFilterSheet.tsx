import React from 'react';
import { View, Text, Pressable, ScrollView } from '@/tw';
import { Checkbox } from '@/components/ui/Checkbox';

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
    <View className="w-full overflow-hidden rounded-2xl bg-surface-primary">
      {/* Title + result count — nodes 2702:3193 and 2702:3190 */}
      <View className="flex-row items-center justify-between px-2xl pb-lg pt-2xl">
        <Text className="font-hestia-primary text-hestia-4xl text-ink-primary">Floors Filter</Text>

        <View className="h-[33px] justify-center rounded-3xl bg-badge-results px-lg">
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
        contentContainerClassName="gap-xl px-2xl pb-lg"
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
          className="h-[66px] w-[231px] items-center justify-center rounded-4xl bg-primary"
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
