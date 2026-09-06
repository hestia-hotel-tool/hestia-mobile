import type { IconName } from '@/components/Icon';

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

/**
 * Status as actually displayed to the user: the persisted RoomStatus, or 'Paused'
 * when the room is currently paused. Paused is an overlay on top of houseKeepingStatus,
 * not a replacement for it — see isRoomPaused/getRoomDisplayStatus below.
 */
export type RoomDisplayStatus = RoomStatus | 'Paused';

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

/**
 * True if either paused signal is set on the room. There are two independent
 * "paused" columns in the DB (rooms.paused_at, written from Room Detail's own
 * pause button, and room_assignments.work_status='paused', written from the
 * assignment/list-view pause flow) that are never reconciled with each other —
 * this is the single check that reads both so a room paused via either path
 * displays as paused everywhere.
 */
export function isRoomPaused(room: Pick<RoomCardData, 'pausedAt' | 'roomAttendantAssigned'>): boolean {
  return room.pausedAt != null || room.roomAttendantAssigned?.assignmentWorkStatus === 'paused';
}

/** The status to show in the UI: 'Paused' overlays houseKeepingStatus when the room is paused. */
export function getRoomDisplayStatus(
  room: Pick<RoomCardData, 'houseKeepingStatus' | 'pausedAt' | 'roomAttendantAssigned'>
): RoomDisplayStatus {
  return isRoomPaused(room) ? 'Paused' : room.houseKeepingStatus;
}

/**
 * What the room is *doing*, as opposed to how clean it is.
 *
 * Pause, Return Later, Refuse Service and Promised Time are not statuses — each
 * persists as `houseKeepingStatus: 'InProgress'` plus its own timestamp/reason
 * column. Treating them as a fifth, sixth, seventh status is what led to the UI
 * reading a free-form `customStatusText` string composed from which modal
 * happened to be open.
 *
 * Times are epoch ms. `null` means "this state is active but has no time yet" —
 * the state the UI is in while its modal is open, before the user confirms.
 */
export type RoomActivityState =
  | { kind: 'none' }
  | { kind: 'paused'; since: number | null; assignmentPaused: boolean }
  | { kind: 'returnLater'; dueAt: number | null }
  | { kind: 'refuseService'; at: number | null; reason: string | null }
  | { kind: 'promisedTime'; dueAt: number | null };

export type RoomActivityKind = RoomActivityState['kind'];

/** Header label per state. `none` falls back to STATUS_CONFIGS[status].label. */
export const ROOM_ACTIVITY_LABEL: Record<RoomActivityKind, string | null> = {
  none: null,
  paused: 'Paused',
  returnLater: 'Return Later',
  refuseService: 'Refused Service',
  promisedTime: 'Promised Time',
};

/** ISO → epoch ms, or null when absent/unparseable. */
function toEpochMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Which activity a room is in, from its own columns.
 *
 * Precedence is paused > refuseService > returnLater, which is what the header
 * already did. It matters because nothing in the schema enforces that the four
 * columns are mutually exclusive — only the convention that every write clears
 * the other three.
 *
 * Deliberately ignores `room.promisedTime`: that column is the reservation's
 * promised *ready* time, not this header state. Reading it here would put every
 * room with a promised time into a Promised Time header.
 */
export function deriveRoomActivityState(
  room: Pick<
    RoomCardData,
    'pausedAt' | 'returnLaterAt' | 'refuseServiceAt' | 'refuseServiceReason' | 'roomAttendantAssigned'
  >
): RoomActivityState {
  // Via isRoomPaused so both pause signals count. Reading `pausedAt` alone is
  // why a room paused from the list view shows "Paused" with no "Paused at:" row.
  if (isRoomPaused(room)) {
    return {
      kind: 'paused',
      since: toEpochMs(room.pausedAt),
      assignmentPaused: room.roomAttendantAssigned?.assignmentWorkStatus === 'paused',
    };
  }

  if (room.refuseServiceAt || room.refuseServiceReason) {
    return {
      kind: 'refuseService',
      at: toEpochMs(room.refuseServiceAt),
      reason: room.refuseServiceReason ?? null,
    };
  }

  if (room.returnLaterAt) {
    return { kind: 'returnLater', dueAt: toEpochMs(room.returnLaterAt) };
  }

  // Promised Time has no column yet — see handlePromiseTimeConfirm, which only
  // writes room_history. It exists in this union as screen-local state until one
  // is added, so it can never be derived here.
  return { kind: 'none' };
}

/**
 * The four activity columns, always written together.
 *
 * They are mutually exclusive by convention, and the convention used to live in
 * five hand-copied update payloads plus three partial clears that each nulled a
 * different subset. Going through here means entering any state leaves the other
 * three cleared, every time.
 */
export function activityStateToUpdate(state: RoomActivityState): {
  paused_at: string | null;
  return_later_at: string | null;
  refuse_service_at: string | null;
  refuse_service_reason: string | null;
} {
  const cleared = {
    paused_at: null,
    return_later_at: null,
    refuse_service_at: null,
    refuse_service_reason: null,
  };
  const iso = (ms: number | null) => (ms == null ? null : new Date(ms).toISOString());

  switch (state.kind) {
    case 'paused':
      return { ...cleared, paused_at: iso(state.since) ?? new Date().toISOString() };
    case 'returnLater':
      return { ...cleared, return_later_at: iso(state.dueAt) };
    case 'refuseService':
      return {
        ...cleared,
        refuse_service_at: iso(state.at) ?? new Date().toISOString(),
        refuse_service_reason: state.reason,
      };
    // Promised Time is not persisted, so it writes the same as clearing.
    case 'promisedTime':
    case 'none':
      return cleared;
  }
}

/**
 * Maps a Change Status modal option to the RoomStatus persisted on the room.
 * Single source of truth — previously duplicated identically in AllRoomsScreen
 * and RoomDetailScreen.
 */
export function mapStatusOptionToRoomStatus(option: StatusChangeOption): RoomStatus {
  switch (option) {
    case 'Dirty':
      return 'Dirty';
    case 'InProgress':
      return 'InProgress';
    case 'Cleaned':
      return 'Cleaned';
    case 'Inspected':
      return 'Inspected';
    case 'Priority':
    case 'Pause':
    case 'ReturnLater':
    case 'RefuseService':
    case 'PromisedTime':
      return 'InProgress';
    default:
      return 'InProgress';
  }
}

export interface AllRoomsScreenData {
  rooms: RoomCardData[];
  /** PM shift rooms from pm-operational-data.csv; used when selectedShift === 'PM' */
  roomsPM?: RoomCardData[];
  selectedShift: 'AM' | 'PM';
}

export interface StatusConfig {
  color: string; // Background color of the status button
  /** Registry key from src/components/Icon — see assets/icons/room-status/. */
  iconName: IconName;
  /** Glyph height in px (design/Figma pixels, before scaleX) — each glyph has a different natural size. */
  glyphHeight: number;
  label: string;
}

/**
 * Figma node 3883:5570 (Rooms screen, dev mode) — colors and icon glyphs for the
 * room status pill (StatusButton / StatusPill). Dirty/InProgress share the same
 * vacuum glyph (only the color differs); Cleaned uses a cleaning-cloth glyph;
 * Inspected uses a thumbs-up glyph; Paused uses a pause glyph. All four
 * pre-existing colors (Dirty/InProgress/Cleaned/Inspected) are unchanged from
 * before — only the icon glyphs and the new Paused color (#b0c0c6) came from Figma.
 */
export const STATUS_CONFIGS: Record<RoomDisplayStatus, StatusConfig> = {
  Dirty: {
    color: '#f92424',
    iconName: 'status-vacuum',
    glyphHeight: 25.4,
    label: 'Dirty',
  },
  InProgress: {
    color: '#F0BE1B',
    iconName: 'status-vacuum',
    glyphHeight: 25.4,
    label: 'In Progress',
  },
  Cleaned: {
    color: '#4a91fc',
    iconName: 'status-clean',
    glyphHeight: 30.6,
    label: 'Cleaned',
  },
  Inspected: {
    color: '#41d541',
    iconName: 'status-approved',
    glyphHeight: 26,
    label: 'Inspected',
  },
  Paused: {
    color: '#b0c0c6',
    iconName: 'status-paused',
    glyphHeight: 38.8,
    label: 'Paused',
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
  /** Registry key from src/components/Icon. */
  iconName: IconName;
  /** Glyph height in design px (before scaleX) — taken from each glyph's own viewBox. */
  glyphHeight: number;
  /** Fill of the 51px circle behind the glyph. */
  circleColor: string;
  /** Tint of the glyph itself. */
  glyphColor: string;
}

/**
 * Figma node 2365:49 (Change Status modal) — every option is a 51px circle with a
 * tinted glyph. The four "solid" statuses reuse their pill colors with a white
 * glyph; the five actions use a pale wash of their colour with a coloured glyph.
 *
 * In Progress is not drawn in that Figma frame (the example room *is* In Progress,
 * so the option is filtered out); it follows the Dirty/Cleaned/Inspected pattern.
 */
export const STATUS_OPTIONS: StatusOptionConfig[] = [
  {
    id: 'Priority',
    label: 'Priority',
    iconName: 'action-priority',
    glyphHeight: 27.9,
    circleColor: '#ffebeb',
    glyphColor: '#f92424',
  },
  {
    id: 'Dirty',
    label: 'Dirty',
    iconName: 'status-dirty',
    glyphHeight: 27.8,
    circleColor: '#f92424',
    glyphColor: '#ffffff',
  },
  {
    id: 'InProgress',
    label: 'In Progress',
    iconName: 'status-vacuum',
    glyphHeight: 25.4,
    circleColor: '#f0be1b',
    glyphColor: '#ffffff',
  },
  {
    id: 'Cleaned',
    label: 'Cleaned',
    iconName: 'status-clean',
    glyphHeight: 31.2,
    circleColor: '#4a91fc',
    glyphColor: '#ffffff',
  },
  {
    id: 'Inspected',
    label: 'Inspected',
    iconName: 'status-approved',
    glyphHeight: 26.5,
    circleColor: '#41d541',
    glyphColor: '#ffffff',
  },
  {
    id: 'Pause',
    label: 'Pause',
    iconName: 'status-paused',
    glyphHeight: 28.4,
    circleColor: 'rgba(176, 192, 198, 0.21)',
    glyphColor: '#3f4c5f',
  },
  {
    id: 'ReturnLater',
    label: 'Return Later',
    iconName: 'action-return-later',
    glyphHeight: 29.8,
    circleColor: '#ead7f6',
    glyphColor: '#3f4c5f',
  },
  {
    id: 'RefuseService',
    label: 'Refuse Service',
    iconName: 'action-refuse-service',
    glyphHeight: 28.4,
    circleColor: '#ff9090',
    glyphColor: '#ffffff',
  },
  {
    id: 'PromisedTime',
    label: 'Promised Time',
    iconName: 'action-promised-time',
    glyphHeight: 30.8,
    circleColor: 'rgba(240, 190, 27, 0.21)',
    glyphColor: '#3f4c5f',
  },
];

