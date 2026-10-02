import React from 'react';

import { TabBar } from '@/components/ui/TabBar';
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
}

/**
 * AM / PM — Figma 3240:561 (nodes 3240:568–573): 16pt, the active one bold
 * with a 49 x 4 rule, the pair set 83 apart. Search lives in the header now.
 */
export default function StaffTabs({ selectedTab, onTabPress }: StaffTabsProps) {
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
    />
  );
}
