# Departure Room Debug Information

## Expected Positions (from Figma node-id=1772:255)

- Guest Info Title: 303px
- Guest (Departure): 369px (gap: 66px from title)
- Dates: 397px (gap: 28px from guest)
- Divider: 436px (gap: 39px from dates)
- Assigned to Title: 462px
- Card: 492px (height: 206.09px)

## Calculated Positions (from roomDetailPositions.ts)

For Departure config:
```typescript
type: 'Departure'
guestInfoStartTop: 303
hasSpecialInstructions: false
numberOfGuests: 1
cardHeight: 206.09
lostAndFoundType: 'empty'
```

Calculations:
```typescript
guestInfoTitle = 303
gapToGuest = 66 (for Departure)
firstGuestTop = 303 + 66 = 369 ✅
firstGuestDateTop = 369 + 28 = 397 ✅
hasSpecialInstructions = false
divider1 = 397 + 39 = 436 ✅
numberOfGuests = 1
divider2 = 436 ✅
assignedToTitle = 436 + 19 = 455 ❌ (should be 462)
cardTop = 455 + 30 = 485 ❌ (should be 492)
```

## Issue Found!

The gap from divider to "Assigned to" title should be **26px** for Departure, not 19px!
- Figma: 462 - 436 = 26px
- Current: 455 - 436 = 19px

## Fix Needed

Update `roomDetailPositions.ts` line 101:
```typescript
// Current:
positions.assignedToTitle = positions.divider2 + 19; // 19px gap from divider to title

// Should be:
const gapToAssignedTitle = config.type === 'Departure' ? 26 : 19;
positions.assignedToTitle = positions.divider2 + gapToAssignedTitle;
```

## Guest Info Display Props

From GuestInfoCard for Departure:
```typescript
containerTop = 369 - 285 = 84px (relative to content area)
category = 'Departure'
isArrival = false
iconLeftRelative = 21
iconTopRelative = 0
nameLeftRelative = 77
dateLeftRelative = 78
timeLeftRelative = 222 (edt.left)
timeTopRelative = 567 - 369 = 198
countIconLeftRelative = 163
countTextLeftRelative = 182
countTopRelative = 566 - 369 = 197
```

## Checklist

- [ ] Verify `gapToGuest = 66` for Departure
- [ ] Verify `gapToAssignedTitle = 26` for Departure
- [ ] Verify guest data has `timeLabel: 'EDT'`
- [ ] Verify navigation passes correct `roomType: 'Departure'`
- [ ] Verify GuestInfoDisplay receives all props correctly
- [ ] Check if elements are rendering but positioned off-screen
- [ ] Check z-index and visibility styles
