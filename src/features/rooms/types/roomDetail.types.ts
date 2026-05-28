import type { RoomCardData, RoomStatus } from './allRooms.types';
import type { LostAndFoundItem } from '@features/lost-and-found';

// Room Type Definitions
export type RoomType = 'Arrival' | 'Departure' | 'ArrivalDeparture' | 'Stayover' | 'Turndown';

export interface RoomTypeConfig {
  type: RoomType;
  guestInfoStartTop: number;
  hasSpecialInstructions: boolean;
  numberOfGuests: 1 | 2;
  cardHeight: number;
  lostAndFoundType: 'empty' | 'withItems';
}

export interface Note {
  id: string;
  text: string;
  staff: {
    name: string;
    avatar?: any;
  };
  createdAt: string;
}

export interface Task {
  id: string;
  text: string;
  createdAt: string;
}

export interface RoomDetailData extends Omit<RoomCardData, 'notes'> {
  roomType: RoomType; // NEW: Room type for dynamic layout
  specialInstructions?: string; // Special instructions for arrival guest
  /** Full note objects for detail view (card view uses NotesInfo with count) */
  notes: Note[];
  tasks?: Task[]; // Tasks for the room
  assignedTo?: {
    id: string;
    name: string;
    avatar?: any;
    initials?: string;
    avatarColor?: string;
    department?: string; // Department/role (e.g., "HSK")
  };
  isUrgent?: boolean;
  lostAndFoundItems?: LostAndFoundItem[]; // NEW: For Stayover/Turndown rooms
}

export type DetailTab = 'Overview' | 'Tickets' | 'Checklist' | 'History';

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

/**
 * Props for the reusable RoomDetailContent component.
 * Any screen or host that shows room details should pass these props (e.g. RoomDetailScreen).
 * Layout is defined in RoomDetailContent; this interface is the data contract.
 */
export interface RoomDetailScreenProps {
  // Room identification
  roomId?: string;
  roomNumber: string;
  roomCode: string; // e.g., "ST2K - 1.4"
  
  // Room status
  status: RoomStatus;
  isPriority?: boolean;
  flagged?: boolean; // When true, show flag badge (flag room)
  frontOfficeStatus?: 'Arrival' | 'Departure' | 'Arrival/Departure' | 'Stayover' | 'Turndown' | 'No Task';
  
  // Room type determines layout structure
  roomType: RoomType;
  
  // Guest information
  // For Arrival/Departure: [arrivalGuest, departureGuest]
  // For Arrival: [arrivalGuest]
  // For Departure: [departureGuest]
  // For Stayover/Turndown: [stayoverGuest]
  guests: Array<{
    guest: import('./allRooms.types').GuestInfo;
    type: 'Arrival' | 'Departure' | 'Stayover' | 'Turndown';
  }>;
  
  // Special instructions (shown after Arrival guest info for Arrival/Departure, or after guest info for other types)
  specialInstructions?: string | null;
  
  // Assigned staff
  assignedTo?: {
    id: string;
    name: string;
    avatar?: any;
    initials?: string;
    avatarColor?: string;
    department?: string;
  };

  /** When true, the Assigned To section is performing a mutation (e.g. reassign). */
  isAssigningStaff?: boolean;
  
  // Task description
  taskDescription?: string;
  
  // Notes
  notes?: Note[];
  
  // Lost & Found items (for Stayover/Turndown)
  lostAndFoundItems?: LostAndFoundItem[];
  
  // History events
  historyEvents?: HistoryEvent[];
  
  // Callbacks
  onBackPress?: () => void;
  onStatusPress?: () => void;
  onStatusChange?: (status: RoomStatus) => void;
  onReassign?: () => void;
  onAddNote?: () => void;
  onSaveNote?: (noteText: string) => void;
  onAddTask?: () => void;
  onSaveTask?: (taskText: string) => void;
  onAddLostAndFoundItem?: () => void;
  onDownloadHistoryReport?: () => Promise<void>;
  /** When the room is paused, resume clears pause and returns to normal UI. */
  onResumePause?: () => void;
  /** When return later time elapses, clear it and return to normal UI. */
  onReturnLaterElapsed?: () => void;
  /** Clear Refuse Service and return to normal UI. */
  onClearRefuseService?: () => void;
  
  // Optional: Custom status text (for Pause, Return Later, etc.)
  customStatusText?: string;
  pausedAt?: string;
  returnLaterAtTimestamp?: number;
  promiseTimeAtTimestamp?: number;
  /** Epoch ms when Refuse Service was confirmed (persisted). */
  refuseServiceAtTimestamp?: number;
  refuseServiceReason?: string;
  
  // Optional: Show stayover with linen badge
  showWithLinenBadge?: boolean;
  
  // Optional: Initial tab to display
  initialTab?: DetailTab;
  
  // Optional: Department name for ticket creation
  departmentName?: string;
}
