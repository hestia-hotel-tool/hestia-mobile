import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, LayoutChangeEvent, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { colors } from '@/theme';
import TabBarItem from './TabBarItem';
import { MORE_MENU_OPTIONS } from '@/types/more.types';
import type { ReturnToTab } from '@/types/navigation';
import { useDesignScale } from '@/hooks/useDesignScale';
import { useBottomTabBadges } from '../hooks/useBottomTabBadges';
import { getAllowedTabs, isTabAllowed } from '@/config/rolePermissions';

export type TabPressOptions = { fromRoomsAssignmentBadge?: boolean };

interface BottomTabBarProps {
  activeTab: string;
  onTabPress?: (tab: string, options?: TabPressOptions) => void;
  onMorePress?: () => void;
  role?: string | null;
}

/** Registered expo-router route name for each tab's screen. */
const TAB_ROUTE_NAMES: Record<string, string> = {
  Home: '(home)/index',
  Rooms: '(rooms)/index',
  Chat: '(chats)/index',
  Tickets: '(tickets)/index',
  LostAndFound: '(lost_and_found)/index',
  Staff: '(staff)/index',
  Settings: '(settings)/index',
};

/** Route name used as the `returnToTab` param, keyed by the currently active tab. */
const TAB_RETURN_ROUTE: Record<string, ReturnToTab> = {
  Home: '(home)/index',
  Rooms: '(rooms)/index',
  Chat: '(chats)/index',
  Tickets: '(tickets)/index',
  LostAndFound: '(lost_and_found)/index',
  Staff: '(staff)/index',
  Settings: '(settings)/index',
};

const MAIN_TABS = [
  {
    id: 'Home',
    icon: require('../../assets/icons/home-icon.png'),
    label: 'Home',
    iconWidth: 56,
    iconHeight: 56,
  },
  {
    id: 'Rooms',
    icon: require('../../assets/icons/rooms-icon.png'),
    label: 'Rooms',
    iconWidth: 70,
    iconHeight: 56,
  },
  {
    id: 'Chat',
    icon: require('../../assets/icons/chat-icon.png'),
    label: 'Chat',
    iconWidth: 56,
    iconHeight: 56,
    iconOffsetX: -2,
  },
  {
    id: 'Tickets',
    icon: require('../../assets/icons/tickets-icon.png'),
    label: 'Tickets',
    iconWidth: 49,
    iconHeight: 54,
    iconOffsetX: -3,
  },
  {
    id: 'AIHome',
    icon: require('../../assets/icons/ai-home-icon.png'),
    label: '',
    iconWidth: 56,
    iconHeight: 56,
  },
];

export default function BottomTabBar({ activeTab, onTabPress, onMorePress, role }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { scaleX } = useDesignScale();
  const styles = useMemo(() => buildBottomTabBarStyles(scaleX), [scaleX]);
  const { chatBadgeCount, ticketsBadgeCount, roomsAssignmentCount } = useBottomTabBadges();

  const tabs = useMemo(
    () => {
      const all = [
        ...MAIN_TABS,
        ...MORE_MENU_OPTIONS.map((option) => ({
          id: option.navigationTarget,
          icon: option.icon,
          label: option.label,
          iconWidth: option.iconWidth,
          iconHeight: option.iconHeight,
        })),
      ];
      return role ? all.filter((t) => isTabAllowed(t.id, role)) : all;
    },
    [role]
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

  const handleTabPress = (tabId: string, options?: TabPressOptions) => {
    // AI Home is not a navigable route - let the screen handle it (opens the AI overlay).
    if (tabId === 'AIHome') {
      onTabPress?.(tabId);
      return;
    }
    onTabPress?.(tabId, options);
    const routeName = TAB_ROUTE_NAMES[tabId];
    if (!routeName) return;
    if (tabId === 'Rooms') {
      (navigation as any).navigate(routeName, {
        prioritizeMyAssignedRooms: !!options?.fromRoomsAssignmentBadge,
      });
    } else if (tabId === 'LostAndFound' || tabId === 'Staff' || tabId === 'Settings') {
      (navigation as any).navigate(routeName, {
        returnToTab: TAB_RETURN_ROUTE[activeTab] ?? '(home)/index',
      });
    } else {
      (navigation as any).navigate(routeName);
    }
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
                handleTabPress(
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
