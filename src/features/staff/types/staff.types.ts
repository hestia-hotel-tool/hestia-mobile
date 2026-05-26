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
    timer: string; // Format: "00:50:23"
    isActive: boolean; // If true, timer is red; if false, black
  };
}

export interface StaffScreenData {
  date: string; // Format: "Mon 23 Feb 2025"
  staffMembers: StaffMember[];
}
