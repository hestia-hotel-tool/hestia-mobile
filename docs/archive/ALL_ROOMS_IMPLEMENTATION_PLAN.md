# All Rooms Screen - Implementation Plan

## Overview
This document outlines the implementation plan for the All Rooms screen based on the Figma design (node-id: 1-1172). The screen displays a scrollable list of room cards with detailed information about each room's status, guests, and assigned staff.

---

## 1. Screen Structure Analysis

### A. Header Component (Fixed at Top)
**Component:** `AllRoomsHeader.tsx`
- **Height:** 217px
- **Background:** `#e4eefe`
- **Elements:**
  1. Back Arrow (left: 27px, top: 69px) - 14x28px
  2. "All Rooms" Title (left: 27px, top: 69px) - 24px, Bold, `#607aa1`
  3. AM/PM Toggle (left: 247px, top: 65px) - 121x35.243px
     - Active background: `#5a759d`
     - Active text: White, Bold, 15px
     - Inactive text: `#b1afaf`, Light, 15px
  4. Search Bar (left: 26px, top: 158px) - 301x59px
     - Background: `#f1f6fc`
     - Border radius: 82px
     - Placeholder: "Search Rooms, Guests, etc"
     - Search icon (left side)
  5. Bell/Notification Icon (top-right)

### B. Room Cards (Scrollable)
**Component:** `RoomCard.tsx`
- **Card Width:** 426px
- **Card Margin:** 7px horizontal
- **Card Spacing:** 23px between cards
- **Border Radius:** 9px
- **Background:** `#f9fafc`
- **Border:** `#e3e3e3`, 1px solid

### C. Bottom Navigation (Fixed at Bottom)
**Component:** `BottomTabBar.tsx`
- **Height:** 152px
- Already implemented

---

## 2. Room Card Types & Dimensions

### Card Type 1: Arrival/Departure (Priority)
**Example:** Room 201
- **Height:** 292px
- **Background:** `rgba(249,36,36,0.08)` (light red tint)
- **Border:** `#f92424`, 1px solid
- **Special Features:**
  - Two guests (arrival and departure)
  - Priority badges (11, 22)
  - Notes section at bottom
  - Horizontal divider between guests

### Card Type 2: Departure (Standard)
**Example:** Room 202
- **Height:** 177px
- **Background:** `#f9fafc`
- **Special Features:**
  - Single guest
  - Promise time display
  - No ETA/EDT time shown

### Card Type 3: Arrival (Standard with Notes)
**Example:** Room 203
- **Height:** 222px
- **Background:** `#f9fafc`
- **Special Features:**
  - Single guest
  - Notes section at bottom
  - Priority badge (11)

### Card Type 4: Arrival (Standard)
**Example:** Room 204
- **Height:** 185px
- **Background:** `#f9fafc`
- **Special Features:**
  - Single guest
  - Guest container background

### Card Type 5: Stayover (Standard)
**Example:** Room 205 (first instance)
- **Height:** 185px
- **Background:** `#f9fafc`
- **Special Features:**
  - Single guest
  - Stayover icon in header

### Card Type 6: Turndown (Standard)
**Example:** Room 205 (second instance)
- **Height:** 185px
- **Background:** `#f9fafc`
- **Special Features:**
  - Single guest
  - Turndown icon in header

---

## 3. Room Card Component Breakdown

### A. Room Header Section
**Position:** Top of card
**Elements:**
1. **Category Icon** (left: 14px/21px, top: 24.59px)
   - Arrival/Departure: 45x29.348px
   - Standard: 22.581x29.348px
   - Icons: `arrival-icon.png`, `departure-icon.png`, `arrival-departure-icon.png`, `stayover-icon.png`, `turndown-icon.png`

2. **Priority Badge** (if applicable)
   - Background: `#ffeded` (priority) or `#f9fafc` (standard)
   - Size: 14.191x16.375px
   - Position: left of room number

3. **Room Number** (left: 72px/79px, top: 17px/24px)
   - Font: Bold, 21px, `#334866`
   - Examples: "201", "202", "203", "204", "205"

4. **Room Type** (left: 111px/118px, top: 22px)
   - Font: Light, 12px, `#334866`
   - Example: "ST2K - 1.4"

5. **Category Label** (left: 70px/77px, top: 40px)
   - Font: Bold, 16px, `#334866`
   - Examples: "Arrival/Departure", "Departure", "Arrival", "Stayover", "Turndown"

6. **Forward Arrow** (left: 392px/401px, top: 29px)
   - Size: 7x14px
   - Icon: `forward-arrow-icon.png`
   - Color: Light black (`#1e1e1e`)

### B. Guest Information Section
**Component:** `GuestInfoSection.tsx`
**Position:** Left side of card

**Elements per Guest:**
1. **Guest Icon** (28.371x29.919px)
   - Arrival: `guest-arrival-icon.png` (green, no tint)
   - Departure: `guest-departure-icon.png` (red, no tint)
   - Other: `guest-icon.png` (with tint `#1e1e1e`)
   - Position: Left of guest name
   - Tint: `#1e1e1e` for arrival/departure icons (light dark)

2. **Guest Name** (left: 73px/80px)
   - Font: Bold, 14px, Black
   - Examples: "Mr Mohamed. B", "Mr Felix. K"
   - Must be fully visible (no overlap)
   - Position varies by card type:
     - Priority first guest: top: 87px
     - Priority second guest: top: 162px
     - Standard Arrival: top: 87px
     - Standard Departure: top: 92px
     - With Notes: top: 80px

3. **Date Range** (below name)
   - Font: Light, 14px, Black
   - Example: "07/10-15/10"
   - Position varies by card type:
     - Priority first guest: top: 109px
     - Priority second guest: top: 184px
     - Standard Arrival: top: 109px
     - Standard Departure: top: 114px
     - With Notes: top: 103px

4. **Time (ETA/EDT)** (if applicable)
   - Font: Regular, 14px, Black
   - Format: "ETA: 17:00" or "EDT: 12:00"
   - Position: Right of date range
   - Only shown for Arrival cards (ETA) or Departure cards (EDT)
   - Position varies:
     - Priority first: left: 75px, top: 130px
     - Priority second: left: 73px, top: 204px
     - Standard Arrival: left: 161px, top: 110px
     - Standard Departure: left: 161px, top: 114px
     - With Notes: left: 158px, top: 103px

5. **Guest Count** (with people icon)
   - Icon: `people-icon.png` (28.371x29.919px)
   - Text: "2/2" (Light, 14px, Black)
   - Position: Right of time or date range
   - Icon tint: `#334866`

6. **Priority Badge** (if applicable)
   - Font: Light, 12px, `#334866`
   - Position: Right of guest name
   - Examples: "11", "22"

### C. Guest Container Background
**Only for standard cards without notes (not Arrival/Departure)**
- **Background:** `rgba(223,230,240,0.4)`
- **Border Radius:** 10px
- **Width:** 414px
- **Height:**
  - Arrival: 100px
  - Departure: 101px
- **Position:** Centered horizontally, below header

### D. Staff Section
**Component:** `StaffSection.tsx`
**Position:** Right side of card

**Elements:**
1. **Avatar/Initials** (left: 236px/245px, top: 22px/24px)
   - Size: 35x35px
   - Circular
   - If no avatar: Show initials with background

2. **Staff Name** (left: 279px/288px, top: 23px/24px)
   - Font: Bold, 13px, `#1e1e1e`
   - Examples: "Etleva Hoxha", "Zoe Tsakeri", "Yenchai Moliao"

3. **Status Text** (below name)
   - Font: Light, 12px
   - Color varies:
     - "Not Started": `#1e1e1e`
     - "Started: 40 mins": `#1e1e1e`
     - "Finished: 60 mins": `#41d541`
     - "Finished: 65 mins": `#f92424`
   - Examples: "Not Started", "Started: 40 mins", "Finished: 60 mins"

4. **Promise Time** (Departure cards only)
   - Font: Bold, 13px, `#1e1e1e`
   - Format: "Promise time: 18:00"
   - Position: Below status text

5. **Forward Arrow** (right of staff info)
   - Size: 10x18px
   - Icon: `forward-arrow-icon.png`
   - Color: `#1e1e1e` (light black)
   - Position: left: 390px (priority) / 399px (standard), top: 29px

### E. Vertical Divider
**Position:** Between guest section and staff section
- **Width:** 1px
- **Height:** 50.5px
- **Color:** `#e3e3e3` (or similar)
- **Position:**
  - Priority: left: 227px, top: 11px
  - Standard: left: 235px, top: varies

### F. Status Button
**Component:** `StatusButton.tsx`
**Position:** Bottom right of card

**All Status Buttons:**
- **Size:** 134x70px
- **Style:** Icon-only (no background, no chevron)
- **Icon Size:** 134x70px (fills entire button area)

**Status Types:**
1. **Dirty** (Room 202)
   - Icon: `dirty-state-icon.png`
   - Position: left: 262px, top: 81px

2. **InProgress** (Room 201)
   - Icon: `in-progess-state-icon.png`
   - Position: left: 255px, top: 114px

3. **Cleaned** (Room 203)
   - Icon: `cleaned-state-icon.png`
   - Position: left: 256px, top: 74px

4. **Inspected** (Room 204, 205)
   - Icon: `inspected-status-icon.png`
   - Position: left: 270px, top: 87px/114px

### G. Notes Section
**Component:** `NotesSection.tsx`
**Only for cards with notes**

**Elements:**
1. **Background Container**
   - Background: `rgba(223,230,240,0.4)` or white
   - Border Radius: 10px
   - Height: 54px
   - Width: 414px
   - Position: Bottom of card

2. **Notes Icon** (left: 19px/23px/45px, top: 245px/943px)
   - Size: 31.974x31.974px
   - Icon: `notes-icon.png`

3. **Notes Count Badge** (if applicable)
   - Background: Pink circle
   - Size: 20.455x20.455px
   - Text: White, 15px, Light
   - Example: "3"

4. **Notes Text**
   - Font: Bold, 14px, `#5a759d`
   - Examples: "3 notes", "Rushed and notes"
   - Position: Right of icon

### H. Horizontal Divider (Arrival/Departure only)
**Position:** Between two guests
- **Height:** 1px
- **Width:** Full card width
- **Color:** `#e3e3e3`
- **Top:** 75px (relative to card)

---

## 4. Icon Specifications

### Category Icons (Header)
- **Arrival:** `arrival-icon.png` - 22.581x29.348px
- **Departure:** `departure-icon.png` - 22.581x29.348px
- **Arrival/Departure:** `arrival-departure-icon.png` - 45x29.348px
- **Stayover:** `stayover-icon.png` - 22.581x29.348px
- **Turndown:** `turndown-icon.png` - 22.581x29.348px

### Guest Icons
- **Guest Arrival:** `guest-arrival-icon.png` - 28.371x29.919px, green (tint: `#1e1e1e`)
- **Guest Departure:** `guest-departure-icon.png` - 28.371x29.919px, red (tint: `#1e1e1e`)
- **People Icon:** `people-icon.png` - 28.371x29.919px, tint: `#334866`

### Status Icons
- **Dirty:** `dirty-state-icon.png` - 134x70px
- **InProgress:** `in-progess-state-icon.png` - 134x70px
- **Cleaned:** `cleaned-state-icon.png` - 134x70px
- **Inspected:** `inspected-status-icon.png` - 134x70px

### Other Icons
- **Forward Arrow:** `forward-arrow-icon.png` - 10x18px (staff), 7x14px (header), tint: `#1e1e1e`
- **Notes Icon:** `notes-icon.png` - 31.974x31.974px

---

## 5. Color Palette

### Card Colors
- **Background (Standard):** `#f9fafc`
- **Background (Priority):** `rgba(249,36,36,0.08)`
- **Border (Standard):** `#e3e3e3`
- **Border (Priority):** `#f92424`
- **Guest Container BG:** `rgba(223,230,240,0.4)`

### Text Colors
- **Primary Text:** `#1e1e1e` (light black)
- **Room Number:** `#334866`
- **Category Label:** `#334866`
- **Guest Name:** Black (`#000000`)
- **Date/Time:** Black (`#000000`)
- **Staff Name:** `#1e1e1e`
- **Status Text:** `#1e1e1e` or `#41d541` or `#f92424`
- **Notes Text:** `#5a759d`

### Status Colors
- **Dirty:** `#f92424` (red)
- **InProgress:** `#ffc107` (yellow)
- **Cleaned:** `#5a759d` (blue)
- **Inspected:** `#41d541` (green)

---

## 6. Typography

### Font Families
- **Primary:** Helvetica (or system default)
- **Weights:** Bold, Light, Regular

### Font Sizes
- **Room Number:** 21px, Bold
- **Room Type:** 12px, Light
- **Category Label:** 16px, Bold
- **Guest Name:** 14px, Bold
- **Date Range:** 14px, Light
- **Time (ETA/EDT):** 14px, Regular
- **Guest Count:** 14px, Light
- **Staff Name:** 13px, Bold
- **Status Text:** 12px, Light
- **Promise Time:** 13px, Bold
- **Notes Text:** 14px, Bold
- **Priority Badge:** 12px, Light

---

## 7. Implementation Checklist

### Phase 1: Screen Structure ✅
- [x] Header component with back arrow, title, AM/PM toggle, search
- [x] Scrollable room cards container
- [x] Bottom navigation

### Phase 2: Room Card Base ✅
- [x] Card container with proper dimensions
- [x] Priority vs standard styling
- [x] Card height calculation based on type

### Phase 3: Room Header ✅
- [x] Category icon positioning and sizing
- [x] Room number, type, category label
- [x] Priority badge
- [x] Forward arrow (header)

### Phase 4: Guest Information ✅
- [x] Guest icon (arrival/departure/generic)
- [x] Guest name with proper visibility
- [x] Date range
- [x] Time (ETA/EDT) with conditional display
- [x] Guest count with people icon
- [x] Priority badge positioning
- [x] Guest container background

### Phase 5: Staff Section ✅
- [x] Avatar/initials display
- [x] Staff name and status
- [x] Promise time (for departure)
- [x] Forward arrow (staff section)

### Phase 6: Status Button ✅
- [x] Icon-only design (no background, no chevron)
- [x] All status types (Dirty, InProgress, Cleaned, Inspected)
- [x] Proper positioning per card type
- [x] Icon size: 134x70px

### Phase 7: Notes Section ✅
- [x] Notes container
- [x] Notes icon and count badge
- [x] Notes text ("3 notes", "Rushed and notes")

### Phase 8: Dividers ✅
- [x] Vertical divider (guest/staff)
- [x] Horizontal divider (Arrival/Departure guests)

### Phase 9: Icon Updates ✅
- [x] Category icons (arrival, departure, arrival-departure, stayover, turndown)
- [x] Guest icons (arrival, departure, people) - size: 28.371x29.919px
- [x] Status icons (dirty-state, in-progess-state, cleaned-state, inspected-status)
- [x] Forward arrow icons (10x18px staff, 7x14px header)
- [x] Notes icon

### Phase 10: Color & Styling Refinements ✅
- [x] Guest icon tint colors (light dark: `#1e1e1e`)
- [x] Text colors matching Figma
- [x] Background colors
- [x] Border colors

### Phase 11: Positioning & Alignment ✅
- [x] Exact positioning from Figma
- [x] Guest name visibility (no overlap)
- [x] Icon alignment
- [x] Text alignment

### Phase 12: Mock Data ✅
- [x] All room types represented
- [x] Priority cards
- [x] Notes cards
- [x] Multiple guests (Arrival/Departure)
- [x] Various status types
- [x] Staff information
- [x] Promise times

---

## 8. Key Implementation Details

### Icon Sizing
- All guest icons: **28.371x29.919px**
- Category icons (standard): **22.581x29.348px**
- Category icon (Arrival/Departure): **45x29.348px**
- Status icons: **134x70px** (icon-only, no background)
- Forward arrow (staff): **10x18px**
- Forward arrow (header): **7x14px**
- Notes icon: **31.974x31.974px**

### Color Application
- Guest arrival/departure icons: Tint with `#1e1e1e` (light dark)
- People icon: Tint with `#334866`
- Forward arrows: Tint with `#1e1e1e`
- Status icons: No tint (use original colors)

### Conditional Rendering
- ETA/EDT: Only show for Arrival (ETA) or Departure (EDT) cards
- Promise time: Only for Departure cards
- Notes section: Only when `room.notes` exists
- Priority badges: Only when `priorityCount` exists
- Guest container background: Only for standard cards without notes

### Positioning Strategy
- Use absolute positioning for all elements
- Calculate positions relative to card (0,0 at top-left)
- Account for priority vs standard card differences
- Use `scaleX` for responsive scaling

---

## 9. Testing Checklist

- [ ] All card types render correctly
- [ ] Priority cards have red border and background
- [ ] Guest names are fully visible (no overlap)
- [ ] Icons are correct size and color
- [ ] Status buttons are icon-only (no background)
- [ ] Notes section appears only when applicable
- [ ] Forward arrows are visible and correctly positioned
- [ ] ETA/EDT times display correctly
- [ ] Promise time shows for departure cards
- [ ] Horizontal divider appears in Arrival/Departure cards
- [ ] Vertical divider is correctly positioned
- [ ] Guest container background appears for standard cards
- [ ] All text colors match Figma
- [ ] All spacing matches Figma
- [ ] Responsive scaling works correctly

---

## 10. Files to Review/Update

### Components
- `src/components/allRooms/AllRoomsHeader.tsx` ✅
- `src/components/allRooms/RoomCard.tsx` ✅
- `src/components/allRooms/GuestInfoSection.tsx` ✅
- `src/components/allRooms/StaffSection.tsx` ✅
- `src/components/allRooms/StatusButton.tsx` ✅
- `src/components/allRooms/NotesSection.tsx` ✅

### Constants
- `src/constants/allRoomsStyles.ts` ✅

### Types
- `src/types/allRooms.types.ts` ✅

### Data
- `src/data/mockAllRoomsData.ts` ✅

### Screen
- `src/screens/AllRoomsScreen.tsx` ✅

---

## 11. Next Steps

1. **Review Current Implementation**
   - Compare existing code with Figma design
   - Identify any discrepancies

2. **Verify Icon Assets**
   - Ensure all icons are present
   - Verify icon sizes match specifications
   - Check icon colors

3. **Test All Card Types**
   - Arrival/Departure (Priority)
   - Departure (Standard)
   - Arrival (Standard with Notes)
   - Arrival (Standard)
   - Stayover (Standard)
   - Turndown (Standard)

4. **Fine-tune Positioning**
   - Verify exact pixel positions from Figma
   - Adjust any misaligned elements

5. **Color Verification**
   - Ensure all colors match Figma exactly
   - Verify tint colors are applied correctly

6. **Text Visibility**
   - Ensure all text is fully visible
   - No overlapping elements
   - Proper text truncation where needed

---

## Summary

The All Rooms screen implementation is largely complete. The main areas to verify are:
- Icon sizes (especially guest icons: 28.371x29.919px)
- Icon colors (light dark tint: `#1e1e1e` for arrival/departure icons)
- Status buttons (all icon-only, 134x70px)
- Exact positioning from Figma
- Text visibility and alignment
- Conditional rendering logic

All components are in place and should match the Figma design when properly configured.

