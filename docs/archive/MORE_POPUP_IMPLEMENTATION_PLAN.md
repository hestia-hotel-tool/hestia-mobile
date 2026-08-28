# More Popup Implementation Plan

## Overview
Implement a popup menu that appears when the user clicks on the "More" tab in the bottom navigation. The popup displays three menu options: Lost & Found, Staff, and Settings.

---

## 🎨 Design Analysis

### Visual Structure (from Figma)
Based on the Figma design at node `102:583`, the More popup consists of:

1. **Backdrop** (Full screen)
   - Semi-transparent overlay with blur effect
   - Color: `rgba(228, 228, 228, 0.1)`
   - Backdrop blur: `10.45px`
   - Covers entire screen (440px × 1176px)

2. **Popup Container** (More PopUp)
   - Position: Appears above bottom navigation bar
   - Dimensions: `316px × 114.928px`
   - Position from left: `104px` (centered)
   - Position from top: `687px`
   - Background: White with shadow
   - Shadow: `0px 0px 105.1px -35px rgba(100, 131, 176, 0.4)`
   - Border radius: Rounded corners

3. **Menu Items** (3 items, horizontally arranged)
   
   **a) Lost & Found**
   - Position: Left side (`16px` from popup left)
   - Icon size: `36.917px × 40.271px`
   - Text: "Lost & Found"
   - Font: Helvetica Regular, 15px
   - Color: `#5a759d` (primary color)
   - Total item size: `96px × 64px`
   
   **b) Staff**
   - Position: Center (`152px` from popup left)
   - Icon: People/users icon
   - Text: "Staff"
   - Font: Helvetica Regular, 15px
   - Color: `#5a759d`
   - Total item size: `31px × 60px`
   
   **c) Settings**
   - Position: Right side (`245px` from popup left)
   - Icon: Gear/cog icon
   - Text: "Settings"
   - Font: Helvetica Regular, 15px
   - Color: `#5a759d`
   - Total item size: `55px × 61px`

---

## 📁 File Structure

### New Files to Create

```
src/
├── components/
│   └── more/
│       ├── MorePopup.tsx           # Main popup component
│       └── MoreMenuItem.tsx        # Individual menu item component
├── screens/
│   ├── LostAndFoundScreen.tsx     # Lost & Found screen
│   ├── StaffScreen.tsx            # Staff management screen
│   └── SettingsScreen.tsx         # Settings screen
└── types/
    └── more.types.ts              # TypeScript types for More feature
```

### Assets to Download

```
assets/icons/more/
├── lost-found-icon.png            # Lost & Found icon (36.917 × 40.271)
├── staff-icon.png                 # Staff icon
└── settings-icon.png              # Settings icon
```

---

## 🏗️ Component Architecture

### 1. MorePopup Component (`src/components/more/MorePopup.tsx`)

**Purpose**: Container for the popup menu that appears above the bottom navigation

**Props**:
```typescript
interface MorePopupProps {
  visible: boolean;
  onClose: () => void;
  onMenuItemPress: (menuItem: 'lostAndFound' | 'staff' | 'settings') => void;
}
```

**Features**:
- Backdrop with blur effect and tap-to-close
- White card container with shadow
- Animated appearance (fade in/slide up)
- Positioned above bottom navigation
- Responsive to screen dimensions using `scaleX`

**Structure**:
```tsx
<Modal transparent animationType="fade">
  <TouchableOpacity onPress={onClose} style={backdrop}>
    <View style={popupContainer}>
      <MoreMenuItem 
        icon={lostFoundIcon}
        label="Lost & Found"
        onPress={() => onMenuItemPress('lostAndFound')}
      />
      <MoreMenuItem 
        icon={staffIcon}
        label="Staff"
        onPress={() => onMenuItemPress('staff')}
      />
      <MoreMenuItem 
        icon={settingsIcon}
        label="Settings"
        onPress={() => onMenuItemPress('settings')}
      />
    </View>
  </TouchableOpacity>
</Modal>
```

**Styling Calculations** (with scaleX):
```typescript
const scaleX = SCREEN_WIDTH / 440;

popupContainer: {
  width: 316 * scaleX,
  height: 114.928 * scaleX,
  backgroundColor: '#ffffff',
  borderRadius: 12 * scaleX,
  shadowColor: 'rgba(100, 131, 176, 0.4)',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 1,
  shadowRadius: 35 * scaleX,
  elevation: 10,
  position: 'absolute',
  bottom: 172 * scaleX, // Above bottom nav (152px) + spacing
  left: 104 * scaleX,
  flexDirection: 'row',
  justifyContent: 'space-around',
  alignItems: 'center',
  paddingHorizontal: 16 * scaleX,
  paddingVertical: 19 * scaleX,
}

backdrop: {
  flex: 1,
  backgroundColor: 'rgba(228, 228, 228, 0.1)',
  // Note: React Native's BlurView from expo-blur can be used for blur effect
}
```

---

### 2. MoreMenuItem Component (`src/components/more/MoreMenuItem.tsx`)

**Purpose**: Reusable menu item for each option in the popup

**Props**:
```typescript
interface MoreMenuItemProps {
  icon: any; // require() image source
  label: string;
  onPress: () => void;
  iconWidth?: number;
  iconHeight?: number;
}
```

**Structure**:
```tsx
<TouchableOpacity onPress={onPress} style={container}>
  <Image source={icon} style={iconStyle} resizeMode="contain" />
  <Text style={labelStyle}>{label}</Text>
</TouchableOpacity>
```

**Styling**:
```typescript
container: {
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8 * scaleX,
}

icon: {
  width: 40 * scaleX,
  height: 40 * scaleX,
  tintColor: colors.primary.main, // #5a759d
}

label: {
  fontFamily: 'Helvetica',
  fontSize: 15 * scaleX,
  color: colors.primary.main,
  textAlign: 'center',
}
```

---

### 3. MoreScreen Update (`src/screens/MoreScreen.tsx`)

**Current State**: Simple placeholder screen

**Required Changes**:
- Add state for popup visibility
- Toggle popup when More tab is active
- Handle navigation to Lost & Found, Staff, and Settings screens
- Show popup overlay on top of home screen content

**Updated Logic**:
```typescript
export default function MoreScreen() {
  const [showPopup, setShowPopup] = useState(true); // Show by default when navigating to More
  
  const handleMenuItemPress = (menuItem: string) => {
    setShowPopup(false);
    // Navigate to respective screen
    switch(menuItem) {
      case 'lostAndFound':
        navigation.navigate('LostAndFound');
        break;
      case 'staff':
        navigation.navigate('Staff');
        break;
      case 'settings':
        navigation.navigate('Settings');
        break;
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    // Navigate back to Home or previous screen
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      {/* Render underlying content (blurred) */}
      <MorePopup
        visible={showPopup}
        onClose={handleClosePopup}
        onMenuItemPress={handleMenuItemPress}
      />
      <BottomTabBar activeTab="More" onTabPress={handleTabPress} />
    </View>
  );
}
```

---

### 4. Navigation Updates (`src/navigation/AppNavigator.tsx`)

**Add New Screens**:
```typescript
export type MainTabsParamList = {
  Home: undefined;
  Rooms: undefined;
  Chat: undefined;
  Tickets: undefined;
  More: undefined;
  LostAndFound: undefined; // New
  Staff: undefined;        // New
  Settings: undefined;     // New
};

function MainTabs() {
  return (
    <Tab.Navigator>
      {/* Existing screens */}
      <Tab.Screen name="More" component={MoreScreen} />
      
      {/* New screens - hidden from tab bar */}
      <Tab.Screen 
        name="LostAndFound" 
        component={LostAndFoundScreen}
        options={{ tabBarButton: () => null }} // Hide from tab bar
      />
      <Tab.Screen 
        name="Staff" 
        component={StaffScreen}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
}
```

---

### 5. Type Definitions (`src/types/more.types.ts`)

```typescript
export type MoreMenuItem = 'lostAndFound' | 'staff' | 'settings';

export interface MoreMenuOption {
  id: MoreMenuItem;
  label: string;
  icon: any;
  iconWidth?: number;
  iconHeight?: number;
  navigationTarget: string;
}

export const MORE_MENU_OPTIONS: MoreMenuOption[] = [
  {
    id: 'lostAndFound',
    label: 'Lost & Found',
    icon: require('../../assets/icons/more/lost-found-icon.png'),
    iconWidth: 36.917,
    iconHeight: 40.271,
    navigationTarget: 'LostAndFound',
  },
  {
    id: 'staff',
    label: 'Staff',
    icon: require('../../assets/icons/more/staff-icon.png'),
    iconWidth: 27,
    iconHeight: 25,
    navigationTarget: 'Staff',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: require('../../assets/icons/more/settings-icon.png'),
    iconWidth: 27,
    iconHeight: 29,
    navigationTarget: 'Settings',
  },
];
```

---

### 6. Placeholder Screens

**LostAndFoundScreen.tsx**:
```typescript
export default function LostAndFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lost & Found</Text>
      {/* Back button */}
      <BottomTabBar activeTab="More" onTabPress={handleTabPress} />
    </View>
  );
}
```

**StaffScreen.tsx** and **SettingsScreen.tsx**: Similar structure

---

## 🎯 Implementation Steps

### Phase 1: Asset Collection
1. ✅ Analyze Figma design structure
2. ⬜ Download icon assets from Figma:
   - Lost & Found icon (node: 866:146)
   - Staff icon (node: 866:161)
   - Settings icon (node: 866:170)
3. ⬜ Convert SVGs to PNGs if needed
4. ⬜ Organize assets in `assets/icons/more/`

### Phase 2: Component Development
5. ⬜ Create `more.types.ts` with type definitions
6. ⬜ Create `MoreMenuItem.tsx` component
7. ⬜ Create `MorePopup.tsx` component with:
   - Backdrop
   - Popup container
   - Menu items integration
   - Animation (optional: slide up/fade in)
8. ⬜ Test popup appearance and styling

### Phase 3: Screen Implementation
9. ⬜ Create `LostAndFoundScreen.tsx` placeholder
10. ⬜ Create `StaffScreen.tsx` placeholder
11. ⬜ Create `SettingsScreen.tsx` placeholder
12. ⬜ Update `AppNavigator.tsx` with new routes

### Phase 4: Integration
13. ⬜ Update `MoreScreen.tsx` to use `MorePopup`
14. ⬜ Implement navigation logic
15. ⬜ Handle popup visibility state
16. ⬜ Test navigation flow: More → MenuItem → Screen → Back

### Phase 5: Polish
17. ⬜ Add blur effect to backdrop (using `expo-blur` if available)
18. ⬜ Add animations for popup appearance
19. ⬜ Ensure proper backdrop dismissal
20. ⬜ Test on different screen sizes
21. ⬜ Verify all icons and spacing match Figma design

---

## 📐 Key Measurements (from Figma)

```
Screen: 440px × 1176px (iPhone 16 Pro Max)

More Popup:
- Width: 316px
- Height: 114.928px
- Position: 104px from left, 687px from top
- Background: #ffffff
- Shadow: 0px 0px 105.1px -35px rgba(100,131,176,0.4)

Backdrop:
- Full screen overlay
- Background: rgba(228,228,228,0.1)
- Blur: 10.45px

Bottom Navigation:
- Height: 152px
- Position: Fixed at bottom

Lost & Found:
- Icon: 36.917 × 40.271px
- Position in popup: 16px from left, 19px from top

Staff:
- Icon: ~27 × 25px
- Position: 152px from left

Settings:
- Icon: ~27 × 29px
- Position: 245px from left

All text:
- Font: Helvetica Regular
- Size: 15px
- Color: #5a759d
```

---

## 🧪 Testing Checklist

- [ ] Popup appears when More tab is clicked
- [ ] Backdrop is semi-transparent with blur effect
- [ ] Popup is centered horizontally
- [ ] Popup is positioned above bottom navigation
- [ ] All three menu items are visible and properly spaced
- [ ] Icons match Figma design
- [ ] Text labels are readable
- [ ] Tapping backdrop dismisses popup
- [ ] Tapping menu item navigates to correct screen
- [ ] Popup closes after menu item selection
- [ ] Navigation back button returns to Home
- [ ] Bottom navigation remains visible
- [ ] Responsive on different screen sizes

---

## 💡 Technical Considerations

### Backdrop Blur
- Use `expo-blur` package's `BlurView` component
- Fallback to semi-transparent overlay if blur not available
- Ensure performance on lower-end devices

### Animation
- Use `Animated` API for smooth popup appearance
- Consider slide-up animation from bottom
- Fade in backdrop simultaneously

### Navigation Flow
1. User taps "More" tab → Navigate to MoreScreen
2. MoreScreen auto-shows popup
3. User taps menu item → Close popup, navigate to screen
4. User taps back → Return to Home screen
5. OR User taps backdrop → Close popup, return to Home

### Alternative Approach (Modal Overlay)
Instead of a separate MoreScreen, the popup could be:
- A modal overlay on top of HomeScreen
- Triggered by More tab press
- Doesn't navigate to new screen
- More similar to native iOS/Android behavior

This would require modifying `BottomTabBar` to handle the More button differently than other tabs.

---

## 🔄 Alternative Implementation: Modal Overlay

### Simpler Approach
Rather than navigating to `MoreScreen`, show popup as overlay on current screen:

**BottomTabBar.tsx Update**:
```typescript
interface BottomTabBarProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
  onMorePress?: () => void; // New prop
}

// In TabBarItem for More:
<TabBarItem
  icon={moreIcon}
  label="More"
  active={false} // Never active since it's a popup
  onPress={onMorePress || (() => {})}
/>
```

**HomeScreen.tsx Update**:
```typescript
const [showMorePopup, setShowMorePopup] = useState(false);

const handleMorePress = () => {
  setShowMorePopup(true);
};

return (
  <View style={styles.container}>
    {/* ... existing content ... */}
    
    <MorePopup
      visible={showMorePopup}
      onClose={() => setShowMorePopup(false)}
      onMenuItemPress={handleMenuItemPress}
    />
    
    <BottomTabBar
      activeTab={activeTab}
      onTabPress={handleTabPress}
      onMorePress={handleMorePress}
    />
  </View>
);
```

This approach:
- ✅ Simpler implementation
- ✅ No extra screen needed
- ✅ More natural UX (modal overlay)
- ✅ Matches common mobile patterns
- ❌ Needs to be implemented on all screens

---

## 📝 Notes

- The Figma design shows the popup above a blurred view of the home screen content
- The popup should be a Modal component for proper z-index layering
- Consider using `react-native-reanimated` for smoother animations
- Icons should use `tintColor` for consistent coloring
- Follow existing project patterns (scaleX, colors from theme, etc.)
- All measurements should be scaled using `scaleX` for responsiveness

---

## 🎨 Design Assets to Extract from Figma

From node `866:143` (Lost & Found):
- Icon: Group 357

From node `866:161` (Staff):
- Icon: Group (people icon)

From node `866:170` (Settings):
- Icon: Group (gear icon)

---

## ✅ Success Criteria

The implementation is complete when:
1. Clicking "More" tab displays a popup overlay
2. Popup contains three menu items matching Figma design
3. All icons are correctly sized and colored
4. Popup has proper shadow and backdrop blur
5. Clicking any menu item navigates to respective screen
6. Clicking backdrop dismisses popup
7. UI is responsive across different screen sizes
8. Animation is smooth (if implemented)
9. Code follows existing project patterns and conventions
10. All TypeScript types are properly defined

---

**Last Updated**: December 22, 2025
**Status**: Ready for Implementation

