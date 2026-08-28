# Return Later Modal - Verification Checklist

## How to Test

1. Open the app and navigate to any room detail screen
2. Tap the status badge in the yellow/gold header
3. Select "Return Later" from the status options
4. The Return Later modal should appear

---

## ✅ Visual Verification Checklist

### Header (Yellow/Gold Background - Should remain visible)
- [ ] Room number displayed (e.g., "Room 201")
- [ ] Room code displayed below (e.g., "ST2K-1.4")
- [ ] "Return Later" status badge with icon and dropdown arrow
- [ ] Header color is yellow/gold (#f0be1b)

### Modal Content (White Background starting at 232px from top)

#### Title Section
- [ ] "Return Later" title in blue-gray color (#607aa1)
- [ ] Font size: 20px, Bold
- [ ] Positioned at left: 24px, top: 21px from modal start

#### Instruction Text
- [ ] Text: "Add time slot for when the Guest wants you to return"
- [ ] Font size: 14px, Light weight
- [ ] Black color
- [ ] Below title with proper spacing

#### Divider Line
- [ ] Thin horizontal line (1px height)
- [ ] Light gray color (#E0E0E0)
- [ ] Full width with 12px margins on sides

#### Suggestions Section
- [ ] "Suggestions" label on left
- [ ] Four pill-shaped buttons in a row:
  - [ ] "10 mins"
  - [ ] "20 mins"
  - [ ] "30 mins"
  - [ ] "1 Hour"
- [ ] Buttons have black border, rounded corners
- [ ] When tapped, button text becomes bold
- [ ] 13px gap between buttons

#### Date & Time Picker
- [ ] Navigation arrows (< and >) at top left
- [ ] "Done" button at top right in blue-gray
- [ ] Horizontal scrollable date picker showing:
  - [ ] Day names (e.g., "Sat", "Sun", "Mon")
  - [ ] Month names (e.g., "Nov", "Dec")
  - [ ] Date numbers (e.g., "29", "30", "1", "2")
- [ ] Selected date is bold and black
- [ ] Unselected dates are light gray
- [ ] Time display showing hour:minute AM/PM
- [ ] Selected time is larger (48px) and bold
- [ ] Unselected time values are smaller (32px) and gray
- [ ] Placeholder area for illustration/calendar image

#### Confirm Button
- [ ] Full-width button (with side margins)
- [ ] Blue-gray background (#5a759d)
- [ ] "Confirm" text in white, 18px
- [ ] 70px height
- [ ] Positioned below date/time picker

#### Assigned To Section
- [ ] "Assigned to" title (15px, bold, black)
- [ ] Staff avatar/initial circle
- [ ] Staff name (e.g., "Etleva Hoxha")
- [ ] Department below name (e.g., "HSK")
- [ ] "Reassign" button on the right in light blue

#### Task Section
- [ ] "Task" label (14px, bold, black)
- [ ] Task description text below (13px, light weight, black)
- [ ] Full text without truncation
- [ ] Text: "Deep clean bathroom (heavy bath use). Change all linens + pillow protectors. Vacuum under bed. Restock all amenities. Light at entrance flickering report to maintenance."
- [ ] Proper line height (18px) for readability

---

## 🔧 Interaction Tests

### Time Suggestions
1. [ ] Tap "10 mins" - time should update to 10 minutes from now
2. [ ] Tap "20 mins" - time should update to 20 minutes from now
3. [ ] Tap "30 mins" - time should update to 30 minutes from now
4. [ ] Tap "1 Hour" - time should update to 1 hour from now
5. [ ] Selected button should show bold text

### Date Picker
1. [ ] Swipe left/right to see more dates
2. [ ] Tap different dates - selected date should change
3. [ ] Selected date should be bold and black
4. [ ] Previously selected date should return to gray

### Navigation
1. [ ] Tap left arrow (<) - should navigate to previous dates
2. [ ] Tap right arrow (>) - should navigate to next dates
3. [ ] Tap "Done" - should finalize date/time selection

### Confirm & Close
1. [ ] Tap "Confirm" - modal should close
2. [ ] Header should show "Return Later" status
3. [ ] Time should be logged to console
4. [ ] Tap close/back - modal should close without saving

### Reassign
1. [ ] Tap "Reassign" button
2. [ ] Return Later modal should close
3. [ ] Reassign modal should open
4. [ ] After assigning, should return to room detail

---

## 🐛 Common Issues to Check

### If modal doesn't show new design:
1. [ ] Clear Metro bundler cache: `npx expo start --clear`
2. [ ] Reload app manually: Press 'r' in Metro terminal
3. [ ] Close app completely and reopen
4. [ ] Check that files were saved properly

### If components are misaligned:
1. [ ] Check screen scaling (should work on different screen sizes)
2. [ ] Verify scaleX calculations are correct
3. [ ] Check that positioning uses correct base values

### If TaskCard doesn't show:
1. [ ] Verify `taskDescription` prop is passed in RoomDetailScreen
2. [ ] Check TaskCard import is correct
3. [ ] Verify TaskCard component exists in `src/components/shared/`

### If app crashes:
1. [ ] Check console for error messages
2. [ ] Verify all imports are correct
3. [ ] Check for TypeScript errors
4. [ ] Ensure all required props are passed

---

## 📱 Device Testing

Test on multiple devices/simulators:
- [ ] iPhone simulator (various sizes)
- [ ] Android emulator
- [ ] Physical iPhone device
- [ ] Physical Android device

---

## ✨ Expected Behavior Summary

When you tap a time suggestion (e.g., "20 mins"):
1. Button text becomes bold
2. Date updates if needed (e.g., if adding 20 mins crosses midnight)
3. Time display updates to show new time
4. Selected time values appear larger and bold

When you tap "Confirm":
1. Modal closes with animation
2. Header shows "Return Later" status with icon
3. Header background becomes dark gray (#202A2F)
4. Console logs the selected return time

---

## 🎯 Key Differences from Old Design

| Feature | Old Design | New Design |
|---------|-----------|------------|
| Time Picker | Scrollable hour/minute wheels | Calendar-style with large time display |
| Date Selection | Not available | Horizontal scrollable date picker |
| AM/PM Toggle | Separate toggle switch | Integrated in time display |
| Task Display | Not visible in modal | Shows full task description at bottom |
| Layout | Vertical with time wheels | Calendar-style with visual hierarchy |
| Visual Style | Simple, functional | Modern, spacious, easy to read |

---

## 📸 Screenshot Comparison

Take screenshots of:
1. [ ] Modal closed - room detail screen with header
2. [ ] Modal open - full view of Return Later modal
3. [ ] After selecting time - showing bold suggestion and updated time
4. [ ] After confirm - showing Return Later status in header

Compare these with the Figma design to verify accuracy!
