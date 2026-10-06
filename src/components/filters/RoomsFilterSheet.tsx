import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { View, Text, Pressable, ScrollView } from '@/tw';
import { colors } from '@/theme';
import { Icon } from '@/components/Icon';
import { FilterOptionRow, type CountFormat, type FilterIndicator } from './FilterOptionRow';

/**
 * The sheet's drop shadow — the same `shadow.nav` token the floors sheet uses,
 * expressed as a StyleSheet because the two platforms take different props.
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

/**
 * Figma node 1966:3906 insets content 36px from the card edge — checkboxes at
 * x=57 inside a card spanning x=21..420. No spacing token lands on 36, and
 * rounding to 32 visibly narrows the gutter against the 19px status dots.
 */
const CONTENT_INSET = 36;

/** Figma 2179:28 — the chevron glyph points left, so it turns to point down. */
const CHEVRON_SIZE = 14;

export type RoomsFilterOption = {
  id: string;
  label: string;
  indicator?: FilterIndicator;
  count?: number;
  selected: boolean;
};

export type RoomsFilterSection = {
  /** Stable key, also used to remember which sections are expanded. */
  key: string;
  title: string;
  options: RoomsFilterOption[];
  onToggle: (id: string) => void;
  /** How every count in this section reads. Defaults to "N Rooms". */
  countFormat?: CountFormat;
  /**
   * Show only the first N options, the rest behind "see more". Omit to show
   * every option with no toggle.
   */
  collapsedCount?: number;
};

export type RoomsFilterSheetProps = {
  sections: RoomsFilterSection[];
  onSeeRooms: () => void;
  /** Defaults to "Rooms Filter" — node 1966:4113. */
  title?: string;
  /**
   * Rooms the pending selection matches. Not rendered — this node has no count
   * badge, unlike the floors sheet — but it is announced on the confirm button
   * so the choice is not silent to a screen reader.
   */
  resultCount?: number;
};

/**
 * The rooms filter — Figma node 1966:3906.
 *
 * A title, a rule, then one titled section per filter group: a checkbox row per
 * option carrying a status dot or a line icon, its label, and its room count.
 * Sections longer than `collapsedCount` hide the remainder behind "see more".
 *
 * Entirely driven by `sections`, so the caller decides what a group contains,
 * how its counts read, and what toggling an option does. That is what lets Home
 * and All Rooms share this sheet rather than keeping a near-copy each.
 */
export function RoomsFilterSheet({
  sections,
  onSeeRooms,
  title = 'Rooms Filter',
  resultCount,
}: RoomsFilterSheetProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    // No `overflow-hidden`: it clips the drop shadow on iOS, and every child
    // already sits inside the padding.
    <View className="w-full flex-1 rounded-[20px] bg-surface-primary" style={SHEET_SHADOW}>
      {/* Title + rule — nodes 1966:4113 and 1966:4158 */}
      <Text
        className="pb-lg pt-2xl font-hestia-primary text-hestia-4xl font-bold text-ink-primary"
        style={{ paddingHorizontal: CONTENT_INSET }}
      >
        {title}
      </Text>
      <View className="h-px bg-border-light" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-sm"
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => {
          const isExpanded = !!expanded[section.key];
          const limit = section.collapsedCount;
          const collapses = limit !== undefined && section.options.length > limit;
          const visible = collapses && !isExpanded ? section.options.slice(0, limit) : section.options;

          return (
            <View key={section.key} className="pt-2xl" style={{ paddingHorizontal: CONTENT_INSET }}>
              <Text className="pb-xl font-hestia-primary text-hestia-xl font-bold text-ink-primary">
                {section.title}
              </Text>

              <View className="gap-2xl">
                {visible.map((option) => (
                  <FilterOptionRow
                    key={option.id}
                    label={option.label}
                    indicator={option.indicator}
                    count={option.count}
                    countFormat={section.countFormat}
                    selected={option.selected}
                    onToggle={() => section.onToggle(option.id)}
                  />
                ))}
              </View>

              {collapses && (
                <Pressable
                  onPress={() => toggleSection(section.key)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExpanded }}
                  className="flex-row items-center justify-center gap-sm pb-xs pt-2xl"
                  hitSlop={8}
                >
                  <Text className="font-hestia-secondary text-hestia-sm font-light text-ink-link">
                    {isExpanded ? 'see less' : 'see more'}
                  </Text>
                  <Icon
                    name="action-chevron"
                    size={CHEVRON_SIZE}
                    color={colors.text.link}
                    style={{ transform: [{ rotate: isExpanded ? '90deg' : '-90deg' }] }}
                  />
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Confirm — node 2186:793. No count badge in this design. */}
      <View className="items-center pb-3xl pt-2xl" style={{ paddingHorizontal: CONTENT_INSET }}>
        <Pressable
          onPress={onSeeRooms}
          accessibilityRole="button"
          accessibilityLabel={
            resultCount === undefined
              ? 'See rooms'
              : `See ${resultCount} ${resultCount === 1 ? 'room' : 'rooms'}`
          }
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

export default RoomsFilterSheet;
