/**
 * Home Screen Type Definitions
 */

export interface RoomStatus {
  dirty: number;
  inProgress: number;
  cleaned: number;
  inspected: number;
}

export type CategoryName = 'Flagged' | 'Arrivals' | 'Departures' | 'StayOvers' | 'Turndown' | 'No Task' | 'Vacant';

export interface CategorySection {
  id: string;
  name: CategoryName;
  total: number;
  priority?: number;
  borderColor: string;
  status: RoomStatus;
}

export interface UserProfile {
  name: string;
  role: string;
  department?: string; // Optional - e.g. Housekeeping, Front Office
  avatar?: string; // Optional - when absent, show initials from name
  hasFlag: boolean;
}

export type ShiftType = 'AM' | 'PM';

export interface HomeScreenData {
  user: UserProfile;
  selectedShift: ShiftType;
  date: string;
  categories: CategorySection[];
  notifications: {
    chat: number;
  };
}

export type StatusType = 'dirty' | 'inProgress' | 'cleaned' | 'inspected';

export interface StatusConfig {
  type: StatusType;
  label: string;
  color: string;
  icon: any; // React Native Image source
}

