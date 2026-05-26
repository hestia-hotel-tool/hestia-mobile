import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '@shared/theme';
import { scaleX, STAFF_TABS } from '../constants/staffStyles';
import { StaffTab } from '../types/staff.types';

interface StaffTabsProps {
  selectedTab: StaffTab;
  onTabPress: (tab: StaffTab) => void;
  /** When true, tabs are replaced by search input + close. */
  searchExpanded?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onSearchPress?: () => void;
  onSearchClose?: () => void;
}

export default function StaffTabs({
  selectedTab,
  onTabPress,
  searchExpanded = false,
  searchQuery = '',
  onSearchQueryChange,
  onSearchPress,
  onSearchClose,
}: StaffTabsProps) {
  const searchInputRef = useRef<TextInput>(null);
  const [tabWidths, setTabWidths] = useState<Partial<Record<StaffTab, number>>>({});

  const handleTabLayout = (tabId: StaffTab) => (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    setTabWidths((prev) => (prev[tabId] === width ? prev : { ...prev, [tabId]: width }));
  };

  useEffect(() => {
    if (searchExpanded) setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [searchExpanded]);

  const tabs: { id: StaffTab; label: string }[] = [
    { id: 'shifts', label: 'Shifts' },
    { id: 'am', label: 'AM' },
    { id: 'pm', label: 'PM' },
  ];

  const getIndicatorPosition = () => {
    const selectedTabConfig = STAFF_TABS.tabs[selectedTab];
    const measuredWidth = tabWidths[selectedTab];
    return {
      left: selectedTabConfig.indicatorLeft * scaleX,
      width: (measuredWidth ?? selectedTabConfig.indicatorWidth) * (measuredWidth != null ? 1 : scaleX),
    };
  };

  const indicatorPos = getIndicatorPosition();

  if (searchExpanded) {
    return (
      <View style={styles.container}>
        <View style={styles.tabsWrapper}>
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search staff and departments..."
            placeholderTextColor={STAFF_TABS.tab.inactiveColor}
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.searchCloseBtn}
            onPress={onSearchClose}
            activeOpacity={0.7}
            hitSlop={12}
          >
            <Ionicons name="close" size={24 * scaleX} color={STAFF_TABS.searchIcon.color} />
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabsWrapper}>
        {tabs.map((tab) => {
          const tabConfig = STAFF_TABS.tabs[tab.id];
          const isActive = selectedTab === tab.id;
          
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, { left: tabConfig.left * scaleX }]}
              onPress={() => onTabPress(tab.id)}
              onLayout={handleTabLayout(tab.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive ? styles.tabTextActive : styles.tabTextInactive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        
        {/* Search icon - right of tabs (On Shift | AM | PM | Departments | Search) */}
        <TouchableOpacity
          style={styles.searchIconBtn}
          onPress={onSearchPress}
          activeOpacity={0.7}
          hitSlop={12}
        >
          <Ionicons
            name="search"
            size={STAFF_TABS.searchIcon.size * scaleX}
            color={STAFF_TABS.searchIcon.color}
          />
        </TouchableOpacity>
        
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
      
      {/* Divider */}
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: STAFF_TABS.container.top * scaleX,
    left: 0,
    right: 0,
    height: STAFF_TABS.container.height * scaleX,
    zIndex: 5,
  },
  tabsWrapper: {
    position: 'relative',
    height: STAFF_TABS.container.height * scaleX,
  },
  tab: {
    position: 'absolute',
    top: 0,
  },
  tabText: {
    fontSize: STAFF_TABS.tab.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.light as any,
    color: STAFF_TABS.tab.color,
  },
  tabTextActive: {
    fontWeight: typography.fontWeights.bold as any,
    color: STAFF_TABS.tab.color,
  },
  tabTextInactive: {
    color: STAFF_TABS.tab.inactiveColor,
  },
  searchIconBtn: {
    position: 'absolute',
    right: STAFF_TABS.searchIcon.right * scaleX,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  searchInput: {
    position: 'absolute',
    left: STAFF_TABS.tabs.shifts.left * scaleX,
    right: (STAFF_TABS.searchIcon.right + 32) * scaleX,
    top: 0,
    bottom: 0,
    fontSize: STAFF_TABS.tab.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: STAFF_TABS.tab.color,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  searchCloseBtn: {
    position: 'absolute',
    right: STAFF_TABS.searchIcon.right * scaleX,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    // Position at bottom of tabs container: container height (39) - indicator height (4) = 35px from container top
    // But Figma shows it at 192px from screen top, which is 192 - 158 = 34px from container top
    top: (STAFF_TABS.indicator.top - STAFF_TABS.container.top) * scaleX,
    height: STAFF_TABS.indicator.height * scaleX,
    backgroundColor: STAFF_TABS.indicator.backgroundColor,
    borderRadius: STAFF_TABS.indicator.borderRadius * scaleX,
  },
  divider: {
    position: 'absolute',
    top: STAFF_TABS.container.height * scaleX, // Position at bottom of container
    left: 0,
    right: 0,
    height: STAFF_TABS.divider.height * scaleX,
    backgroundColor: STAFF_TABS.divider.color,
  },
});


