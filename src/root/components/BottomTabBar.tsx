import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, LayoutChangeEvent, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@shared/theme';
import TabBarItem from './TabBarItem';
import { MORE_MENU_OPTIONS } from '@shared/types/more.types';
import { useDesignScale } from '@shared/hooks/useDesignScale';
import { useBottomTabBadges } from '../hooks/useBottomTabBadges';

export type TabPressOptions = { fromRoomsAssignmentBadge?: boolean };

interface BottomTabBarProps {
  activeTab: string;
  onTabPress: (tab: string, options?: TabPressOptions) => void;
  onMorePress?: () => void;
}

const MAIN_TABS = [
  {
    id: 'Home',
    icon: require('../../../assets/icons/home-icon.png'),
    label: 'Home',
    iconWidth: 56,
    iconHeight: 56,
  },
  {
    id: 'Rooms',
    icon: require('../../../assets/icons/rooms-icon.png'),
    label: 'Rooms',
    iconWidth: 70,
    iconHeight: 56,
  },
  {
    id: 'Chat',
    icon: require('../../../assets/icons/chat-icon.png'),
    label: 'Chat',
    iconWidth: 56,
    iconHeight: 56,
    iconOffsetX: -2,
  },
  {
    id: 'Tickets',
    icon: require('../../../assets/icons/tickets-icon.png'),
    label: 'Tickets',
    iconWidth: 49,
    iconHeight: 54,
    iconOffsetX: -3,
  },
  {
    id: 'AIHome',
    icon: require('../../../assets/icons/ai-home-icon.png'),
    label: '',
    iconWidth: 56,
    iconHeight: 56,
  },
];

export default function BottomTabBar({ activeTab, onTabPress, onMorePress }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { scaleX } = useDesignScale();
  const styles = useMemo(() => buildBottomTabBarStyles(scaleX), [scaleX]);
  const { chatBadgeCount, ticketsBadgeCount, roomsAssignmentCount } = useBottomTabBadges();

  const tabs = useMemo(
    () => [
      ...MAIN_TABS,
      ...MORE_MENU_OPTIONS.map((option) => ({
        id: option.navigationTarget,
        icon: option.icon,
        label: option.label,
        iconWidth: option.iconWidth,
        iconHeight: option.iconHeight,
      })),
    ],
    []
  );

  const scrollRef = useRef<ScrollView | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const scrollXRef = useRef(0);
  const lastScrollTargetRef = useRef<number | null>(null);

  const handleTabLayout = (tabId: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    tabLayouts.current[tabId] = { x, width };
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollXRef.current = e.nativeEvent.contentOffset.x;
  };

  useEffect(() => {
    const layout = tabLayouts.current[activeTab];
    if (!layout || viewportWidth <= 0) return;

    // Ensure active tab is visible inside the viewport.
    const leftPadding = 16 * scaleX;
    const rightPadding = 16 * scaleX;
    const visibleStart = scrollXRef.current;
    const visibleEnd = scrollXRef.current + viewportWidth;

    const tabStart = layout.x;
    const tabEnd = layout.x + layout.width;

    let targetX: number | null = null;
    if (tabStart < visibleStart + leftPadding) {
      targetX = Math.max(0, tabStart - leftPadding);
    } else if (tabEnd > visibleEnd - rightPadding) {
      targetX = Math.max(0, tabEnd - viewportWidth + rightPadding);
    }

    if (targetX != null) {
      // Avoid re-trigger loops (layout + effect) that can feel jittery.
      const last = lastScrollTargetRef.current;
      if (last == null || Math.abs(last - targetX) > 2) {
        lastScrollTargetRef.current = targetX;
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ x: targetX!, animated: true });
        });
      }
    }
  }, [activeTab, viewportWidth, scaleX]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <ScrollView
        ref={(r) => {
          scrollRef.current = r;
        }}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onLayout={(e) => setViewportWidth(e.nativeEvent.layout.width)}
        decelerationRate="fast"
      >
        {tabs.map((tab) => (
          <View
            key={tab.id}
            style={styles.tabItemContainer}
            onLayout={handleTabLayout(tab.id)}
          >
            <TabBarItem
              icon={tab.icon}
              label={tab.label}
              active={activeTab === tab.id}
              badge={
                tab.id === 'Chat' && chatBadgeCount > 0
                  ? chatBadgeCount
                  : tab.id === 'Tickets' && ticketsBadgeCount > 0
                    ? ticketsBadgeCount
                    : tab.id === 'Rooms' && roomsAssignmentCount > 0
                      ? roomsAssignmentCount
                      : undefined
              }
              onPress={() =>
                onTabPress(
                  tab.id,
                  tab.id === 'Rooms' && roomsAssignmentCount > 0 ? { fromRoomsAssignmentBadge: true } : undefined
                )
              }
              iconWidth={tab.iconWidth}
              iconHeight={tab.iconHeight}
              iconOffsetX={'iconOffsetX' in tab ? (tab as any).iconOffsetX : 0}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function buildBottomTabBarStyles(scaleX: number) {
  return StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      minHeight: 152 * scaleX,
      backgroundColor: colors.background.primary,
      borderTopWidth: 1,
      borderTopColor: '#e6e6e6',
      shadowColor: 'rgba(100,131,176,0.4)',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: (105.1 * scaleX) / 3,
      elevation: 8,
      zIndex: 100,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16 * scaleX,
      height: '100%',
    },
    tabItemContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      // Fixed slot width prevents “some tabs not centered” due to varying padding/label lengths.
      width: 96 * scaleX,
      marginHorizontal: 6 * scaleX,
    },
  });
}
