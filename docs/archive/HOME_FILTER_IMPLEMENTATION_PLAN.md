# Home Filter Implementation Plan

## Design Analysis - Figma Node: 1386-312

### Screen Overview
The Filter modal is a full-screen overlay that appears when the user clicks the filter/menu button on the home page. It allows users to filter rooms by Room State and Guest status with checkboxes and counts, then navigate to filtered results.

---

## 1. Layout Structure

```
┌─────────────────────────────────┐
│  Background (Blurred)           │
│  ┌───────────────────────────┐ │
│  │ Filter Modal (White Card) │ │
│  │                           │ │
│  │ ┌───────────────────────┐ │ │
│  │ │ Header                │ │ │
│  │ │ "Filter" | "20 results"│ │ │
│  │ └───────────────────────┘ │ │
│  │                           │ │
│  │ ┌───────────────────────┐ │ │
│  │ │ Room State Section    │ │ │
│  │ │ ☐ Dirty (24 Rooms)   │ │ │
│  │ │ ☐ In Progress (24)    │ │ │
│  │ │ ☐ Cleaned (24)        │ │ │
│  │ │ ☐ Inspected (24)      │ │ │
│  │ │ ☐ Priority (24)        │ │ │
│  │ └───────────────────────┘ │ │
│  │                           │ │
│  │ ┌───────────────────────┐ │ │
│  │ │ Guest Section         │ │ │
│  │ │ ☐ Arrivals (18)       │ │ │
│  │ │ ☐ Departures (18)     │ │ │
│  │ │ ☐ Turn Down           │ │ │
│  │ │ ☐ StayOver            │ │ │
│  │ └───────────────────────┘ │ │
│  │                           │ │
│  │ ┌───────────────────────┐ │ │
│  │ │ "Go to Results" →     │ │ │
│  │ │ "Advance Filter"      │ │ │
│  │ └───────────────────────┘ │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

---

## 2. Component Breakdown

### A. Filter Modal Component
**Type:** Full-screen modal overlay with blurred background

#### Structure:
1. **Backdrop/Overlay**
   - Full-screen blur overlay (similar to MorePopup pattern)
   - BlurView with intensity 80
   - Darkener overlay (rgba(200, 200, 200, 0.6))
   - Touchable to close modal

2. **Modal Container** (White rounded card)
   - Width: ~90% of screen width (centered)
   - Height: ~80% of screen height (centered or from top)
   - Background: #ffffff
   - Border radius: 12px
   - Shadow: rgba(100, 131, 176, 0.4)

3. **Header Section**
   - Left: "Filter" title (20px, Bold)
   - Right: "20 results" button (clickable, shows count)
   - Height: ~60px
   - Padding: 20px horizontal

4. **Room State Section**
   - Title: "Room State" (18px, Semi-Bold)
   - 5 filter rows:
     - **Dirty**: ☐ Red circle icon + "Dirty" + "24 Rooms"
     - **In Progress**: ☐ Yellow circle icon + "In Progress" + "24 Rooms"
     - **Cleaned**: ☐ Blue circle icon + "Cleaned" + "24 Rooms"
     - **Inspected**: ☐ Green circle icon + "Inspected" + "24 Rooms"
     - **Priority**: ☐ Red running person icon + "Priority" + "24 Rooms"
   - Each row:
     - Checkbox (square, empty when unchecked)
     - Colored icon (circle or special icon)
     - Label text
     - Count badge on right ("24 Rooms" or just number)

5. **Guest Section**
   - Title: "Guest" (18px, Semi-Bold)
   - 4 filter rows:
     - **Arrivals**: ☐ Green person icon with inward arrow + "Arrivals" + "18"
     - **Departures**: ☐ Red person icon with outward arrow + "Departures" + "18"
     - **Turn Down**: ☐ Blue circle icon + "Turn Down"
     - **StayOver**: ☐ Black circle icon + "StayOver"
   - Same row structure as Room State

6. **Action Section** (Bottom)
   - Primary: "Go to Results" button with right arrow icon
     - Full width button
     - Background: Primary color (#5a759d)
     - Text: White, 16px, Semi-Bold
     - Arrow icon on right
   - Secondary: "Advance Filter" link
     - Text link below button
     - Color: Primary color or gray
     - 14px, Regular

---

## 3. Data Structure

```typescript
// Filter Types
type RoomStateFilter = 'dirty' | 'inProgress' | 'cleaned' | 'inspected' | 'priority';
type GuestFilter = 'arrivals' | 'departures' | 'turnDown' | 'stayOver';

interface FilterOption {
  id: string;
  label: string;
  icon: any; // require() path to icon
  iconColor?: string;
  count: number;
  selected: boolean;
}

interface RoomStateFilterOption extends FilterOption {
  type: RoomStateFilter;
}

interface GuestFilterOption extends FilterOption {
  type: GuestFilter;
}

interface FilterState {
  roomStates: {
    dirty: boolean;
    inProgress: boolean;
    cleaned: boolean;
    inspected: boolean;
    priority: boolean;
  };
  guests: {
    arrivals: boolean;
    departures: boolean;
    turnDown: boolean;
    stayOver: boolean;
  };
}

interface FilterCounts {
  roomStates: {
    dirty: number;
    inProgress: number;
    cleaned: number;
    inspected: number;
    priority: number;
  };
  guests: {
    arrivals: number;
    departures: number;
    turnDown: number;
    stayOver: number;
  };
}

interface HomeFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterState) => void;
  onGoToResults: (filters: FilterState) => void;
  onAdvanceFilter: () => void;
  initialFilters?: FilterState;
  filterCounts: FilterCounts;
}
```

---

## 4. Assets Required

### Icons to Use (Already Available):
1. **Room State Icons:**
   - `dirty-icon.png` or `dirty-state-icon.png` - Red circle
   - `in-progress-icon.png` or `in-progess-state-icon.png` - Yellow circle
   - `cleaned-icon.png` or `cleaned-state-icon.png` - Blue circle
   - `inspected-icon.png` or `inspected-state-icon.png` - Green circle
   - `priority-icon.png` or `prioirty-icon.png` - Priority icon

2. **Guest Icons:**
   - `arrival-icon.png` or `guest-arrival-icon.png` - Arrivals (green)
   - `departure-icon.png` or `guest-departure-icon.png` - Departures (red)
   - `turndown-icon.png` or `turndown-guest-icon.png` - Turn Down
   - `stayover-icon.png` or `stayover-guest-icon.png` - StayOver

3. **UI Icons:**
   - `forward-arrow-icon.png` - For "Go to Results" button
   - Checkbox icons (may need to create or use custom component)

### Icons to Create/Download:
- [ ] Checkbox unchecked icon (square outline)
- [ ] Checkbox checked icon (square with checkmark)
- [ ] Verify all status icons match Figma design exactly

---

## 5. Component Files to Create

```
src/
├── components/
│   └── home/
│       ├── HomeFilterModal.tsx      # Main filter modal component
│       ├── FilterSection.tsx         # Reusable section (Room State / Guest)
│       ├── FilterRow.tsx             # Individual filter option row
│       └── FilterCheckbox.tsx       # Custom checkbox component
├── types/
│   └── filter.types.ts               # Filter TypeScript interfaces
└── hooks/
    └── useHomeFilters.ts             # Filter state management hook
```

---

## 6. Styling Specifications

### Colors:
```typescript
{
  modal: {
    background: '#ffffff',
    shadow: 'rgba(100, 131, 176, 0.4)',
  },
  blur: {
    intensity: 80,
    darkener: 'rgba(200, 200, 200, 0.6)',
  },
  roomState: {
    dirty: '#f92424',        // Red
    inProgress: '#f0be1b',   // Yellow
    cleaned: '#4a91fc',      // Blue
    inspected: '#41d541',    // Green
    priority: '#f92424',     // Red
  },
  guest: {
    arrivals: '#41d541',     // Green
    departures: '#f92424',   // Red
    turnDown: '#4a91fc',     // Blue
    stayOver: '#1e1e1e',     // Black/Dark
  },
  button: {
    primary: '#5a759d',
    text: '#ffffff',
  },
  text: {
    primary: '#1e1e1e',
    secondary: '#5a759d',
    sectionTitle: '#1e1e1e',
  },
  checkbox: {
    border: '#5a759d',
    checked: '#5a759d',
    unchecked: 'transparent',
  }
}
```

### Typography:
- **Modal Title**: 20px, Bold, Helvetica/Inter
- **Section Title**: 18px, Semi-Bold, Helvetica/Inter
- **Filter Label**: 16px, Regular, Helvetica/Inter
- **Count Text**: 16px, Regular, Helvetica/Inter
- **Button Text**: 16px, Semi-Bold, Helvetica/Inter
- **Link Text**: 14px, Regular, Helvetica/Inter

### Spacing:
- Modal padding: 20px horizontal, 24px vertical
- Section spacing: 32px between sections
- Row spacing: 16px between filter rows
- Icon size: 24×24px (status icons)
- Checkbox size: 20×20px
- Button height: 50px
- Header height: 60px

### Dimensions:
- Modal width: 90% of screen (max 400px)
- Modal height: ~80% of screen (max 700px)
- Border radius: 12px
- Shadow radius: 35px

---

## 7. Implementation Steps

### Phase 1: Setup & Types (30 min)
1. Create `src/types/filter.types.ts` with all interfaces
2. Create `src/hooks/useHomeFilters.ts` for state management
3. Verify/update icon assets
4. Set up color constants in theme if needed

### Phase 2: Filter Components (2 hours)
1. Create `FilterCheckbox.tsx`
   - Custom checkbox component
   - Unchecked: square outline
   - Checked: square with checkmark
   - Animated state transitions

2. Create `FilterRow.tsx`
   - Row layout: checkbox + icon + label + count
   - Touchable to toggle selection
   - Proper spacing and alignment

3. Create `FilterSection.tsx`
   - Section title
   - List of FilterRow components
   - Proper spacing

### Phase 3: Main Modal Component (2 hours)
1. Create `HomeFilterModal.tsx`
   - Modal wrapper with blur backdrop
   - Header with title and results count
   - Room State section
   - Guest section
   - Action buttons (Go to Results, Advance Filter)
   - Close functionality (tap backdrop or X button)

2. Implement state management
   - Track selected filters
   - Calculate result count
   - Handle filter toggles

### Phase 4: Integration (1 hour)
1. Update `HomeScreen.tsx`
   - Add state for filter modal visibility
   - Connect menu button to open filter
   - Pass filter counts from home data
   - Handle filter application

2. Update `handleMenuPress` function
   - Change from TODO to open filter modal

3. Add navigation logic
   - "Go to Results" navigates to AllRooms with filters
   - "Advance Filter" (future implementation)

### Phase 5: Filter Logic & Results (1.5 hours)
1. Implement filter application
   - Filter rooms based on selected states
   - Pass filters to AllRooms screen
   - Update AllRooms to accept and apply filters

2. Calculate result counts
   - Count rooms matching each filter
   - Update counts dynamically
   - Show total results in header

3. Handle edge cases
   - No filters selected
   - All filters selected
   - Empty results

### Phase 6: Polish & Animations (1 hour)
1. Add animations
   - Modal fade in/out
   - Checkbox toggle animation
   - Smooth transitions

2. Test interactions
   - Touch feedback
   - Scroll behavior (if content overflows)
   - Keyboard handling (if needed)

3. Responsive design
   - Test on different screen sizes
   - Ensure modal is properly centered
   - Verify blur overlay coverage

---

## 8. Key Technical Considerations

### Modal Pattern:
- Use React Native `Modal` component
- Use `BlurView` from expo-blur (similar to MorePopup)
- Full-screen backdrop with touch-to-close
- Prevent background scroll when modal is open

### State Management:
- Use `useState` for filter selections
- Use `useMemo` for calculated counts
- Pass initial filters as props
- Emit filter changes via callbacks

### Navigation:
- "Go to Results" should navigate to AllRooms screen
- Pass filter state as route params
- AllRooms screen should apply filters on mount

### Performance:
- Memoize filter calculations
- Optimize re-renders with React.memo
- Lazy load icons if needed

### Accessibility:
- Add proper labels for screen readers
- Ensure touch targets are at least 44×44px
- Provide keyboard navigation (if applicable)

---

## 9. Integration Points

### HomeScreen.tsx Changes:
```typescript
// Add state
const [showFilterModal, setShowFilterModal] = useState(false);

// Update handleMenuPress
const handleMenuPress = () => {
  setShowFilterModal(true);
};

// Add filter counts (from homeData or calculate)
const filterCounts = {
  roomStates: {
    dirty: 24,
    inProgress: 24,
    cleaned: 24,
    inspected: 24,
    priority: 24,
  },
  guests: {
    arrivals: 18,
    departures: 18,
    turnDown: 0, // Calculate from data
    stayOver: 0, // Calculate from data
  },
};

// Add modal component
<HomeFilterModal
  visible={showFilterModal}
  onClose={() => setShowFilterModal(false)}
  onApplyFilters={(filters) => {
    // Apply filters locally or navigate
  }}
  onGoToResults={(filters) => {
    setShowFilterModal(false);
    navigation.navigate('AllRooms', { 
      filters,
      showBackButton: true 
    });
  }}
  onAdvanceFilter={() => {
    // Future: Navigate to advanced filter screen
    console.log('Advanced filter');
  }}
  filterCounts={filterCounts}
/>
```

### AllRoomsScreen.tsx Updates:
- Accept `filters` from route params
- Apply filters to room list
- Show filtered results
- Update filter button to show active state

---

## 10. Testing Checklist

### Visual Testing:
- [ ] Modal appears with blur backdrop
- [ ] Modal is properly centered
- [ ] Header displays "Filter" and result count
- [ ] All filter options display correctly
- [ ] Icons show correct colors
- [ ] Checkboxes render properly
- [ ] Counts display next to each option
- [ ] "Go to Results" button is visible
- [ ] "Advance Filter" link is visible
- [ ] Modal closes on backdrop tap

### Functional Testing:
- [ ] Checkbox toggles work
- [ ] Result count updates when filters change
- [ ] "Go to Results" navigates correctly
- [ ] Filters are passed to AllRooms screen
- [ ] AllRooms applies filters correctly
- [ ] Modal closes properly
- [ ] Multiple filters can be selected
- [ ] All filters can be deselected

### Edge Cases:
- [ ] No filters selected (show all or 0 results)
- [ ] All filters selected
- [ ] Filter counts are 0
- [ ] Very long filter labels
- [ ] Modal on small screens
- [ ] Modal on large screens

### Integration Testing:
- [ ] Filter modal opens from home screen
- [ ] Navigation to AllRooms with filters works
- [ ] Back navigation preserves filter state (if needed)
- [ ] Filter state persists during navigation

---

## 11. Estimated Timeline

| Phase | Task | Time |
|-------|------|------|
| 1 | Setup & Types | 30 min |
| 2 | Filter Components | 2 hours |
| 3 | Main Modal Component | 2 hours |
| 4 | Integration | 1 hour |
| 5 | Filter Logic & Results | 1.5 hours |
| 6 | Polish & Animations | 1 hour |
| **Total** | | **~8 hours** |

---

## 12. Mock Data Example

```typescript
const mockFilterCounts: FilterCounts = {
  roomStates: {
    dirty: 24,
    inProgress: 24,
    cleaned: 24,
    inspected: 24,
    priority: 24,
  },
  guests: {
    arrivals: 18,
    departures: 18,
    turnDown: 12,
    stayOver: 30,
  },
};

const initialFilters: FilterState = {
  roomStates: {
    dirty: false,
    inProgress: false,
    cleaned: false,
    inspected: false,
    priority: false,
  },
  guests: {
    arrivals: false,
    departures: false,
    turnDown: false,
    stayOver: false,
  },
};
```

---

## 13. Future Enhancements

1. **Advanced Filter Screen**
   - More filter options (floor, room type, etc.)
   - Date range filters
   - Saved filter presets

2. **Filter Persistence**
   - Save last used filters
   - Remember filter state across navigation

3. **Filter Indicators**
   - Show active filter count on home screen
   - Visual indicator when filters are applied

4. **Quick Filters**
   - Pre-defined filter combinations
   - One-tap filter presets

---

## Next Steps

1. **Review this plan** and confirm approach
2. **Verify icon assets** are available or need to be downloaded
3. **Create component structure** starting with Phase 1
4. **Begin implementation** following the phases

---

## Design Reference

- **Figma Node**: 1386-312
- **Design File**: HESTIA-APP-AND-DASHBOARD
- **Key Features**:
  - Full-screen modal overlay
  - Blurred background
  - Two filter sections (Room State, Guest)
  - Checkbox selection
  - Result count display
  - Navigation to filtered results

---

**Status**: 📋 READY FOR IMPLEMENTATION

**Priority**: High (Core feature for home screen)

**Dependencies**: 
- HomeScreen must be implemented
- AllRooms screen should accept filter params
- Icon assets should be available
