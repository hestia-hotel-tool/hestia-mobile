import type { RoomPickerGuest } from '@features/rooms/types/roomPicker.types';
// The canonical status table lives with the shared status row.
import type { RoomStatusKey } from '@/components/ui/StatusCircle';

/**
 * The Staff screen's own view model.
 *
 * Deliberately **not** an extension of `StaffMember`. That type has five
 * consumers and four of them live outside this feature (`rooms/roomDetail/*`,
 * `lost-and-found/*`); widening it to carry shift state would make a Staff
 * screen concern everyone else's problem. It is also almost entirely optional
 * fields, so it can express "a person with no name and no id" while being
 * unable to say which of its two stat shapes you are actually holding.
 *
 * This one is built for one screen and says exactly what that screen draws.
 */

/** Which of Figma 3240:561's three labelled groups a person belongs to. */
export type StaffShiftState = 'on_shift' | 'on_break' | 'shift_end';

/**
 * A shift's wall-clock window.
 *
 * `shifts.start_time` / `end_time` are `time without time zone` — no date, no
 * zone — and no migration seeds them, so both ends are nullable and every
 * consumer has to cope with not knowing.
 */
export interface ShiftWindow {
  id: string;
  /** As stored: 'AM' | 'PM'. */
  name: string;
  /** Minutes since local midnight, or null when unset/unparseable. */
  startMinutes: number | null;
  endMinutes: number | null;
  /** True when the window wraps midnight (`end <= start`). */
  overnight: boolean;
}

/**
 * One person's assignment rows for one shift, folded down.
 *
 * Counts rather than rows: the card draws totals, and keeping rows would mean
 * every consumer re-deriving the same four numbers.
 */
export interface StaffAssignmentFacts {
  total: number;
  /** `work_status` null — assigned but not begun. The most common value. */
  notStarted: number;
  inProgress: number;
  completed: number;
  /**
   * Paused. **`rooms.paused_at`, or `work_status === 'paused'`.**
   *
   * The second half alone would never fire: nothing in `src/` writes
   * `work_status = 'paused'` — the pause UI sets `rooms.paused_at`
   * (`rooms.ts:783`). `allRooms.types.ts:136` already encodes this OR; keying
   * "On Break" on the status alone would leave the section permanently empty.
   */
  paused: number;
}

/**
 * One room on this person's list, for the card's expanded state.
 *
 * Costs no extra query: `fetchAssignments` already walks every
 * `room_assignments` row to total the workload and previously discarded all
 * but the one being worked.
 */
export interface StaffAssignedRoom {
  roomId?: string;
  roomNumber: string;
  status: RoomStatusKey;
  isPaused: boolean;
}

/** One ticket on this person's list — the non-cleaning equivalent. */
export interface StaffAssignedTicket {
  title: string;
  /** Raw `tickets.status`; 'unsolved' | 'done' | 'ofo' in practice. */
  status: string;
  isResolved: boolean;
}

/** What the card's workload bar and stats row draw. */
export interface StaffWorkload {
  /** The "/7". */
  total: number;
  /** The "3/". */
  completed: number;
  inProgress: number;
  cleaned: number;
  dirty: number;
}

/** The "Current" block: the room this person is in right now. */
export interface StaffCurrentAssignment {
  roomId?: string;
  roomNumber: string;
  /** `start_time ?? created_at` — what `ElapsedTimer` counts from. */
  startTimeIso: string | null;
  /** `rooms.credit`, the budget the elapsed time is measured against. */
  creditMins?: number;
  isPaused: boolean;
  pauseReason?: string | null;
  /**
   * Who is staying there. Absent means the card draws initials — never a
   * synthesised portrait, which would put a stranger's face against a named
   * guest (see the note on `RoomPickerGuest.imageUrl`).
   */
  guest?: RoomPickerGuest;
}

export interface StaffTicketSummary {
  resolved: number;
  open: number;
  total: number;
  avgResolutionMins?: number;
  currentTicket?: { title: string; startTimeIso: string | null };
}

export interface StaffRosterPerson {
  id: string;
  name: string;
  avatarUrl?: string;
  departmentName?: string;
  /** Job title, falling back to role — the line under the name. */
  jobTitle?: string;

  state: StaffShiftState;
  /** The window this state was derived against, for the section header. */
  shiftName: string;

  /** Cleaning departments get a workload; everyone else gets tickets. */
  statKind: 'cleaning' | 'tickets';
  work?: StaffWorkload;
  current?: StaffCurrentAssignment;
  tickets?: StaffTicketSummary;
  /** Revealed by "See rooms". Empty for someone with nothing assigned. */
  rooms: StaffAssignedRoom[];
  /** Revealed by "See tickets" in a non-cleaning department. */
  ticketList: StaffAssignedTicket[];
}

export interface StaffRosterSection {
  state: StaffShiftState;
  title: 'On Shift' | 'On Break' | 'Shift End';
  people: StaffRosterPerson[];
}

export interface StaffRoster {
  /**
   * Always three, always in the frame's order. Presentation hides the empty
   * ones; keeping the array a fixed shape means a person moving between
   * sections does not remount the list.
   */
  sections: readonly [StaffRosterSection, StaffRosterSection, StaffRosterSection];
  shift: ShiftWindow | null;
  /** Everyone in the department, whatever their state — the header count. */
  totalCount: number;
}
