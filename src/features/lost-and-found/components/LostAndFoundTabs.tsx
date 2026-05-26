import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '@shared/theme';
import { scaleX } from '../constants/lostAndFoundStyles';
import {
  LOST_AND_FOUND_TABS,
  LOST_AND_FOUND_COLORS,
  LOST_AND_FOUND_TYPOGRAPHY,
  LOST_AND_FOUND_DIVIDER,
} from '../constants/lostAndFoundStyles';
import type { LostAndFoundTab } from '../types/lostAndFound.types';

interface LostAndFoundTabsProps {
  selectedTab: LostAndFoundTab;
  onTabPress: (tab: LostAndFoundTab) => void;
  onSearchPress?: () => void;
}

export default function LostAndFoundTabs({ selectedTab, onTabPress, onSearchPress }: LostAndFoundTabsProps) {
  const insets = useSafeAreaInsets();
  const [labelWidths, setLabelWidths] = React.useState<Partial<Record<LostAndFoundTab, number>>>({});
  const tabs = [
    { id: 'created' as LostAndFoundTab, label: 'All' },
    { id: 'stored' as LostAndFoundTab, label: 'Stored' },
    { id: 'returned' as LostAndFoundTab, label: 'Shipped' },
    { id: 'discarded' as LostAndFoundTab, label: 'Discarded' },
  ];

  // Calculate indicator position based on Figma design
  const getIndicatorPosition = () => {
    const selectedTabConfig = LOST_AND_FOUND_TABS.tabs[selectedTab];
    
    // Use exact left position from Figma design
    const indicatorLeft = selectedTabConfig.left * scaleX;
    const measured = labelWidths[selectedTab];
    const indicatorWidth = (measured != null && measured > 0)
      ? measured
      : selectedTabConfig.indicatorWidth * scaleX;
    
    return { left: indicatorLeft, width: indicatorWidth };
  };

  const indicatorPos = getIndicatorPosition();

  return (
    <View style={[styles.container, { top: LOST_AND_FOUND_TABS.container.top * scaleX + insets.top }]}>
      <View style={styles.tabsWrapper}>
        {tabs.map((tab) => {
          const tabConfig = LOST_AND_FOUND_TABS.tabs[tab.id];
          const isActive = selectedTab === tab.id;
          
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                {
                  left: tabConfig.left * scaleX,
                },
              ]}
              onPress={() => onTabPress(tab.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive ? styles.tabTextActive : styles.tabTextInactive,
                ]}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  setLabelWidths((prev) => (prev[tab.id] === w ? prev : { ...prev, [tab.id]: w }));
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        
        {/* Active Indicator */}
        <View
          style={[
            styles.indicator,
            {
              left: indicatorPos.left,
              width: indicatorPos.width,
            },
          ]}
        />
      </View>

      {/* Divider below tabs */}
      <View style={styles.tabsDivider} pointerEvents="none" />

      {/* Search Icon */}
      <TouchableOpacity
        style={styles.searchButton}
        onPress={onSearchPress || (() => {})}
        activeOpacity={0.7}
      >
        <Image
          source={require('../../../../assets/icons/search-icon.png')}
          style={styles.searchIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: LOST_AND_FOUND_TABS.container.top * scaleX,
    left: 0,
    right: 0,
    height: LOST_AND_FOUND_TABS.container.height * scaleX,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    zIndex: 12,
    elevation: 12,
  },
  tabsWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  tab: {
    position: 'absolute',
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  tabText: {
    fontSize: LOST_AND_FOUND_TYPOGRAPHY.tab.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: LOST_AND_FOUND_COLORS.tabActive,
    lineHeight: LOST_AND_FOUND_TYPOGRAPHY.tab.fontSize * scaleX,
    includeFontPadding: false,
    textAlignVertical: 'top',
  },
  tabTextActive: {
    fontWeight: LOST_AND_FOUND_TYPOGRAPHY.tab.activeFontWeight as any,
    color: LOST_AND_FOUND_COLORS.tabActive,
  },
  tabTextInactive: {
    fontWeight: LOST_AND_FOUND_TYPOGRAPHY.tab.fontWeight as any,
    color: LOST_AND_FOUND_COLORS.tabInactive,
  },
  indicator: {
    position: 'absolute',
    // Reduce vertical gap between tab label and underline.
    top: (LOST_AND_FOUND_TABS.indicator.top - LOST_AND_FOUND_TABS.container.top - 4) * scaleX,
    height: LOST_AND_FOUND_TABS.indicator.height * scaleX,
    backgroundColor: LOST_AND_FOUND_TABS.indicator.backgroundColor,
    borderRadius: LOST_AND_FOUND_TABS.indicator.borderRadius * scaleX,
  },
  tabsDivider: {
    position: 'absolute',
    left: LOST_AND_FOUND_DIVIDER.left * scaleX,
    top: (LOST_AND_FOUND_TABS.indicator.top - LOST_AND_FOUND_TABS.container.top + LOST_AND_FOUND_TABS.indicator.height + 5) * scaleX,
    width: (LOST_AND_FOUND_DIVIDER.width + 32) * scaleX,
    height: LOST_AND_FOUND_DIVIDER.height,
    backgroundColor: LOST_AND_FOUND_DIVIDER.color,
  },
  searchButton: {
    position: 'absolute',
    right: LOST_AND_FOUND_TABS.searchIcon.right * scaleX,
    top: 0, // Aligned with tab text at top of container
    width: LOST_AND_FOUND_TABS.searchIcon.width * scaleX,
    height: LOST_AND_FOUND_TABS.searchIcon.height * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  searchIcon: {
    width: LOST_AND_FOUND_TABS.searchIcon.width * scaleX,
    height: LOST_AND_FOUND_TABS.searchIcon.height * scaleX,
    tintColor: LOST_AND_FOUND_COLORS.tabActive,
  },
});

