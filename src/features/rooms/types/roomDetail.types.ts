import type { RoomCardData, RoomStatus, RoomActivityState } from './allRooms.types';
import type { LostAndFoundItem } from '@features/lost-and-found';

// Room Type Definitions
export type RoomType = 'Arrival' | 'Departure' | 'ArrivalDeparture' | 'Stayover' | 'Turndown';

export type GuestSlotRole = 'Arrival' | 'Departure' | 'Stayover' | 'Turndown';

/**
 * One guest block on the Overview, and how to find its guest.
 *
 * "Arrival only / Departure only / both" is a list of these rather than a chain
 * of `roomType === 'ArrivalDeparture'` checks — which used to appear in two
 * files, once to build a typed array and again to pick it apart.
 */
export interface GuestSlot {
  role: GuestSlotRole;
  /** How this slot picks its guest out of the room's guest list. */
  match: { by: 'index'; index: number } | { by: 'timeLabel'; timeLabel: 'ETA' | 'EDT' };
  /** Used when `match` finds nothing. */
  fallbackIndex?: number;
  /** Draw the Special Instructions block under this slot, when the room has any. */
  showsSpecialInstructions: boolean;
  /** 'inheritFromFirst' falls back to the first slot's badge when this one has none. */
  numberBadge: 'own' | 'inheritFromFirst' | 'none';
}

export interface RoomTypeConfig {
  type: RoomType;
  /** The guest blocks this room type shows, in render order. */
  guestSlots: GuestSlot[];
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
  
  /**
   * The room's guests, in room-card order — pass `room.guests` straight through.
   *
   * Which of them fills which block is decided by the room type's `guestSlots`
   * (see `resolveGuestSlots`), so callers no longer tag each guest with a role.
   */
  guests: import('./allRooms.types').GuestInfo[];
  
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
  
  /**
   * The room's tasks. Was a single `taskDescription` string, so only the first
   * one could ever be seen and the Add-task callbacks had nothing to append to.
   */
  tasks?: Task[];
  
  // Notes
  notes?: Note[];
  
  // Lost & Found items (for Stayover/Turndown)
  lostAndFoundItems?: LostAndFoundItem[];
  
  // History events
  historyEvents?: HistoryEvent[];
  
  // Callbacks
  onBackPress?: () => void;
  onStatusPress?: () => void;
  onReassign?: () => void;
  /*
   * Only the "open the modal" callbacks live here. Saving is the host screen's
   * job, since it owns every modal — the matching save callbacks were declared
   * and never called.
   */
  onAddNote?: () => void;
  onAddTask?: () => void;
  /** Opens a task in full — wired to ViewTaskModal. */
  onSeeMoreTask?: (task: Task) => void;
  onAddLostAndFoundItem?: () => void;
  onDownloadHistoryReport?: () => Promise<void>;
  /** When the room is paused, resume clears pause and returns to normal UI. */
  onResumePause?: () => void;
  /** When return later time elapses, clear it and return to normal UI. */
  onReturnLaterElapsed?: () => void;
  /** Clear Refuse Service and return to normal UI. */
  onClearRefuseService?: () => void;
  
  /**
   * What the room is doing — paused, returning later, refused, or nothing.
   *
   * Replaces `customStatusText` plus four parallel timestamp props. Those could
   * describe combinations the data never produces, and the string was rebuilt on
   * every render from whichever modal happened to be open. Derive it with
   * `deriveRoomActivityState(room)`.
   */
  activity?: RoomActivityState;
  
  // Optional: Show stayover with linen badge
  showWithLinenBadge?: boolean;
  
  // Optional: Initial tab to display
  initialTab?: DetailTab;
  
  // Optional: Department name for ticket creation
  departmentName?: string;
}
