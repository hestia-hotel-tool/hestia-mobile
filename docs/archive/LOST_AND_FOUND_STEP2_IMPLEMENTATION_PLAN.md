# Lost and Found Registration - Step 2 Implementation Plan

## Overview
This document outlines the implementation plan for Step 2 of the Lost and Found registration form, which focuses on staff assignment, status selection, and storage location.

## Design Reference
- **Figma Node**: `733-192`
- **Figma URL**: https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=733-192&m=dev

## Step 2 Components

### 1. Progress Indicator
- **Current Step**: "Step 2" (bold, black text)
- **Progress Bar**: 3 segments
  - First 2 segments: Active (dark blue `#5a759d`)
  - Third segment: Inactive (light gray `rgba(90,117,157,0.24)`)
- **Position**: Below "Register" title

### 2. Founded By Section
**Label**: "Founded by" (Inter Light, 14px, black)

**Input Field**:
- Border: `#afa9ad`, 1px, 8px radius
- Height: 68px
- Width: 388px (centered)
- Shows selected staff member:
  - Avatar (32x32px circular)
  - Name (Helvetica Regular, 16px, `#5a759d`)
  - Search icon on right (magnifying glass, rotated 270deg)

**Dropdown/Modal** (opens when field is clicked):
- Header:
  - Left: "Founded by" (Helvetica Bold, 17px, `#607aa1`)
  - Right: "1 Selected" (Inter Light, 14px, black)
  - Close icon (X) on right
- Staff List:
  - Each item shows:
    - Avatar (32x32px) or initial circle with colored background
    - Name (Helvetica Bold, 16px, `#1e1e1e`)
    - Department (Inter Light, 14px, black) - e.g., "HSK", "F&B"
    - Checkmark icon on right if selected
  - Special "Me" option:
    - Shows "Me" label (Helvetica Regular, 11px, `#5a759d`) above name
    - Represents current user (Etleva Hoxha)
- Footer: "see all" link (Helvetica Regular, 14px, `#5a759d`, centered)
- Divider line between header and list
- Scrollable if list exceeds visible area

**Mock Data**:
- Etleva Hoxha (Me) - HSK - Avatar: `@assets/images/Etleva_Hoxha.png`
- Stella Kitou - HSK (default selected) - Avatar: `@assets/images/Stella_Kitou.png`
- Zoe Tsakeri - HSK (initial "Z" in pink circle) - No avatar, use initial
- Felix F - F&B - Avatar: `@assets/images/Felix_F.png`

**Avatar Handling**:
- If avatar image is provided, use the image
- If no avatar, use first letter of name in a colored circle (e.g., "Mua Wallace" -> "M")
- Generate color for initial circle based on name (similar to existing StaffListItem pattern)

### 3. Registered By Section
**Label**: "Registered by" (Inter Light, 14px, black)

**Input Field**:
- Same styling as "Founded by" field
- Default: "Stella Kitou" with avatar
- Search icon on right
- Opens similar dropdown/modal as "Founded by"

### 4. Status Section
**Label**: "Status" (Inter Light, 14px, black)

**Input Field**:
- Border: `#afa9ad`, 1px, 8px radius
- Height: 68px
- Width: 387px (centered)
- Content:
  - Status icon (yellow solid circle, 27x27px) on left
  - Status text: "Stored" (Helvetica Regular, 16px, `#5a759d`)
  - Dropdown chevron on right (down arrow, rotated 270deg)

**Dropdown Options**:
- Stored (default)
- Shipped
- Discarded
- Each option shows icon + text

### 5. Stored Location Section
**Label**: "Stored Location" (Inter Light, 14px, black)

**Input Field**:
- Border: `#afa9ad`, 1px, 8px radius
- Height: 68px
- Width: 387px (centered)
- Content:
  - Location text: "HSK Office" (Helvetica Regular, 16px, `#5a759d`)
  - Dropdown chevron on right (down arrow, rotated 270deg)

**Dropdown Options**:
- HSK Office (default)
- Front Desk
- Security Office
- Other locations (to be defined)

### 6. Next Button
- Background: `#5a759d`
- Height: 70px
- Width: 351px (centered)
- Border radius: 8px
- Text: "Next" (Helvetica Regular, 18px, white, centered)
- Position: Bottom of form

## Implementation Tasks

### Task 1: Update Modal State Management
- [ ] Add `currentStep` state (1, 2, or 3)
- [ ] Update progress bar to reflect current step
- [ ] Add conditional rendering for Step 1 vs Step 2 content
- [ ] Update "Next" button handler to advance to Step 2

### Task 2: Create Staff Selector Component
- [ ] Create `StaffSelectorModal.tsx` component
- [ ] Implement search functionality
- [ ] Display staff list with avatars/initials
- [ ] Show "Me" option at top
- [ ] Add selection checkmarks
- [ ] Implement "see all" link (scroll to show more)
- [ ] Add header with "X Selected" count
- [ ] Style to match Figma design

### Task 3: Create Status Dropdown Component
- [ ] Create `StatusDropdown.tsx` component
- [ ] Options: Stored, Shipped, Discarded
- [ ] Each option with appropriate icon:
  - Stored: yellow circle or down arrow
  - Shipped: tick icon
  - Discarded: trash/delete icon
- [ ] Style to match Figma design

### Task 4: Create Stored Location Dropdown Component
- [ ] Create `StoredLocationDropdown.tsx` component
- [ ] Options: HSK Office, Front Desk, Security Office, etc.
- [ ] Style to match Figma design

### Task 5: Update Design Tokens
- [ ] Add Step 2 specific constants to `lostAndFoundStyles.ts`:
  - Founded by field dimensions and styling
  - Registered by field dimensions and styling
  - Status field dimensions and styling
  - Stored location field dimensions and styling
  - Staff selector modal dimensions
  - Status dropdown dimensions
  - Location dropdown dimensions

### Task 6: Integrate Step 2 into Modal
- [ ] Add Step 2 form fields to `RegisterLostAndFoundModal.tsx`
- [ ] Add state for:
  - `foundedBy` (staff member ID)
  - `registeredBy` (staff member ID)
  - `status` ('stored' | 'shipped' | 'discarded')
  - `storedLocation` (string)
- [ ] Add handlers for field interactions
- [ ] Connect dropdowns/modals to fields

### Task 7: Mock Data
- [ ] Create or update mock staff data for selectors with avatar images:
  - Etleva Hoxha: `require('../../assets/images/Etleva_Hoxha.png')`
  - Stella Kitou: `require('../../assets/images/Stella_Kitou.png')`
  - Felix F: `require('../../assets/images/Felix_F.png')`
  - Others: Use first letter of name (e.g., "Mua Wallace" -> "M") in colored circle
- [ ] Implement avatar fallback logic (use first letter if no image)
- [ ] Add status options data
- [ ] Add stored location options data

### Task 8: Navigation Between Steps
- [ ] Update "Next" button to advance from Step 1 to Step 2
- [ ] Add "Back" functionality (optional, or use header back button)
- [ ] Update progress bar on step change

## Technical Considerations

### Reusable Components
- Leverage existing `StaffListItem` component pattern
- Reuse dropdown/modal patterns from `ReassignModal`
- Use similar avatar/initial rendering logic

### State Management
- Use `useState` for form state
- Manage modal visibility for each selector
- Track selected items for "X Selected" count

### Styling
- Use `scaleX` for responsive dimensions
- Follow existing design token patterns
- Ensure proper spacing between sections (relative, not absolute)

### Assets Needed
- **Staff Avatars**:
  - `@assets/images/Etleva_Hoxha.png` - For Etleva Hoxha
  - `@assets/images/Stella_Kitou.png` - For Stella Kitou
  - `@assets/images/Felix_F.png` - For Felix F
  - Other staff members: Use first letter of name in colored circle
- Search/magnifying glass icon (if not already available)
- Status icons (yellow circle, tick, etc.)
- Dropdown chevron icon (down arrow, rotated)
- Close icon (X) for modals

## File Structure

```
src/
  components/
    lostAndFound/
      RegisterLostAndFoundModal.tsx (update)
      StaffSelectorModal.tsx (new)
      StatusDropdown.tsx (new)
      StoredLocationDropdown.tsx (new)
  constants/
    lostAndFoundStyles.ts (update)
  data/
    mockStaffData.ts (update or use existing)
```

## Design Tokens to Extract

### Founded By / Registered By Fields
- Input field: width, height, border, radius, padding
- Avatar size: 32x32px
- Text sizes: name (16px), department (14px)
- Icon sizes: search icon, chevron

### Status Field
- Input field: width, height, border, radius
- Icon size: 27x27px
- Text size: 16px
- Dropdown positioning

### Stored Location Field
- Input field: width, height, border, radius
- Text size: 16px
- Dropdown positioning

### Staff Selector Modal
- Modal dimensions
- Header height and styling
- List item height
- Avatar/initial circle sizes
- Spacing between items
- Footer "see all" link styling

## Next Steps
1. Review and approve this plan
2. Start with Task 1 (state management and step navigation)
3. Create reusable staff selector component
4. Implement status and location dropdowns
5. Integrate all components into Step 2
6. Test navigation between steps
7. Verify styling matches Figma design

