# History Section Implementation Plan

## Overview
This document outlines the implementation plan for the History tab in the Room Details screen. The History section displays a chronological timeline of all activities and events related to a room, grouped by date.

**Figma Design:** https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=1966-6188&m=dev

## Design Analysis

### Layout Structure
1. **Download Report Button** - Centered button at the top of the History content area
2. **Timeline View** - Vertical timeline with:
   - Date separators (Today, Yesterday, etc.) with horizontal lines
   - Timeline connector (vertical blue line on the left)
   - Event entries with avatars/initials, descriptions, and timestamps

### Visual Elements
- **Download Report Button:**
  - Light grey rounded rectangle
  - Document icon with downward arrow
  - Text: "Download Report"
  - Centered, spans ~50% of screen width

- **Date Separators:**
  - Date label (e.g., "Today", "Yesterday")
  - Horizontal grey line extending on both sides
  - Positioned between event groups

- **Timeline Connector:**
  - Thin vertical blue line
  - Runs down the left side
  - Connects all event avatars/initials circles

- **Event Entry:**
  - **Avatar/Initials Circle:**
    - Circular placeholder on the left
    - Shows profile picture if available
    - Otherwise shows colored circle with white initial letter
    - Colors: Pink (#ff4dd8), Blue (#5a759d), etc.
  - **Event Description:**
    - Text describing the action (e.g., "Etleva clicked on in progress")
    - Positioned to the right of avatar
  - **Timestamp:**
    - Format: "15:15 | 22 Jan"
    - Smaller, grey font
    - Below event description

## Implementation Steps

### Step 1: Create Type Definitions

**File:** `src/types/roomDetail.types.ts`

Add new interfaces:

```typescript
export interface HistoryEvent {
  id: string;
  action: string; // e.g., "clicked on in progress", "changed status to cleaned", "added note", etc.
  staff: {
    id: string;
    name: string;
    avatar?: any;
    initials?: string;
    avatarColor?: string;
  };
  timestamp: Date; // Full date/time for sorting
  createdAt: string; // ISO string for storage
}

export interface HistoryGroup {
  dateLabel: string; // "Today", "Yesterday", or formatted date
  date: Date; // Actual date for comparison
  events: HistoryEvent[];
}
```

### Step 2: Create History Section Component

**File:** `src/components/roomDetail/HistorySection.tsx`

**Component Structure:**
```typescript
interface HistorySectionProps {
  events: HistoryEvent[];
  onDownloadReport?: () => void;
}
```

**Features:**
1. Download Report button at the top
2. Group events by date (Today, Yesterday, or formatted date)
3. Render date separators with horizontal lines
4. Render timeline with vertical connector
5. Render event entries with avatars/initials
6. Format timestamps consistently

**Key Functions:**
- `groupEventsByDate(events: HistoryEvent[]): HistoryGroup[]`
  - Groups events by date
  - Determines "Today", "Yesterday", or formatted date label
  - Sorts events within each group (newest first)
- `formatTimestamp(date: Date): string`
  - Returns format: "HH:mm | DD MMM"
  - Example: "15:15 | 22 Jan"
- `getInitialColor(name: string): string`
  - Returns consistent color for initials circle based on name
  - Uses same color palette as AssignedToSection: ['#ff4dd8', '#5a759d', '#607aa1', '#f0be1b']

### Step 3: Create History Event Item Component

**File:** `src/components/roomDetail/HistoryEventItem.tsx`

**Component Structure:**
```typescript
interface HistoryEventItemProps {
  event: HistoryEvent;
  isFirst: boolean; // First item in group (for timeline connector)
  isLast: boolean; // Last item in group (for timeline connector)
}
```

**Visual Elements:**
- Avatar/Initials circle (left side)
- Timeline connector dot (center of circle)
- Event description text
- Timestamp text (below description)
- Proper spacing and alignment

### Step 4: Create Download Report Button Component

**File:** `src/components/roomDetail/DownloadReportButton.tsx`

**Component Structure:**
```typescript
interface DownloadReportButtonProps {
  onPress: () => void;
}
```

**Visual:**
- Light grey rounded rectangle
- Document icon with downward arrow (use existing icon or create)
- Text: "Download Report"
- Centered horizontally
- Appropriate padding and spacing

### Step 5: Add Style Constants

**File:** `src/constants/roomDetailStyles.ts`

Add new constants:

```typescript
export const HISTORY_SECTION = {
  container: {
    paddingTop: 20 * scaleX,
    paddingHorizontal: 20 * scaleX,
    paddingBottom: 40 * scaleX,
  },
  downloadButton: {
    width: '50%', // Approximately half screen width
    height: 44 * scaleX,
    borderRadius: 8 * scaleX,
    backgroundColor: '#F5F5F5', // Light grey
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignSelf: 'center',
    marginBottom: 24 * scaleX,
  },
  downloadButtonText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: '#000000',
  },
  dateSeparator: {
    marginTop: 24 * scaleX,
    marginBottom: 16 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#1e1e1e',
    paddingHorizontal: 12 * scaleX,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  timelineContainer: {
    position: 'relative',
    paddingLeft: 20 * scaleX, // Space for timeline connector
  },
  timelineConnector: {
    position: 'absolute',
    left: 12 * scaleX, // Center of avatar circle (24px / 2)
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#5a759d', // Blue color
  },
  eventItem: {
    flexDirection: 'row',
    marginBottom: 20 * scaleX,
    position: 'relative',
  },
  avatarContainer: {
    width: 24 * scaleX,
    height: 24 * scaleX,
    borderRadius: 12 * scaleX,
    marginRight: 12 * scaleX,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  initialsCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 12 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#ffffff',
  },
  eventContent: {
    flex: 1,
  },
  eventDescription: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: '#000000',
    marginBottom: 4 * scaleX,
  },
  eventTimestamp: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.light as any,
    color: '#999999',
  },
} as const;
```

### Step 6: Create Mock History Data

**File:** `src/data/mockHistoryData.ts`

Create mock history events for testing:

```typescript
import type { HistoryEvent } from '../types/roomDetail.types';

export const getMockHistoryEvents = (roomNumber: string): HistoryEvent[] => {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  return [
    // Today's events
    {
      id: '1',
      action: 'clicked on in progress',
      staff: {
        id: '1',
        name: 'Etleva Hoxha',
        avatar: require('../../assets/icons/Etleva_Hoxha.png'),
      },
      timestamp: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 15),
      createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 15).toISOString(),
    },
    // Add more events...
  ];
};
```

### Step 7: Integrate into RoomDetailScreen

**File:** `src/screens/RoomDetailScreen.tsx`

**Changes:**
1. Import HistorySection component
2. Add history events state
3. Add handler for download report
4. Render HistorySection when activeTab === 'History'

**Code Addition:**
```typescript
import HistorySection from '../components/roomDetail/HistorySection';

// In component:
const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>(() => {
  // Load from mock data or API
  return getMockHistoryEvents(room.roomNumber);
});

const handleDownloadReport = () => {
  // TODO: Implement report download functionality
  console.log('Download report for room', room.roomNumber);
};

// In render:
{activeTab === 'History' && (
  <HistorySection
    events={historyEvents}
    onDownloadReport={handleDownloadReport}
  />
)}
```

### Step 8: Update RoomDetailData Type

**File:** `src/types/roomDetail.types.ts`

Add history events to RoomDetailData:

```typescript
export interface RoomDetailData extends RoomCardData {
  // ... existing fields
  historyEvents?: HistoryEvent[]; // NEW: History of room activities
}
```

## Component Hierarchy

```
RoomDetailScreen
└── HistorySection (when activeTab === 'History')
    ├── DownloadReportButton
    └── ScrollView
        ├── HistoryDateGroup (for each date group)
        │   ├── DateSeparator
        │   └── HistoryEventItem[] (for each event)
        │       ├── Avatar/Initials Circle
        │       ├── Timeline Connector (vertical line)
        │       ├── Event Description
        │       └── Timestamp
        └── ... (more date groups)
```

## Styling Details

### Colors
- Timeline connector: `#5a759d` (blue)
- Date separator line: `#E0E0E0` (light grey)
- Download button background: `#F5F5F5` (light grey)
- Download button border: `#E0E0E0` (light grey)
- Event description: `#000000` (black)
- Timestamp: `#999999` (grey)
- Initials circle colors: `['#ff4dd8', '#5a759d', '#607aa1', '#f0be1b']`

### Typography
- Date label: Bold, 14px
- Event description: Regular, 14px
- Timestamp: Light, 12px
- Download button text: Regular, 14px

### Spacing
- Download button: 20px top padding, 24px bottom margin
- Date separator: 24px top margin, 16px bottom margin
- Event items: 20px bottom margin
- Avatar to content: 12px horizontal margin

## Event Types to Track

The following actions should be tracked in history:
1. Status changes (e.g., "clicked on in progress", "changed status to cleaned")
2. Note additions
3. Task assignments/completions
4. Staff reassignments
5. Checklist submissions
6. Ticket creation/updates
7. Lost and found item registrations
8. Special instructions updates

## Future Enhancements

1. **Filtering:** Add filters for event types (status changes, notes, tasks, etc.)
2. **Search:** Add search functionality to find specific events
3. **Export:** Implement actual PDF/CSV report generation
4. **Pagination:** For rooms with many events, implement pagination or infinite scroll
5. **Real-time Updates:** Connect to backend for real-time history updates
6. **Event Details:** Make events clickable to view more details
7. **Grouping Options:** Allow grouping by event type in addition to date

## Testing Checklist

- [ ] History section renders correctly when History tab is selected
- [ ] Download report button is visible and clickable
- [ ] Events are grouped correctly by date (Today, Yesterday, formatted dates)
- [ ] Timeline connector line is visible and connects all events
- [ ] Avatars display correctly when available
- [ ] Initials circles display with correct colors when no avatar
- [ ] Timestamps are formatted correctly (HH:mm | DD MMM)
- [ ] Events are sorted correctly within each date group (newest first)
- [ ] Date separators display correctly with horizontal lines
- [ ] ScrollView works correctly for long history lists
- [ ] Empty state displays when no history events exist
- [ ] Component handles edge cases (missing staff info, invalid dates, etc.)

## File Structure

```
src/
├── components/
│   └── roomDetail/
│       ├── HistorySection.tsx (NEW)
│       ├── HistoryEventItem.tsx (NEW)
│       └── DownloadReportButton.tsx (NEW)
├── types/
│   └── roomDetail.types.ts (UPDATE - add HistoryEvent, HistoryGroup)
├── constants/
│   └── roomDetailStyles.ts (UPDATE - add HISTORY_SECTION constants)
├── data/
│   └── mockHistoryData.ts (NEW)
└── screens/
    └── RoomDetailScreen.tsx (UPDATE - integrate HistorySection)
```

## Implementation Order

1. ✅ Create type definitions
2. ✅ Add style constants
3. ✅ Create DownloadReportButton component
4. ✅ Create HistoryEventItem component
5. ✅ Create HistorySection component with grouping logic
6. ✅ Create mock history data
7. ✅ Integrate into RoomDetailScreen
8. ✅ Test and refine

## Notes

- Use existing avatar/initials patterns from AssignedToSection
- Follow existing color palette and typography system
- Ensure responsive design with scaleX for different screen sizes
- Maintain consistency with other tab sections (Tickets, Checklist)
- Consider performance for rooms with many history events (virtualization if needed)
