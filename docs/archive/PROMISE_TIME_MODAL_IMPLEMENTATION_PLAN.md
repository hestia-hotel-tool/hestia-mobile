# Promise Time Modal Implementation Plan

## Overview
Implement a "Promise Time" modal similar to the "Return Later" modal, allowing users to set a promise time for when a room will be ready. This modal will be triggered when users select "Promised Time" from the status change modal.

## Design Reference
- **Figma URL**: https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=1121-825&m=dev
- **Similar Component**: `ReturnLaterModal.tsx` (use as reference)

## Key Differences from Return Later Modal

### 1. Title & Instruction
- **Title**: "Promise time" (instead of "Return Later")
- **Instruction**: "Add time for when the room will be ready" (instead of "Add time slot for when the Guest wants you to return")
- **No Suggestions Section**: Unlike Return Later, Promise Time doesn't have time suggestion buttons

### 2. Date/Time Picker
- Same iOS-style wheel picker with 4 columns (Date, Hour, Minute, AM/PM)
- Same navigation arrows (`<`, `>`) and "Done" button
- Same divider styling and selection behavior
- Same validation (no past dates/times)

### 3. Content Sections
- **No Assigned To Section**: Promise Time modal doesn't show assigned staff
- **No Task Section**: Promise Time modal doesn't show task information
- **Simpler Layout**: Just title, instruction, date/time picker, and confirm button

## Implementation Steps

### Step 1: Create PromiseTimeModal Component
**File**: `src/components/roomDetail/PromiseTimeModal.tsx`

**Props Interface**:
```typescript
interface PromiseTimeModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (promiseTime: string, period: 'AM' | 'PM') => void;
  roomNumber?: string;
}
```

**Key Features**:
1. Modal overlay with white background
2. Title: "Promise time"
3. Instruction: "Add time for when the room will be ready"
4. Date/Time picker (reuse logic from ReturnLaterModal)
5. Confirm button at bottom

### Step 2: Reuse ReturnLaterModal Date/Time Picker Logic

**Components to Reuse**:
- Date/Time picker wheel implementation
- Navigation arrows (`<`, `>`) for day navigation
- "Done" button in picker header
- Scroll handlers for date, hour, minute, AM/PM
- Validation logic (no past dates/times)
- Default to current date/time
- Selected time display (if needed)

**Code to Copy/Adapt**:
- Date/Time picker state management
- Scroll refs and handlers
- `changeDay()` function
- `handleDateScroll`, `handleHourScroll`, `handleMinuteScroll`, `handlePeriodScroll`
- `handleDateScrollEnd`, `handleHourScrollEnd`, `handleMinuteScrollEnd`, `handlePeriodScrollEnd`
- Initial scroll positioning in `useEffect`

### Step 3: Simplified Layout Structure

**Modal Structure**:
```
┌─────────────────────────────────────┐
│  Promise time                      │  ← Title
│  Add time for when the room will   │  ← Instruction
│  be ready                           │
│  ─────────────────────────────     │  ← Divider
│                                     │
│  [Date/Time Picker with header]    │
│  ┌─────────────────────────────┐   │
│  │ < >                  Done   │   │  ← Picker header
│  │ ─────────────────────────   │   │  ← Dividers
│  │ [Date] [Hour] [Min] [AM/PM] │   │  ← Wheel picker
│  │ ─────────────────────────   │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Confirm Button]                   │
└─────────────────────────────────────┘
```

### Step 4: Styling

**Reuse Styles from ReturnLaterModal**:
- `container`, `modalOverlay`, `scrollView`, `scrollContent`
- `title`, `instruction`, `divider`
- `dateTimePickerContainer`, `pickerHeader`, `navArrows`, `navButton`, `navArrow`, `navArrowActive`, `doneButton`
- `wheelPickerContainer`, `selectionDividerTop`, `selectionDividerBottom`
- `wheelColumn`, `wheelScrollContent`, `wheelItem`
- `wheelDateText`, `wheelSelectedDateText`, `wheelNumberText`, `wheelSelectedNumberText`
- `confirmButton`, `confirmButtonText`

**Remove/Don't Include**:
- `suggestionsLabel`, `suggestionsButtons` (no suggestions)
- `assignedTaskCard`, `cardDivider` (no assigned to section)
- `taskSection`, `taskTitle`, `taskText` (no task section)
- `selectedTimeDisplay` (may not be needed)

### Step 5: Integration with Room Detail Screens

**Files to Update**:
1. `src/screens/RoomDetailScreen.tsx`
2. `src/screens/ArrivalDepartureDetailScreen.tsx`

**Changes Needed**:
1. Uncomment and import `PromiseTimeModal`
2. Uncomment `showPromiseTimeModal` state
3. Uncomment `handlePromiseTimeConfirm` function
4. Update `handleStatusSelect` to show modal when `PromisedTime` is selected
5. Add modal component to JSX
6. Update `customStatusText` to show "Promise Time" when modal is open

**Example Integration**:
```typescript
// In handleStatusSelect
if (statusOption === 'PromisedTime') {
  setShowPromiseTimeModal(true);
  setSelectedStatusText('Promise Time');
  return;
}

// Handler
const handlePromiseTimeConfirm = (promiseTime: string, period: 'AM' | 'PM') => {
  // TODO: Save promise time to backend/API
  console.log('Promise Time confirmed for room:', room.roomNumber, 'at:', promiseTime, period);
  setShowPromiseTimeModal(false);
  // Keep selectedStatusText to show "Promise Time" in header
};

// In JSX
<PromiseTimeModal
  visible={showPromiseTimeModal}
  onClose={() => {
    setShowPromiseTimeModal(false);
    setSelectedStatusText(undefined);
  }}
  onConfirm={handlePromiseTimeConfirm}
  roomNumber={room.roomNumber}
/>
```

### Step 6: Validation & Behavior

**Same as ReturnLaterModal**:
- ✅ Default to current date/time
- ✅ Disable past dates
- ✅ Disable past times when on current date
- ✅ Navigation arrows (`<`, `>`) change days
- ✅ `>` button is active (blue color)
- ✅ Selected items snap to center between dividers
- ✅ All items have same font size (selected = bold, unselected = light)
- ✅ Date text doesn't wrap (`numberOfLines={1}`, `ellipsizeMode="clip"`)

**Different from ReturnLaterModal**:
- ❌ No time suggestions
- ❌ No assigned to section
- ❌ No task section
- ❌ No "see more" functionality

### Step 7: Testing Checklist

- [ ] Modal opens when "Promised Time" is selected from status modal
- [ ] Title displays "Promise time"
- [ ] Instruction displays correctly
- [ ] Date/Time picker shows current date/time by default
- [ ] Navigation arrows change days correctly
- [ ] Past dates/times are disabled
- [ ] Selected items are centered between dividers
- [ ] "Done" button closes picker (but not modal)
- [ ] Confirm button saves promise time and closes modal
- [ ] Header shows "Promise Time" when modal is open
- [ ] Modal closes properly on backdrop tap
- [ ] All styling matches Figma design

## File Structure

```
src/
├── components/
│   └── roomDetail/
│       ├── PromiseTimeModal.tsx          ← NEW
│       ├── ReturnLaterModal.tsx          ← REFERENCE
│       └── DatePickerContainer.tsx       ← EXISTS (may not be needed)
└── screens/
    ├── RoomDetailScreen.tsx              ← UPDATE
    └── ArrivalDepartureDetailScreen.tsx  ← UPDATE
```

## Estimated Implementation Time

- **Component Creation**: 2-3 hours
- **Integration**: 30 minutes
- **Testing & Refinement**: 1 hour
- **Total**: ~4 hours

## Notes

1. **Reusability**: Most of the date/time picker code can be directly copied from `ReturnLaterModal.tsx` and simplified
2. **Styling**: Reuse all picker-related styles, remove unused styles
3. **State Management**: Similar state management pattern, but simpler (no suggestions, no assigned to, no task)
4. **Validation**: Same validation logic as Return Later modal
5. **Future Enhancement**: Consider extracting the date/time picker into a shared component if more modals need it

## Dependencies

- React Native components: `Modal`, `View`, `Text`, `ScrollView`, `TouchableOpacity`, `StyleSheet`
- Existing components: None (self-contained)
- Constants: `scaleX` from `roomDetailStyles.ts` (or create new constants file if needed)
