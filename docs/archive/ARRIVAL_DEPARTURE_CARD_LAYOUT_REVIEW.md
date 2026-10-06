# Arrival/Departure Card Layout Review

## Current Implementation vs Design

### Design Analysis (from provided image)

**Room 201 - Arrival/Departure Card:**

#### Header Section
- Room icon (arrival/departure combined icon) - top left
- Room number "201" - bold, dark blue
- Room type "ST2K - 1.4" - light text
- Category label "Arrival/Departure" - below room number

#### First Guest (Mr Mohamed. B)
- **Guest image**: 65×65px, rounded corners, left side
- **Green badge** (arrival indicator) on bottom-right of image
- **Name**: "Mr Mohamed. B" with badge "11" inline
- **Dates**: "07/10-15/10" 
- **Guest count icon + text**: "2/2" (people icon + numbers)
- **ETA**: "ETA: 17:00" on separate line below dates

#### Divider
- Horizontal line separating the two guests

#### Second Guest (Mr Felix. K)
- **Guest image**: 65×65px, rounded corners, left side
- **Red badge** (departure indicator) on bottom-right of image
- **Name**: "Mr Felix. K" with badge "22"
- **Dates**: "07/10-15/10"
- **Guest count icon + text**: "2/2"
- **EDT**: "EDT: 12:00" on separate line below dates

#### Staff Section (Right Side)
- **Avatar**: Circular, top-right area
- **Name**: "Etleva Hoxha"
- **Status**: "Started: 40 mins" in gray text
- **Vertical divider** separating from guest section

#### Status Button
- **Large rounded button** (yellow/gold color)
- **Cleaning icon** (vacuum/broom)
- **Chevron** indicating more options
- Positioned center-right of card

#### Notes/Rush Section
- **Bottom section** with icons (rush flag, notes)
- White background container

---

## Issues Identified

### 1. **Guest Image Layout**
**Current**: Uses two-column flex layout with image on left, info column on right
**Design**: Same approach, but spacing and alignment may need adjustment

**Action**: ✅ Verify spacing between image and info column matches design (currently 12px gap)

### 2. **Name + Badge Layout**
**Current**: Name and badge are inline using flexbox
**Design**: Same - name with badge number inline

**Action**: ✅ Current implementation correct

### 3. **Date + Guest Count + Time Layout**
**Current**: 
- Dates on one line
- Guest count with icon on same line as dates
- ETA/EDT on separate line below

**Design**: 
- Dates: "07/10-15/10" on first line
- Guest count "2/2" with icon on same line as dates
- ETA/EDT on separate line

**Action**: ✅ Current implementation matches design

### 4. **Vertical Spacing Between Elements**
**Current**: Uses `GUEST_INFO.infoColumn.gapBetweenNameAndDate` (4px) and `gapBetweenDateAndTime` (4px)

**Design**: Appears to have slightly more spacing

**Action**: 🔧 Review and potentially increase gaps:
- Name → Dates: Currently 4px, may need 6-8px
- Dates → Time: Currently 4px, may need 6-8px

### 5. **Guest Image Badge Position**
**Current**: Positioned at bottom-right of guest image with absolute positioning
**Design**: Same - green badge for arrival (first guest), red badge for departure (second guest)

**Action**: ✅ Current implementation correct

### 6. **Horizontal Divider Between Guests**
**Current**: Rendered in RoomCard.tsx at line 256-258
**Design**: Thin gray line separating the two guest sections

**Action**: ✅ Verify divider positioning and styling

### 7. **Status Button Position**
**Current**: Uses `STATUS_BUTTON.positions.arrivalDeparture` with left: 255px, top: 114px + CONTENT_OFFSET_TOP
**Design**: Centered in right portion of card, vertically aligned with guest sections

**Action**: 🔧 Verify vertical centering relative to both guest sections

### 8. **Staff Section Alignment**
**Current**: Uses `STAFF_SECTION` constants for positioning
**Design**: Staff avatar, name, and status in top-right corner

**Action**: ✅ Verify alignment with room header

---

## Recommended Adjustments

### Priority 1: Spacing Adjustments

```typescript
// In allRoomsStyles.ts - GUEST_INFO section
export const GUEST_INFO = {
  // ...
  infoColumn: {
    marginTop: 0,
    gapBetweenNameAndDate: 6,      // Increase from 4 to 6
    gapBetweenDateAndTime: 6,      // Increase from 4 to 6
  },
  // ...
}
```

### Priority 2: Guest Image Sizing Verification

Current: 65×65px - matches design ✅

### Priority 3: Status Button Vertical Centering

The status button should be vertically centered relative to the entire guest content area (both guests + divider).

**Current calculation**: Fixed top position
**Needed**: Dynamic centering based on card height and guest content

```typescript
// In RoomCard.tsx - for Arrival/Departure cards
const statusButtonTop = isArrivalDeparture
  ? (cardHeight - STATUS_BUTTON.height * scaleX) / 2  // Center vertically
  : /* existing logic */;
```

### Priority 4: Divider Positioning

Verify the divider is exactly centered between the two guest sections.

**Current**: `styles.guestDividerLine` at fixed position
**Needed**: Position between first and second guest

---

## Testing Checklist

- [ ] Guest images display at 65×65px with 5px border radius
- [ ] Name and badge are inline and properly aligned
- [ ] Dates, guest count icon, and count text are on same line
- [ ] ETA/EDT appears on separate line below dates
- [ ] Spacing between name → dates is 6px
- [ ] Spacing between dates → time is 6px
- [ ] Green badge on first guest image (arrival)
- [ ] Red badge on second guest image (departure)
- [ ] Horizontal divider is centered between guests
- [ ] Status button is vertically centered in card
- [ ] Staff section aligns with room header
- [ ] Notes/rush section at bottom with correct spacing

---

## Files to Modify

1. **`src/constants/allRoomsStyles.ts`**
   - Adjust `GUEST_INFO.infoColumn.gapBetweenNameAndDate` from 4 to 6
   - Adjust `GUEST_INFO.infoColumn.gapBetweenDateAndTime` from 4 to 6

2. **`src/components/allRooms/RoomCard.tsx`**
   - Review status button vertical positioning for Arrival/Departure cards
   - Verify divider positioning between guests

3. **`src/components/shared/GuestInfoDisplay.tsx`**
   - Verify two-column layout spacing
   - Confirm badge positioning on guest images

---

## Next Steps

1. Apply spacing adjustments to `allRoomsStyles.ts`
2. Test Arrival/Departure card with real data
3. Compare side-by-side with design
4. Fine-tune any remaining spacing issues
5. Verify on different screen sizes
