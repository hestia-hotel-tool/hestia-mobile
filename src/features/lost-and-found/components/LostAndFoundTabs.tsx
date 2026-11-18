import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import type { LostAndFoundTab } from '../types/lostAndFound.types';

/**
 * Figma 3128:32 (4731:158): All / Stored / Shipped / Drafts (n) / Discarded,
 * as chips. `created` is "All" and `returned` is "Shipped" — the keys stay, so
 * the filters behind them do not move.
 */
export const LOST_AND_FOUND_TABS_ORDER: readonly LostAndFoundTab[] = [
  'created',
  'stored',
  'returned',
  'drafts',
  'discarded',
];

export const LOST_AND_FOUND_TAB_LABELS: Record<LostAndFoundTab, string> = {
  created: 'All',
  stored: 'Stored',
  returned: 'Shipped',
  drafts: 'Drafts',
  discarded: 'Discarded',
};

export type LostAndFoundTabsProps = {
  selectedTab: LostAndFoundTab;
  onTabPress: (tab: LostAndFoundTab) => void;
  /** The magnifier after the chips — search is kept though the frame has none (user, 2026-11-17). */
  onSearchPress?: () => void;
  /** "Drafts (n)": this person's unfinished registrations. */
  draftsCount?: number;
};

/**
 * The Lost & Found filter chips — Figma 3128:32 (4735:416 / 4731:158): a white
 * band under the header, chips 15 in and 10 apart; the chosen one #5a759d with
 * white bold 16, the rest #eef2f7 with #5a759d light 14. They scroll sideways
 * when they do not fit; the search glyph stays put at the end.
 */
export default function LostAndFoundTabs({
  selectedTab,
  onTabPress,
  onSearchPress,
  draftsCount = 0,
}: LostAndFoundTabsProps) {
  return (
    <View style={styles.band}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.chips}
      >
        {LOST_AND_FOUND_TABS_ORDER.map((tab) => {
          const active = tab === selectedTab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onTabPress(tab)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {LOST_AND_FOUND_TAB_LABELS[tab]}
                {tab === 'drafts' ? <Text style={styles.count}>{` (${draftsCount})`}</Text> : null}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {onSearchPress ? (
        <TouchableOpacity
          style={styles.search}
          onPress={onSearchPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Search lost and found"
        >
          <Icon name="action-search" size={18 * scaleX} color="#5a759d" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /* 4735:416 — white, 78 tall; the chips 21 under the header. */
  band: {
    height: 78 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  /* Shrinks to the space the search slot leaves, so chips scroll under nothing. */
  scroll: {
    flex: 1,
    minWidth: 0,
  },
  chips: {
    alignItems: 'center',
    gap: 10 * scaleX,
    paddingLeft: 15 * scaleX,
    // The last chip scrolls fully clear of the search slot.
    paddingRight: 16 * scaleX,
  },
  chip: {
    height: 44 * scaleX,
    paddingHorizontal: 12 * scaleX,
    minWidth: 54 * scaleX,
    borderRadius: 77 * scaleX,
    backgroundColor: '#eef2f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    height: 46 * scaleX,
    paddingHorizontal: 16 * scaleX,
    backgroundColor: '#5a759d',
  },
  chipText: {
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: '#5a759d',
  },
  chipTextActive: {
    fontSize: 16 * scaleX,
    fontWeight: '700',
    color: '#ffffff',
  },
  count: {
    fontWeight: '700',
  },
  /* Its own slot after the chips: a hairline and white ground, so a chip
     scrolled up to it reads as passing behind the edge, not touching the icon. */
  search: {
    width: 48 * scaleX,
    height: 44 * scaleX,
    marginRight: 6 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#e3e3e3',
  },
});
