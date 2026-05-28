/** Front office status: Arrival/Departure, Arrival, Departure, Stayover, Turndown, No Task, Refresh */
export type FrontOfficeStatus = 'Arrival/Departure' | 'Arrival' | 'Departure' | 'Stayover' | 'Turndown' | 'No Task' | 'Refresh';
export type ReservationStatus =
  | 'Due in / Due out'
  | 'Occupied'
  | 'Checked out / Due in'
  | 'Checked in'
  | 'Checked out'
  | 'Due out'
  | 'Vacant'
  | 'Out Of Order'
  | 'Due Out / Out Of Order'
  | 'Checked out / Out Of Order';

export type RoomStatus = 'Dirty' | 'InProgress' | 'Cleaned' | 'Inspected';

/** Promised ready time for the room: 12:00, 13:00, or null */
export type PromisedTime = '12:00' | '13:00' | null;

export type StatusChangeOption = 'Priority' | 'Dirty' | 'InProgress' | 'Cleaned' | 'Inspected' | 'Pause' | 'ReturnLater' | 'RefuseService' | 'PromisedTime';

/** Guest count: adults/kids. For ETA (arrival) = checking in; for EDT (departure) = checking out */
export interface GuestCount {
  adults: number;
  kids: number;
}

/** Dates of stay. For ETA guest = checking in; for EDT guest = checking out. ISO format for parsing. */
export interface DatesOfStay {
  from: string; // ISO YYYY-MM-DD
  to: string;   // ISO YYYY-MM-DD
}

export interface GuestInfo {
  name: string;
  /** Dates of stay. For ETA = checking in; for EDT = checking out. Display: DD.MM.YYYY - DD.MM.YYYY */
  datesOfStay: DatesOfStay;
  /** Time value: HH:mm (24h) or h:00am/pm for Arrival [ETA] / Departure [EDT]; "N/A" for Stayover, Turndown, No Task, Vacant */
  time: string;
  /** ETA = Arrival (check-in); EDT = Departure (check-out); N/A = Stayover, Turndown, No Task, Vacant */
  timeLabel: 'ETA' | 'EDT' | 'N/A';
  guestCount: GuestCount; // Display: adults/kids (e.g. 2/2)
  vipCode?: number; // VIP code badge (e.g., 11 for first guest, 22 for second in Arrival/Departure)
  isVacant?: boolean; // For turndown vacant state
  /** ISO date string (YYYY-MM-DD) of guest arrival; used for Stayover linen calculation (every 2nd day = linen change) */
  arrivalDate?: string;
  /** Optional guest portrait URL for two-column layout (image left, info right) on room cards */
  imageUrl?: string;
}

export interface StaffInfo {
  avatar?: string; // URL to avatar image, or undefined for initials
  initials?: string; // If no avatar, show initials (e.g., "Z")
  name: string;
  /** Supabase `users.id` when this staff comes from room_assignments. */
  userId?: string;
  statusText: string; // "Not Started", "Started: 40 mins", "Finished: 60 mins", etc.
  statusColor: string; // Color for the status text
  promiseTime?: string; // Optional, for departure rooms: "Promise time: 18:00"
  avatarColor?: string; // Optional, for initial circle when no avatar
  /** From `room_assignments.work_status` when staff is assigned (list + cards use for paused UI). */
  assignmentWorkStatus?: 'in_progress' | 'completed' | 'paused' | null;
}

export interface NotesInfo {
  count: number;
  hasRushed?: boolean; // If true, show "Rushed and notes"
}

/** Who made the note - shown in room details */
export interface NoteMadeBy {
  name: string;
  avatar?: any;
}

export interface RoomCardData {
  id: string;
  roomNumber: string; // "201", "202", etc.
  /** Room category code e.g. ST2K, R01K, R01KY, RO2KT, ST3K, JS2KT, RO1Q, JS1KT, PS1K */
  roomCategory: string;
  credit: number; // Approximate time to clean room in minutes (45, 60, 90, etc.)
  frontOfficeStatus: FrontOfficeStatus; // Arrival/Departure, Arrival, Departure, Stayover, Turndown, No Task, Refresh
  /** When frontOfficeStatus is Stayover: true = Stayover with Linen (linen change day), false = Stayover no Linen. Computed from arrival date (every 2nd day of stay) if not set. */
  withLinen?: boolean;
  houseKeepingStatus: RoomStatus;
  reservationStatus?: ReservationStatus; // Due in / Due out, Occupied, Checked out / Due in, Checked in, Checked out, Due out, Vacant, Out Of Order, Due Out / Out Of Order, Checked out / Out Of Order
  promisedTime?: PromisedTime; // 12:00, 13:00, or null
  /** When set (ISO timestamp), room is in "Return Later" state until that time. */
  returnLaterAt?: string | null;
  /** When set (ISO timestamp), room is in "Paused" state (for header + list styling). */
  pausedAt?: string | null;
  /** When set, room is in "Refused Service" state (for header + list styling). */
  refuseServiceReason?: string | null;
  /** When set (ISO timestamp), room is in "Refused Service" state (for display). */
  refuseServiceAt?: string | null;
  guests: GuestInfo[]; // Array to support Arrival/Departure rooms with 2 guests
  /** When null, room card shows "Assign Staff" button; when set, shows staff info. */
  roomAttendantAssigned: StaffInfo | null;
  isPriority: boolean; // Must be true or false; red border for priority rooms when true
  flagged: boolean; // Must be true or false; when true, room contributes to "Flagged" category on Home
  notes?: NotesInfo;
  /** Special instructions for room. null for Departure rooms; displayed in room details for all other room types */
  specialInstructions?: string | null;
  /** Room note text. null when no note. Displayed in room details. */
  roomNotes?: string | null;
  /** Who made the room note. null when no note. Paired with roomNotes. */
  noteMadeBy?: NoteMadeBy | null;
  /** Tasks associated with the room. Displayed in Assigned To card in room details. */
  tasks?: Array<{
    id: string;
    text: string;
    createdAt: string;
  }>;
}

export interface AllRoomsScreenData {
  rooms: RoomCardData[];
  /** PM shift rooms from pm-operational-data.csv; used when selectedShift === 'PM' */
  roomsPM?: RoomCardData[];
  selectedShift: 'AM' | 'PM';
}

export interface StatusConfig {
  color: string; // Background color of the status button
  icon: any; // Icon for the status
  label: string;
}

export const STATUS_CONFIGS: Record<RoomStatus, StatusConfig> = {
  Dirty: {
    color: '#f92424',
    icon: require('../../../../assets/icons/dirty-state-icon.png'),
    label: 'Dirty',
  },
  InProgress: {
    color: '#F0BE1B',
    icon: require('../../../../assets/icons/in-progess-state-icon.png'),
    label: 'In Progress',
  },
  Cleaned: {
    color: '#4a91fc',
    icon: require('../../../../assets/icons/cleaned-state-icon.png'),
    label: 'Cleaned',
  },
  Inspected: {
    color: '#41d541',
    icon: require('../../../../assets/icons/inspected-state-icon.png'),
    label: 'Inspected',
  },
};

export const FRONT_OFFICE_STATUS_ICONS: Record<FrontOfficeStatus, any> = {
  'Arrival': require('../../../../assets/icons/arrival-icon.png'),
  'Departure': require('../../../../assets/icons/departure-icon.png'),
  'Stayover': require('../../../../assets/icons/stayover-icon.png'),
  'Turndown': require('../../../../assets/icons/turndown-icon.png'),
  'Arrival/Departure': require('../../../../assets/icons/arrival-departure-icon.png'),
  'No Task': require('../../../../assets/icons/stayover-icon.png'), // fallback
  'Refresh': require('../../../../assets/icons/done.png'), // fallback
};

export interface StatusOptionConfig {
  id: StatusChangeOption;
  label: string;
  icon: any;
}

export const STATUS_OPTIONS: StatusOptionConfig[] = [
  {
    id: 'Priority',
    label: 'Priority',
    icon: require('../../../../assets/icons/priority-status.png'),
  },
  {
    id: 'Dirty',
    label: 'Dirty',
    icon: require('../../../../assets/icons/dirty-status.png'),
  },
  {
    id: 'InProgress',
    label: 'In Progress',
    icon: require('../../../../assets/icons/in-progress-icon.png'),
  },
  {
    id: 'Cleaned',
    label: 'Cleaned',
    icon: require('../../../../assets/icons/cleaned-status.png'),
  },
  {
    id: 'Inspected',
    label: 'Inspected',
    icon: require('../../../../assets/icons/inspected-status.png'),
  },
  {
    id: 'Pause',
    label: 'Pause',
    icon: require('../../../../assets/icons/pause-status.png'),
  },
  {
    id: 'ReturnLater',
    label: 'Return Later',
    icon: require('../../../../assets/icons/return-later-status.png'),
  },
  {
    id: 'RefuseService',
    label: 'Refuse Service',
    icon: require('../../../../assets/icons/refuse-service-status.png'),
  },
  {
    id: 'PromisedTime',
    label: 'Promised Time',
    icon: require('../../../../assets/icons/promised-time-status.png'),
  },
];

