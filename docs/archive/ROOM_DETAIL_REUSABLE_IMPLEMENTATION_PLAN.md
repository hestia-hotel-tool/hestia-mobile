# Room Detail Screen - Reusable Implementation Plan

## Overview
This document outlines the plan to refactor the current `ArrivalDepartureDetailScreen.tsx` into a fully reusable `RoomDetailScreen.tsx` that supports all room types: Arrival, Departure, Arrival/Departure, Stayover, and Turndown.

## Current State Analysis

### Existing Implementation
- **File**: `src/screens/ArrivalDepartureDetailScreen.tsx`
- **Supports**: Arrival/Departure rooms (dual guest scenario)
- **Components Used**:
  - `RoomDetailHeader`
  - `DetailTabNavigation`
  - `GuestInfoCard`
  - `AssignedToSection`
  - `TaskSection`
  - `LostAndFoundSection`
  - `NotesSection`

### Figma Design Analysis

#### 1. Arrival (Single Guest) - Node: 1772:104
```
Key Positions:
- Guest Info Title: 303px
- Guest (Arrival): 349px
- Special Instructions Title: 425px (has special instructions)
- Special Instructions Text: 450px
- Divider: 524px
- Assigned to Title: 543px
- Card: 573px (height: 206.09px)
- Lost & Found Title: 811px
- Lost & Found Box: 849px
- Notes: 1000px
```

#### 2. Departure (Single Guest) - Node: 1772:255
```
Key Positions:
- Guest Info Title: 303px
- Guest (Departure): 369px
- NO Special Instructions
- Divider: 436px
- Assigned to Title: 462px
- Card: 492px (height: 206.09px)
- Lost & Found Title: 723px
- Lost & Found Box: 759px
- Notes: 910px
```

#### 3. Stayover (Single Guest) - Node: 1772:406
```
Key Positions:
- Guest Info Title: 318px
- Guest (Stayover): 368px
- Special Instructions Title: 441px (has special instructions)
- Special Instructions Text: 466px
- Divider: 536px
- Assigned to Title: 555px
- Card: 585px (height: 183px - SMALLER!)
- Lost & Found Title: 812px
- Lost & Found Box: 844px (with actual item displayed)
- Notes: 1001px
```

#### 4. Turndown (Single Guest) - Node: 1772:601
```
Key Positions:
- Guest Info Title: 318px
- Guest (Turndown): 368px
- Special Instructions Title: 441px (has special instructions)
- Special Instructions Text: 466px
- Divider: 536px
- Assigned to Title: 555px
- Card: 585px (height: 183px - SMALLER!)
- Lost & Found Title: 812px
- Lost & Found Box: 844px (with actual item displayed)
- Notes: 980px
```

#### 5. Arrival/Departure (Dual Guest) - Node: 1-1506 (Current Implementation)
```
Key Positions:
- Guest Info Title: 303px
- Guest (Arrival): 349px
- Special Instructions Title: 417px (has special instructions)
- Special Instructions Text: 442px
- Divider 1: 510px
- Guest (Departure): 542px
- Divider 2: 625px
- Assigned to Title: 644px
- Card: 674px (height: 206.09px)
- Lost & Found Title: 906px
- Lost & Found Box: 940px
- Notes: 1110px (icon at 1105px)
```

## Key Differences by Room Type

### 1. Number of Guests
- **Single Guest**: Arrival, Departure, Stayover, Turndown
- **Dual Guest**: Arrival/Departure

### 2. Special Instructions
- **Has Special Instructions**: Arrival, Stayover, Turndown, Arrival/Departure
- **No Special Instructions**: Departure

### 3. Card Height
- **Standard Height (206.09px)**: Arrival, Departure, Arrival/Departure
- **Smaller Height (183px)**: Stayover, Turndown

### 4. Lost & Found Display
- **Empty Box**: Arrival, Departure, Arrival/Departure
- **With Item**: Stayover, Turndown (shows actual lost item with image, description, status)

### 5. Guest Info Start Position
- **Starts at 303px**: Arrival, Departure, Arrival/Departure
- **Starts at 318px**: Stayover, Turndown

## Implementation Strategy

### Phase 1: Create Room Type Configuration System

#### 1.1 Define Room Type Enum
**File**: `src/types/roomDetail.types.ts`

```typescript
export type RoomType = 'Arrival' | 'Departure' | 'ArrivalDeparture' | 'Stayover' | 'Turndown';

export interface RoomTypeConfig {
  type: RoomType;
  guestInfoStartTop: number;
  hasSpecialInstructions: boolean;
  numberOfGuests: 1 | 2;
  cardHeight: number;
  lostAndFoundType: 'empty' | 'withItems';
}
```

#### 1.2 Create Room Type Configurations
**File**: `src/constants/roomTypeConfigs.ts`

```typescript
import { RoomTypeConfig } from '../types/roomDetail.types';

export const ROOM_TYPE_CONFIGS: Record<string, RoomTypeConfig> = {
  Arrival: {
    type: 'Arrival',
    guestInfoStartTop: 303,
    hasSpecialInstructions: true,
    numberOfGuests: 1,
    cardHeight: 206.09,
    lostAndFoundType: 'empty',
  },
  Departure: {
    type: 'Departure',
    guestInfoStartTop: 303,
    hasSpecialInstructions: false,
    numberOfGuests: 1,
    cardHeight: 206.09,
    lostAndFoundType: 'empty',
  },
  ArrivalDeparture: {
    type: 'ArrivalDeparture',
    guestInfoStartTop: 303,
    hasSpecialInstructions: true,
    numberOfGuests: 2,
    cardHeight: 206.09,
    lostAndFoundType: 'empty',
  },
  Stayover: {
    type: 'Stayover',
    guestInfoStartTop: 318,
    hasSpecialInstructions: true,
    numberOfGuests: 1,
    cardHeight: 183,
    lostAndFoundType: 'withItems',
  },
  Turndown: {
    type: 'Turndown',
    guestInfoStartTop: 318,
    hasSpecialInstructions: true,
    numberOfGuests: 1,
    cardHeight: 183,
    lostAndFoundType: 'withItems',
  },
};
```

### Phase 2: Update Constants System

#### 2.1 Create Dynamic Position Calculator
**File**: `src/utils/roomDetailPositions.ts`

```typescript
import { RoomTypeConfig } from '../types/roomDetail.types';
import { CONTENT_AREA } from '../constants/roomDetailStyles';

export interface CalculatedPositions {
  guestInfoTitle: number;
  firstGuestTop: number;
  specialInstructionsTitle?: number;
  specialInstructionsText?: number;
  divider1: number;
  secondGuestTop?: number;
  divider2: number;
  assignedToTitle: number;
  cardTop: number;
  lostAndFoundTitle: number;
  lostAndFoundBox: number;
  notesIconTop: number;
  notesTitleTop: number;
}

export function calculatePositions(config: RoomTypeConfig): CalculatedPositions {
  const { guestInfoStartTop, hasSpecialInstructions, numberOfGuests, cardHeight } = config;
  
  // Base calculations
  const guestInfoTitle = guestInfoStartTop;
  const firstGuestTop = guestInfoTitle + 46; // Guest appears 46px below title
  
  let currentTop = firstGuestTop;
  let positions: CalculatedPositions = {
    guestInfoTitle,
    firstGuestTop,
    divider1: 0,
    divider2: 0,
    assignedToTitle: 0,
    cardTop: 0,
    lostAndFoundTitle: 0,
    lostAndFoundBox: 0,
    notesIconTop: 0,
    notesTitleTop: 0,
  };
  
  // Special Instructions (if applicable)
  if (hasSpecialInstructions) {
    const dateRowTop = firstGuestTop + 28; // Dates 28px below name
    positions.specialInstructionsTitle = dateRowTop + 40; // 40px gap from dates
    positions.specialInstructionsText = positions.specialInstructionsTitle + 25; // 25px below title
    currentTop = positions.specialInstructionsText + 68; // 68px to divider
  } else {
    const dateRowTop = firstGuestTop + 28;
    currentTop = dateRowTop + 39; // 39px to divider for Departure
  }
  
  positions.divider1 = currentTop;
  
  // Second Guest (if dual guest)
  if (numberOfGuests === 2) {
    positions.secondGuestTop = positions.divider1 + 32; // 32px gap
    positions.divider2 = positions.secondGuestTop + 83; // 83px for guest info
  } else {
    positions.divider2 = positions.divider1; // Same as divider1 for single guest
  }
  
  // Assigned to and Card
  positions.assignedToTitle = positions.divider2 + 19; // 19px gap
  positions.cardTop = positions.assignedToTitle + 30; // 30px gap
  
  const cardEnd = positions.cardTop + cardHeight;
  
  // Lost & Found
  positions.lostAndFoundTitle = cardEnd + 26; // 26px gap
  positions.lostAndFoundBox = positions.lostAndFoundTitle + 34; // 34px gap
  
  const lostAndFoundBoxEnd = positions.lostAndFoundBox + 97; // Box height
  
  // Notes
  positions.notesIconTop = lostAndFoundBoxEnd + 68; // 68px gap
  positions.notesTitleTop = positions.notesIconTop + 5; // 5px below icon
  
  return positions;
}
```

### Phase 3: Refactor Main Screen Component

#### 3.1 Rename and Update Main Screen
**Action**: Rename `ArrivalDepartureDetailScreen.tsx` to `RoomDetailScreen.tsx`

**Changes**:
1. Add `roomType` prop
2. Use `calculatePositions()` for dynamic positioning
3. Conditionally render components based on room type
4. Update card height dynamically

```typescript
interface RoomDetailScreenProps {
  route: {
    params: {
      roomId: string;
      roomType: RoomType; // NEW: Add room type
    };
  };
  navigation: any;
}

export default function RoomDetailScreen({ route, navigation }: RoomDetailScreenProps) {
  const { roomId, roomType } = route.params;
  const config = ROOM_TYPE_CONFIGS[roomType];
  const positions = calculatePositions(config);
  
  // ... rest of implementation
}
```

### Phase 4: Update Components for Flexibility

#### 4.1 Update AssignedToSection
- Already flexible, no changes needed

#### 4.2 Update TaskSection
- Accept `cardHeight` prop
- Dynamically calculate container height based on card height

```typescript
interface TaskSectionProps {
  tasks?: Task[];
  onAddPress?: () => void;
  onSeeMorePress?: (task: Task) => void;
  cardHeight: number; // NEW: Dynamic card height
}
```

#### 4.3 Update LostAndFoundSection
- Add `displayType` prop: 'empty' | 'withItems'
- Render empty box or actual items based on type

```typescript
interface LostAndFoundSectionProps {
  displayType: 'empty' | 'withItems';
  items?: LostAndFoundItem[]; // NEW: For Stayover/Turndown
  onAddPhotosPress?: () => void;
  onTitlePress?: () => void;
}
```

#### 4.4 Create LostAndFoundItem Component (NEW)
**File**: `src/components/roomDetail/LostAndFoundItem.tsx`

For displaying actual lost items in Stayover/Turndown:
- Item image (76x80px)
- Item name
- Description
- Status (Stored/Returned)
- Location

### Phase 5: Update Navigation and Routing

#### 5.1 Update Navigation Types
**File**: `src/types/navigation.types.ts`

```typescript
export type RoomDetailParams = {
  roomId: string;
  roomType: RoomType; // Add room type
};
```

#### 5.2 Update All Navigation Calls
Update all places that navigate to room detail:
- `AllRoomsScreen.tsx`
- Any other screens that navigate to room details

```typescript
// Before
navigation.navigate('ArrivalDepartureDetail', { roomId: room.id });

// After
navigation.navigate('RoomDetail', { 
  roomId: room.id, 
  roomType: room.category as RoomType 
});
```

### Phase 6: Update Styles and Constants

#### 6.1 Update roomDetailStyles.ts
- Keep existing constants
- Add new constants for Stayover/Turndown specific elements
- Make card height configurable

```typescript
// Add Stayover/Turndown specific constants
export const STAYOVER_TURNDOWN = {
  cardHeight: 183,
  lostAndFoundItem: {
    image: {
      width: 76,
      height: 80,
      borderRadius: 10,
    },
    name: {
      fontSize: 19,
      fontWeight: 'bold' as const,
      color: '#5a759d',
    },
    description: {
      fontSize: 11,
      fontWeight: 'light' as const,
      color: '#000000',
    },
    status: {
      fontSize: 12,
      fontWeight: 'regular' as const,
      color: '#000000',
    },
  },
};
```

### Phase 7: Update Data Models

#### 7.1 Add Lost & Found Item Type
**File**: `src/types/roomDetail.types.ts`

```typescript
export interface LostAndFoundItem {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  status: 'Stored' | 'Returned' | 'Disposed';
  location: string;
  foundDate: string;
  foundBy?: string;
}
```

#### 7.2 Update Room Detail Type
```typescript
export interface RoomDetail {
  // ... existing fields
  lostAndFoundItems?: LostAndFoundItem[]; // NEW: For Stayover/Turndown
}
```

### Phase 8: Update Mock Data

#### 8.1 Update Mock Room Data
**File**: `src/data/mockRoomData.ts`

Add `roomType` to each room:
```typescript
{
  id: '1',
  roomNumber: '201',
  category: 'Arrival', // This becomes roomType
  // ... rest of fields
}
```

#### 8.2 Add Mock Lost & Found Items
For Stayover and Turndown rooms:
```typescript
lostAndFoundItems: [
  {
    id: 'lf1',
    name: 'Wrist Watch',
    description: 'Wrist watch found in guest bathroom while cleaning',
    status: 'Stored',
    location: 'HSK Office',
    foundDate: '2024-01-15',
  },
],
```

## Implementation Checklist

### Step 1: Type Definitions
- [ ] Create `RoomType` enum in `roomDetail.types.ts`
- [ ] Create `RoomTypeConfig` interface
- [ ] Create `LostAndFoundItem` interface
- [ ] Update `RoomDetail` interface

### Step 2: Configuration System
- [ ] Create `roomTypeConfigs.ts` with all room type configurations
- [ ] Create `roomDetailPositions.ts` with position calculator

### Step 3: Component Updates
- [ ] Update `TaskSection` to accept dynamic card height
- [ ] Update `LostAndFoundSection` to support both display types
- [ ] Create `LostAndFoundItem` component for item display
- [ ] Update `GuestInfoCard` if needed

### Step 4: Main Screen Refactor
- [ ] Rename `ArrivalDepartureDetailScreen.tsx` to `RoomDetailScreen.tsx`
- [ ] Add `roomType` prop handling
- [ ] Implement dynamic positioning using `calculatePositions()`
- [ ] Update card height to be dynamic
- [ ] Conditionally render based on room type

### Step 5: Navigation Updates
- [ ] Update navigation types
- [ ] Update `AllRoomsScreen` navigation calls
- [ ] Update any other navigation calls
- [ ] Update route configuration

### Step 6: Styles and Constants
- [ ] Add Stayover/Turndown constants to `roomDetailStyles.ts`
- [ ] Update card height constants to be configurable

### Step 7: Data Updates
- [ ] Update mock room data with `roomType`
- [ ] Add mock lost & found items for Stayover/Turndown
- [ ] Update data fetching logic if needed

### Step 8: Testing
- [ ] Test Arrival room type
- [ ] Test Departure room type
- [ ] Test Arrival/Departure room type
- [ ] Test Stayover room type with lost items
- [ ] Test Turndown room type with lost items
- [ ] Test all interactions (add task, reassign, add note, etc.)

## Benefits of This Approach

1. **Single Source of Truth**: One screen component handles all room types
2. **Configuration-Driven**: Easy to add new room types or adjust layouts
3. **Maintainable**: Changes to common elements only need to be made once
4. **Type-Safe**: Full TypeScript support with proper types
5. **Flexible**: Easy to customize per room type without duplicating code
6. **Scalable**: Can easily add new room types or features

## Migration Strategy

1. **Phase 1**: Implement new system alongside existing (no breaking changes)
2. **Phase 2**: Update navigation to use new screen
3. **Phase 3**: Test thoroughly with all room types
4. **Phase 4**: Remove old `ArrivalDepartureDetailScreen` once confirmed working

## Estimated Effort

- **Type Definitions**: 1 hour
- **Configuration System**: 2 hours
- **Component Updates**: 3 hours
- **Main Screen Refactor**: 4 hours
- **Navigation Updates**: 1 hour
- **Styles and Constants**: 2 hours
- **Data Updates**: 1 hour
- **Testing**: 3 hours

**Total**: ~17 hours

## Next Steps

1. Review this plan and confirm approach
2. Begin implementation starting with Phase 1
3. Implement incrementally, testing each phase
4. Update documentation as we go

---

**Document Version**: 1.0  
**Created**: 2024-01-15  
**Status**: Ready for Implementation
