# Status Change Modal - Quick Start Guide

## Overview
This document provides a quick reference for implementing the status change modal that appears when clicking an InProgress status icon.

## Component Structure

```
AllRoomsScreen
  ├── RoomCard (maps over rooms)
  │     └── StatusButton (status icon)
  │           └── onPress → handleStatusPress(room)
  │
  └── StatusChangeModal (conditionally rendered)
        ├── Backdrop (TouchableOpacity)
        │     └── onPress → close modal
        │
        └── ModalContainer (View with white background)
              └── StatusOptionsGrid (View/Flexbox)
                    └── StatusOptionItem[] (TouchableOpacity)
                          ├── Icon (Image)
                          ├── Label (Text)
                          └── onPress → handleStatusSelect(option)
```

## Data Flow

1. **User clicks InProgress status icon**
   - `StatusButton.onPress()` → `RoomCard.onStatusPress()` → `AllRoomsScreen.handleStatusPress(room)`

2. **Modal opens**
   - Check: `room.status === 'InProgress'`
   - Set state: `setShowStatusModal(true)`, `setSelectedRoomForStatusChange(room)`
   - Render: `<StatusChangeModal visible={true} ... />`

3. **User selects status option**
   - `StatusOptionItem.onPress()` → `StatusChangeModal.onStatusSelect(option)` → `AllRoomsScreen.handleStatusSelect(option)`
   - Update room status in `allRoomsData` state
   - Close modal: `setShowStatusModal(false)`

## Key Files

### Types & Config
- **`src/types/allRooms.types.ts`**
  - Add `StatusChangeOption` type
  - Add `STATUS_OPTIONS` array with icon configurations

### Components
- **`src/components/allRooms/StatusChangeModal.tsx`** (NEW)
  - Main modal component
  - Handles layout, backdrop, option rendering

- **`src/components/allRooms/StatusOptionItem.tsx`** (NEW - Optional)
  - Individual status option in grid
  - Icon + label display

### Screen
- **`src/screens/AllRoomsScreen.tsx`**
  - State: `showStatusModal`, `selectedRoomForStatusChange`
  - Handlers: `handleStatusPress`, `handleStatusSelect`
  - Render: `<StatusChangeModal />`

## Status Options

| Option ID | Label | Icon File | Maps to RoomStatus? |
|-----------|-------|-----------|---------------------|
| Priority | Priority | priority-status.png | Maybe (flag) |
| Dirty | Dirty | dirty-status.png | ✅ Yes |
| Cleaned | Cleaned | cleaned-status.png | ✅ Yes |
| Inspected | Inspected | inspected-status.png | ✅ Yes |
| Pause | Pause | pause-status.png | ❓ Metadata |
| ReturnLater | Return Later | return-later-status.png | ❓ Metadata |
| RefuseService | Refuse Service | refuse-service-status.png | ❓ Metadata |
| PromisedTime | Promised Time | promised-time-status.png | ❓ Metadata |

**Decision Needed**: Determine which options change `RoomStatus` vs. set metadata/flags.

## Implementation Checklist

### Phase 1: Setup Types
- [ ] Define `StatusChangeOption` type
- [ ] Create `STATUS_OPTIONS` configuration array
- [ ] Update `RoomCardData` if metadata fields needed

### Phase 2: Create Modal Component
- [ ] Extract Figma dimensions (width, height, padding, spacing)
- [ ] Create `StatusChangeModal.tsx` with Modal wrapper
- [ ] Implement backdrop with blur
- [ ] Create grid layout for options
- [ ] Add styling constants

### Phase 3: Create Option Item (Optional)
- [ ] Create `StatusOptionItem.tsx`
- [ ] Implement icon + label layout
- [ ] Add press handler

### Phase 4: Integrate
- [ ] Add modal state to `AllRoomsScreen`
- [ ] Update `handleStatusPress` to show modal (InProgress only)
- [ ] Implement `handleStatusSelect` handler
- [ ] Add modal to render tree
- [ ] Test status updates

### Phase 5: Polish
- [ ] Add animations
- [ ] Test on different screen sizes
- [ ] Add error handling
- [ ] Test edge cases

## Quick Code Snippets

### Modal State (AllRoomsScreen.tsx)
```typescript
const [showStatusModal, setShowStatusModal] = useState(false);
const [selectedRoomForStatusChange, setSelectedRoomForStatusChange] = useState<RoomCardData | null>(null);
```

### Status Press Handler
```typescript
const handleStatusPress = (room: RoomCardData) => {
  if (room.status === 'InProgress') {
    setSelectedRoomForStatusChange(room);
    setShowStatusModal(true);
  }
};
```

### Status Select Handler
```typescript
const handleStatusSelect = (statusOption: StatusChangeOption) => {
  if (!selectedRoomForStatusChange) return;
  
  // Map option to RoomStatus and update
  const newStatus = mapOptionToStatus(statusOption);
  setAllRoomsData(prev => ({
    ...prev,
    rooms: prev.rooms.map(room =>
      room.id === selectedRoomForStatusChange.id
        ? { ...room, status: newStatus }
        : room
    ),
  }));
  
  setShowStatusModal(false);
  setSelectedRoomForStatusChange(null);
};
```

### Modal Render
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

## Design Specs to Extract from Figma

- Modal container width/height
- Grid columns (2, 3, or 4)
- Icon size
- Label font size/weight
- Padding (container, items)
- Spacing (between items, rows)
- Border radius
- Shadow properties
- Position (fixed center/bottom vs. anchored to button)
- Backdrop opacity/blur intensity

## Next Steps

1. **Analyze Figma design** (node-id=406-1783) to extract exact specs
2. **Start with TypeScript types** - safest first step
3. **Build modal component** following existing modal patterns (MorePopup, CreateTicketMenu)
4. **Integrate and test** incrementally






