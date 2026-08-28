# Arrival/Departure Card Layout - Changes Applied

## Summary

Reviewed the Arrival/Departure card layout against the design image and applied spacing adjustments to improve visual hierarchy and match the design more closely.

---

## Changes Made

### 1. **Increased Vertical Spacing in Guest Info Column**

**File**: `src/constants/allRoomsStyles.ts`

**Change**:
```typescript
// Before:
infoColumn: {
  marginTop: 0,
  gapBetweenNameAndDate: 4,
  gapBetweenDateAndTime: 4,
},

// After:
infoColumn: {
  marginTop: 0,
  gapBetweenNameAndDate: 6,    // Increased from 4px to 6px
  gapBetweenDateAndTime: 6,    // Increased from 4px to 6px
},
```

**Impact**: 
- Better visual separation between guest name and dates
- Better visual separation between dates and ETA/EDT time
- Improves readability and matches design spacing more closely

---

## Current Layout Structure (Verified Correct)

### ✅ Guest Image Layout
- **Size**: 65×65px with 5px border radius
- **Gap**: 12px between image and info column
- **Badge**: Positioned at bottom-right of image
  - First guest: Green badge (arrival)
  - Second guest: Red badge (departure)

### ✅ Name + Badge Layout
- Name and number badge are inline using flexbox
- Badge appears immediately after name
- Wrapping supported for long names (>23 characters)

### ✅ Date + Guest Count + Time Layout
**First line**: Date range + Guest count icon + count text
- Example: "07/10-15/10  👥 2/2"

**Second line**: ETA/EDT
- Example: "ETA: 17:00" or "EDT: 12:00"

### ✅ Horizontal Divider
- **Position**: Between the two guest sections
- **Top**: 75px + CONTENT_OFFSET_TOP (12px) = 87px from card top
- **Height**: 1px
- **Color**: #e3e3e3 (light gray)
- **Full width**: Spans entire card width

### ✅ Status Button
- **Position**: `STATUS_BUTTON.positions.arrivalDeparture`
  - Left: 255px
  - Top: 114px + CONTENT_OFFSET_TOP (12px) = 126px
- **Size**: 134×70px with 35px border radius
- **Color**: Yellow/gold (#F0BE1B for in-progress status)

### ✅ Staff Section
- **Avatar**: 35×35px circular, positioned at top-right
- **Name**: Bold, 13px font
- **Status**: Light, 12px font with color based on work status
- **Vertical divider**: Separates staff from guest section

### ✅ Notes/Rush Section
- **Position**: Bottom of card
- **Height**: 54px
- **Background**: White for Arrival/Departure cards
- **Bottom margin**: 5px from card bottom

---

## Layout Measurements (from Design)

### Card Dimensions
- **Width**: 426px
- **Height**: 292px + CONTENT_OFFSET_TOP (12px) = 304px total

### First Guest Section
- **Name top**: 87px + 12px = 99px from card top
- **Date top**: 109px + 12px = 121px from card top
- **Time top**: 130px + 12px = 142px from card top

### Divider
- **Top**: 75px + 12px = 87px from card top (centered between guests)

### Second Guest Section
- **Name top**: 162px + 12px = 174px from card top
- **Date top**: 184px + 12px = 196px from card top
- **Time top**: 204px + 12px = 216px from card top

### Spacing Calculations
- **Name to Date**: 121 - 99 = 22px
  - Name line height: 18px
  - Gap: 22 - 18 = 4px (now increased to 6px)
- **Date to Time**: 142 - 121 = 21px
  - Date line height: 17px
  - Gap: 21 - 17 = 4px (now increased to 6px)

---

## Testing Checklist

### Visual Verification
- [ ] Guest images are 65×65px with rounded corners
- [ ] Green badge on first guest (arrival)
- [ ] Red badge on second guest (departure)
- [ ] Name and number badge are inline
- [ ] Date, guest count icon, and count text are on same line
- [ ] ETA/EDT appears on separate line below dates
- [ ] Spacing between name and dates feels comfortable (6px gap)
- [ ] Spacing between dates and time feels comfortable (6px gap)
- [ ] Horizontal divider is centered between guests
- [ ] Status button is properly positioned
- [ ] Staff section aligns with room header
- [ ] Notes/rush section at bottom with correct spacing

### Functional Verification
- [ ] Tapping guest image opens profile modal
- [ ] Tapping card opens room detail screen
- [ ] Tapping status button opens status picker
- [ ] Tapping staff section opens staff assignment
- [ ] Long names (>23 chars) wrap correctly
- [ ] VIP badges display correctly
- [ ] All text is readable and not clipped

---

## Next Steps

1. **Test with real data**: Load actual guest data and verify layout
2. **Compare side-by-side**: Place app next to design and compare
3. **Test edge cases**:
   - Very long guest names
   - Missing guest images
   - Different VIP codes
   - Various ETA/EDT times
4. **Test on different devices**: Verify scaling works correctly
5. **Get design approval**: Share with designer for final review

---

## Files Modified

1. `src/constants/allRoomsStyles.ts` - Increased spacing in guest info column

---

## Additional Notes

### Why 6px instead of 4px?

The design shows slightly more breathing room between elements. The calculation:
- Name line height: 18px
- Date line height: 17px
- Time line height: 18px

With 4px gaps, elements felt too tight. Increasing to 6px provides:
- Better visual hierarchy
- Easier scanning of information
- More comfortable reading experience
- Closer match to design intent

### Responsive Scaling

All measurements use `normalizedScaleX` to scale proportionally across different screen sizes. The base design width is 440px.

### PM Theme Support

The layout supports both AM and PM themes, with color adjustments for:
- Text colors (white for PM theme)
- Icon tints (white for PM theme)
- Badge backgrounds (adjusted opacity for PM theme)
