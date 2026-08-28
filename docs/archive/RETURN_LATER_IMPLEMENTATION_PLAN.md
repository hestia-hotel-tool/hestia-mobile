# Return Later Modal - Implementation Plan

## 📋 Overview

**Figma Design**: https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=1121-328&m=dev

**Purpose**: Allow housekeeping staff to set a specific time when they should return to a guest's room.

**Trigger**: User taps "Return Later" option from the status change modal in room detail screen.

### ✅ Reusable Components

This implementation will leverage **3 existing components**:

1. **`AssignedToSection`** (`src/components/roomDetail/AssignedToSection.tsx`)
   - Shows staff avatar/initials, name, department
   - Includes reassign button with correct styling
   - Fully functional and tested

2. **`AMPMToggle`** (`src/components/home/AMPMToggle.tsx`)
   - AM/PM toggle with slider animation
   - Correct colors and dimensions
   - Fully functional and tested

3. **`TimePickerWheel`** (`src/components/shared/TimePickerWheel.tsx`)
   - Scrollable time picker (if exists)
   - Or will create simple ScrollView implementation

**Benefits**: Faster development, consistent UI, fewer bugs, less code to maintain.

---

## 🎯 User Flow

1. User is on Room Detail Screen
2. User taps the Status button (top of screen)
3. Status Change Modal appears
4. User selects "Return Later" option
5. **Return Later Modal opens** (full screen, starting below header)
6. User can:
   - Select a quick time suggestion (10 mins, 20 mins, 30 mins, 1 Hour)
   - Toggle between AM/PM
   - Manually select time using time picker (hours & minutes)
   - View assigned staff member
   - Reassign to different staff if needed
7. User taps "Confirm" button
8. Modal closes
9. Room status updates to show "Return Later" with the selected time
10. Backend is notified of the return time

---

## 🎨 Design Specifications

### Layout Structure
```
┌─────────────────────────────────────┐
│  [Header - Yellow, 232px height]   │ ← Remains visible
├─────────────────────────────────────┤
│  Return Later                       │ ← Title (21px from top)
│  Add time slot for when the Guest  │ ← Instruction text
│  wants you to return                │
│  ─────────────────────────────────  │ ← Divider
│  Suggestions                        │ ← Label
│  [10 mins] [20 mins] [30 mins]     │ ← Suggestion buttons
│  [1 Hour]                           │
│                                     │
│         [AM] [PM]                   │ ← Toggle (centered)
│                                     │
│      [Hours]  |  [Minutes]          │ ← Time picker
│        12          30                │
│        01          31                │
│        02          32                │
│                                     │
│  ┌───────────────────────────────┐ │
│  │         Confirm               │ │ ← Confirm button
│  └───────────────────────────────┘ │
│                                     │
│  Assigned to                        │ ← Assigned section
│  [Avatar] Staff Name                │
│           [Reassign]                │
│                                     │
└─────────────────────────────────────┘
```

### Key Measurements (from Figma)
- **Modal Start**: 232px from top (below header)
- **Title**: 253px from top (21px from modal start)
- **Instruction**: 280px from top
- **Divider**: 312px from top
- **Suggestions Label**: 336px from top
- **Suggestion Buttons**: 371px from top
- **AM/PM Toggle**: 466px from top (centered)
- **Time Picker**: 556.39px from top
- **Confirm Button**: 848px from top (full width, 107px height)
- **Assigned To**: 1185px from top

### Colors
- **Title**: #607aa1 (blue-gray)
- **Body Text**: #1e1e1e (dark gray)
- **Divider**: #c6c5c5 (light gray)
- **Button Border**: #000000 (black, 1px)
- **Button Background (unselected)**: #ffffff (white)
- **Button Background (selected)**: #f5f5f5 (light gray)
- **Toggle Background**: rgba(100, 131, 176, 0.07) (light blue-gray)
- **Toggle Slider**: #5a759d (blue-gray)
- **Time Picker (selected)**: #5a759d (blue-gray)
- **Time Picker (unselected)**: #999999 (gray)
- **Confirm Button**: #5a759d (blue-gray)
- **Reassign Button**: #f1f6fc (light blue)

### Typography
- **Title**: 20px, Bold (700)
- **Instruction**: 14px, Light (300)
- **Labels**: 14px, Light (300)
- **Buttons**: 14px, Light (300) / Bold (700) when selected
- **Toggle**: 15px, Regular (400)
- **Time Picker (selected)**: 24px, Bold (700)
- **Time Picker (unselected)**: 16px, Regular (400)
- **Confirm Button**: 18px, Regular (400)

---

## 📁 File Structure

```
src/
├── components/
│   └── roomDetail/
│       ├── ReturnLaterModal.tsx           # Main modal component (NEW)
│       ├── TimeSuggestionButton.tsx       # Individual suggestion button (NEW)
│       ├── AssignedToSection.tsx          # ✅ REUSE existing component
│       ├── TimePickerWheel.tsx            # ✅ REUSE existing component
│       └── AMPMToggle.tsx                 # ✅ REUSE existing component (in home/)
├── constants/
│   └── returnLaterModalStyles.ts          # All design constants (NEW)
└── screens/
    ├── RoomDetailScreen.tsx               # Update to use modal
    └── ArrivalDepartureDetailScreen.tsx   # Update to use modal
```

**Reusable Components**:
- ✅ `AssignedToSection` - Already exists, shows staff with reassign button
- ✅ `AMPMToggle` - Already exists in `src/components/home/`
- ✅ `TimePickerWheel` - Already exists in `src/components/shared/`

---

## 🔨 Implementation Steps

### Phase 1: Design Constants (1 hour)

**File**: `src/constants/returnLaterModalStyles.ts`

**Tasks**:
1. Create constants file with all measurements from Figma
2. Define responsive scaling (scaleX based on screen width)
3. Export all style constants:
   - Modal overlay position
   - Title, instruction, divider positions
   - Suggestions section (label, buttons)
   - AM/PM toggle specs
   - Time picker specs
   - Confirm button specs
   - Assigned to section specs

**Deliverable**: Complete style constants file with proper TypeScript types

---

### Phase 2: Time Suggestion Button Component (1 hour)

**File**: `src/components/roomDetail/TimeSuggestionButton.tsx`

**Props**:
```typescript
interface TimeSuggestionButtonProps {
  label: string;           // "10 mins", "20 mins", etc.
  isSelected: boolean;     // Whether this button is selected
  onPress: () => void;     // Callback when pressed
}
```

**Features**:
- Pill-shaped button with black border
- White background when unselected
- Light gray background when selected
- Light font weight when unselected
- Bold font weight when selected
- Proper scaling for all screen sizes

**Deliverable**: Reusable button component

---

### Phase 3: Main Modal Component (3-4 hours)

**File**: `src/components/roomDetail/ReturnLaterModal.tsx`

**Props**:
```typescript
interface ReturnLaterModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (returnTime: string, period: 'AM' | 'PM') => void;
  roomNumber?: string;
  assignedTo?: {
    id: string;
    name: string;
    avatar?: any;
    initials?: string;
    avatarColor?: string;
    department?: string;  // For AssignedToSection component
  };
  onReassignPress?: () => void;
}
```

**Reusable Components to Import**:
```typescript
import AssignedToSection from './AssignedToSection';  // ✅ Existing
import AMPMToggle from '../home/AMPMToggle';          // ✅ Existing
import TimePickerWheel from '../shared/TimePickerWheel'; // ✅ Existing (if exists)
```

**State Management**:
```typescript
const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
const [selectedHour, setSelectedHour] = useState<number>(currentHour);
const [selectedMinute, setSelectedMinute] = useState<number>(currentMinute);
const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(currentPeriod);
```

**Features**:
1. **Modal Container**
   - Transparent background (header remains visible)
   - White overlay starting at 232px from top
   - Scrollable content

2. **Title Section**
   - "Return Later" text
   - Blue-gray color
   - Proper positioning from Figma

3. **Instruction Text**
   - "Add time slot for when the Guest wants you to return"
   - Light gray color
   - Multi-line support

4. **Divider**
   - Thin horizontal line
   - Light gray color
   - Full width with margins

5. **Suggestions Section**
   - "Suggestions" label
   - Four suggestion buttons in a row
   - Buttons: "10 mins", "20 mins", "30 mins", "1 Hour"
   - Handle selection and time calculation

6. **AM/PM Toggle**
   - ✅ **REUSE** existing `AMPMToggle` component from `src/components/home/`
   - Already has correct styling:
     - Width: 121px
     - Height: 35.243px
     - Background: Light blue-gray
     - Slider: Blue-gray (#5a759d)
     - Smooth animation
   - Just need to center horizontally

7. **Time Picker**
   - ✅ **REUSE** existing `TimePickerWheel` component (if available)
   - Or create simple ScrollView implementation
   - Two scrollable columns (Hours | Minutes)
   - Hours: 1-12 (12-hour format)
   - Minutes: 00-59
   - Selected item: larger, bold, blue-gray
   - Unselected items: smaller, regular, gray
   - Smooth scrolling with snap

8. **Confirm Button**
   - Full-width button
   - Blue-gray background
   - White text
   - Fixed height (107px)
   - Calls onConfirm with formatted time string

9. **Assigned To Section**
   - ✅ **REUSE** existing `AssignedToSection` component
   - Title: "Assigned to" (render separately)
   - Component handles:
     - Avatar (35px circular) or initials
     - Staff name
     - Department (if available)
     - Reassign button (light blue, rounded)

**Logic**:
- Initialize with current time
- When suggestion pressed:
  - Calculate new time (current time + suggestion)
  - Update time picker to show calculated time
  - Update AM/PM if time crosses noon/midnight
- When time picker scrolled:
  - Clear selected suggestion
  - Update selected time
- When AM/PM toggled:
  - Update period state
- When confirm pressed:
  - Format time as "HH:MM AM/PM"
  - Call onConfirm callback
  - Close modal

**Deliverable**: Complete, functional modal component

---

### Phase 4: Integration with Screens (1 hour)

**Files**: 
- `src/screens/RoomDetailScreen.tsx`
- `src/screens/ArrivalDepartureDetailScreen.tsx`

**Tasks**:
1. Uncomment the Return Later modal code
2. Uncomment state variables
3. Uncomment handlers
4. Uncomment modal component
5. Test integration

**Changes**:
```typescript
// Uncomment these lines:
import ReturnLaterModal from '../components/roomDetail/ReturnLaterModal';
const [showReturnLaterModal, setShowReturnLaterModal] = useState(false);

const handleReturnLaterConfirm = (returnTime: string, period: 'AM' | 'PM') => {
  console.log('Return Later confirmed:', returnTime, period);
  // TODO: Call backend API to save return time
  setShowReturnLaterModal(false);
  // Update room status or show success message
};

// In status selection:
if (statusOption === 'ReturnLater') {
  setShowStatusModal(false);
  setShowReturnLaterModal(true);
  setSelectedStatusText(statusLabel);
  return;
}

// In render:
<ReturnLaterModal
  visible={showReturnLaterModal}
  onClose={() => {
    setShowReturnLaterModal(false);
    setSelectedStatusText(undefined);
  }}
  onConfirm={handleReturnLaterConfirm}
  roomNumber={room.roomNumber}
  assignedTo={roomDetail.assignedTo}
  onReassignPress={handleReassign}
/>
```

**Deliverable**: Fully integrated modal in both screens

---

### Phase 5: Testing & Refinement (2 hours)

**Test Cases**:

1. **Modal Opening**
   - ✅ Modal opens when "Return Later" selected
   - ✅ Header remains visible
   - ✅ Modal starts at correct position (232px)
   - ✅ All elements visible and properly positioned

2. **Time Suggestions**
   - ✅ "10 mins" adds 10 minutes to current time
   - ✅ "20 mins" adds 20 minutes to current time
   - ✅ "30 mins" adds 30 minutes to current time
   - ✅ "1 Hour" adds 60 minutes to current time
   - ✅ Time picker updates to show calculated time
   - ✅ AM/PM updates if time crosses noon/midnight
   - ✅ Selected button shows visual feedback

3. **AM/PM Toggle**
   - ✅ Toggle switches between AM and PM
   - ✅ Slider animates smoothly
   - ✅ Selected period shows white text
   - ✅ Unselected period shows black text

4. **Time Picker**
   - ✅ Hours scroll from 1-12
   - ✅ Minutes scroll from 00-59
   - ✅ Scrolling snaps to values
   - ✅ Selected value is larger and bold
   - ✅ Unselected values are smaller and regular
   - ✅ Scrolling clears selected suggestion

5. **Confirm Button**
   - ✅ Button is tappable
   - ✅ Correct time string is passed to callback
   - ✅ Modal closes after confirm
   - ✅ Room status updates

6. **Assigned To Section**
   - ✅ Shows correct staff member
   - ✅ Avatar displays correctly
   - ✅ Reassign button opens reassign modal
   - ✅ Return Later modal closes before reassign opens

7. **Edge Cases**
   - ✅ Time calculation handles hour overflow (e.g., 11:50 + 20 mins = 12:10)
   - ✅ Time calculation handles day boundary (11:50 PM + 20 mins = 12:10 AM)
   - ✅ Modal scrolls properly on small screens
   - ✅ All text is readable
   - ✅ No layout issues on different screen sizes

**Deliverable**: Fully tested, bug-free modal

---

## 🔄 Backend Integration (Future)

**API Endpoint** (to be implemented):
```typescript
POST /api/rooms/{roomId}/return-later

Request Body:
{
  "returnTime": "02:30 PM",
  "scheduledFor": "2024-01-15T14:30:00Z",  // ISO 8601 format
  "assignedStaffId": "staff-123",
  "roomNumber": "101"
}

Response:
{
  "success": true,
  "message": "Return time scheduled successfully",
  "data": {
    "roomId": "room-456",
    "returnTime": "02:30 PM",
    "scheduledFor": "2024-01-15T14:30:00Z",
    "status": "ReturnLater"
  }
}
```

**Integration Points**:
1. Call API in `handleReturnLaterConfirm`
2. Show loading state while API call is in progress
3. Handle success: Update room status, show success message
4. Handle error: Show error message, keep modal open
5. Store return time in local state for offline support

---

## 📱 Responsive Design

**Screen Sizes to Support**:
- iPhone 14 Pro Max (440px width) - Design baseline
- iPhone 14 Pro (393px width)
- iPhone SE (375px width)
- iPad (768px width)

**Scaling Strategy**:
```typescript
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

// Apply scaling to all dimensions
fontSize: 20 * scaleX
width: 358 * scaleX
marginLeft: 32 * scaleX
```

---

## ⚠️ Edge Cases & Error Handling

1. **No Assigned Staff**
   - Hide "Assigned to" section if no staff assigned
   - Or show "Unassigned" with assign button

2. **Invalid Time Selection**
   - Validate time is in the future
   - Show error if time is in the past

3. **Network Error**
   - Show error message
   - Keep modal open
   - Allow retry

4. **Modal Dismissed Without Confirm**
   - Clear selected time
   - Don't update room status
   - Return to previous state

5. **Reassign During Return Later**
   - Close Return Later modal
   - Open Reassign modal
   - After reassign, optionally reopen Return Later modal

---

## 🎯 Success Criteria

✅ Modal matches Figma design pixel-perfect  
✅ All interactions work smoothly  
✅ Time calculations are accurate  
✅ Modal is responsive on all screen sizes  
✅ No performance issues (smooth scrolling)  
✅ Code is clean and maintainable  
✅ All edge cases handled  
✅ No linter errors  
✅ No TypeScript errors  
✅ User can successfully set return time  
✅ Room status updates correctly  

---

## 📅 Estimated Timeline

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Design Constants | 1 hour | ⏳ Not Started |
| 2 | Suggestion Button Component | 1 hour | ⏳ Not Started |
| 3 | Main Modal Component | 3-4 hours | ⏳ Not Started |
| 4 | Screen Integration | 1 hour | ⏳ Not Started |
| 5 | Testing & Refinement | 2 hours | ⏳ Not Started |
| **Total** | | **8-9 hours** | |

---

## 🚀 Getting Started

### Prerequisites
- Figma design access
- Development environment set up
- Metro bundler running
- iOS Simulator or Android Emulator

### Step 1: Review Figma Design
1. Open Figma link
2. Inspect all elements
3. Note exact measurements, colors, fonts
4. Take screenshots for reference

### Step 2: Create Constants File
1. Create `src/constants/returnLaterModalStyles.ts`
2. Extract all values from Figma
3. Add proper TypeScript types
4. Export constants

### Step 3: Build Components
1. Start with `TimeSuggestionButton.tsx`
2. Test button in isolation
3. Build `ReturnLaterModal.tsx`
4. Test modal in isolation

### Step 4: Integrate
1. Uncomment code in screen files
2. Test full flow
3. Fix any issues

### Step 5: Polish
1. Test on multiple screen sizes
2. Test all interactions
3. Fix edge cases
4. Verify against Figma

---

## 📝 Notes

### Reusable Components ✅
- **`AssignedToSection`** - Fully functional, handles avatar/initials, name, department, reassign button
- **`AMPMToggle`** - Fully functional, correct styling, smooth animation
- **`TimePickerWheel`** - Check if exists in `src/components/shared/`, if not, create simple implementation

### Best Practices
- Keep code clean and well-documented
- Use TypeScript for type safety
- Follow existing code patterns in the project
- Test on real device if possible
- Consider accessibility (font sizes, touch targets)
- Add haptic feedback for better UX (optional)

### Component Reuse Benefits
- ✅ Consistent UI across the app
- ✅ Less code to write and maintain
- ✅ Fewer bugs (components already tested)
- ✅ Faster development time

---

**Status**: 📋 Plan Ready - Ready to Implement

