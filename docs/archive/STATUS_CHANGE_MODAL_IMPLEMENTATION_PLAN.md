# Status Change Modal Implementation Plan

## Overview
Implement a modal that appears when a user clicks on an **InProgress** status icon on a room card. The modal allows users to change the room status by selecting from available status options.

## Figma Reference
[Figma Design](https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=406-1783&m=dev)

## Current Implementation Status
- ✅ Status icons are displayed on room cards
- ✅ StatusButton component handles status icon rendering
- ✅ `handleStatusPress` exists but currently only logs
- ✅ Modal pattern established (see `MorePopup`, `CreateTicketMenu`, `NewChatMenu`)
- ✅ Icons downloaded and available in `assets/icons/`

## Available Icons
The following status icons are available:
- `priority-status.png` - Priority status
- `dirty-status.png` - Dirty status  
- `cleaned-status.png` - Cleaned status
- `inspected-status.png` - Inspected status
- `pause-status.png` - Pause status
- `return-later-status.png` - Return Later status
- `refuse-service-status.png` - Refuse Service status
- `promised-time-status.png` - Promised Time status

## Implementation Plan

### Phase 1: Type Definitions

#### 1.1 Update `RoomStatus` Type
**File**: `src/types/allRooms.types.ts`

**Current Type**:
```typescript
export type RoomStatus = 'Dirty' | 'InProgress' | 'Cleaned' | 'Inspected';
```

**Proposed Extended Type** (if needed for modal options):
```typescript
export type RoomStatus = 'Dirty' | 'InProgress' | 'Cleaned' | 'Inspected';
export type StatusChangeOption = 'Priority' | 'Dirty' | 'Cleaned' | 'Inspected' | 'Pause' | 'ReturnLater' | 'RefuseService' | 'PromisedTime';
```

**Note**: The modal may show all options, but only some may actually change the `RoomStatus`. Some options (like Pause, Return Later, etc.) might be additional metadata or actions rather than status changes.

#### 1.2 Create Status Option Configuration
**File**: `src/types/allRooms.types.ts`

Add status option configurations similar to `STATUS_CONFIGS`:
```typescript
export interface StatusOptionConfig {
  id: StatusChangeOption;
  label: string;
  icon: any; // Image source
  color?: string; // Optional background/tint color
}

export const STATUS_OPTIONS: StatusOptionConfig[] = [
  {
    id: 'Priority',
    label: 'Priority',
    icon: require('../../assets/icons/priority-status.png'),
  },
  {
    id: 'Dirty',
    label: 'Dirty',
    icon: require('../../assets/icons/dirty-status.png'),
  },
  {
    id: 'Cleaned',
    label: 'Cleaned',
    icon: require('../../assets/icons/cleaned-status.png'),
  },
  {
    id: 'Inspected',
    label: 'Inspected',
    icon: require('../../assets/icons/inspected-status.png'),
  },
  {
    id: 'Pause',
    label: 'Pause',
    icon: require('../../assets/icons/pause-status.png'),
  },
  {
    id: 'ReturnLater',
    label: 'Return Later',
    icon: require('../../assets/icons/return-later-status.png'),
  },
  {
    id: 'RefuseService',
    label: 'Refuse Service',
    icon: require('../../assets/icons/refuse-service-status.png'),
  },
  {
    id: 'PromisedTime',
    label: 'Promised Time',
    icon: require('../../assets/icons/promised-time-status.png'),
  },
];
```

### Phase 2: Modal Component

#### 2.1 Create `StatusChangeModal` Component
**File**: `src/components/allRooms/StatusChangeModal.tsx`

**Structure**:
- Modal with transparent backdrop
- White container/card positioned below the status icon
- Grid or list of status options with icons and labels
- Tap backdrop to close
- Similar structure to `MorePopup` but customized for status selection

**Props Interface**:
```typescript
interface StatusChangeModalProps {
  visible: boolean;
  onClose: () => void;
  onStatusSelect: (status: StatusChangeOption) => void;
  currentStatus: RoomStatus;
  // Optional: Position info to anchor modal near the clicked button
  anchorPosition?: { x: number; y: number };
}
```

**Features**:
- Fade animation
- Backdrop with blur (using `BlurView` from `expo-blur`)
- Grid layout for status options (2-4 columns depending on design)
- Each option shows icon and label
- Tap to select -> calls `onStatusSelect` -> closes modal
- Tap backdrop -> closes modal

**Layout Considerations**:
- Based on Figma design, determine:
  - Modal size (width/height)
  - Number of columns for grid
  - Icon size
  - Spacing between items
  - Position relative to status button (likely below it)

### Phase 3: Integration

#### 3.1 Update `AllRoomsScreen.tsx`
**File**: `src/screens/AllRoomsScreen.tsx`

**Changes**:
1. Add state for modal visibility and selected room:
```typescript
const [showStatusModal, setShowStatusModal] = useState(false);
const [selectedRoomForStatusChange, setSelectedRoomForStatusChange] = useState<RoomCardData | null>(null);
```

2. Update `handleStatusPress`:
```typescript
const handleStatusPress = (room: RoomCardData) => {
  // Only show modal if status is InProgress
  if (room.status === 'InProgress') {
    setSelectedRoomForStatusChange(room);
    setShowStatusModal(true);
  } else {
    // For other statuses, handle differently or do nothing
    console.log('Status pressed for room:', room.roomNumber, 'status:', room.status);
  }
};
```

3. Add handler for status selection:
```typescript
const handleStatusSelect = (statusOption: StatusChangeOption) => {
  if (!selectedRoomForStatusChange) return;
  
  // Map status option to RoomStatus if needed
  // Some options like 'Priority', 'Pause', 'ReturnLater' might need special handling
  const newStatus: RoomStatus = mapStatusOptionToRoomStatus(statusOption);
  
  // Update room status in state
  setAllRoomsData(prev => ({
    ...prev,
    rooms: prev.rooms.map(room =>
      room.id === selectedRoomForStatusChange.id
        ? { ...room, status: newStatus }
        : room
    ),
  }));
  
  // Close modal and reset selected room
  setShowStatusModal(false);
  setSelectedRoomForStatusChange(null);
  
  // TODO: Save to backend/API
};

const mapStatusOptionToRoomStatus = (option: StatusChangeOption): RoomStatus => {
  switch (option) {
    case 'Dirty':
      return 'Dirty';
    case 'Cleaned':
      return 'Cleaned';
    case 'Inspected':
      return 'Inspected';
    case 'Priority':
      // Priority might be a flag, not a status - handle appropriately
      return 'InProgress'; // Or keep current status and set priority flag
    case 'Pause':
    case 'ReturnLater':
    case 'RefuseService':
    case 'PromisedTime':
      // These might be actions/metadata, not status changes
      // Keep InProgress status but add metadata
      return 'InProgress';
    default:
      return 'InProgress';
  }
};
```

4. Add modal to render:
```typescript
<StatusChangeModal
  visible={showStatusModal}
  onClose={() => {
    setShowStatusModal(false);
    setSelectedRoomForStatusChange(null);
  }}
  onStatusSelect={handleStatusSelect}
  currentStatus={selectedRoomForStatusChange?.status || 'InProgress'}
/>
```

#### 3.2 Update `RoomCard.tsx` (if needed)
**File**: `src/components/allRooms/RoomCard.tsx`

**Note**: No changes needed if `onStatusPress` is already passed correctly. The modal logic is handled at the screen level.

### Phase 4: Styling Constants

#### 4.1 Add Modal Styles to Constants
**File**: `src/constants/allRoomsStyles.ts` (or create new file)

Add constants for modal dimensions, spacing, etc. based on Figma design:
```typescript
export const STATUS_MODAL = {
  container: {
    width: 350, // Adjust based on Figma
    minHeight: 200, // Adjust based on Figma
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 16,
  },
  grid: {
    columns: 4, // Or 2, 3 based on design
    itemSpacing: 12,
    rowSpacing: 16,
  },
  optionItem: {
    iconSize: 40, // Adjust based on Figma
    labelFontSize: 12,
  },
  // Position relative to status button
  positionOffset: {
    top: 10, // Distance below status button
    // Or use absolute positioning based on anchor point
  },
} as const;
```

### Phase 5: Status Option Item Component (Optional)

#### 5.1 Create `StatusOptionItem` Component
**File**: `src/components/allRooms/StatusOptionItem.tsx`

**Purpose**: Reusable component for each status option in the modal grid.

**Props**:
```typescript
interface StatusOptionItemProps {
  option: StatusOptionConfig;
  onPress: () => void;
  isSelected?: boolean; // If we want to highlight current status
}
```

**Structure**:
- TouchableOpacity container
- Icon Image
- Label Text
- Optional selected state styling

### Phase 6: Data Model Considerations

#### 6.1 Room Data Extensions
If some status options (like Pause, Return Later) need to store additional metadata:

**File**: `src/types/allRooms.types.ts`

Extend `RoomCardData`:
```typescript
export interface RoomCardData {
  // ... existing fields
  statusMetadata?: {
    isPaused?: boolean;
    returnLater?: boolean;
    refusedService?: boolean;
    promisedTime?: string; // Time string like "18:00"
  };
}
```

## Design Specifications (To be extracted from Figma)

### Modal Layout
- **Position**: Below the status icon that was clicked
- **Container**: White rounded card with shadow
- **Grid Layout**: Determine column count (likely 2-4 columns)
- **Icon Size**: Based on Figma (likely 40-50px)
- **Label**: Below or beside icon
- **Spacing**: Consistent padding and gaps

### Visual Design
- **Background**: White (#ffffff)
- **Border Radius**: 12px (standard)
- **Shadow**: Similar to other modals (rgba(100, 131, 176, 0.4))
- **Backdrop**: Blur with semi-transparent overlay
- **Animation**: Fade in/out

### Interaction
- **Tap Status Option**: Select status, close modal
- **Tap Backdrop**: Close modal without change
- **Current Status**: Optionally highlight current status (if applicable)

## Implementation Steps

### Step 1: Analyze Figma Design
- [ ] Extract exact dimensions, positions, spacing
- [ ] Determine grid layout (columns, rows)
- [ ] Identify icon sizes and label styles
- [ ] Note any special cases (e.g., current status highlighting)

### Step 2: Update Types
- [ ] Add `StatusChangeOption` type
- [ ] Create `STATUS_OPTIONS` configuration array
- [ ] Update `RoomCardData` if metadata needed

### Step 3: Create Modal Component
- [ ] Create `StatusChangeModal.tsx`
- [ ] Implement Modal wrapper with backdrop
- [ ] Create grid layout for status options
- [ ] Add styling based on Figma specs
- [ ] Implement close handlers

### Step 4: Create Option Item Component (Optional)
- [ ] Create `StatusOptionItem.tsx`
- [ ] Implement icon and label display
- [ ] Add press handler
- [ ] Add selected state styling (if needed)

### Step 5: Integrate with Screen
- [ ] Update `AllRoomsScreen.tsx` state
- [ ] Update `handleStatusPress` to show modal
- [ ] Implement `handleStatusSelect` handler
- [ ] Add modal to render tree
- [ ] Implement status update logic

### Step 6: Testing
- [ ] Test modal appears on InProgress status click
- [ ] Test modal closes on backdrop tap
- [ ] Test status selection updates room card
- [ ] Test modal positioning (if anchored)
- [ ] Test with different screen sizes
- [ ] Test edge cases (multiple rooms, scrolling, etc.)

### Step 7: Polish
- [ ] Add animations (fade, slide)
- [ ] Add haptic feedback (optional)
- [ ] Ensure accessibility
- [ ] Test performance

## Files to Create/Modify

### New Files
1. `src/components/allRooms/StatusChangeModal.tsx` - Main modal component
2. `src/components/allRooms/StatusOptionItem.tsx` - Optional item component
3. `STATUS_CHANGE_MODAL_IMPLEMENTATION_PLAN.md` - This file

### Files to Modify
1. `src/types/allRooms.types.ts` - Add types and configurations
2. `src/screens/AllRoomsScreen.tsx` - Add modal state and handlers
3. `src/constants/allRoomsStyles.ts` - Add modal styling constants (if needed)

## Notes and Considerations

1. **Status Mapping**: Some options (Priority, Pause, etc.) might not directly map to `RoomStatus`. Determine if they should:
   - Change status directly
   - Set metadata flags
   - Trigger actions

2. **Modal Positioning**: 
   - Fixed position (center, bottom)
   - Anchored to status button (requires position calculation)
   - Responsive positioning (avoid off-screen)

3. **Multiple Status Changes**: Consider if multiple rooms can be in "status change mode" simultaneously (likely not).

4. **Data Persistence**: After status change, save to backend/API (TODO for later).

5. **Undo/Redo**: Consider if status changes should be undoable (future enhancement).

6. **Accessibility**: Ensure modal is accessible (focus management, screen reader support).

## Questions to Resolve (From Figma Analysis)

1. How many columns in the grid?
2. Exact modal dimensions?
3. Modal position (fixed or anchored to button)?
4. Should current status be highlighted/disabled?
5. Which status options actually change `RoomStatus` vs. metadata?
6. Icon sizes and label typography?
7. Animation style (fade, slide-up, etc.)?






