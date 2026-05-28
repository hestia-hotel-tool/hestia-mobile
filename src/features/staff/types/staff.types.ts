export type StaffTab = 'shifts' | 'am' | 'pm';

/** Tab for reassign modal: On Shift, AM, PM, Departments */
export type ReassignTab = 'OnShift' | 'AM' | 'PM' | 'departments';

export interface StaffMember {
  id: string;
  name: string;
  avatar?: any; // Image source
  initials?: string; // Single letter for avatar
  avatarColor?: string; // Background color for initial circle
  department?: string; // Department display name (e.g. HSK, F&B)
  role?: string; // Role display name (e.g. Attendant, Supervisor)
  workload?: number;
  maxWorkload?: number;
  onShift?: boolean;
  shift?: string;
  progressRatio?: {
    completed: number;
    total: number;
  };
  taskStats?: {
    inProgress: number;
    cleaned: number;
    dirty: number;
  };
  currentTask?: {
    roomNumber: string;
    /** rooms.id — opens RoomDetail when the card's button is pressed. */
    roomId?: string;
    timer?: string; // Optional precomputed label; the card derives a live timer from startTimeIso
    isActive: boolean; // If true, timer is red (in progress); if false, black
    /** room_assignments.start_time — when cleaning started; drives the live elapsed timer. */
    startTimeIso?: string | null;
    /** room_assignments.work_status === 'paused' */
    isPaused?: boolean;
    /** room_assignments.pause_reason */
    pauseReason?: string | null;
  };
  /** Which stat panel this staff's card should show (by department kind). */
  statKind?: 'cleaning' | 'tickets';
  /** Ticket throughput for non-housekeeping departments (Engineering, IT, etc.). */
  ticketStats?: {
    resolved: number;
    open: number;
    total: number;
    avgResolutionMins?: number;
    currentTicket?: { title: string; startTimeIso: string | null };
  };
}

export interface StaffScreenData {
  date: string; // Format: "Mon 23 Feb 2025"
  staffMembers: StaffMember[];
}
