import React from 'react';
import { Pressable, View } from '@/tw';
import { Icon } from '@/components/Icon';
import { TabBar } from '@/components/ui/TabBar';
import { scaleX } from '@/utils/responsive';
import { LOST_AND_FOUND_SCREEN_LAYOUT as S } from '../constants/lostAndFoundScreenLayout';
import type { LostAndFoundTab } from '../types/lostAndFound.types';

/** Figma 3128:32 — nodes 3128:38/40/39/41, in this order. */
export const LOST_AND_FOUND_TABS_ORDER: readonly LostAndFoundTab[] = [
  'created',
  'stored',
  'returned',
  'discarded',
];

/**
 * Display text per tab.
 *
 * The keys already matched the frame; the labels did not. This screen showed
 * "All" for `created` and "Shipped" for `returned`, against the frame's
 * "Created" and "Returned".
 *
 * Note "Returned" here sits above cards that say "Shipped By", "Shipped
 * Location" and "Shipped" — one state under two words. That is what 3128:32
 * draws, and per the user's decision each element matches the frame rather than
 * being harmonised. See `LOST_AND_FOUND_CARD_CHROME`.
 */
export const LOST_AND_FOUND_TAB_LABELS: Record<LostAndFoundTab, string> = {
  created: 'Created',
  stored: 'Stored',
  returned: 'Returned',
  discarded: 'Discarded',
};

export type LostAndFoundTabsProps = {
  selectedTab: LostAndFoundTab;
  onTabPress: (tab: LostAndFoundTab) => void;
  onSearchPress?: () => void;
};

/**
 * The Lost & Found tab row — Figma 3128:32.
 *
 * A thin wrapper over the shared `TabBar` rather than a fourth hand-rolled row.
 * What this replaces positioned each label with an absolute `left` read off the
 * frame (32/118/186/272) and sized the rule from a per-tab `indicatorWidth`
 * guess — the same "invented widths" problem `TabBar` was extracted to end. The
 * frame's own spacing is `justify-between` to within 4px, so the shared row
 * reproduces it.
 *
 * Two things here are not the shared defaults, and both are props now:
 * the rule tracks the label (left-aligned, +8) rather than being a fixed 92
 * centred; and the search glyph is a `trailing` child of the row rather than an
 * absolute sibling, because it takes part in the distribution.
 */
export default function LostAndFoundTabs({
  selectedTab,
  onTabPress,
  onSearchPress,
}: LostAndFoundTabsProps) {
  return (
    <View>
      <TabBar<LostAndFoundTab>
        tabs={LOST_AND_FOUND_TABS_ORDER}
        activeTab={selectedTab}
        onTabPress={onTabPress}
        renderLabel={(tab) => LOST_AND_FOUND_TAB_LABELS[tab]}
        ruleWidth="label"
        ruleOverhang={S.tabRow.ruleOverhang}
        ruleAlign="left"
        ruleGap={S.tabRow.ruleGap}
        ruleHeight={S.tabRow.ruleHeight}
        ruleColor="#5a759d"
        labelColor="#5a759d"
        fontSize={S.tabRow.fontSize}
        trailing={
          <Pressable
            onPress={onSearchPress}
            disabled={!onSearchPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Search lost and found"
          >
            <Icon
              name="action-search"
              size={S.tabRow.searchGlyph * scaleX}
              color="#5a759d"
            />
          </Pressable>
        }
        className=""
      />

      {/*
        Node 3128:42 spans x=-4 to 444 — past both screen edges. It is a sibling
        of the inset row, not a child, so it can bleed: the row is padded to the
        frame's 32/47 and this is not.
      */}
      <View
        className="bg-border-medium"
        style={{
          height: S.divider.height,
          marginHorizontal: -S.tabRow.paddingLeft * scaleX,
        }}
      />
    </View>
  );
}
