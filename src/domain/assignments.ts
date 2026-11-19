/**
 * Room assignment departments — who holds a room for a shift, per department.
 *
 * One room record, one assignment layer per department (migration
 * 20261118090000): housekeeping assigns room attendants, engineering assigns
 * technicians, on the same rooms and the same AM/PM shifts. Each department
 * keeps its own workflow; housekeeping's cleaning state machine only ever sees
 * housekeeping assignments.
 *
 * Everything that differs between the two lives in this table, so a screen
 * takes a department instead of growing an engineering copy.
 */
import { PERMISSIONS, type Permission } from './rbac/permissions';
import type { HomeVariant } from './rbac/matrix';

export type AssignmentDepartment = 'housekeeping' | 'engineering';

export type AssignmentDepartmentConfig = {
  /** `departments.key`, also `assign_rooms(p_department)`. */
  key: AssignmentDepartment;
  /** The job title rooms are assigned to (the staff picker lists these). */
  assigneeJobTitle: string;
  /** What the assignee is called on cards and pickers. */
  assigneeNoun: { one: string; many: string };
  /** Who may assign, reassign and unassign this department's rooms. */
  assignPermission: Permission;
};

export const ASSIGNMENT_DEPARTMENTS: Record<AssignmentDepartment, AssignmentDepartmentConfig> = {
  housekeeping: {
    key: 'housekeeping',
    assigneeJobTitle: 'housekeeping_room_attendant',
    assigneeNoun: { one: 'Room Attendant', many: 'Room Attendants' },
    assignPermission: PERMISSIONS.ROOMS_REASSIGN,
  },
  engineering: {
    key: 'engineering',
    assigneeJobTitle: 'shift_engineer',
    assigneeNoun: { one: 'Technician', many: 'Technicians' },
    assignPermission: PERMISSIONS.ROOMS_ENGINEERING_ASSIGN,
  },
};

/**
 * The assignment layer a reader works in: engineering's titles see and assign
 * technicians; everyone else sees housekeeping's room attendants.
 */
export function assignmentDepartmentForHomeVariant(homeVariant: HomeVariant | null | undefined): AssignmentDepartment {
  return homeVariant === 'engineering' ? 'engineering' : 'housekeeping';
}

/** `departments.key` → an assignment department, or null for one that assigns no rooms. */
export function asAssignmentDepartment(key: string | null | undefined): AssignmentDepartment | null {
  return key === 'housekeeping' || key === 'engineering' ? key : null;
}
