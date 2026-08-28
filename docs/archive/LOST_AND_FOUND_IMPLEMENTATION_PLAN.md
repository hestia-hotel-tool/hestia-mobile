# Lost and Found Screen Implementation Plan

## Overview
This document outlines the implementation plan for the Lost and Found screen based on the Figma design at node-id=733-662. The screen follows a similar structure to the Tickets screen with a header, tab navigation, and scrollable list of items.

## Design Analysis

### Screen Structure
1. **Header Section** (133px height)
   - Light blue background (#e4eefe)
   - Back arrow button (left, 27px from left, 69px from top)
   - "Lost & Found" title (center, 69px from top, bold, #607aa1)
   - "+ Register" button (right, pink #ff46a3, 24px bold "+" + 20px light "Register")

2. **Tab Navigation** (below header, ~39px height)
   - Four tabs: "Created", "Stored", "Returned", "Discarded"
   - "Created" is active (bold, #5a759d)
   - Other tabs are inactive (light weight, rgba(90,117,157,0.55))
   - Active indicator: 4px blue underline (#5a759d)
   - Search icon on the right side

3. **Content Area** (scrollable)
   - List of Lost & Found item cards
   - Each card: 409px width, 271px height
   - Card spacing: 16px between cards
   - Cards start at y=213px (below tabs)

4. **Bottom Navigation** (already implemented)
   - Persistent bottom tab bar

### Item Card Structure
Each Lost & Found item card contains:

1. **Card Container**
   - Background: #f9fafc
   - Border: 1px solid #e3e3e3
   - Border radius: 9px
   - Width: 409px
   - Height: 271px
   - Margin: 16px horizontal, 16px bottom

2. **Item Header Section** (top left)
   - Item name (bold, 18px, black) - e.g., "Wrist Watch", "Hand Bag"
   - Item ID with copy icon (light, 14px, black) - e.g., "FH31390"
   - Location/Room (bold, 18px, black) - e.g., "Room 201", "Brasserie"
   - Guest/Owner name (light, 17px, black) - e.g., "Mr Mohamed. B", "Public Area"
   - Room number badge (circular, black background, white number) - e.g., "11"

3. **Stored Location Section** (left side, middle)
   - Map pin icon (yellow background, circular, 33px)
   - "Stored Location" label (light, 11px, black)
   - Location name (bold, 13px, black) - e.g., "HSK Office"

4. **Registered/Stored By Section** (left side, bottom)
   - Profile avatar (circular, 28px)
   - Staff name (bold, 13px, #1e1e1e)
   - Timestamp (light, 12px, black) - e.g., "15:00, 11 November 2025"
   - Label above: "Stored by" or "Registered by" (light, 11px, black)

5. **Item Image** (right side)
   - Width: 146px (or 144px for second card)
   - Height: 153px (or 158px for second card)
   - Border radius: 10px (or 16px for second card)
   - Position: absolute right side of card

6. **Status Button** (bottom right)
   - Rounded pill shape (border radius: 75px)
   - Height: 54px
   - Width: 118px
   - Colors vary by status:
     - "Stored": Yellow background (#f0be1b), white text, down arrow icon
     - "Shipped": Green background (#41d541), white text, checkmark icon
   - Text: Bold, 16px, white

7. **Divider Line** (horizontal, above registered by section)
   - Width: 408px
   - Height: 1px
   - Color: #e3e3e3
   - Position: ~397px from card top (or ~693px for second card)

## Implementation Structure

### Files to Create

1. **Types**
   - `src/types/lostAndFound.types.ts` - TypeScript interfaces for Lost & Found data

2. **Constants**
   - `src/constants/lostAndFoundStyles.ts` - Design tokens and style constants

3. **Components**
   - `src/components/lostAndFound/LostAndFoundHeader.tsx` - Header with back button, title, and Register button
   - `src/components/lostAndFound/LostAndFoundTabs.tsx` - Tab navigation component
   - `src/components/lostAndFound/LostAndFoundItemCard.tsx` - Individual item card component

4. **Data**
   - `src/data/mockLostAndFoundData.ts` - Mock data for Lost & Found items

5. **Screen**
   - `src/screens/LostAndFoundScreen.tsx` - Main screen component (update existing)

## Detailed Implementation Steps

### Phase 1: Types and Constants

#### 1.1 Create Type Definitions (`src/types/lostAndFound.types.ts`)
```typescript
export type LostAndFoundTab = 'created' | 'stored' | 'returned' | 'discarded';

export type LostAndFoundStatus = 'stored' | 'shipped' | 'returned' | 'discarded';

export interface LostAndFoundItem {
  id: string;
  itemName: string;
  itemId: string; // e.g., "FH31390"
  location: string; // e.g., "Room 201", "Brasserie"
  guestName?: string; // e.g., "Mr Mohamed. B"
  publicArea?: string; // e.g., "Public Area"
  roomNumber?: number; // e.g., 11
  storedLocation: string; // e.g., "HSK Office"
  registeredBy: {
    name: string;
    avatar?: any; // Image source
    timestamp: string; // e.g., "15:00, 11 November 2025"
  };
  image?: any; // Image source
  status: LostAndFoundStatus;
  createdAt: string; // ISO date string for filtering
  storedAt?: string; // ISO date string
  returnedAt?: string; // ISO date string
  discardedAt?: string; // ISO date string
}
```

#### 1.2 Create Style Constants (`src/constants/lostAndFoundStyles.ts`)
Extract all design tokens from Figma:
- Header dimensions and colors
- Tab navigation dimensions and colors
- Card dimensions, colors, and spacing
- Typography sizes and weights
- Status button colors and dimensions
- All absolute positioning values

### Phase 2: Components

#### 2.1 LostAndFoundHeader Component
- Similar structure to TicketsHeader
- Back button (left)
- "Lost & Found" title (center)
- "+ Register" button (right, pink color)
- Light blue background (#e4eefe)

#### 2.2 LostAndFoundTabs Component
- Similar structure to TicketsTabs
- Four tabs: "Created", "Stored", "Returned", "Discarded"
- Active tab indicator (4px blue underline)
- Search icon on the right
- Tab switching logic

#### 2.3 LostAndFoundItemCard Component
- Card container with proper styling
- Item header section (name, ID, location, guest)
- Room number badge (if applicable)
- Stored location section with map pin icon
- Registered/Stored by section with avatar
- Item image (right side)
- Status button (bottom right)
- Horizontal divider line
- Touch handlers for card press and status button press

### Phase 3: Data Layer

#### 3.1 Mock Data (`src/data/mockLostAndFoundData.ts`)
Create mock data matching the Figma design:
- At least 2-3 items for each tab
- Include all required fields
- Use realistic data (names, timestamps, etc.)

### Phase 4: Screen Implementation

#### 4.1 Update LostAndFoundScreen
- Replace placeholder content
- Add header component
- Add tabs component
- Add ScrollView with item cards
- Implement tab filtering logic
- Add pull-to-refresh
- Handle navigation to Register screen (future)
- Handle item card press (future: detail screen)
- Handle status button press (future: status change modal)

### Phase 5: Integration

#### 5.1 Navigation
- Ensure navigation from More popup works
- Add navigation to Register screen (when implemented)
- Add navigation to item detail screen (when implemented)

#### 5.2 Icons and Images
- **Confirmed Assets:**
  - Back arrow: `assets/icons/back-arrow.png` ✓
  - Search icon: `assets/icons/search-icon.png` ✓
  - Map pin icon: `assets/icons/location-pin-icon.png` ✓
  - Down arrow for status: `assets/icons/down-arrow.png` ✓
  - Checkmark for shipped: `assets/icons/done.png` ✓
  - Wrist watch image: `assets/images/wrist-watch.png` ✓
  - Hand bag image: `assets/images/hand-bag.png` ✓
  - Profile avatar: `assets/images/Stella_Kitou.png` ✓ (for registered by section)
  
- **Additional Icons Needed:**
  - Copy icon (for item ID) - may need to download from Figma or use alternative

## Design Tokens Reference

### Colors
- Header background: #e4eefe
- Title color: #607aa1
- Register button: #ff46a3
- Tab active: #5a759d (bold)
- Tab inactive: rgba(90,117,157,0.55) (light)
- Card background: #f9fafc
- Card border: #e3e3e3
- Text primary: #000000
- Text secondary: #1e1e1e
- Status stored: #f0be1b (yellow)
- Status shipped: #41d541 (green)
- Map pin background: #f0be1b (yellow, approximate)

### Typography
- Header title: 24px, bold, #607aa1
- Register button "+": 24px, bold
- Register button "Register": 20px, light
- Tab labels: 16px, bold (active) / light (inactive)
- Item name: 18px, bold, black
- Item ID: 14px, light, black
- Location/Room: 18px, bold, black
- Guest name: 17px, light, black
- Stored location label: 11px, light, black
- Stored location name: 13px, bold, black
- Registered by label: 11px, light, black
- Staff name: 13px, bold, #1e1e1e
- Timestamp: 12px, light, black
- Status button: 16px, bold, white

### Dimensions
- Header height: 133px
- Tab container height: ~39px (31px tabs + 4px indicator + spacing)
- Card width: 409px
- Card height: 271px
- Card margin horizontal: 16px
- Card margin bottom: 16px
- Card border radius: 9px
- Status button height: 54px
- Status button width: 118px
- Status button border radius: 75px
- Avatar size: 28px
- Map pin icon size: 33px
- Room badge size: 20px (approximate)
- Item image width: 146px (varies)
- Item image height: 153px (varies)

## Component Props Interfaces

### LostAndFoundHeader
```typescript
interface LostAndFoundHeaderProps {
  onBackPress?: () => void;
  onRegisterPress?: () => void;
}
```

### LostAndFoundTabs
```typescript
interface LostAndFoundTabsProps {
  selectedTab: LostAndFoundTab;
  onTabPress: (tab: LostAndFoundTab) => void;
  onSearchPress?: () => void;
}
```

### LostAndFoundItemCard
```typescript
interface LostAndFoundItemCardProps {
  item: LostAndFoundItem;
  onPress?: () => void;
  onStatusPress?: () => void;
}
```

## State Management

### LostAndFoundScreen State
- `selectedTab: LostAndFoundTab` - Currently selected tab
- `items: LostAndFoundItem[]` - All items (filtered by tab)
- `refreshing: boolean` - Pull-to-refresh state
- `activeTab: string` - For bottom navigation
- `showMorePopup: boolean` - More popup visibility

### Filtering Logic
```typescript
const filteredItems = items.filter((item) => {
  switch (selectedTab) {
    case 'created':
      return true; // Show all items
    case 'stored':
      return item.status === 'stored';
    case 'returned':
      return item.status === 'returned' || item.returnedAt;
    case 'discarded':
      return item.status === 'discarded' || item.discardedAt;
    default:
      return true;
  }
});
```

## Future Enhancements

1. **Register Screen**
   - Form to register new lost items
   - Photo upload
   - Location selection
   - Guest information

2. **Item Detail Screen**
   - Full item details
   - Edit functionality
   - Status change history
   - Additional photos

3. **Search Functionality**
   - Search by item name, ID, location
   - Filter by date range
   - Filter by status

4. **Status Change Modal**
   - Change item status
   - Add notes
   - Update location

## Testing Checklist

- [ ] Header displays correctly with all elements
- [ ] Back button navigates to previous screen
- [ ] Register button is visible and styled correctly
- [ ] Tabs display correctly with proper styling
- [ ] Active tab indicator positions correctly
- [ ] Tab switching filters items correctly
- [ ] Search icon is visible (functionality can be future)
- [ ] Item cards render with all required information
- [ ] Item images display correctly
- [ ] Status buttons display with correct colors
- [ ] Status buttons are positioned correctly
- [ ] ScrollView works smoothly
- [ ] Pull-to-refresh works
- [ ] Bottom navigation works
- [ ] More popup works
- [ ] Navigation from More popup works
- [ ] All text is readable and properly styled
- [ ] Spacing matches Figma design
- [ ] Colors match Figma design

## Asset References

### Images
- **Wrist Watch**: `require('../../assets/images/wrist-watch.png')`
- **Hand Bag**: `require('../../assets/images/hand-bag.png')`
- **Profile Avatar**: `require('../../assets/images/Stella_Kitou.png')`

### Icons
- **Back Arrow**: `require('../../assets/icons/back-arrow.png')`
- **Search Icon**: `require('../../assets/icons/search-icon.png')`
- **Location Pin**: `require('../../assets/icons/location-pin-icon.png')`
- **Down Arrow**: `require('../../assets/icons/down-arrow.png')` (for "Stored" status button)
- **Done/Checkmark**: `require('../../assets/icons/done.png')` (for "Shipped" status button)
- **Copy Icon**: May need to be downloaded from Figma or use alternative icon

## Notes

- The design shows two example cards with different statuses (Stored and Shipped)
- The second card shows "Public Area" instead of a guest name
- The room number badge appears only when there's a room number
- The stored location section uses a yellow map pin icon
- The status button colors vary: yellow for "Stored", green for "Shipped"
- The divider line appears above the registered/stored by section
- All positioning should use the scaleX factor for responsive design
- All image assets are confirmed to exist in the project

