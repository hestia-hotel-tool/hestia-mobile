# Room Detail Screens - Implementation Plan

## Overview
This document outlines the implementation plan for five room detail screen variants based on the Figma designs. All screens share the same foundational structure with variations in guest information display and optional sections, but their vertical layout (Guest Info, Special Instructions, dividers, Assigned to card, Lost & Found, Notes) must match the exact Figma coordinates per node.

**Figma Designs:**
- **Arrival (single guest)**: Room Detail – Arrival `node-id=1772-104`
- **Departure (single guest)**: Room Detail – Departure `node-id=1772-255`
- **Stayover (single guest)**: Room Detail – Stayover `node-id=1772-406`
- **Turndown (single guest)**: Room Detail – Turndown `node-id=1772-601`
- **Arrival/Departure (dual guest)**: Room Detail – Arrival/Departure `node-id=1-1506`

Base design file: `https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD`

## Screen Variants

1. **Arrival/Departure Detail Screen** - Shows both arrival and departure guests
2. **Arrival Detail Screen** - Shows only arrival guest information
3. **Departure Detail Screen** - Shows only departure guest information
4. **Stayover Detail Screen** - Shows stayover guest information
5. **Turndown Detail Screen** - Shows turndown guest information

## Common Structure

All detail screens share the following structure:

### 1. Header Section (Yellow Background)
- **Height:** 232px
- **Background:** Dynamic based on status (default: `#f0be1b` yellow)
- **Elements:**
  - Back arrow (left: 26px, top: 69px)
  - Room number (e.g., "Room 201") - Bold, 24px, white, centered
  - Room code (e.g., "ST2K-1.4") - Light, 17px, white, centered
  - Status indicator with dropdown (left: 131px, top: 176px)
  - Paused time (if applicable) - below status indicator

### 2. Tab Navigation
- **Position:** Below header (top: 252px)
- **Tabs:** "Overview", "Tickets", "Checklist", "History"
- **Active Tab:** Bold, 16px, `#5a759d` with blue underline (4px height)
- **Inactive Tabs:** Light, 16px, `#5a759d`
- **Underline:** Blue (`#5a759d`), height: 4px, width: 92px

### 3. Content Area (White Background)
Starts at y=285px, scrollable

#### A. Guest Info Section
- **Title:** "Guest Info" - Bold, 15px, black (top: 303px)
- **Content varies by screen type:**
  - **Arrival/Departure:** Two guest entries (arrival + departure)
  - **Arrival:** Single arrival guest entry
  - **Departure:** Single departure guest entry
  - **Stayover:** Single stayover guest entry
  - **Turndown:** Single turndown guest entry

#### B. Assigned to Section
- **Title:** "Assigned to" - Bold, 15px, black (top: 630px, left: 32px)
- **Card Container:** 
  - Background: `#f9fafc`
  - Border: 1px, `#e3e3e3`
  - Border radius: 9px
  - Position: left: 25px, top: 650px (absolute)
  - Size: 390x206.09px
  - Padding: 16px horizontal and vertical
- **Content (inside card):**
  - **Left Column (vertically stacked):**
    - Profile picture (35x35px) - left: 15px (relative to card content), top: 17px
    - Staff name - directly below profile picture, same left position (15px relative to card content)
    - Department/role (e.g., "HSK") - below staff name, same left position, smaller gray text
  - **Right Column:**
    - Reassign button (122x49px, `#f1f6fc` background) - right aligned, top: 9px (relative to card content)
- **Layout:** Profile picture, name, and department are vertically stacked on the left. Reassign button is on the right side.
- **Divider:** Horizontal line at top: 90px (relative to card content), between Assigned to and Task sections

#### C. Task Section
- **Inside Assigned to card container**
- **Title:** "Task" - Bold, 15px, black (left: 16px, top: 101px relative to card content)
- **Add Button:** Border button, 74x39px (left: 284px, top: 101px relative to card content)
- **Note:** Task title and Add button are horizontally aligned (same top position: 101px)

#### D. Lost and Found Section
- **Title:** "Lost & Found" - Bold, 15px, black (top: 856.09px, left: 32px)
  - **Positioning:** Immediately after card ends (0px gap from card bottom at 856.09px)
  - Aligned with "Assigned to" title (same left: 32px)
- **Add Lost & Found Box:**
  - Solid border rectangle (390x97px)
  - Position: left: 25px (centered, same as assigned task card), top: 895.09px (39px below title)
  - Border: `rgba(90, 117, 157, 0.23)`, solid style (1px)
  - Border radius: 12px
  - Background: `#F9FAFC`
  - Padding: 16px horizontal
  - **Layout:** Horizontal flex layout with icon on left and text on right
  - **Content:**
    - **Left:** Icon container with:
      - Laundry basket icon (53.176x58.008px) - light blue outlined icon
      - Plus sign "+" (42px font, `#5a759d`) - positioned as overlay on icon (top-right of icon)
    - **Right:** Text "Add Lost & Found" (19px, bold, `#5a759d`) - right-aligned within box
  - **Box ends at:** 992.09px (895.09 + 97)
  - **Note:** The entire box is clickable and navigates to Lost & Found screen

#### E. Notes Section
- **Title:** "Notes" with badge count - Bold, 18px, black (top: 1087.09px)
- **Add Button:** Border button, 74x39px
- **Note Items:** List of notes with staff info

## Screen-Specific Variations

### Arrival/Departure Detail Screen
**Unique Features:**
- Shows **two guest entries** (arrival and departure)
- **Arrival Guest:**
  - Icon: Green arrow pointing left
  - Name with number badge (e.g., "11")
  - Green "Arrival" pill badge
  - Dates, occupancy, ETA
  - **Special Instructions** section (only for arrival) at **417px** title / **442px** text
- **Departure Guest:**
  - Icon: Red arrow pointing right
  - Name with number badge (e.g., "22")
  - Red "Departure" pill badge
  - Dates, occupancy, EDT
- **Divider** between guests (top: **510px**)
- **Second divider** after departure guest (top: **625px**)

### Arrival Detail Screen
**Unique Features:**
- Shows **single arrival guest entry**
- **Arrival Guest:**
  - Icon: Green arrow pointing left
  - Name with number badge
  - Green "Arrival" pill badge
  - Dates, occupancy, ETA
  - **Special Instructions** section at **417px** title / **442px** text
- **Divider** after guest + special instructions (top: **510px**)

### Departure Detail Screen
**Unique Features:**
- Shows **single departure guest entry**
- **Departure Guest:**
  - Icon: Red arrow pointing right
  - Name with number badge
  - Red "Departure" pill badge
  - Dates, occupancy, EDT
  - **No Special Instructions** (departure guests don't have special instructions)
- **Divider** after guest info (top: **436px**)

### Stayover Detail Screen
**Unique Features:**
- Shows **single stayover guest entry**
- **Stayover Guest:**
  - Icon: Stayover icon
  - Name with number badge (if priority)
  - Stayover category badge (if applicable)
  - Dates, occupancy
  - **Special Instructions** block (if present) at **441px** title / **466px** text
- **Divider** after guest + special instructions (top: **536px**)

### Turndown Detail Screen
**Unique Features:**
- Shows **single turndown guest entry**
- **Turndown Guest:**
  - Icon: Turndown icon
  - Name with number badge (if priority)
  - Turndown category badge (if applicable)
  - Dates, occupancy
  - **Special Instructions** block (if present) at **441px** title / **466px** text
- **Divider** after guest + special instructions (top: **536px**)

## Component Structure

```
RoomDetailScreen (Base Component)
├── RoomDetailHeader
│   ├── BackButton
│   ├── RoomNumber
│   ├── RoomCode
│   ├── StatusIndicator (with dropdown)
│   └── PausedTime (conditional)
├── DetailTabNavigation
│   ├── Overview (active)
│   ├── Tickets
│   ├── Checklist
│   └── History
├── ContentArea (ScrollView)
│   ├── GuestInfoSection
│   │   ├── GuestInfoCard (Arrival) - conditional
│   │   ├── Divider - conditional
│   │   ├── GuestInfoCard (Departure) - conditional
│   │   └── GuestInfoCard (Stayover/Turndown) - conditional
│   ├── AssignedToSection
│   │   ├── SectionTitle (outside card)
│   │   └── CardContainer
│   │       ├── StaffInfo
│   │       ├── ReassignButton
│   │       ├── Divider
│   │       └── TaskSection
│   ├── LostAndFoundSection
│   │   ├── SectionTitle
│   │   └── AddPhotosBox
│   └── NotesSection
│       ├── SectionHeader (with badge)
│       ├── AddButton
│       └── NoteList
│           └── NoteItem[]
```

## Implementation Steps

### Step 1: Create Base Room Detail Screen Component
**File:** `src/screens/RoomDetailScreen.tsx`

**Features:**
- Generic room detail screen that accepts room category
- Determines which guest info to display based on category
- Handles tab navigation
- Manages all modals and interactions

**Props:**
```typescript
interface RoomDetailScreenProps {
  route: {
    params: {
      room: RoomCardData;
    };
  };
  navigation: any;
}
```

**State Management:**
```typescript
const [activeTab, setActiveTab] = useState<DetailTab>('Overview');
const [showStatusModal, setShowStatusModal] = useState(false);
const [showReturnLaterModal, setShowReturnLaterModal] = useState(false);
const [showPromiseTimeModal, setShowPromiseTimeModal] = useState(false);
const [showRefuseServiceModal, setShowRefuseServiceModal] = useState(false);
const [showReassignModal, setShowReassignModal] = useState(false);
const [showAddNoteModal, setShowAddNoteModal] = useState(false);
const [currentStatus, setCurrentStatus] = useState<RoomCardData['status']>(room.status);
const [selectedStatusText, setSelectedStatusText] = useState<string | undefined>(undefined);
const [notes, setNotes] = useState<Note[]>([]);
const [assignedStaff, setAssignedStaff] = useState<...>(room.staff);
const [pausedAt, setPausedAt] = useState<string | undefined>(undefined);
```

### Step 2: Create Screen-Specific Components (Optional)
**Files:**
- `src/screens/ArrivalDepartureDetailScreen.tsx` (if needed for specific logic)
- `src/screens/ArrivalDetailScreen.tsx` (if needed for specific logic)
- `src/screens/DepartureDetailScreen.tsx` (if needed for specific logic)
- `src/screens/StayoverDetailScreen.tsx` (if needed for specific logic)
- `src/screens/TurndownDetailScreen.tsx` (if needed for specific logic)

**Note:** These can be thin wrappers around the base `RoomDetailScreen` component, or the base component can handle all variations internally.

### Step 3: Update Guest Info Section Logic
**File:** `src/screens/RoomDetailScreen.tsx` (or base component)

**Logic for determining which guests to display:**
```typescript
// Arrival/Departure: Show both arrival and departure guests
if (room.category === 'Arrival/Departure') {
  const arrivalGuest = room.guests.find((g) => g.timeLabel === 'ETA');
  const departureGuest = room.guests.find((g) => g.timeLabel === 'EDT');
  // Display both
}

// Arrival: Show only arrival guest
if (room.category === 'Arrival') {
  const arrivalGuest = room.guests.find((g) => g.timeLabel === 'ETA') || room.guests[0];
  // Display arrival guest with special instructions
}

// Departure: Show only departure guest
if (room.category === 'Departure') {
  const departureGuest = room.guests.find((g) => g.timeLabel === 'EDT') || room.guests[0];
  // Display departure guest (no special instructions)
}

// Stayover: Show stayover guest
if (room.category === 'Stayover') {
  const stayoverGuest = room.guests[0];
  // Display stayover guest (may have special instructions)
}

// Turndown: Show turndown guest
if (room.category === 'Turndown') {
  const turndownGuest = room.guests[0];
  // Display turndown guest (may have special instructions)
}
```

### Step 4: Update GuestInfoCard Component
**File:** `src/components/roomDetail/GuestInfoCard.tsx`

**Enhancements:**
- Support for Stayover and Turndown categories
- Conditional special instructions display (only for Arrival, optional for Stayover/Turndown)
- Proper icon selection based on category
- Category badge styling for all types

**Category Badge Colors:**
- Arrival: Green (`#41d541`)
- Departure: Red (`#f92424`)
- Stayover: Blue (to be determined from Figma)
- Turndown: Orange/Purple (to be determined from Figma)

### Step 5: Update Navigation
**File:** `src/navigation/types.ts`

**Add route types:**
```typescript
export type RootStackParamList = {
  // ... existing routes
  ArrivalDepartureDetail: { room: RoomCardData };
  ArrivalDetail: { room: RoomCardData };
  DepartureDetail: { room: RoomCardData };
  StayoverDetail: { room: RoomCardData };
  TurndownDetail: { room: RoomCardData };
};
```

**File:** `src/navigation/AppNavigator.tsx`

**Add routes:**
```typescript
<Stack.Screen 
  name="ArrivalDepartureDetail" 
  component={RoomDetailScreen}
  options={{
    animation: 'slide_from_right',
    gestureEnabled: true,
    gestureDirection: 'horizontal',
  }}
/>
<Stack.Screen 
  name="ArrivalDetail" 
  component={RoomDetailScreen}
  options={{...}}
/>
// ... similar for other screen types
```

### Step 6: Update AllRoomsScreen Navigation
**File:** `src/screens/AllRoomsScreen.tsx`

**Update `handleRoomPress`:**
```typescript
const handleRoomPress = (room: RoomCardData) => {
  switch (room.category) {
    case 'Arrival/Departure':
      navigation.navigate('ArrivalDepartureDetail', { room });
      break;
    case 'Arrival':
      navigation.navigate('ArrivalDetail', { room });
      break;
    case 'Departure':
      navigation.navigate('DepartureDetail', { room });
      break;
    case 'Stayover':
      navigation.navigate('StayoverDetail', { room });
      break;
    case 'Turndown':
      navigation.navigate('TurndownDetail', { room });
      break;
    default:
      console.log('Unknown room category:', room.category);
  }
};
```

### Step 7: Update Type Definitions
**File:** `src/types/roomDetail.types.ts`

**Ensure types support all categories:**
```typescript
export interface RoomDetailData extends RoomCardData {
  specialInstructions?: string; // For Arrival, optional for Stayover/Turndown
  notes: Note[];
  assignedTo?: {
    id: string;
    name: string;
    avatar?: any;
    initials?: string;
    avatarColor?: string;
    department?: string;
  };
  isUrgent?: boolean;
}
```

## Technical Details

### Positioning Strategy
- All positions are absolute, relative to screen (0,0)
- Header: height 232px, dynamic background color
- Tabs: start at y=252px
- Content: starts at y=285px, scrollable
- Use `scaleX` for responsive scaling (design width: 440px)

### Card and Section Spacing
- **Guest Info Section:** Ends at divider 2 (625px absolute)
- **Gap to Assigned to title:** 5px (630px - 625px)
- **Gap to Card:** 20px (650px - 630px)
- **Card:** 650px - 856.09px (206.09px height)
- **Lost & Found title:** 856.09px (0px gap from card - starts immediately after)
- **Lost & Found box:** 895.09px - 1075.09px (39px below title, 180px height)
- **Divider 3:** 1075.09px (0px gap from Lost & Found box bottom)
- **Notes Section:** 1086.09px (11px gap from divider)


### Colors
- **Header Background:** Dynamic based on status
  - Default: `#f0be1b` (yellow)
  - Special statuses: `#202A2F` (dark gray)
- **Text (Header):** White
- **Active Tab:** `#5a759d` (blue)
- **Tab Underline:** `#5a759d` (blue)
- **Content Background:** White
- **Text (Content):** Black (`#000000`, `#1e1e1e`)
- **Secondary Text:** `#334866`, `#5a759d`
- **Borders:** `#c6c5c5`, `#cbc7c7`
- **Button Background:** `#f1f6fc`
- **Category Badges:**
  - Arrival: `#41d541` (green)
  - Departure: `#f92424` (red)
  - Stayover: TBD (from Figma)
  - Turndown: TBD (from Figma)

### Typography
- **Room Number:** Helvetica Bold, 24px
- **Room Code:** Helvetica Light, 17px
- **Status:** Helvetica Bold, 18px
- **Tab Labels:** Helvetica Bold/Light, 16px
- **Section Titles:** Helvetica Bold, 15px
- **Guest Names:** Helvetica Bold, 14px
- **Note Text:** Helvetica Light, 13px
- **Staff Names:** Helvetica Regular, 11px

### Icons Required
- Back arrow icon
- Arrival icon (green arrow left)
- Departure icon (red arrow right)
- Stayover icon
- Turndown icon
- Person/occupancy icon
- Pencil icon (for notes)
- Status indicator icons
- Dropdown arrow icon
- Lost and found box icon
- Profile/avatar images

## File Structure

```
src/
├── screens/
│   ├── RoomDetailScreen.tsx (base component)
│   ├── ArrivalDepartureDetailScreen.tsx (optional wrapper)
│   ├── ArrivalDetailScreen.tsx (optional wrapper)
│   ├── DepartureDetailScreen.tsx (optional wrapper)
│   ├── StayoverDetailScreen.tsx (optional wrapper)
│   └── TurndownDetailScreen.tsx (optional wrapper)
├── components/
│   └── roomDetail/
│       ├── RoomDetailHeader.tsx (existing)
│       ├── DetailTabNavigation.tsx (existing)
│       ├── GuestInfoCard.tsx (update for all categories)
│       ├── NotesSection.tsx (existing)
│       ├── NoteItem.tsx (existing)
│       ├── LostAndFoundSection.tsx (existing)
│       ├── AssignedToSection.tsx (existing)
│       ├── TaskSection.tsx (existing)
│       ├── ChecklistSection.tsx (existing)
│       ├── RoomTicketsSection.tsx (existing)
│       └── [all existing modals]
├── types/
│   └── roomDetail.types.ts (update if needed)
└── constants/
    └── roomDetailStyles.ts (existing)
```

## Implementation Order

1. ✅ Create/update base RoomDetailScreen component
2. ✅ Update GuestInfoCard to support all categories
3. ✅ Add navigation routes for all screen types
4. ✅ Update AllRoomsScreen navigation logic
5. ✅ Test Arrival/Departure Detail Screen
6. ✅ Test Arrival Detail Screen
7. ✅ Test Departure Detail Screen
8. ✅ Test Stayover Detail Screen
9. ✅ Test Turndown Detail Screen
10. ✅ Verify all tabs work correctly
11. ✅ Verify all modals work correctly
12. ✅ Verify responsive scaling

## Key Features to Implement

### 1. Header
- Dynamic background color based on status
- Status indicator with dropdown
- Back navigation
- Paused time display (when applicable)

### 2. Tab Navigation
- Four tabs with active state
- Blue underline for active tab
- Tab switching (Overview, Tickets, Checklist, History)

### 3. Guest Info (Screen-Specific)
- **Arrival/Departure:** Two guests with divider
- **Arrival:** Single arrival guest with special instructions
- **Departure:** Single departure guest (no special instructions)
- **Stayover:** Single stayover guest (optional special instructions)
- **Turndown:** Single turndown guest (optional special instructions)

### 4. Assigned To & Task Card
- **Card Container:**
  - Positioned absolutely at 650px (25px after Guest Info divider)
  - Contains both Assigned to and Task sections
  - Divider at 90px from card content top separating sections
- **Assigned to Section:**
  - Title outside card at 630px (20px above card)
  - Staff info inside card (profile, name, department, reassign button)
- **Task Section:**
  - Inside card, below divider
  - Task title and Add button horizontally aligned at same top (101px from card content top)
  - Task title on left (16px from card content), Add button on right (284px from card content)

### 5. Lost and Found
- **Title:** Positioned at 856.09px (0px gap from card bottom)
- **Add Lost & Found Box:**
  - Dashed border rectangle (384x180px)
  - Positioned at 895.09px (39px below title)
  - Content centered horizontally:
    - Laundry basket icon
    - Plus sign (+)
    - Text "Add Lost & Found"
- **Navigation:** Clicking box or title navigates to Lost & Found screen

### 6. Notes
- Display list of notes
- Show staff info for each note
- Add note functionality

## Testing Checklist

### Arrival/Departure Detail Screen
- [ ] Screen opens when clicking Arrival/Departure card
- [ ] Both arrival and departure guests display correctly
- [ ] Special instructions show for arrival guest only
- [ ] Dividers appear between guests
- [ ] All sections display correctly

### Arrival Detail Screen
- [ ] Screen opens when clicking Arrival card
- [ ] Single arrival guest displays correctly
- [ ] Special instructions section appears
- [ ] ETA displays correctly
- [ ] All sections display correctly

### Departure Detail Screen
- [ ] Screen opens when clicking Departure card
- [ ] Single departure guest displays correctly
- [ ] No special instructions section
- [ ] EDT displays correctly
- [ ] All sections display correctly

### Stayover Detail Screen
- [ ] Screen opens when clicking Stayover card
- [ ] Single stayover guest displays correctly
- [ ] Optional special instructions (if present)
- [ ] All sections display correctly

### Turndown Detail Screen
- [ ] Screen opens when clicking Turndown card
- [ ] Single turndown guest displays correctly
- [ ] Optional special instructions (if present)
- [ ] All sections display correctly

### Common Tests
- [ ] Back button navigates correctly
- [ ] Tabs switch correctly
- [ ] Status dropdown works
- [ ] All modals work (Return Later, Promise Time, Refuse Service, Reassign, Add Note)
- [ ] All positions match Figma design
- [ ] Responsive scaling works
- [ ] Scrollable content works
- [ ] Notes display correctly
- [ ] Lost and found section displays
- [ ] Assigned to section displays

## Future Enhancements

1. **Tab Content**
   - Implement Tickets tab content (if not already done)
   - Implement Checklist tab content (if not already done)
   - Implement History tab content

2. **Interactions**
   - Status change functionality (existing)
   - Add note functionality (existing)
   - Edit note functionality
   - Add photos to Lost and Found (existing)
   - Reassign staff functionality (existing)
   - Task management functionality

3. **Data Integration**
   - Connect to backend API
   - Real-time updates
   - Photo upload functionality
   - Note synchronization

## Notes

- All screens share the same component structure and styling
- Main differences are in the Guest Info section (number of guests, special instructions)
- Consider creating a single base component with conditional rendering rather than separate screen files
- Category badges and icons should be consistent across all screens
- Special instructions are mandatory for Arrival, optional for Stayover/Turndown, and not shown for Departure
