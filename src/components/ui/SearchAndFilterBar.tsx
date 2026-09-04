import React from 'react';
import { View, Text, TextInput, Pressable } from '@/tw';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme';

export type SearchAndFilterBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  onFilterPress?: () => void;
  /** Leading word, rendered semibold. Figma node 2702:3322. */
  placeholderLead?: string;
  placeholderRest?: string;
  className?: string;
};

/**
 * Search field with a filter affordance — Figma node 2702:3310.
 *
 * HomeScreen and AllRoomsHeader carried the same JSX for this, down to the same
 * five style-override props on SearchInput and the same
 * `height: 59, width: 347, borderRadius: 82` block in each screen's styles. One
 * component now.
 *
 * The placeholder is drawn rather than passed to `placeholder`, because the
 * design sets the first word semibold and the remainder light — a single
 * placeholder string cannot express that.
 */
export function SearchAndFilterBar({
  value,
  onChangeText,
  onFilterPress,
  placeholderLead = 'Search',
  placeholderRest = 'Rooms, Guests, Floors etc',
  className,
}: SearchAndFilterBarProps) {
  return (
    <View className={`w-full flex-row items-center gap-lg ${className ?? ''}`}>
      <View className="h-[44px] flex-1 flex-row items-center gap-md rounded-10xl bg-surface-tertiary px-xl">
        <Icon name="action-search" size={14} color={colors.primary.main} />

        <View className="flex-1 justify-center">
          <TextInput
            className="font-hestia-secondary text-hestia-base text-ink-primary"
            value={value}
            onChangeText={onChangeText}
            accessibilityLabel={`${placeholderLead} ${placeholderRest}`}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />

          {/* Shown only while empty — a real placeholder cannot mix weights. */}
          {value.length === 0 && (
            <View className="absolute left-0 right-0 flex-row" pointerEvents="none">
              <Text className="font-hestia-secondary text-hestia-xs font-semibold text-ink-primary opacity-[0.36]">
                {placeholderLead}{' '}
              </Text>
              <Text className="font-hestia-secondary text-hestia-xs font-light text-ink-primary opacity-[0.36]">
                {placeholderRest}
              </Text>
            </View>
          )}
        </View>
      </View>

      {onFilterPress && (
        <Pressable
          onPress={onFilterPress}
          accessibilityRole="button"
          accessibilityLabel="Filter"
          hitSlop={12}
          className="p-xs"
        >
          <Icon name="action-filter" size={12} color={colors.primary.main} />
        </Pressable>
      )}
    </View>
  );
}
