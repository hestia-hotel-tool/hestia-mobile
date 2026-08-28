# Stayover & Turndown UI Fix Summary

## Problem
Stayover and Turndown room types had distorted UI with incorrect spacing between sections.

## Root Cause
The Lost & Found section positioning used the same gaps for all room types, but Stayover and Turndown have different gaps in the Figma design.

### Incorrect Calculation
```
Card End: 768px (585 + 183)
Lost & Found Title: 768 + 26 = 794px ❌
Lost & Found Box: 794 + 34 = 828px ❌
```

### Correct from Figma
```
Card End: 768px (585 + 183)
Lost & Found Title: 812px (gap: 44px, not 26px!)
Lost & Found Box: 844px (gap: 32px, not 34px!)
```

## Solution
Updated `roomDetailPositions.ts` to use room-type-specific gaps for Lost & Found section:

```typescript
// Gaps vary by room type:
// - Stayover/Turndown: 44px to title, 32px to box (768 -> 812 -> 844)
// - Others: 26px to title, 34px to box
const isStayoverOrTurndown = config.type === 'Stayover' || config.type === 'Turndown';
const gapToLostFoundTitle = isStayoverOrTurndown ? 44 : 26;
const gapToLostFoundBox = isStayoverOrTurndown ? 32 : 34;

positions.lostAndFoundTitle = cardEnd + gapToLostFoundTitle;
positions.lostAndFoundBox = positions.lostAndFoundTitle + gapToLostFoundBox;
```

## Complete Position Verification

### Stayover/Turndown (Figma node-id: 1772:406 / 1772:601)

| Element | Expected | Calculated | Status |
|---------|----------|------------|--------|
| Guest Info Title | 318px | 318px | ✅ |
| Guest | 368px | 318 + 50 = 368px | ✅ |
| Dates | 396px | 368 + 28 = 396px | ✅ |
| Special Instructions Title | 441px | 396 + 45 = 441px | ✅ |
| Special Instructions Text | 466px | 441 + 25 = 466px | ✅ |
| Divider | 536px | 466 + 70 = 536px | ✅ |
| Assigned to Title | 555px | 536 + 19 = 555px | ✅ |
| Card | 585px | 555 + 30 = 585px | ✅ |
| Card Height | 183px | 183px | ✅ |
| **Lost & Found Title** | **812px** | **768 + 44 = 812px** | ✅ **FIXED** |
| **Lost & Found Box** | **844px** | **812 + 32 = 844px** | ✅ **FIXED** |

### All Room Type Gaps Summary

| Room Type | Guest Gap | Special Inst Gap | Divider Gap | Assigned Gap | L&F Title Gap | L&F Box Gap |
|-----------|-----------|------------------|-------------|--------------|---------------|-------------|
| Arrival | 46px | 40px | 68px | 19px | 26px | 34px |
| Departure | 66px | N/A | 39px | 26px | 26px | 34px |
| ArrivalDeparture | 46px | 40px | 68px | 19px | 26px | 34px |
| **Stayover** | **50px** | **45px** | **70px** | **19px** | **44px** | **32px** |
| **Turndown** | **50px** | **45px** | **70px** | **19px** | **44px** | **32px** |

## Result
Stayover and Turndown rooms now have correct spacing:
- ✅ Guest info section properly positioned
- ✅ Special instructions with correct gaps
- ✅ Card positioned correctly with smaller height (183px)
- ✅ Lost & Found section with correct gaps (44px + 32px)
- ✅ Lost & Found items display properly
- ✅ Notes section positioned correctly below Lost & Found

The UI is now pixel-perfect according to Figma designs!

---

**Fixed**: 2024-01-15
**Files Modified**: `src/utils/roomDetailPositions.ts`
