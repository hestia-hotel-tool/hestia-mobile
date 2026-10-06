# Checklist Tab - Implementation Plan

## Overview
This document outlines the implementation plan for the Checklist tab in the Room Detail Screen. The Checklist tab allows staff to track and manage room inventory items (Mini Bar and Laundry) with quantity tracking.

**Figma Design:** https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=1-2018&m=dev

## Design Analysis

### Screen Structure
The Checklist tab displays collapsible sections for tracking inventory consumption and changes. The structure includes:

1. **Title Section**
   - "Room Checklist" in large, bold text

2. **Collapsible Categories**
   - **Mini Bar Section** (collapsible with chevron)
     - Section header: "Mini bar" with chevron icon
     - Each item displays:
       - Product image (left side)
       - Initial stock number (e.g., "10")
       - Item name (e.g., "Valser Sparkling water")
       - Description text (e.g., "How many bottles of Valser Sparkling water was consumed")
       - Quantity selector with +/- buttons and number input
     - Items:
       - Valser Sparkling water
       - Valser Still water
       - Coca Cola Zero
       - Rivella
     - "Load more" link at bottom
   
   - **Laundry Section** (collapsible with chevron)
     - Section header: "Laundry" with chevron icon
     - Each item displays:
       - Product image (left side)
       - Item name
       - Description text (e.g., "How many times were towels changed")
       - Quantity selector with +/- buttons and number input
     - Items:
       - Towels changed
       - Medium Towels
       - Face Towels

3. **Footer Section**
   - Registration Information:
     - Profile picture (left)
     - "Registered by" label
     - Staff name (e.g., "Etleva Hoxha")
     - Time (e.g., "12:00")
     - Date (e.g., "12 December 2025")
   - Action Buttons:
     - "Submit" button (large, blue background, white text)
     - "Cancel" link/button (below Submit)

## Component Breakdown

### 1. Main Checklist Component
**File:** `src/components/roomDetail/ChecklistSection.tsx`

**Responsibilities:**
- Display "Room Checklist" title
- Render collapsible categories (Mini Bar, Laundry)
- Manage quantity state for all items
- Handle submit and cancel actions
- Track registration information

**Props:**
```typescript
interface ChecklistSectionProps {
  roomNumber: string;
  roomStatus: RoomStatus;
  onSubmit?: (data: ChecklistSubmissionData) => void;
  onCancel?: () => void;
  initialData?: ChecklistData;
}
```

**State:**
- `categories`: Array of categories with items and quantities
- `expandedCategories`: Track which categories are expanded
- `registeredBy`: Current user/staff information
- `registeredAt`: Current time and date

---

### 2. Checklist Category Component
**File:** `src/components/roomDetail/ChecklistCategory.tsx`

**Responsibilities:**
- Display collapsible category header with chevron
- Group checklist items by category
- Handle expand/collapse functionality
- Show "Load more" link for Mini Bar section

**Props:**
```typescript
interface ChecklistCategoryProps {
  category: {
    id: string;
    name: string;
    items: ChecklistItem[];
    showLoadMore?: boolean; // For Mini Bar section
  };
  onQuantityChange: (itemId: string, quantity: number) => void;
  onLoadMore?: () => void; // For Mini Bar "Load more" functionality
}
```

**Features:**
- Collapsible section with chevron icon
- Expand/collapse animation
- "Load more" link for Mini Bar (if applicable)

---

### 3. Checklist Item Component
**File:** `src/components/roomDetail/ChecklistItem.tsx`

**Responsibilities:**
- Display individual checklist item with quantity selector
- Handle quantity changes (+/- buttons)
- Show product image
- Display initial stock and description
- Manage quantity state

**Props:**
```typescript
interface ChecklistItemProps {
  item: {
    id: string;
    name: string;
    description: string;
    image: any;
    initialStock?: number; // For mini bar items
    quantity: number;
  };
  onQuantityChange: (itemId: string, quantity: number) => void;
}
```

**Features:**
- Product image on left
- Initial stock number (if applicable)
- Item name and description
- Quantity selector with +/- buttons and number input
- Min value: 0, Max value: initialStock (if applicable)

---

### 4. Checklist Footer Component
**File:** `src/components/roomDetail/ChecklistFooter.tsx`

**Responsibilities:**
- Display registration information
- Show staff profile picture and name
- Display registration time and date
- Provide Submit and Cancel buttons

**Props:**
```typescript
interface ChecklistFooterProps {
  registeredBy: {
    id: string;
    name: string;
    avatar?: any;
  };
  registeredAt: {
    time: string; // e.g., "12:00"
    date: string; // e.g., "12 December 2025"
  };
  onSubmit: () => void;
  onCancel: () => void;
}
```

---

## Type Definitions

**File:** `src/types/checklist.types.ts`

```typescript
export interface ChecklistItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  image: any;
  quantity: number;
  initialStock?: number; // For mini bar items showing initial inventory
  order: number;
}

export interface ChecklistCategory {
  id: string;
  name: string;
  items: ChecklistItem[];
  order: number;
  showLoadMore?: boolean; // For Mini Bar section
}

export interface ChecklistData {
  roomNumber: string;
  categories: ChecklistCategory[];
  registeredBy: {
    id: string;
    name: string;
    avatar?: any;
  };
  registeredAt: {
    time: string;
    date: string;
  };
}

export interface ChecklistSubmissionData {
  roomNumber: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
  registeredBy: string;
  registeredAt: string;
}
```

---

## Style Constants

**File:** `src/constants/checklistStyles.ts`

```typescript
export const CHECKLIST_SECTION = {
  container: {
    marginTop: 20 * scaleX,
    paddingHorizontal: 20 * scaleX,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#000000',
    left: 20,
    top: 320, // Relative to content area start (285px)
  },
  progress: {
    fontSize: 14,
    fontWeight: 'regular' as const,
    color: '#666666',
    left: 20,
    top: 350,
  },
  category: {
    marginTop: 30 * scaleX,
    title: {
      fontSize: 16,
      fontWeight: 'bold' as const,
      color: '#000000',
    },
    item: {
      fontSize: 14,
      fontWeight: 'regular' as const,
      color: '#000000',
      marginLeft: 40 * scaleX,
      marginTop: 12 * scaleX,
    },
    checkbox: {
      size: 24 * scaleX,
      borderWidth: 2,
      borderColor: '#5a759d',
      checkedColor: '#5a759d',
    },
    itemImage: {
      width: 40 * scaleX,
      height: 40 * scaleX,
      marginRight: 12 * scaleX,
      borderRadius: 4 * scaleX,
    },
  },
} as const;
```

---

## Data Structure

### Default Checklist Template
Based on Figma design with quantity tracking:

```typescript
export const DEFAULT_CHECKLIST_TEMPLATE: ChecklistCategory[] = [
  {
    id: 'minibar',
    name: 'Mini bar',
    order: 1,
    showLoadMore: true,
    items: [
      { 
        id: 'minibar-1', 
        categoryId: 'minibar', 
        name: 'Valser Sparkling water', 
        description: 'How many bottles of Valser Sparkling water was consumed',
        quantity: 1,
        initialStock: 10,
        order: 1,
        image: require('../../assets/images/sparling-water.png')
      },
      { 
        id: 'minibar-2', 
        categoryId: 'minibar', 
        name: 'Valser Still water', 
        description: 'How many bottles of Valser Still water was consumed',
        quantity: 1,
        initialStock: 10,
        order: 2,
        image: require('../../assets/images/valser-still-water.png')
      },
      { 
        id: 'minibar-3', 
        categoryId: 'minibar', 
        name: 'Coca Cola Zero', 
        description: 'How many bottles of Coca Cola Zero',
        quantity: 1,
        initialStock: 10,
        order: 3,
        image: require('../../assets/images/coca-cola-zero.png')
      },
      { 
        id: 'minibar-4', 
        categoryId: 'minibar', 
        name: 'Rivella', 
        description: 'How many bottles of Rivella was consumed',
        quantity: 1,
        initialStock: 10,
        order: 4,
        image: require('../../assets/images/rivella.png')
      },
    ],
  },
  {
    id: 'laundry',
    name: 'Laundry',
    order: 2,
    items: [
      { 
        id: 'laundry-1', 
        categoryId: 'laundry', 
        name: 'Towels changed', 
        description: 'How many times were towels changed',
        quantity: 1,
        order: 1,
        image: require('../../assets/images/large-towels.png')
      },
      { 
        id: 'laundry-2', 
        categoryId: 'laundry', 
        name: 'Medium Towels', 
        description: 'Medium Towels',
        quantity: 1,
        order: 2,
        image: require('../../assets/images/medium-towels.png')
      },
      { 
        id: 'laundry-3', 
        categoryId: 'laundry', 
        name: 'Face Towels', 
        description: 'Face Towels',
        quantity: 1,
        order: 3,
        image: require('../../assets/images/face-towels.png')
      },
    ],
  },
];
```

---

## Implementation Steps

### Step 1: Create Type Definitions ✅
1. Create `src/types/checklist.types.ts`
2. Define `ChecklistItem`, `ChecklistCategory`, `ChecklistData`, and `ChecklistSubmissionData` interfaces
3. Include quantity tracking and registration info

### Step 2: Create Style Constants ✅
1. Create `src/constants/checklistStyles.ts`
2. Define all styling constants based on Figma design
3. Include styles for quantity selectors, footer, and collapsible sections

### Step 3: Create Checklist Components ✅
1. **ChecklistItem.tsx**
   - Product image display
   - Initial stock number (for mini bar)
   - Item name and description
   - Quantity selector with +/- buttons and number input
   - Handle quantity changes

2. **ChecklistCategory.tsx**
   - Collapsible category header with chevron icon
   - Expand/collapse animation
   - Render list of ChecklistItem components
   - "Load more" link for Mini Bar section

3. **ChecklistFooter.tsx**
   - Registration information (profile, name, time, date)
   - Submit button (blue, large)
   - Cancel button/link

4. **ChecklistSection.tsx**
   - Main container component
   - "Room Checklist" title
   - Manage quantity state for all items
   - Handle submit and cancel actions
   - Scrollable content with footer

### Step 4: Integrate into ArrivalDepartureDetailScreen ✅
1. Import `ChecklistSection` component
2. Render when `activeTab === 'Checklist'`
3. Handle submit and cancel actions
4. Pass room number and status

### Step 5: Add Mock Data ✅
1. Create `src/data/mockChecklistData.ts`
2. Provide default checklist templates with Mini Bar and Laundry
3. Include product images and initial stock values
4. Format date and time helpers

### Step 6: Styling and Positioning ✅
1. Match Figma design exactly
2. Collapsible sections with smooth animations
3. Quantity selectors with proper styling
4. Footer with registration info and action buttons
5. Test on different screen sizes

---

## Features to Implement

### Core Features ✅
- [x] Display checklist categories (Mini Bar, Laundry)
- [x] Collapsible sections with chevron icons
- [x] Quantity selector with +/- buttons and number input
- [x] Product images for all items
- [x] Initial stock display for mini bar items
- [x] Item descriptions
- [x] "Load more" link for Mini Bar section
- [x] Footer with registration information
- [x] Submit and Cancel buttons
- [x] Scrollable checklist content

### Enhanced Features (Future)
- [ ] Save checklist state to backend
- [ ] Load more items functionality
- [ ] Add custom checklist items
- [ ] Checklist templates based on room type
- [ ] Photo attachments for items
- [ ] Notes/comments on items
- [ ] Checklist history/audit trail
- [ ] Real-time inventory updates
- [ ] Quantity validation and limits
- [ ] Auto-calculate consumption (initialStock - quantity)

---

## State Management

### Local State (Initial Implementation)
```typescript
const [checklistData, setChecklistData] = useState<ChecklistData>(() => {
  // Initialize from room data or use default template
  return getDefaultChecklist(room.roomNumber, room.roomType);
});

const handleItemToggle = (itemId: string, checked: boolean) => {
  setChecklistData(prev => {
    const updated = { ...prev };
    // Update item checked state
    // Recalculate completion progress
    return updated;
  });
  // TODO: Save to backend/API
};
```

### Future: Backend Integration
- Save checklist state to API
- Load checklist from API based on room number
- Real-time updates if multiple staff are working
- Checklist history and audit logs

---

## Testing Checklist

- [ ] Checklist displays correctly when tab is selected
- [ ] "Room Checklist" title displays
- [ ] Mini Bar section is collapsible
- [ ] Laundry section is collapsible
- [ ] Chevron icons rotate correctly on expand/collapse
- [ ] All product images display correctly
- [ ] Initial stock numbers show for mini bar items
- [ ] Quantity selectors work (+/- buttons)
- [ ] Quantity input accepts numeric values
- [ ] Quantity cannot go below 0
- [ ] Quantity cannot exceed initialStock (for mini bar)
- [ ] "Load more" link appears for Mini Bar section
- [ ] Footer displays registration information correctly
- [ ] Submit button triggers submission
- [ ] Cancel button resets or navigates back
- [ ] Scrollable content works smoothly
- [ ] Styling matches Figma design
- [ ] Responsive scaling works correctly
- [ ] Works for different room statuses (Dirty, Cleaned, Inspected)

---

## File Structure

```
src/
├── components/
│   └── roomDetail/
│       ├── ChecklistSection.tsx (main component)
│       ├── ChecklistCategory.tsx
│       ├── ChecklistItem.tsx
│       └── ChecklistProgress.tsx
├── constants/
│   └── checklistStyles.ts
├── types/
│   └── checklist.types.ts
├── data/
│   └── mockChecklistData.ts
└── screens/
    └── ArrivalDepartureDetailScreen.tsx (integration)
```

---

## Next Steps

1. **Review Figma Design**: Get exact measurements and styling from Figma
2. **Create Type Definitions**: Set up TypeScript interfaces
3. **Create Style Constants**: Define all styling values
4. **Build Components**: Start with ChecklistItem, then Category, then Section
5. **Integrate**: Add to ArrivalDepartureDetailScreen
6. **Test**: Verify functionality and styling
7. **Refine**: Adjust based on design review and testing

---

## Notes

- Checklist should be room-specific and status-aware
- Consider different checklist templates for different room types
- Progress tracking helps staff see completion status at a glance
- Future enhancements can include photo verification, timestamps, and staff attribution
