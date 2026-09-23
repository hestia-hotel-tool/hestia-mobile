import React from 'react';
import { TextInput } from 'react-native';

import { View } from '@/tw';
import { Icon } from '@/components/Icon';
import { TabBar } from '@/components/ui/TabBar';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';
import type { StaffTab } from '../types/staff.types';
import { STAFF_LIST_LAYOUT as L } from './staffList/staffListLayout';

/** Figma 3240:561 — nodes 3240:569 / 3240:568, in this order. */
export const STAFF_TABS_ORDER: readonly StaffTab[] = ['am', 'pm'];

export const STAFF_TAB_LABELS: Record<StaffTab, string> = {
  am: 'AM',
  pm: 'PM',
};

export interface StaffTabsProps {
  selectedTab: StaffTab;
  onTabPress: (tab: StaffTab) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

/**
 * A thin wrapper over the shared `TabBar`, as `LostAndFoundTabs` is.
 *
 * **Two tabs, not three.** The revised frame drops "Shifts" and gives AM and
 * PM the grouped roster, each scoped to its own shift.
 *
 * **The search is a field, always visible.** It was a bare glyph that swapped
 * the whole tab row out for an input; node 4211:623 puts a 233x38 field beside
 * the tabs instead, so the tabs never disappear and there is no open/closed
 * state to hold.
 *
 * `distribute="start"`: this frame left-clusters its labels (x=43 and x=111,
 * 43 apart) and pushes the field right. `justify-between` would spread two
 * labels across the width.
 */
export default function StaffTabs({
  selectedTab,
  onTabPress,
  searchQuery,
  onSearchQueryChange,
}: StaffTabsProps) {
  const s = (n: number) => n * scaleX;
  const search = L.tabRow.search;

  return (
    <TabBar
      tabs={STAFF_TABS_ORDER}
      activeTab={selectedTab}
      onTabPress={onTabPress}
      renderLabel={(tab) => STAFF_TAB_LABELS[tab]}
      distribute="start"
      gap={L.tabRow.labelGap}
      ruleWidth={L.tabRow.ruleWidth}
      ruleAlign="center"
      ruleHeight={L.tabRow.ruleHeight}
      ruleGap={L.tabRow.ruleGap}
      fontSize={L.tabRow.fontSize}
      trailing={
        <View
          className="flex-row items-center overflow-hidden"
          style={{
            width: s(search.width),
            height: s(search.height),
            borderRadius: s(search.radius),
            backgroundColor: search.background,
            paddingLeft: s(search.glyphInset),
            gap: s(search.textInset - search.glyphInset - search.glyph),
          }}
        >
          <Icon name="action-search" size={s(search.glyph)} color="#334866" />
          <TextInput
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            placeholder="Search staff"
            placeholderTextColor="#9aa7bd"
            style={{
              flex: 1,
              fontSize: s(search.fontSize),
              fontFamily: typography.fontFamily.primary,
              color: '#334866',
              // Android centres a single-line input poorly without this.
              paddingVertical: 0,
            }}
            accessibilityLabel="Search staff"
          />
        </View>
      }
    />
  );
}
