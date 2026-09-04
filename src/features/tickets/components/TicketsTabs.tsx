import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { typography } from '@/theme';
import { scaleX } from '../constants/ticketsStyles';
import {
  TICKETS_TABS,
  TICKETS_COLORS,
  TICKETS_TYPOGRAPHY,
} from '../constants/ticketsStyles';
import type { TicketTab } from '../types/tickets.types';

interface TicketsTabsProps {
  selectedTab: TicketTab;
  onTabPress: (tab: TicketTab) => void;
}

export default function TicketsTabs({ selectedTab, onTabPress }: TicketsTabsProps) {
  const tabs = [
    { id: 'myTickets' as TicketTab, label: 'My Tickets' },
    { id: 'all' as TicketTab, label: 'All' },
    { id: 'open' as TicketTab, label: 'Open' },
    { id: 'closed' as TicketTab, label: 'Closed' },
  ];

  const [textWidths, setTextWidths] = useState<Record<TicketTab, number>>({
    myTickets: 0,
    all: 0,
    open: 0,
    closed: 0,
  });

  const [tabPositions, setTabPositions] = useState<Record<TicketTab, { x: number; width: number }>>({
    myTickets: { x: 0, width: 0 },
    all: { x: 0, width: 0 },
    open: { x: 0, width: 0 },
    closed: { x: 0, width: 0 },
  });

  const tabsWrapperRef = useRef<View>(null);

  // Calculate indicator position based on measured tab positions
  const getIndicatorPosition = () => {
    const selectedTabConfig = TICKETS_TABS.tabs[selectedTab] as { width: number; indicatorWidth?: number };
    const selectedTabPos = tabPositions[selectedTab];
    
    if (selectedTabPos.width === 0) {
      // Fallback to calculated width if not measured yet
      const textWidth = textWidths[selectedTab] || (selectedTabConfig.width * scaleX);
      return { left: 0, width: (selectedTabConfig.indicatorWidth || selectedTabConfig.width) * scaleX };
    }
    
    // Indicator width from Figma (may be wider than text for "My Tickets")
    const indicatorWidth = (selectedTabConfig.indicatorWidth || selectedTabConfig.width) * scaleX;
    
    // Calculate center of selected tab text
    const selectedTabCenter = selectedTabPos.x + (selectedTabPos.width / 2);
    
    // Position indicator centered under the selected tab text
    const indicatorLeft = selectedTabCenter - (indicatorWidth / 2);
    
    return { left: indicatorLeft, width: indicatorWidth };
  };

  const indicatorPos = getIndicatorPosition();

  return (
    <View style={styles.container}>
      <View 
        ref={tabsWrapperRef}
        style={styles.tabsWrapper}
      >
        {tabs.map((tab, index) => {
          const tabConfig = TICKETS_TABS.tabs[tab.id];
          const isLast = index === tabs.length - 1;
          
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                !isLast && { marginRight: TICKETS_TABS.tab.spacing * scaleX },
              ]}
              onPress={() => onTabPress(tab.id)}
              activeOpacity={0.7}
              onLayout={(event) => {
                const { x, width } = event.nativeEvent.layout;
                // x is already relative to the parent (tabsWrapper)
                setTabPositions((prev) => ({
                  ...prev,
                  [tab.id]: { x, width },
                }));
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  tab.id === 'myTickets' 
                    ? styles.tabTextMyTickets 
                    : (selectedTab === tab.id ? styles.tabTextActive : styles.tabTextInactive),
                ]}
                onLayout={(event) => {
                  const { width } = event.nativeEvent.layout;
                  if (textWidths[tab.id] !== width) {
                    setTextWidths((prev) => ({
                      ...prev,
                      [tab.id]: width,
                    }));
                  }
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: TICKETS_TABS.container.top * scaleX,
    left: 0,
    right: 0,
    height: TICKETS_TABS.container.height * scaleX,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  tabsWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  tab: {
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  tabText: {
    fontSize: 16 * scaleX, // font-size: 16px
    fontFamily: typography.fontFamily.regular,
    color: '#5A759D', // color: #5A759D
    lineHeight: 16 * scaleX, // line-height: normal (same as font-size)
    includeFontPadding: false, // Remove extra padding on Android
    textAlignVertical: 'top', // Align to top for consistent baseline
  },
  tabTextMyTickets: {
    fontWeight: '700' as any, // font-weight: 700 for "My Tickets"
  },
  tabTextActive: {
    fontWeight: '700' as any, // font-weight: 700 for selected tabs (other than My Tickets)
    color: '#5A759D',
  },
  tabTextInactive: {
    fontWeight: '300' as any, // font-weight: 300 for inactive tabs (other than My Tickets)
    color: '#5A759D',
  },
  indicator: {
    position: 'absolute',
    top: (TICKETS_TABS.indicator.top - TICKETS_TABS.container.top - 10) * scaleX, // Spacing: 31px - 10px = 21px from container top
    height: TICKETS_TABS.indicator.height * scaleX,
    backgroundColor: TICKETS_TABS.indicator.backgroundColor,
    borderRadius: TICKETS_TABS.indicator.borderRadius * scaleX,
  },
});

