# Staff Screen Implementation Plan

## Overview
This document outlines the implementation plan for the Staff screen based on the Figma design (node-id: 843-7). The screen displays staff members currently on shift with their task progress, statistics, and current assignments.

## Design Analysis

### Screen Structure
1. **Header Section** (top: 0, height: 133px)
   - Light blue background (#e4eefe)
   - Back arrow button (left: 27px, top: 69px)
   - "Staff" title (centered, bold, #607aa1, 24px)
   - Search icon (right side, top: 158px)

2. **Tab Navigation** (top: 158px, height: 39px)
   - Tabs: "On Shift", "AM", "PM", "Departments"
   - Active tab indicator: 4px blue bar (#5a759d) below active tab
   - Active tab: Bold text (#5a759d)
   - Inactive tabs: Light text (rgba(90,117,157,0.55))
   - Divider line below tabs

3. **Date Display** (top: 218px)
   - Format: "Mon 23 Feb 2025"
   - Font: Inter SemiBold, 11px, black
   - Position: left: 23px

4. **Staff Cards List** (scrollable, starting at top: 253px)
   - Each card: 401px width, 156px height (or 131px for some)
   - Background: #f9fafc
   - Border: 1px solid #e3e3e3
   - Border radius: 9px
   - Centered horizontally

### Staff Card Components

Each staff card contains:

1. **Avatar/Initial** (left: 42px, top: varies)
   - Size: 29×29px
   - Circular with border radius
   - Shows profile picture or initial letter on colored background

2. **Staff Name** (left: 77px, top: varies)
   - Font: Helvetica Bold, 16px, #1e1e1e
   - Examples: "Anna Sube", "Vasilis Baoss", "Yenchai Manis", "Poali Bason"

3. **Progress Ratio** (right: 367px, top: varies)
   - Format: "X/7" (completed/total)
   - Font: Helvetica Bold, 16px, black
   - Right-aligned

4. **Progress Bar** (left: 42px, top: varies)
   - Height: 9px
   - Completed portion: Pink (#ff4dd8) with rounded corners
   - Remaining portion: Light grey (#cdd3dd) with rounded corners
   - Width varies based on completion percentage

5. **Task Statistics** (left: 42px, top: varies)
   - Three categories displayed horizontally:
     - "Inprogress. X" (left: 42px)
     - "Cleaned. X" (left: 168px)
     - "Dirty. X" (left: 291px)
   - Font: Helvetica Light, 16px, black
   - Numbers in bold

6. **Current Task** (optional, left: 44px or 39px, top: varies)
   - Yellow circular background (#f7eecf, 34×34px)
   - Bell icon inside circle
   - "Room 301" text in yellow (#f0be1b, 13px, bold)
   - Timer text below:
     - Red (#f92424) if active: "00:50:23"
     - Black (#1e1e1e) if completed: "00:00:23"

## File Structure

```
src/
├── screens/
│   └── StaffScreen.tsx (MODIFY - replace placeholder)
├── components/
│   └── staff/
│       ├── StaffHeader.tsx (NEW)
│       ├── StaffTabs.tsx (NEW)
│       ├── StaffCard.tsx (NEW)
│       └── StaffCardProgressBar.tsx (NEW)
├── constants/
│   └── staffStyles.ts (NEW)
└── types/
    └── staff.types.ts (NEW)
```

## Implementation Steps

### Step 1: Create Type Definitions

**File: `src/types/staff.types.ts`**

```typescript
export type StaffTab = 'onShift' | 'am' | 'pm' | 'departments';

export interface StaffMember {
  id: string;
  name: string;
  avatar?: any; // Image source
  initials?: string; // Single letter for avatar
  avatarColor?: string; // Background color for initial circle
  progressRatio: {
    completed: number;
    total: number;
  };
  taskStats: {
    inProgress: number;
    cleaned: number;
    dirty: number;
  };
  currentTask?: {
    roomNumber: string;
    timer: string; // Format: "00:50:23"
    isActive: boolean; // If true, timer is red; if false, black
  };
}

export interface StaffScreenData {
  date: string; // Format: "Mon 23 Feb 2025"
  staffMembers: StaffMember[];
}
```

### Step 2: Create Style Constants

**File: `src/constants/staffStyles.ts`**

```typescript
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
export const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

export const STAFF_HEADER = {
  height: 133,
  background: {
    height: 133,
    backgroundColor: '#e4eefe',
  },
  backButton: {
    left: 27,
    top: 69,
    width: 32,
    height: 32,
  },
  title: {
    left: 69, // Centered with back button
    top: 69,
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#607aa1',
  },
  searchIcon: {
    right: 32, // Approximate
    top: 158,
    width: 19,
    height: 19,
  },
} as const;

export const STAFF_TABS = {
  container: {
    top: 158,
    height: 39,
  },
  tab: {
    fontSize: 16,
    fontWeight: 'light' as const,
    activeFontWeight: 'bold' as const,
    color: '#5a759d',
    inactiveColor: 'rgba(90,117,157,0.55)',
  },
  tabs: {
    onShift: {
      left: 32,
      top: 158,
      width: 68,
      indicatorWidth: 68,
      indicatorLeft: 32,
    },
    am: {
      left: 131,
      top: 158,
      width: 20, // Approximate
      indicatorWidth: 20,
      indicatorLeft: 131,
    },
    pm: {
      left: 198,
      top: 158,
      width: 20, // Approximate
      indicatorWidth: 20,
      indicatorLeft: 198,
    },
    departments: {
      left: 256,
      top: 158,
      width: 90, // Approximate
      indicatorWidth: 90,
      indicatorLeft: 256,
    },
  },
  indicator: {
    height: 4,
    backgroundColor: '#5a759d',
    borderRadius: 2,
    top: 192, // 34px from container top
  },
  divider: {
    top: 197,
    height: 1,
    width: 448,
    color: '#e3e3e3',
  },
} as const;

export const STAFF_DATE = {
  top: 218,
  left: 23,
  fontSize: 11,
  fontWeight: 'semiBold' as const,
  color: '#000000',
  fontFamily: 'Inter',
} as const;

export const STAFF_CARD = {
  width: 401,
  height: {
    standard: 156,
    compact: 131, // For cards without current task
  },
  borderRadius: 9,
  backgroundColor: '#f9fafc',
  borderColor: '#e3e3e3',
  borderWidth: 1,
  marginHorizontal: 17,
  marginBottom: 20,
  avatar: {
    left: 42,
    top: 16, // Relative to card top
    width: 29,
    height: 29,
    borderRadius: 14.5,
  },
  name: {
    left: 77,
    top: 16, // Relative to card top
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#1e1e1e',
  },
  progressRatio: {
    right: 34, // 367px from left, so right = 401 - 367 = 34
    top: 18, // Relative to card top
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  progressBar: {
    left: 42,
    top: 50, // Relative to card top
    height: 9,
    borderRadius: 27, // For rounded ends
    completedColor: '#ff4dd8',
    remainingColor: '#cdd3dd',
  },
  taskStats: {
    top: 65, // Relative to card top
    fontSize: 16,
    fontWeight: 'light' as const,
    color: '#000000',
    inProgress: {
      left: 42,
    },
    cleaned: {
      left: 168,
    },
    dirty: {
      left: 291,
    },
  },
  currentTask: {
    top: 106, // Relative to card top
    circle: {
      left: 44, // or 39 for some cards
      width: 34,
      height: 34,
      borderRadius: 37,
      backgroundColor: '#f7eecf',
    },
    bellIcon: {
      width: 20, // Approximate
      height: 20,
    },
    roomText: {
      left: 80, // Approximate, centered with circle
      fontSize: 13,
      fontWeight: 'bold' as const,
      color: '#f0be1b',
    },
    timer: {
      left: 80, // or 83 for some cards
      top: 17, // Relative to currentTask top
      fontSize: 13,
      fontWeight: 'regular' as const,
      activeColor: '#f92424',
      inactiveColor: '#1e1e1e',
    },
  },
} as const;
```

### Step 3: Create Staff Header Component

**File: `src/components/staff/StaffHeader.tsx`**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { typography } from '../../theme';
import { scaleX, STAFF_HEADER } from '../../constants/staffStyles';

interface StaffHeaderProps {
  onBackPress?: () => void;
  onSearchPress?: () => void;
}

export default function StaffHeader({
  onBackPress,
  onSearchPress,
}: StaffHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.background} />
      
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBackPress}
        activeOpacity={0.7}
      >
        <Image
          source={require('../../../assets/icons/back-arrow.png')}
          style={styles.backArrow}
          resizeMode="contain"
          tintColor="#607aa1"
        />
      </TouchableOpacity>
      
      {/* Title */}
      <Text style={styles.title}>Staff</Text>
      
      {/* Search Icon */}
      {onSearchPress && (
        <TouchableOpacity
          style={styles.searchButton}
          onPress={onSearchPress}
          activeOpacity={0.7}
        >
          <Image
            source={require('../../../assets/icons/search-icon.png')}
            style={styles.searchIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    height: STAFF_HEADER.height * scaleX,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: STAFF_HEADER.height * scaleX,
    backgroundColor: STAFF_HEADER.background.backgroundColor,
  },
  backButton: {
    position: 'absolute',
    left: STAFF_HEADER.backButton.left * scaleX,
    top: STAFF_HEADER.backButton.top * scaleX,
    width: STAFF_HEADER.backButton.width * scaleX,
    height: STAFF_HEADER.backButton.height * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    width: 14 * scaleX,
    height: 14 * scaleX,
  },
  title: {
    position: 'absolute',
    left: STAFF_HEADER.title.left * scaleX,
    top: STAFF_HEADER.title.top * scaleX,
    fontSize: STAFF_HEADER.title.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: STAFF_HEADER.title.color,
  },
  searchButton: {
    position: 'absolute',
    right: STAFF_HEADER.searchIcon.right * scaleX,
    top: STAFF_HEADER.searchIcon.top * scaleX,
    width: STAFF_HEADER.searchIcon.width * scaleX,
    height: STAFF_HEADER.searchIcon.height * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    width: STAFF_HEADER.searchIcon.width * scaleX,
    height: STAFF_HEADER.searchIcon.height * scaleX,
  },
});
```

### Step 4: Create Staff Tabs Component

**File: `src/components/staff/StaffTabs.tsx`**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { typography } from '../../theme';
import { scaleX, STAFF_TABS } from '../../constants/staffStyles';
import { StaffTab } from '../../types/staff.types';

interface StaffTabsProps {
  selectedTab: StaffTab;
  onTabPress: (tab: StaffTab) => void;
}

export default function StaffTabs({ selectedTab, onTabPress }: StaffTabsProps) {
  const tabs: { id: StaffTab; label: string }[] = [
    { id: 'onShift', label: 'On Shift' },
    { id: 'am', label: 'AM' },
    { id: 'pm', label: 'PM' },
    { id: 'departments', label: 'Departments' },
  ];

  const getIndicatorPosition = () => {
    const selectedTabConfig = STAFF_TABS.tabs[selectedTab];
    return {
      left: selectedTabConfig.indicatorLeft * scaleX,
      width: selectedTabConfig.indicatorWidth * scaleX,
    };
  };

  const indicatorPos = getIndicatorPosition();

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
    position: 'relative',
    marginTop: STAFF_TABS.container.top * scaleX,
    height: STAFF_TABS.container.height * scaleX,
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
  indicator: {
    position: 'absolute',
    top: STAFF_TABS.indicator.top * scaleX,
    height: STAFF_TABS.indicator.height * scaleX,
    backgroundColor: STAFF_TABS.indicator.backgroundColor,
    borderRadius: STAFF_TABS.indicator.borderRadius * scaleX,
  },
  divider: {
    position: 'absolute',
    top: STAFF_TABS.divider.top * scaleX,
    left: '50%',
    marginLeft: -(STAFF_TABS.divider.width / 2) * scaleX,
    width: STAFF_TABS.divider.width * scaleX,
    height: STAFF_TABS.divider.height * scaleX,
    backgroundColor: STAFF_TABS.divider.color,
  },
});
```

### Step 5: Create Staff Card Progress Bar Component

**File: `src/components/staff/StaffCardProgressBar.tsx`**

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { scaleX, STAFF_CARD } from '../../constants/staffStyles';

interface StaffCardProgressBarProps {
  completed: number;
  total: number;
  width?: number; // Total width of progress bar
}

export default function StaffCardProgressBar({
  completed,
  total,
  width = 343, // 401 - 42 (left) - 16 (right padding) = 343
}: StaffCardProgressBarProps) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const completedWidth = (width * percentage) / 100;
  const remainingWidth = width - completedWidth;

  return (
    <View style={[styles.container, { width: width * scaleX }]}>
      {/* Completed portion */}
      {completedWidth > 0 && (
        <View
          style={[
            styles.completedBar,
            {
              width: completedWidth * scaleX,
              borderTopLeftRadius: STAFF_CARD.progressBar.borderRadius * scaleX,
              borderBottomLeftRadius: STAFF_CARD.progressBar.borderRadius * scaleX,
              borderTopRightRadius: completedWidth === width ? STAFF_CARD.progressBar.borderRadius * scaleX : 0,
              borderBottomRightRadius: completedWidth === width ? STAFF_CARD.progressBar.borderRadius * scaleX : 0,
            },
          ]}
        />
      )}
      
      {/* Remaining portion */}
      {remainingWidth > 0 && (
        <View
          style={[
            styles.remainingBar,
            {
              width: remainingWidth * scaleX,
              marginLeft: completedWidth > 0 ? 0 : 0,
              borderTopRightRadius: STAFF_CARD.progressBar.borderRadius * scaleX,
              borderBottomRightRadius: STAFF_CARD.progressBar.borderRadius * scaleX,
              borderTopLeftRadius: completedWidth === 0 ? STAFF_CARD.progressBar.borderRadius * scaleX : 0,
              borderBottomLeftRadius: completedWidth === 0 ? STAFF_CARD.progressBar.borderRadius * scaleX : 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: STAFF_CARD.progressBar.height * scaleX,
    flexDirection: 'row',
  },
  completedBar: {
    height: STAFF_CARD.progressBar.height * scaleX,
    backgroundColor: STAFF_CARD.progressBar.completedColor,
  },
  remainingBar: {
    height: STAFF_CARD.progressBar.height * scaleX,
    backgroundColor: STAFF_CARD.progressBar.remainingColor,
  },
});
```

### Step 6: Create Staff Card Component

**File: `src/components/staff/StaffCard.tsx`**

```typescript
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { typography } from '../../theme';
import { scaleX, STAFF_CARD } from '../../constants/staffStyles';
import { StaffMember } from '../../types/staff.types';
import StaffCardProgressBar from './StaffCardProgressBar';

interface StaffCardProps {
  staff: StaffMember;
}

export default function StaffCard({ staff }: StaffCardProps) {
  const hasCurrentTask = !!staff.currentTask;
  const cardHeight = hasCurrentTask
    ? STAFF_CARD.height.standard
    : STAFF_CARD.height.compact;

  return (
    <View style={[styles.container, { height: cardHeight * scaleX }]}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {staff.avatar ? (
          <Image
            source={staff.avatar}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : staff.initials ? (
          <View
            style={[
              styles.initialsCircle,
              { backgroundColor: staff.avatarColor || '#5a759d' },
            ]}
          >
            <Text style={styles.initialsText}>{staff.initials}</Text>
          </View>
        ) : null}
      </View>

      {/* Name */}
      <Text style={styles.name}>{staff.name}</Text>

      {/* Progress Ratio */}
      <Text style={styles.progressRatio}>
        {staff.progressRatio.completed}/{staff.progressRatio.total}
      </Text>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <StaffCardProgressBar
          completed={staff.progressRatio.completed}
          total={staff.progressRatio.total}
        />
      </View>

      {/* Task Statistics */}
      <View style={styles.taskStatsContainer}>
        <Text style={styles.taskStat}>
          <Text style={styles.taskStatLabel}>Inprogress. </Text>
          <Text style={styles.taskStatValue}>{staff.taskStats.inProgress}</Text>
        </Text>
        <Text style={[styles.taskStat, styles.taskStatCleaned]}>
          <Text style={styles.taskStatLabel}>Cleaned. </Text>
          <Text style={styles.taskStatValue}>{staff.taskStats.cleaned}</Text>
        </Text>
        <Text style={[styles.taskStat, styles.taskStatDirty]}>
          <Text style={styles.taskStatLabel}>Dirty. </Text>
          <Text style={styles.taskStatValue}>{staff.taskStats.dirty}</Text>
        </Text>
      </View>

      {/* Current Task */}
      {hasCurrentTask && (
        <View style={styles.currentTaskContainer}>
          <View style={styles.currentTaskCircle}>
            <Image
              source={require('../../../assets/icons/bell-icon.png')} // Update with correct icon
              style={styles.bellIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.roomText}>Room {staff.currentTask.roomNumber}</Text>
          <Text
            style={[
              styles.timer,
              {
                color: staff.currentTask.isActive
                  ? STAFF_CARD.currentTask.timer.activeColor
                  : STAFF_CARD.currentTask.timer.inactiveColor,
              },
            ]}
          >
            {staff.currentTask.timer}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: STAFF_CARD.width * scaleX,
    backgroundColor: STAFF_CARD.backgroundColor,
    borderWidth: STAFF_CARD.borderWidth * scaleX,
    borderColor: STAFF_CARD.borderColor,
    borderRadius: STAFF_CARD.borderRadius * scaleX,
    marginHorizontal: STAFF_CARD.marginHorizontal * scaleX,
    marginBottom: STAFF_CARD.marginBottom * scaleX,
    position: 'relative',
  },
  avatarContainer: {
    position: 'absolute',
    left: STAFF_CARD.avatar.left * scaleX,
    top: STAFF_CARD.avatar.top * scaleX,
    width: STAFF_CARD.avatar.width * scaleX,
    height: STAFF_CARD.avatar.height * scaleX,
  },
  avatar: {
    width: STAFF_CARD.avatar.width * scaleX,
    height: STAFF_CARD.avatar.height * scaleX,
    borderRadius: STAFF_CARD.avatar.borderRadius * scaleX,
  },
  initialsCircle: {
    width: STAFF_CARD.avatar.width * scaleX,
    height: STAFF_CARD.avatar.height * scaleX,
    borderRadius: STAFF_CARD.avatar.borderRadius * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#ffffff',
  },
  name: {
    position: 'absolute',
    left: STAFF_CARD.name.left * scaleX,
    top: STAFF_CARD.name.top * scaleX,
    fontSize: STAFF_CARD.name.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: STAFF_CARD.name.color,
  },
  progressRatio: {
    position: 'absolute',
    right: STAFF_CARD.progressRatio.right * scaleX,
    top: STAFF_CARD.progressRatio.top * scaleX,
    fontSize: STAFF_CARD.progressRatio.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: STAFF_CARD.progressRatio.color,
  },
  progressBarContainer: {
    position: 'absolute',
    left: STAFF_CARD.progressBar.left * scaleX,
    top: STAFF_CARD.progressBar.top * scaleX,
  },
  taskStatsContainer: {
    position: 'absolute',
    left: 0,
    top: STAFF_CARD.taskStats.top * scaleX,
    width: '100%',
  },
  taskStat: {
    position: 'absolute',
    fontSize: STAFF_CARD.taskStats.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.light as any,
    color: STAFF_CARD.taskStats.color,
  },
  taskStatCleaned: {
    left: STAFF_CARD.taskStats.cleaned.left * scaleX,
  },
  taskStatDirty: {
    left: STAFF_CARD.taskStats.dirty.left * scaleX,
  },
  taskStatLabel: {
    fontWeight: typography.fontWeights.light as any,
  },
  taskStatValue: {
    fontWeight: typography.fontWeights.bold as any,
  },
  currentTaskContainer: {
    position: 'absolute',
    left: STAFF_CARD.currentTask.circle.left * scaleX,
    top: STAFF_CARD.currentTask.top * scaleX,
  },
  currentTaskCircle: {
    width: STAFF_CARD.currentTask.circle.width * scaleX,
    height: STAFF_CARD.currentTask.circle.height * scaleX,
    borderRadius: STAFF_CARD.currentTask.circle.borderRadius * scaleX,
    backgroundColor: STAFF_CARD.currentTask.circle.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellIcon: {
    width: STAFF_CARD.currentTask.bellIcon.width * scaleX,
    height: STAFF_CARD.currentTask.bellIcon.height * scaleX,
  },
  roomText: {
    position: 'absolute',
    left: STAFF_CARD.currentTask.roomText.left * scaleX,
    top: 0,
    fontSize: STAFF_CARD.currentTask.roomText.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: STAFF_CARD.currentTask.roomText.color,
  },
  timer: {
    position: 'absolute',
    left: STAFF_CARD.currentTask.timer.left * scaleX,
    top: STAFF_CARD.currentTask.timer.top * scaleX,
    fontSize: STAFF_CARD.currentTask.timer.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
  },
});
```

### Step 7: Update Staff Screen

**File: `src/screens/StaffScreen.tsx`**

Replace the entire file with the new implementation:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { colors, typography } from '../theme';
import BottomTabBar from '../components/navigation/BottomTabBar';
import MorePopup from '../components/more/MorePopup';
import { mockHomeData } from '../data/mockHomeData';
import { MoreMenuItemId } from '../types/more.types';
import StaffHeader from '../components/staff/StaffHeader';
import StaffTabs from '../components/staff/StaffTabs';
import StaffCard from '../components/staff/StaffCard';
import { StaffTab, StaffMember } from '../types/staff.types';
import { scaleX, STAFF_DATE } from '../constants/staffStyles';

const DESIGN_WIDTH = 440;

type MainTabsParamList = {
  Home: undefined;
  Rooms: undefined;
  Chat: undefined;
  Tickets: undefined;
  LostAndFound: undefined;
  Staff: undefined;
  Settings: undefined;
};

type StaffScreenNavigationProp = NativeStackNavigationProp<MainTabsParamList, 'Staff'>;

// Mock data - replace with actual API call
const mockStaffData: StaffMember[] = [
  {
    id: '1',
    name: 'Anna Sube',
    initials: 'A',
    avatarColor: '#cdd3dd',
    progressRatio: { completed: 3, total: 7 },
    taskStats: { inProgress: 1, cleaned: 3, dirty: 3 },
    currentTask: {
      roomNumber: '301',
      timer: '00:30:23',
      isActive: true,
    },
  },
  {
    id: '2',
    name: 'Vasilis Baoss',
    initials: 'V',
    avatarColor: '#5a759d',
    progressRatio: { completed: 3, total: 7 },
    taskStats: { inProgress: 0, cleaned: 1, dirty: 6 },
  },
  {
    id: '3',
    name: 'Yenchai Manis',
    avatar: require('../../assets/icons/staff-icon.png'), // Use actual avatar
    progressRatio: { completed: 2, total: 7 },
    taskStats: { inProgress: 1, cleaned: 2, dirty: 4 },
    currentTask: {
      roomNumber: '301',
      timer: '00:50:23',
      isActive: true,
    },
  },
  {
    id: '4',
    name: 'Poali Bason',
    avatar: require('../../assets/icons/staff-icon.png'), // Use actual avatar
    progressRatio: { completed: 4, total: 7 },
    taskStats: { inProgress: 1, cleaned: 4, dirty: 2 },
    currentTask: {
      roomNumber: '301',
      timer: '00:00:23',
      isActive: false,
    },
  },
];

export default function StaffScreen() {
  const navigation = useNavigation<StaffScreenNavigationProp>();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;
  
  const [activeTab, setActiveTab] = useState('Home');
  const [showMorePopup, setShowMorePopup] = useState(false);
  const [selectedTab, setSelectedTab] = useState<StaffTab>('onShift');
  const [staffMembers] = useState<StaffMember[]>(mockStaffData);

  // Format current date
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    setShowMorePopup(false);
    navigation.navigate(tab as keyof MainTabsParamList);
  };

  const handleMorePress = () => {
    setShowMorePopup(true);
  };

  const handleMenuItemPress = (menuItem: MoreMenuItemId) => {
    setShowMorePopup(false);
    switch (menuItem) {
      case 'lostAndFound':
        navigation.navigate('LostAndFound');
        break;
      case 'staff':
        navigation.navigate('Staff');
        break;
      case 'settings':
        navigation.navigate('Settings');
        break;
      default:
        break;
    }
  };

  const handleClosePopup = () => {
    setShowMorePopup(false);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSearch = () => {
    // TODO: Implement search functionality
    console.log('Search pressed');
  };

  const handleStaffTabPress = (tab: StaffTab) => {
    setSelectedTab(tab);
    // TODO: Filter staff members based on selected tab
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    content: {
      flex: 1,
    },
    contentBlurOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1,
    },
    blurOverlayDarkener: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(200, 200, 200, 0.6)',
    },
    dateText: {
      marginTop: STAFF_DATE.top * scaleX,
      marginLeft: STAFF_DATE.left * scaleX,
      fontSize: STAFF_DATE.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: typography.fontWeights.semiBold as any,
      color: STAFF_DATE.color,
    },
    staffList: {
      paddingTop: 20 * scaleX,
      paddingBottom: 152 * scaleX, // Space for bottom tab bar
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <StaffHeader
          onBackPress={handleBack}
          onSearchPress={handleSearch}
        />

        {/* Tabs */}
        <StaffTabs
          selectedTab={selectedTab}
          onTabPress={handleStaffTabPress}
        />

        {/* Date */}
        <Text style={styles.dateText}>{formattedDate}</Text>

        {/* Staff List */}
        <ScrollView
          style={styles.staffList}
          contentContainerStyle={styles.staffList}
          showsVerticalScrollIndicator={false}
        >
          {staffMembers.map((staff) => (
            <StaffCard key={staff.id} staff={staff} />
          ))}
        </ScrollView>

        {showMorePopup && (
          <BlurView intensity={80} style={styles.contentBlurOverlay} tint="light">
            <View style={styles.blurOverlayDarkener} />
          </BlurView>
        )}
      </View>

      <BottomTabBar
        activeTab={activeTab}
        onTabPress={handleTabPress}
        onMorePress={handleMorePress}
      />

      <MorePopup
        visible={showMorePopup}
        onClose={handleClosePopup}
        onMenuItemPress={handleMenuItemPress}
      />
    </View>
  );
}
```

## Assets Required

1. **Icons:**
   - Back arrow icon (already exists: `assets/icons/back-arrow.png`)
   - Search icon (already exists: `assets/icons/search-icon.png`)
   - Bell icon for current task (may need to extract from Figma or use existing)

2. **Staff Avatars:**
   - Profile pictures for staff members (if available)
   - Or use initials with colored backgrounds

## Testing Checklist

- [ ] Header displays correctly with back button, title, and search icon
- [ ] Tabs navigation works correctly with active indicator
- [ ] Date displays in correct format
- [ ] Staff cards render with all information
- [ ] Progress bars calculate and display correctly
- [ ] Task statistics display correctly
- [ ] Current task displays when available
- [ ] Timer color changes based on active/inactive state
- [ ] Cards are scrollable
- [ ] Tab switching filters staff (when implemented)
- [ ] Search functionality works (when implemented)
- [ ] Responsive scaling works on different screen sizes
- [ ] Navigation works correctly

## Next Steps

1. Implement the components in the order listed
2. Add mock data or API integration
3. Implement tab filtering logic
4. Implement search functionality
5. Add animations/transitions if needed
6. Test on different screen sizes
7. Add error handling and loading states


