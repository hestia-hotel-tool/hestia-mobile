# Departure Room Troubleshooting Guide

## How to Test Departure Room

### Step 1: Navigate to the Correct Room
**Important**: Make sure you're testing with a pure Departure room, not Arrival/Departure!

**Pure Departure Room in Mock Data:**
- **Room Number: 202**
- Category: 'Departure'
- Guest: Mr Mohamed. B
- Time Label: 'EDT'
- Time: '12:00'

### Step 2: Verify You're Using the New Screen
The new reusable `RoomDetailScreen` should be used, not the old `ArrivalDepartureDetailScreen`.

Check the navigation in `AllRoomsScreen.tsx`:
- Should call: `navigation.navigate('RoomDetail', { room, roomType })`
- NOT: `navigation.navigate('ArrivalDepartureDetail', { room })`

### Step 3: Check What You Should See

For Room 202 (Departure), you should see:
1. **Guest Icon**: Red departure icon (left side)
2. **Guest Name**: "Mr Mohamed. B"
3. **Departure Badge**: Red pill with "Departure" text
4. **Date Range**: "07/10-15/10"
5. **EDT Time**: "EDT: 12:00"
6. **Occupancy**: People icon + "2/2"

## Common Issues

### Issue 1: Testing Wrong Room
**Problem**: Testing room 201 (Arrival/Departure) instead of room 202 (Departure)
**Solution**: Make sure to tap on room 202 in the All Rooms list

### Issue 2: Old Screen Still Being Used
**Problem**: Navigation still goes to old `ArrivalDepartureDetailScreen`
**Solution**: 
1. Check `AllRoomsScreen.tsx` line 193
2. Should navigate to 'RoomDetail', not 'ArrivalDepartureDetail'
3. Reload the app if changes were made

### Issue 3: App Not Reloaded
**Problem**: Code changes not reflected in running app
**Solution**: 
1. Reload the app (shake device/emulator and tap "Reload")
2. Or restart the Metro bundler

### Issue 4: Wrong Room Type Passed
**Problem**: `roomType` parameter is wrong
**Solution**: 
1. Check `AllRoomsScreen.tsx` `mapCategoryToRoomType` function
2. Should map 'Departure' -> 'Departure'

## Debugging Steps

### 1. Add Console Logs

In `RoomDetailScreen.tsx`, after line 370, add:
```typescript
console.log('=== ROOM DETAIL DEBUG ===');
console.log('Room Type:', roomType);
console.log('Config:', config);
console.log('First Guest:', firstGuest);
console.log('Positions:', positions);
console.log('========================');
```

### 2. Check Console Output

Look for:
- `Room Type: 'Departure'` ✅
- `Config.type: 'Departure'` ✅
- `First Guest: { name: 'Mr Mohamed. B', timeLabel: 'EDT', ... }` ✅
- `Positions.firstGuestTop: 369` ✅

### 3. Verify Guest Data

In `GuestInfoCard.tsx`, after line 31, add:
```typescript
console.log('=== GUEST INFO CARD ===');
console.log('Category:', category);
console.log('isArrival:', isArrival);
console.log('Guest:', guest);
console.log('absoluteTop:', absoluteTop);
console.log('containerTop:', containerTop);
console.log('======================');
```

### 4. Check GuestInfoDisplay

In `GuestInfoDisplay.tsx`, after line 75, add:
```typescript
console.log('=== GUEST INFO DISPLAY ===');
console.log('isDeparture:', isDeparture);
console.log('timePos:', timePos);
console.log('countPos:', countPos);
console.log('guestIconPos:', guestIconPos);
console.log('=========================');
```

## Expected Values for Departure

### Room Type Config
```
type: 'Departure'
guestInfoStartTop: 303
hasSpecialInstructions: false
numberOfGuests: 1
cardHeight: 206.09
lostAndFoundType: 'empty'
```

### Calculated Positions
```
guestInfoTitle: 303
firstGuestTop: 369
firstGuestDateTop: 397
divider1: 436
divider2: 436
assignedToTitle: 462
cardTop: 492
cardHeight: 206.09
lostAndFoundTitle: 724.09
lostAndFoundBox: 758.09
```

### Guest Info Card Props
```
guest: { name: 'Mr Mohamed. B', timeLabel: 'EDT', time: '12:00', ... }
isArrival: false
category: 'Departure'
absoluteTop: 369
containerTop: 84 (369 - 285)
```

### GuestInfoDisplay State
```
isDeparture: true
isArrival: false
timePos: { left: 222, top: 198 }
countPos: { iconLeft: 163, textLeft: 182, top: 197 }
guestIconPos: { left: 21, top: 0 }
```

## If Still Not Visible

### Check Styles

1. **Container visibility**: Check if `GuestInfoCard` container has `display: 'none'` or `opacity: 0`
2. **Z-index**: Check if something is covering the guest info (z-index too low)
3. **Overflow**: Check if parent has `overflow: 'hidden'` and content is clipped
4. **Position**: Check if container is positioned off-screen

### Check Rendering

1. Add a bright background color to `GuestInfoCard` container:
```typescript
<View style={[styles.container, { top: containerTop * normalizedScaleX, backgroundColor: 'red' }]}>
```

2. If you see a red box but no content, the issue is with child elements
3. If you don't see a red box, the issue is with the container positioning

## Quick Fix Test

Try adding this to `GuestInfoCard` to force visibility:
```typescript
<View style={[styles.container, { 
  top: 100, // Fixed position for testing
  backgroundColor: 'rgba(255,0,0,0.3)', // Semi-transparent red
  minHeight: 200, // Ensure height
  zIndex: 9999 // Force on top
}]}>
```

If content appears with this, the issue is with the calculated positioning.

## Contact Points

Files to check:
1. `/src/screens/RoomDetailScreen.tsx` - Main screen
2. `/src/components/roomDetail/GuestInfoCard.tsx` - Guest card wrapper
3. `/src/components/shared/GuestInfoDisplay.tsx` - Guest info renderer
4. `/src/utils/roomDetailPositions.ts` - Position calculator
5. `/src/constants/roomTypeConfigs.ts` - Room type configs
6. `/src/data/mockAllRoomsData.ts` - Mock data (room 202)

---

**Last Updated**: 2024-01-15
**Status**: Troubleshooting in progress
