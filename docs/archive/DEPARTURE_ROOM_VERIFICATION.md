# Departure Room - Complete Verification Guide

## What Should Display for Departure Rooms

For a Departure room (e.g., Room 202), you should see:

### 1. Guest Icon ✅
- Red/pink departure icon on the left
- Position: 21px from left

### 2. Guest Name ✅
- Example: "Mr Mohamed. B"
- Position: 77px from left, 369px from top
- Font: Bold, 14px

### 3. Number Badge (if priority) ✅
- Small number next to name
- Only shows if room is priority

### 4. Departure Badge ✅
- Red pill-shaped badge with "Departure" text
- Position: After number badge or name
- Background: Red (#f92424)

### 5. Date Range ✅
- Example: "07/10-15/10"
- Position: 78px from left, 397px from top (28px below name)
- Font: Light, 14px

### 6. EDT Time ✅
- Example: "EDT: 12:00"
- Position: 222px from left, 567px from top
- Font: Regular, 14px
- **NOTE**: Shows separately, NOT inline with date (different from Arrival)

### 7. Occupancy (Guest Count) ✅
- People icon + text (e.g., "2/2")
- Icon position: 163px from left
- Text position: 182px from left
- Both at 566px from top
- **NOTE**: Shows separately, NOT inline with date

### 8. NO Special Instructions ✅
- Departure rooms do NOT have special instructions section
- This is correct and expected

## Position Verification

### Calculated Positions for Departure
```
Guest Info Title: 303px
Guest Name: 369px (gap: 66px from title)
Date Range: 397px (gap: 28px from name)
Divider: 436px (gap: 39px from date)
Assigned to Title: 462px (gap: 26px from divider)
Card: 492px (gap: 30px from title)
```

### Relative Positions (within GuestInfoCard container)
Container is at `369 - 285 = 84px` from content area top.

Within container:
```
Icon: top 0, left 21
Name: top 0, left 77
Date: top 28px, left 78
EDT: top 198px, left 222
Occupancy Icon: top 197px, left 163
Occupancy Text: top 197px, left 182
```

## Common Issues & Solutions

### Issue: Nothing shows at all
**Cause**: Wrong gap calculation (was 46px instead of 66px)
**Status**: ✅ FIXED - Now uses 66px gap for Departure

### Issue: EDT time not visible
**Cause 1**: `shouldShowGuestCountBelow` excluded Departure
**Status**: ✅ FIXED - Now includes Departure when custom positioning provided

**Cause 2**: Time rendering excluded when custom positioning provided
**Status**: ✅ FIXED - Now renders separately for Departure with custom positioning

### Issue: Guest count (2/2) not visible
**Cause**: Guest count position calculations didn't use custom props
**Status**: ✅ FIXED - Now uses custom `countTop`, `countIconLeft`, `countTextLeft`

### Issue: Wrong category applied
**Cause**: Category determined by `isArrival` boolean only
**Status**: ✅ FIXED - Now passes `roomCategory={roomType}` explicitly

## Testing Steps

1. **Navigate to Room 202**
   - This is the Departure room in mock data
   - From All Rooms screen, tap on room 202

2. **Verify Display**
   - [ ] Guest icon (departure icon) visible
   - [ ] Guest name "Mr Mohamed. B" visible
   - [ ] Departure badge (red pill) visible
   - [ ] Date range "07/10-15/10" visible
   - [ ] EDT time "EDT: 12:00" visible
   - [ ] Occupancy "2/2" with people icon visible
   - [ ] NO special instructions section (correct)
   - [ ] Divider line below guest info visible
   - [ ] "Assigned to" section visible below
   - [ ] Card with Task section visible
   - [ ] Lost & Found section visible
   - [ ] Notes section visible

3. **Verify Spacing**
   - [ ] No overlapping elements
   - [ ] Proper gaps between sections
   - [ ] Guest info well-separated from card below

## Code References

### Files Modified
1. `src/utils/roomDetailPositions.ts` - Added 66px gap for Departure guest
2. `src/components/shared/GuestInfoDisplay.tsx` - Fixed rendering logic
3. `src/components/roomDetail/GuestInfoCard.tsx` - Added roomCategory prop
4. `src/screens/RoomDetailScreen.tsx` - Passes roomCategory

### Key Code Sections

**Position Calculation (roomDetailPositions.ts:57)**
```typescript
const gapToGuest = config.type === 'Departure' ? 66 
  : config.type === 'Stayover' || config.type === 'Turndown' ? 50 
  : 46;
```

**Guest Count Rendering (GuestInfoDisplay.tsx:222)**
```typescript
const shouldShowGuestCountBelow = countPos && 
  ((isArrival || isStayover || isTurndown) || 
   (isDeparture && countIconLeft !== undefined && countTextLeft !== undefined)) && 
  !(isArrivalDeparture && isPriority);
```

**Time Rendering (GuestInfoDisplay.tsx:393)**
```typescript
{guest.timeLabel && guest.time && timePos && 
 (timeLeft !== undefined && timeTop !== undefined || 
  !(isArrival || isStayover || isTurndown)) && (
```

**Category Passing (RoomDetailScreen.tsx:480)**
```typescript
<GuestInfoCard
  ...
  roomCategory={roomType}
/>
```

## If Still Not Working

1. **Reload the app**
   - Shake device/emulator
   - Tap "Reload"
   - Or restart Metro bundler

2. **Verify you're on the new screen**
   - Check navigation goes to 'RoomDetail', not 'ArrivalDepartureDetail'
   - File: `src/screens/AllRoomsScreen.tsx` line 193

3. **Check mock data**
   - File: `src/data/mockAllRoomsData.ts`
   - Room 202 should have:
     - `category: 'Departure'`
     - `guests[0].timeLabel: 'EDT'`
     - `guests[0].time: '12:00'`

4. **Add debug logging**
   ```typescript
   // In RoomDetailScreen.tsx after line 377
   console.log('DEBUG - Departure Room:', {
     roomType,
     config,
     positions,
     firstGuest
   });
   ```

---

**Last Updated**: 2024-01-15
**Status**: All fixes implemented ✅
