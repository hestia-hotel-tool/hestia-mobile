import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { typography } from '@/theme';
import { scaleX, DETAIL_TABS } from '../../constants/roomDetailStyles';
import type { DetailTab } from '../../types/roomDetail.types';

interface DetailTabNavigationProps {
  activeTab: DetailTab;
  onTabPress: (tab: DetailTab) => void;
}

export default function DetailTabNavigation({
  activeTab,
  onTabPress,
}: DetailTabNavigationProps) {
  const tabs: DetailTab[] = ['Overview', 'Tickets', 'Checklist', 'History'];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        let left: number;
        switch (tab) {
          case 'Overview':
            left = DETAIL_TABS.overview.left;
            break;
          case 'Tickets':
            left = DETAIL_TABS.tickets.left;
            break;
          case 'Checklist':
            left = DETAIL_TABS.checklist.left;
            break;
          case 'History':
            left = DETAIL_TABS.history.left;
            break;
        }

        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, { left: left * scaleX }]}
            onPress={() => onTabPress(tab)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 14, right: 14 }}
          >
            <Text
              style={[
                styles.tabText,
                isActive && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Active Tab Underline - Show for all active tabs */}
      {(() => {
        // Calculate underline position for each tab
        // Underline width is 92px, we need to center it under each tab text
        const getUnderlineLeft = (tab: DetailTab): number => {
          const underlineWidth = DETAIL_TABS.underline.width; // 92px
          let tabLeft: number;
          let estimatedTabWidth = 80; // Approximate tab text width
          
          switch (tab) {
            case 'Overview':
              tabLeft = DETAIL_TABS.overview.left; // 21px
              estimatedTabWidth = 80;
              break;
            case 'Tickets':
              tabLeft = DETAIL_TABS.tickets.left; // 143px
              estimatedTabWidth = 70;
              break;
            case 'Checklist':
              tabLeft = DETAIL_TABS.checklist.left; // 235px
              estimatedTabWidth = 85;
              break;
            case 'History':
              tabLeft = DETAIL_TABS.history.left; // 362px
              estimatedTabWidth = 70;
              break;
            default:
              return DETAIL_TABS.underline.left;
          }
          
          // Center underline: tabLeft + (tabWidth / 2) - (underlineWidth / 2)
          return tabLeft + (estimatedTabWidth / 2) - (underlineWidth / 2);
        };
        
        return (
          <View
            style={[
              styles.underline,
              {
                left: getUnderlineLeft(activeTab) * scaleX,
                width: DETAIL_TABS.underline.width * scaleX,
              },
            ]}
          />
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: DETAIL_TABS.container.top * scaleX, // 252px from top
    left: 0,
    right: 0,
    height: DETAIL_TABS.container.height * scaleX,
    zIndex: 10, // Above background
  },
  tab: {
    position: 'absolute',
    top: 0, // Tabs are at top of container (container is already at 252px)
  },
  tabText: {
    fontSize: DETAIL_TABS.tabs.fontSize * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: typography.fontWeights.light as any,
    color: DETAIL_TABS.tabs.color,
  },
  activeTabText: {
    fontWeight: typography.fontWeights.bold as any,
  },
  underline: {
    position: 'absolute',
    top: (DETAIL_TABS.underline.top - DETAIL_TABS.container.top) * scaleX, // 281 - 252 = 29px relative to container
    height: DETAIL_TABS.underline.height * scaleX,
    width: DETAIL_TABS.underline.width * scaleX,
    backgroundColor: DETAIL_TABS.underline.backgroundColor,
  },
});

