# Room Detail Screen - Quick Start Guide

## Overview
The room detail screen is now fully reusable across all room types. This guide shows you how to use it.

## How It Works

### 1. Navigation
From any screen, navigate to the room detail screen with:

```typescript
import type { RoomType } from '../types/roomDetail.types';

// Map category to room type
const roomType: RoomType = room.category === 'Arrival/Departure' 
  ? 'ArrivalDeparture' 
  : room.category as RoomType;

// Navigate
navigation.navigate('RoomDetail', { room, roomType });
```

### 2. Room Types Supported

| Room Type | Description | Key Features |
|-----------|-------------|--------------|
| **Arrival** | Single arriving guest | Special instructions, empty Lost & Found |
| **Departure** | Single departing guest | No special instructions, empty Lost & Found |
| **ArrivalDeparture** | Both arriving and departing guests | Dual guests, special instructions for arrival |
| **Stayover** | Guest staying over | Special instructions, Lost & Found with items |
| **Turndown** | Evening turndown service | Special instructions, Lost & Found with items |

### 3. What Changes Per Room Type

#### Guest Info Section
- **Single Guest** (Arrival, Departure, Stayover, Turndown): Shows one guest
- **Dual Guest** (ArrivalDeparture): Shows both arrival and departure guests with divider

#### Special Instructions
- **Shown**: Arrival, ArrivalDeparture, Stayover, Turndown
- **Hidden**: Departure

#### Card Height
- **Standard (206.09px)**: Arrival, Departure, ArrivalDeparture
- **Smaller (183px)**: Stayover, Turndown

#### Lost & Found Section
- **Empty Box**: Arrival, Departure, ArrivalDeparture
  - Shows "Add Lost & Found" button
  - Navigates to Lost & Found screen
  
- **With Items**: Stayover, Turndown
  - Displays list of actual lost & found items
  - Each item shows: image, name, description, status, location
  - Items are tappable

## Code Structure

### Configuration System
```
src/constants/roomTypeConfigs.ts
└── ROOM_TYPE_CONFIGS
    ├── Arrival
    ├── Departure
    ├── ArrivalDeparture
    ├── Stayover
    └── Turndown
```

Each config defines:
- `guestInfoStartTop`: Where guest info section starts
- `hasSpecialInstructions`: Whether to show special instructions
- `numberOfGuests`: 1 or 2
- `cardHeight`: Height of assigned/task card
- `lostAndFoundType`: 'empty' or 'withItems'

### Position Calculator
```
src/utils/roomDetailPositions.ts
└── calculatePositions(config)
    └── Returns all element positions dynamically
```

Calculates:
- Guest info positions
- Special instructions positions
- Divider positions
- Card positions
- Lost & Found positions
- Notes positions

### Main Screen
```
src/screens/RoomDetailScreen.tsx
└── Uses config + positions to render dynamically
```

## Component Props

### TaskSection
```typescript
<TaskSection
  tasks={tasks}
  onAddPress={handleAddTask}
  onSeeMorePress={handleSeeMoreTask}
  cardHeight={positions.cardHeight} // Dynamic!
/>
```

### LostAndFoundSection
```typescript
<LostAndFoundSection
  displayType={config.lostAndFoundType} // 'empty' or 'withItems'
  items={roomDetail.lostAndFoundItems} // For Stayover/Turndown
  onAddPhotosPress={handleAddPhotos}
  onTitlePress={handleLostAndFoundTitlePress}
  onItemPress={handleLostAndFoundItemPress}
/>
```

### LostAndFoundItemDisplay (NEW)
```typescript
<LostAndFoundItemDisplay
  item={item}
  onPress={() => handleItemPress(item)}
/>
```

## Adding a New Room Type

1. **Add to type definition** (`src/types/roomDetail.types.ts`):
```typescript
export type RoomType = 'Arrival' | 'Departure' | 'ArrivalDeparture' | 'Stayover' | 'Turndown' | 'MyNewType';
```

2. **Add configuration** (`src/constants/roomTypeConfigs.ts`):
```typescript
MyNewType: {
  type: 'MyNewType',
  guestInfoStartTop: 303,
  hasSpecialInstructions: true,
  numberOfGuests: 1,
  cardHeight: 206.09,
  lostAndFoundType: 'empty',
},
```

3. **Update navigation** (if needed):
```typescript
const mapCategoryToRoomType = (category: string) => {
  switch (category) {
    case 'My New Category':
      return 'MyNewType';
    // ... other cases
  }
};
```

4. Done! The screen automatically adapts.

## Customizing Positions

If you need to adjust spacing for a specific room type, update the position calculator:

```typescript
// src/utils/roomDetailPositions.ts
export function calculatePositions(config: RoomTypeConfig) {
  // ... existing code ...
  
  // Add custom logic for specific room type
  if (config.type === 'MyNewType') {
    positions.specialInstructionsTitle = currentTop + 50; // Custom gap
  }
  
  // ... rest of code ...
}
```

## Common Tasks

### Change Card Height for a Room Type
```typescript
// src/constants/roomTypeConfigs.ts
Stayover: {
  // ... other props
  cardHeight: 200, // Change from 183 to 200
},
```

### Add Special Instructions to Departure
```typescript
// src/constants/roomTypeConfigs.ts
Departure: {
  // ... other props
  hasSpecialInstructions: true, // Change from false to true
},
```

### Change Lost & Found Display Type
```typescript
// src/constants/roomTypeConfigs.ts
Arrival: {
  // ... other props
  lostAndFoundType: 'withItems', // Change from 'empty' to 'withItems'
},
```

## Debugging Tips

### Check Current Configuration
```typescript
// In RoomDetailScreen.tsx
console.log('Room Type:', roomType);
console.log('Config:', config);
console.log('Positions:', positions);
```

### Verify Positions
```typescript
// In RoomDetailScreen.tsx
console.log('Guest Info Title Top:', positions.guestInfoTitle);
console.log('Card Top:', positions.cardTop);
console.log('Card Height:', positions.cardHeight);
```

### Test Different Room Types
```typescript
// Temporarily hardcode room type for testing
const roomType = 'Stayover'; // Test Stayover layout
// const roomType = 'Arrival'; // Test Arrival layout
```

## Performance

- **Memoized Calculations**: Config and positions are calculated once using `useMemo`
- **Conditional Rendering**: Components only render when needed
- **Optimized Re-renders**: Only re-calculate when `roomType` changes

## Best Practices

1. **Always pass roomType**: Don't rely on defaults
2. **Use TypeScript**: Let the compiler catch errors
3. **Test all room types**: When making changes, test all 5 types
4. **Follow Figma**: Keep positions accurate to design
5. **Document changes**: Update this guide when adding features

## Troubleshooting

### Issue: Wrong layout displayed
**Solution**: Check that correct `roomType` is passed in navigation

### Issue: Elements overlapping
**Solution**: Verify position calculations in `calculatePositions()`

### Issue: Card height wrong
**Solution**: Check `cardHeight` in room type config

### Issue: Lost & Found not showing
**Solution**: Verify `lostAndFoundType` in config and `items` prop

### Issue: Special instructions missing
**Solution**: Check `hasSpecialInstructions` in config

## Resources

- **Implementation Plan**: `ROOM_DETAIL_REUSABLE_IMPLEMENTATION_PLAN.md`
- **Implementation Summary**: `ROOM_DETAIL_REUSABLE_IMPLEMENTATION_SUMMARY.md`
- **Type Definitions**: `src/types/roomDetail.types.ts`
- **Configurations**: `src/constants/roomTypeConfigs.ts`
- **Position Calculator**: `src/utils/roomDetailPositions.ts`
- **Main Screen**: `src/screens/RoomDetailScreen.tsx`

## Support

For questions or issues:
1. Check this guide first
2. Review implementation summary
3. Check TypeScript types for available options
4. Look at existing room type configs for examples

---

**Last Updated**: 2024-01-15  
**Version**: 1.0
