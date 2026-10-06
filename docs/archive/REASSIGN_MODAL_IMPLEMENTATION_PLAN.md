# Reassign Modal - Implementation Plan

## Overview
This document outlines the implementation plan for the "Reassign" modal/screen that appears when a user clicks the "Reassign" button in the room details screen.

**Figma Design:** https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=1038-441&m=dev

## Design Analysis

### Screen Structure
The modal is a full-screen overlay with:

1. **Header Section** (0px - 133px)
   - Light blue background (#e4eefe)
   - Back button (left: 27px, top: 68px)
   - "Auto Assign" button (right: 293px, top: 62px)
   - Search icon (right side)

2. **Tab Navigation** (133px - 196px)
   - White background bar
   - Three tabs: "On Shift", "AM", "PM"
   - Active tab indicator (blue underline, 4px height, 81px width)
   - Active tab: "On Shift" (Bold, #5a759d)
   - Inactive tabs: "AM", "PM" (Light, rgba(90,117,157,0.55))
   - Divider line at bottom

3. **Staff List** (196px - bottom)
   - Scrollable list of staff members
   - Each staff item shows:
     - Profile picture (32px × 32px) or initial circle
     - Name (16px, Bold, #1e1e1e)
     - Department (14px, Light, black) - "HSK" or "F&B"
     - Workload progress bar (pink #ff4dd8 for assigned, gray #cdd3dd for remaining)
     - Workload number (16px, Bold) - e.g., "200"

## Component Breakdown

### 1. Main Modal Component
**File:** `src/components/roomDetail/ReassignModal.tsx`

**Responsibilities:**
- Full-screen modal overlay
- Coordinates all sub-components
- Handles staff selection
- Manages tab switching (On Shift, AM, PM)
- Handles auto assign functionality

**Props:**
```typescript
interface ReassignModalProps {
  visible: boolean;
  onClose: () => void;
  onStaffSelect: (staffId: string) => void;
  onAutoAssign: () => void;
  currentAssignedStaffId?: string;
  roomNumber?: string;
}
```

**State:**
- `activeTab`: 'OnShift' | 'AM' | 'PM'
- `searchQuery`: string
- `selectedStaffId`: string | null

---

### 2. Reassign Header
**File:** `src/components/roomDetail/ReassignHeader.tsx`

**Reusable Component** - Header with back button and action button

**Responsibilities:**
- Renders header with light blue background
- Back button with icon
- Auto Assign button
- Search icon

**Props:**
```typescript
interface ReassignHeaderProps {
  onBackPress: () => void;
  onAutoAssignPress: () => void;
  onSearchPress?: () => void;
}
```

**Design Specs:**
- Height: 133px
- Background: #e4eefe
- Back button: Left 27px, Top 68px
- Auto Assign button: Right 293px, Top 62px, White background, 119px × 39px

---

### 3. Reassign Tabs
**File:** `src/components/roomDetail/ReassignTabs.tsx`

**Reusable Component** - Tab navigation for filtering staff

**Responsibilities:**
- Renders three tabs: "On Shift", "AM", "PM"
- Shows active tab indicator (blue underline)
- Handles tab selection

**Props:**
```typescript
interface ReassignTabsProps {
  activeTab: 'OnShift' | 'AM' | 'PM';
  onTabChange: (tab: 'OnShift' | 'AM' | 'PM') => void;
}
```

**Design Specs:**
- Height: 64px (133px to 196px)
- Active tab: Bold, #5a759d
- Inactive tabs: Light, rgba(90,117,157,0.55)
- Underline: 4px height, 81px width, #5a759d

---

### 4. Staff List Item
**File:** `src/components/roomDetail/StaffListItem.tsx`

**Reusable Component** - Individual staff member row

**Responsibilities:**
- Renders staff profile picture or initial
- Displays name and department
- Shows workload progress bar
- Handles selection

**Props:**
```typescript
interface StaffListItemProps {
  staff: {
    id: string;
    name: string;
    department: string;
    avatar?: any;
    workload: number; // Current workload number
    maxWorkload?: number; // Max workload (default: 200)
    onShift: boolean;
  };
  isSelected: boolean;
  onPress: () => void;
}
```

**Design Specs:**
- Profile picture: 32px × 32px
- Name: 16px, Bold, #1e1e1e
- Department: 14px, Light, black
- Progress bar: Height 8px, Pink (#ff4dd8) for assigned, Gray (#cdd3dd) for remaining
- Workload number: 16px, Bold, right-aligned

---

### 5. Workload Progress Bar
**File:** `src/components/shared/WorkloadProgressBar.tsx`

**Highly Reusable Component** - Can be used in other staff-related screens

**Responsibilities:**
- Renders progress bar showing workload
- Shows assigned vs remaining capacity
- Displays workload number

**Props:**
```typescript
interface WorkloadProgressBarProps {
  current: number; // Current workload
  max?: number; // Max workload (default: 200)
  showNumber?: boolean; // Show number on right
  height?: number; // Bar height (default: 8px)
}
```

**Design Specs:**
- Height: 8px
- Assigned color: #ff4dd8 (pink)
- Remaining color: #cdd3dd (gray)
- Border radius: 27px (rounded ends)
- Number: 16px, Bold, right-aligned

---

### 6. Staff List Container
**File:** `src/components/roomDetail/StaffListContainer.tsx`

**Reusable Component** - Container for staff list with filtering

**Responsibilities:**
- Renders scrollable list of staff items
- Filters staff by active tab (On Shift, AM, PM)
- Handles search functionality
- Manages selection state

**Props:**
```typescript
interface StaffListContainerProps {
  staff: StaffMember[];
  activeTab: 'OnShift' | 'AM' | 'PM';
  searchQuery?: string;
  selectedStaffId?: string;
  onStaffSelect: (staffId: string) => void;
}
```

---

## File Structure

```
src/components/
├── roomDetail/
│   ├── ReassignModal.tsx          # Main modal component
│   ├── ReassignHeader.tsx         # Header with back and auto assign
│   ├── ReassignTabs.tsx          # Tab navigation
│   ├── StaffListItem.tsx         # Individual staff row
│   └── StaffListContainer.tsx    # Staff list with filtering
│
└── shared/
    └── WorkloadProgressBar.tsx   # Reusable progress bar component
```

## Data Types

**File:** `src/types/staff.types.ts` (new file)

```typescript
export interface StaffMember {
  id: string;
  name: string;
  department: string; // "HSK", "F&B", etc.
  avatar?: any;
  workload: number; // Current workload (e.g., 200)
  maxWorkload?: number; // Max capacity (default: 200)
  onShift: boolean;
  shift?: 'AM' | 'PM'; // Which shift they're on
}

export type ReassignTab = 'OnShift' | 'AM' | 'PM';
```

## Implementation Steps

### Phase 1: Base Components (2 hours)
1. ✅ Create `WorkloadProgressBar.tsx` - Reusable progress bar
   - Pink/gray segments
   - Workload number display
   - Rounded ends

2. ✅ Create `StaffListItem.tsx`
   - Profile picture or initial circle
   - Name and department
   - Workload progress bar
   - Selection state

3. ✅ Create `ReassignTabs.tsx`
   - Three tabs with active indicator
   - Tab switching logic

### Phase 2: Composite Components (1.5 hours)
4. ✅ Create `ReassignHeader.tsx`
   - Header with back button
   - Auto Assign button
   - Search icon

5. ✅ Create `StaffListContainer.tsx`
   - Scrollable list
   - Filter by tab
   - Search functionality

### Phase 3: Main Modal (2 hours)
6. ✅ Create `ReassignModal.tsx`
   - Modal structure
   - State management
   - Integrate all sub-components
   - Handle staff selection
   - Handle auto assign

### Phase 4: Data & Integration (1 hour)
7. ✅ Create `staff.types.ts` - Type definitions
8. ✅ Create mock staff data
9. ✅ Integrate with `ArrivalDepartureDetailScreen.tsx`
   - Add state for modal visibility
   - Handle reassign button press
   - Pass current assigned staff
   - Handle staff selection callback

### Phase 5: Testing & Polish (1 hour)
10. ✅ Test all interactions
    - Tab switching
    - Staff selection
    - Auto assign
    - Search (if implemented)
    - Close modal

## Styling Constants

Create constants file: `src/constants/reassignModalStyles.ts`

```typescript
export const REASSIGN_MODAL = {
  header: {
    height: 133,
    backgroundColor: '#e4eefe',
    backButton: {
      left: 27,
      top: 68,
    },
    autoAssignButton: {
      right: 293,
      top: 62,
      width: 119,
      height: 39,
    },
  },
  tabs: {
    top: 133,
    height: 64,
    activeUnderline: {
      height: 4,
      width: 81,
      backgroundColor: '#5a759d',
      left: 23,
    },
  },
  staffList: {
    top: 196,
    itemHeight: 76, // Approximate height per item
    profilePicture: {
      size: 32,
      left: 37,
    },
    name: {
      left: 83,
      fontSize: 16,
      top: 0, // Relative to item
    },
    department: {
      left: 83,
      fontSize: 14,
      top: 21, // Below name
    },
    progressBar: {
      left: 230,
      width: 172, // Approximate
      height: 8,
    },
    workloadNumber: {
      right: 375,
      fontSize: 16,
    },
  },
} as const;
```

## Key Technical Considerations

### 1. Staff Filtering Logic
- **On Shift**: Show all staff currently on shift
- **AM**: Show staff on AM shift
- **PM**: Show staff on PM shift

### 2. Workload Calculation
- Progress bar shows: assigned / max workload
- Pink portion = assigned workload
- Gray portion = remaining capacity
- Number displays current workload

### 3. Profile Picture Fallback
- If no avatar, show initial circle with first letter
- Initial circle: Colored background with white letter

### 4. Selection State
- Highlight selected staff member
- Show visual feedback on selection

### 5. Auto Assign Logic
- Automatically select staff with lowest workload
- Or use round-robin algorithm
- Or use department matching

## Reusability Notes

### Components That Can Be Reused Elsewhere:

1. **WorkloadProgressBar** - Can be used for:
   - Staff management screens
   - Dashboard workload indicators
   - Task assignment screens

2. **StaffListItem** - Can be used for:
   - Staff directory
   - Team management
   - Assignment screens

3. **ReassignTabs** - Can be used for:
   - Any tabbed filtering interface
   - Shift-based filtering

4. **ReassignHeader** - Pattern can be reused for:
   - Modal headers with actions
   - Screen headers with buttons

## Testing Checklist

- [ ] Modal opens when "Reassign" is clicked
- [ ] Back button closes modal
- [ ] Auto Assign button works
- [ ] Tab switching works (On Shift, AM, PM)
- [ ] Staff list filters correctly by tab
- [ ] Staff items display correctly
- [ ] Profile pictures or initials show
- [ ] Workload progress bars display correctly
- [ ] Staff selection works
- [ ] Selected staff is highlighted
- [ ] Modal closes on staff selection
- [ ] Search functionality works (if implemented)
- [ ] Scrollable list works
- [ ] Responsive on different screen sizes

## Estimated Timeline

| Phase | Task | Time |
|-------|------|------|
| 1 | Base Components | 2 hours |
| 2 | Composite Components | 1.5 hours |
| 3 | Main Modal | 2 hours |
| 4 | Data & Integration | 1 hour |
| 5 | Testing & Polish | 1 hour |
| **Total** | | **7.5 hours** |

## Next Steps

1. Review and approve this plan
2. Create type definitions
3. Create mock staff data
4. Implement base components
5. Build up to main modal
6. Integrate with room detail screen
7. Test and refine

