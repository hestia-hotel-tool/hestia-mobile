# Arrival/Departure Card Removal & Redesign Implementation Plan

## Overview
Remove all Arrival/Departure card functionality from the All Rooms screen and redesign to match the Figma design specification.

## Current Implementation Analysis

### What Currently Exists:
1. **Category Type**: `'Arrival/Departure'` in `RoomCategory` type
2. **Special Card Height**: 292px (vs 177px/185px for standard cards)
3. **Dual Guest Support**: Cards can display 2 guests with divider between them
4. **Special Icon**: `arrival-departure-icon.png` (45px × 29.348px)
5. **Special Logic**: Throughout multiple components for handling dual guests, positioning, priority counts

### Files Affected:
1. **Type Definitions**: `src/types/allRooms.types.ts`
2. **Mock Data**: `src/data/mockAllRoomsData.ts`
3. **Constants**: `src/constants/allRoomsStyles.ts`
4. **RoomCard Component**: `src/components/allRooms/RoomCard.tsx`
5. **GuestInfoSection Component**: `src/components/allRooms/GuestInfoSection.tsx`
6. **StatusButton Component**: `src/components/allRooms/StatusButton.tsx`
7. **NotesSection Component**: `src/components/allRooms/NotesSection.tsx`

---

## Implementation Steps

### Phase 1: Remove Arrival/Departure Category & Type Definitions

**File: `src/types/allRooms.types.ts`**
- [ ] Remove `'Arrival/Departure'` from `RoomCategory` type
- [ ] Remove `'Arrival/Departure'` entry from `CATEGORY_ICONS` object
- [ ] Remove `secondGuestPriorityCount` field from `RoomCardData` interface (if only used for Arrival/Departure)
- [ ] Verify that `guests` array only needs single guest support (check if other categories need multiple guests)

**Impact**: Breaking change - any code referencing `'Arrival/Departure'` will need updates

---

### Phase 2: Remove Arrival/Departure from Mock Data

**File: `src/data/mockAllRoomsData.ts`**
- [ ] Remove room with `category: 'Arrival/Departure'` (room-201)
- [ ] Verify remaining mock data only uses: `'Arrival'`, `'Departure'`, `'Stayover'`, `'Turndown'`
- [ ] Update any room that had dual guests to use single guest structure

**Note**: Based on current mock data, room-201 is the Arrival/Departure card and should be removed or converted to separate Arrival/Departure rooms

---

### Phase 3: Clean Up Constants

**File: `src/constants/allRoomsStyles.ts`**

#### Card Dimensions
- [ ] Remove `arrivalDeparture: 292` from `CARD_DIMENSIONS.heights`
- [ ] Update height calculations in RoomCard to only use remaining heights

#### Room Header
- [ ] Remove `iconArrivalDeparture` object from `ROOM_HEADER`
- [ ] Remove special sizing logic for Arrival/Departure icons

#### Guest Info
- [ ] Remove `container` (used only for Arrival/Departure priority cards - left: 73px)
- [ ] Remove `nameSecond` and `dateRangeSecond` (used for second guest in Arrival/Departure)
- [ ] Remove `priorityFirst` and `prioritySecond` positions from `time.positions`
- [ ] Remove `priorityFirst` and `prioritySecond` positions from `guestCount.positions`
- [ ] Clean up priority badge positions (remove second guest positions)

#### Status Button
- [ ] Remove `arrivalDeparture` position from `STATUS_BUTTON.positions`

#### Notes Section
- [ ] Remove `arrivalDeparture` position from `NOTES_SECTION.positions`
- [ ] Remove `arrivalDeparture` icon position from `NOTES_SECTION.icon.positions`
- [ ] Remove `arrivalDeparture` badge position from `NOTES_SECTION.badge.positions`
- [ ] Remove `arrivalDeparture` text position from `NOTES_SECTION.text.positions`
- [ ] Remove `rushedIcon` left position (26.03px) if only used for Arrival/Departure

#### Dividers
- [ ] Verify horizontal divider is only used for Arrival/Departure and remove if not needed

---

### Phase 4: Update RoomCard Component

**File: `src/components/allRooms/RoomCard.tsx`**

- [ ] Remove `isArrivalDeparture` variable and all conditional logic based on it
- [ ] Remove `arrivalDeparture` height calculation
- [ ] Remove `roomBadgeArrivalDeparture` style
- [ ] Remove `roomIconArrivalDeparture` style
- [ ] Remove guest divider line rendering logic (horizontal divider between two guests)
- [ ] Remove `isArrivalDeparture` prop from `GuestInfoSection` calls
- [ ] Remove `isArrivalDeparture` prop from `StatusButton` calls
- [ ] Remove `isArrivalDeparture` prop from `NotesSection` calls
- [ ] Simplify guest mapping logic (remove `secondGuestPriorityCount` handling)
- [ ] Remove conditional logic for guest container background (already excludes Arrival/Departure)

---

### Phase 5: Update GuestInfoSection Component

**File: `src/components/allRooms/GuestInfoSection.tsx`**

- [ ] Remove `isArrivalDeparture` prop from interface
- [ ] Remove `isSecondGuest` prop (if only used for Arrival/Departure)
- [ ] Remove `isFirstGuest` prop (if only used for Arrival/Departure)
- [ ] Remove `category` prop usage for Arrival/Departure icon logic
- [ ] Simplify icon selection logic (remove Arrival/Departure dual-icon logic)
- [ ] Remove `containerLeft` calculation for Arrival/Departure priority cards
- [ ] Remove `nameTop` calculation for second guest
- [ ] Remove `dateTop` calculation for second guest
- [ ] Remove `timePos` calculation for `prioritySecond`
- [ ] Remove `countPos` calculation for `prioritySecond`
- [ ] Remove `priorityBadgeLeft` and `priorityBadgeTop` calculations for second guest
- [ ] Simplify guest icon source logic (keep only Arrival, Departure, and default icons)
- [ ] Remove `guestIconNoTint` style if only used for Arrival/Departure icons

**Icon Logic to Keep**:
- `guest-arrival-icon.png` for Arrival category
- `guest-departure-icon.png` for Departure category
- `guest-icon.png` for other categories (Stayover, Turndown)

---

### Phase 6: Update StatusButton Component

**File: `src/components/allRooms/StatusButton.tsx`**

- [ ] Remove `isArrivalDeparture` prop from interface
- [ ] Remove `isArrivalDeparture` conditional logic from position calculation
- [ ] Simplify position logic to only handle: `hasNotes`, `status === 'Dirty'`, and `standard`

---

### Phase 7: Update NotesSection Component

**File: `src/components/allRooms/NotesSection.tsx`**

- [ ] Remove `isArrivalDeparture` prop from interface
- [ ] Remove `arrivalDeparture` position logic
- [ ] Use only `withNotes` position for all note sections
- [ ] Simplify icon, badge, and text positioning

---

### Phase 8: Figma Design Analysis & Requirements

**Based on Figma Design Analysis (node-id=1-1172):**

**Note**: The Figma design still contains an Arrival/Departure card (Room 201). However, the user wants to remove this functionality. The following analysis is for reference to understand what currently exists and what needs to be removed/redesigned.

**Current Arrival/Departure Card in Figma:**
- **Card Height**: 292px
- **Background**: `rgba(249, 36, 36, 0.08)` (light pink/red) - priority room
- **Border**: Red (`#f92424`) - priority border
- **Category Icon**: Blue door icon with green arrow (in) and red arrow (out) - `arrival-departure-icon.png`
- **Category Label**: "Arrival/Departure" text
- **Dual Guest Display**:
  - **First Guest (Arrival)**: 
    - Icon: Green arrow guest icon (`guest-arrival-icon.png`)
    - Name: "Mr Mohamed. B"
    - Priority badge: "11"
    - Date: "07/10-15/10"
    - Time: "ETA: 17:00"
    - Guest count: "2/2" with people icon
  - **Second Guest (Departure)**:
    - Icon: Red arrow guest icon (`guest-departure-icon.png`)
    - Name: "Mr Felix. K"
    - Priority badge: "22"
    - Date: "07/10-15/10"
    - Time: "EDT: 12:00"
    - Guest count: "2/2" with people icon
- **Horizontal Divider**: Between guests at 75px from top
- **Notes Section**: At bottom (245px from top)
  - Rushed icon (red circle)
  - Notes icon (gray)
  - Badge with "3"
  - Text: "Rushed and notes"

**Icons Used in Arrival/Departure Card:**
1. **Category Icon**: `arrival-departure-icon.png` (45px × 29.348px) - Blue door with green/red arrows
2. **Guest Icons**:
   - `guest-arrival-icon.png` (16px × 16px) - Green arrow for first guest
   - `guest-departure-icon.png` (16px × 16px) - Red arrow for second guest
3. **Notes Icons**:
   - `rushed-icon.png` (31.974px × 31.974px) - Red circle with running person
   - `notes-icon.png` (31.974px × 31.974px) - Gray pencil icon
4. **Other Icons**: People icon, forward arrow, status button icons

**Decision Required:**
Since the user wants to remove Arrival/Departure functionality but "redesign to match Figma", clarification is needed:
- Option A: Remove Arrival/Departure category entirely - rooms become separate Arrival or Departure cards
- Option B: Keep Arrival/Departure category but redesign the card implementation to exactly match Figma
- Option C: Something else (needs specification)

For now, proceeding with **removal** plan, assuming Option A unless specified otherwise.

---

### Phase 9: Testing & Cleanup

- [ ] Test All Rooms screen renders correctly without Arrival/Departure cards
- [ ] Verify all room categories display correctly (Arrival, Departure, Stayover, Turndown)
- [ ] Test priority rooms still work correctly
- [ ] Test rooms with notes display correctly
- [ ] Verify guest icons display correctly for each category
- [ ] Check that all positioning matches Figma design
- [ ] Remove any unused style definitions
- [ ] Remove any unused constants
- [ ] Check for any console errors or warnings

---

## Code Changes Summary

### Files to Modify:
1. `src/types/allRooms.types.ts` - Remove type and icon
2. `src/data/mockAllRoomsData.ts` - Remove/convert Arrival/Departure room
3. `src/constants/allRoomsStyles.ts` - Clean up constants
4. `src/components/allRooms/RoomCard.tsx` - Remove Arrival/Departure logic
5. `src/components/allRooms/GuestInfoSection.tsx` - Simplify guest info logic
6. `src/components/allRooms/StatusButton.tsx` - Simplify position logic
7. `src/components/allRooms/NotesSection.tsx` - Simplify notes positioning

### Estimated Changes:
- **Type definitions**: ~5 lines removed
- **Mock data**: 1 room removed (~40 lines)
- **Constants**: ~50-80 lines cleaned up
- **Components**: ~100-150 lines of conditional logic removed

---

## Notes for Implementation

1. **Backward Compatibility**: This is a breaking change. Ensure no other parts of the codebase reference `'Arrival/Departure'` category.

2. **Icon Assets**: Verify the following icons exist and are correct:
   - `arrival-icon.png`
   - `departure-icon.png`
   - `stayover-icon.png`
   - `turndown-icon.png`
   - `guest-arrival-icon.png`
   - `guest-departure-icon.png`
   - `guest-icon.png`

3. **Data Migration**: If production data exists, ensure backend/system can handle removal of Arrival/Departure category.

4. **Figma Reference**: Always cross-reference with Figma design at node-id=1-1172 to ensure new design matches exactly.

---

## Next Steps

1. **CLARIFICATION NEEDED**: Since Figma still shows an Arrival/Departure card (Room 201), confirm the intent:
   - **Option A**: Remove Arrival/Departure category entirely - rooms become separate Arrival/Departure cards
   - **Option B**: Keep Arrival/Departure category but redesign current implementation to exactly match Figma specifications
   - **Option C**: Other requirement

2. Review this plan with the team
3. Verify Figma design requirements (Phase 8) - icons and layout specifications
4. Create a branch for this refactoring
5. Implement changes phase by phase:
   - If Option A: Follow Phases 1-7 to remove functionality
   - If Option B: Follow Phases 1-7 to remove current code, then rebuild to match Figma exactly
6. Test thoroughly
7. Update documentation if needed

---

## Alternative: If Redesigning to Match Figma (Option B)

If the goal is to **redesign** the Arrival/Departure card to match Figma exactly (rather than remove it), the following additional steps would be needed after removal:

### Phase 10: Rebuild Arrival/Departure Card (If Option B)

- [ ] Add back `'Arrival/Departure'` to `RoomCategory` type
- [ ] Verify icon assets match Figma (especially `arrival-departure-icon.png`)
- [ ] Rebuild card component to match exact Figma specifications:
  - Card height: 292px
  - Priority background: `rgba(249, 36, 36, 0.08)`
  - Dual guest layout with exact positioning from Figma
  - Horizontal divider at 75px
  - Notes section positioning from Figma
  - Status button positioning from Figma
- [ ] Ensure all icons match Figma design exactly
- [ ] Verify priority badge positions (11 and 22) match Figma
- [ ] Test against Figma design pixel-perfectly

