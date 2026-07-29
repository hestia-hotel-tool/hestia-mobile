export type StaffDepartmentId =
  | 'engineering'
  | 'hskPortier'
  | 'inRoomDining'
  | 'laundry'
  | 'concierge'
  | 'reception'
  | 'it';

export interface DepartmentRowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  /** When set, triangle points at the department name (label below icon). */
  namePosition?: { x: number; y: number; width: number; height: number };
}
