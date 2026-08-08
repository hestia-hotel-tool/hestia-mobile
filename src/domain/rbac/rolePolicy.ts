/**
 * Role policy — maps a user's role name to the set of permissions they hold.
 *
 * Mirrors the seed data in public.roles / public.role_permissions. Keep this
 * file in sync with the DB seed (scripts/seedRolesAndPermissions.js) — the DB
 * is the security boundary, this is the client-side UX mirror.
 */
import { PERMISSIONS, type Permission } from './permissions';

export type RoleCategory =
  | 'admin'
  | 'housekeepingSupervisor'
  | 'housekeeping'
  | 'engineering'
  | 'frontOffice'
  | 'night';

export const ROLE_CATEGORY_MAP: Record<string, RoleCategory> = {
  'General Manager': 'admin',
  'Hotel Manager': 'admin',
  'IT Administrator': 'admin',
  'Executive Housekeeper': 'housekeepingSupervisor',
  'Housekeeping Manager': 'housekeepingSupervisor',
  'Assistant Housekeeping Manager': 'housekeepingSupervisor',
  'Senior Supervisor': 'housekeepingSupervisor',
  Supervisor: 'housekeepingSupervisor',
  Coordinator: 'housekeepingSupervisor',
  'Housekeeping Room Attendant': 'housekeeping',
  'Housekeeping Portier / Houseman': 'housekeeping',
  'Housekeeping Laundry Attendant': 'housekeeping',
  'Housekeeping Public Area Attendant': 'housekeeping',
  'Director of Engineering': 'engineering',
  'Engineering Supervisor': 'engineering',
  'Shift Engineer': 'engineering',
  'Director of Rooms': 'frontOffice',
  'Assistant Director of Rooms': 'frontOffice',
  'Director of Front Office': 'frontOffice',
  'Front Office Manager': 'frontOffice',
  'Front Office Supervisor': 'frontOffice',
  'Front Office Agent': 'frontOffice',
  'Front Office Trainee': 'frontOffice',
  'Night Manager': 'night',
  'Night Auditor': 'night',
  'Night Agent': 'night',
};

const p = PERMISSIONS;

const ALL_PERMISSIONS: readonly Permission[] = [
  p.HOME_VIEW,
  p.ROOMS_VIEW,
  p.CHAT_VIEW,
  p.TICKETS_VIEW,
  p.LOST_AND_FOUND_VIEW,
  p.STAFF_VIEW,
  p.SETTINGS_VIEW,
  p.ROOMS_READ,
  p.ROOMS_ASSIGN,
  p.ROOMS_UPDATE_STATUS,
  p.ROOMS_MANAGE_NOTES,
  p.TICKETS_CREATE,
  p.TICKETS_ASSIGN,
  p.TICKETS_UPDATE_STATUS,
  p.CHAT_CREATE,
  p.CHAT_MANAGE_GROUPS,
  p.STAFF_READ,
  p.STAFF_MANAGE,
  p.LOST_AND_FOUND_READ,
  p.LOST_AND_FOUND_REGISTER,
  p.LOST_AND_FOUND_MANAGE,
  p.SETTINGS_MANAGE,
];

/** Supervisors + admins can see staff, settings and manage everything. */
const SUPERVISOR_PERMISSIONS: readonly Permission[] = [
  p.HOME_VIEW,
  p.ROOMS_VIEW,
  p.CHAT_VIEW,
  p.TICKETS_VIEW,
  p.LOST_AND_FOUND_VIEW,
  p.STAFF_VIEW,
  p.SETTINGS_VIEW,
  p.ROOMS_READ,
  p.ROOMS_ASSIGN,
  p.ROOMS_UPDATE_STATUS,
  p.ROOMS_MANAGE_NOTES,
  p.TICKETS_CREATE,
  p.TICKETS_ASSIGN,
  p.TICKETS_UPDATE_STATUS,
  p.CHAT_CREATE,
  p.CHAT_MANAGE_GROUPS,
  p.STAFF_READ,
  p.LOST_AND_FOUND_READ,
  p.LOST_AND_FOUND_REGISTER,
  p.LOST_AND_FOUND_MANAGE,
];

/** Line staff (room attendants, portiers, laundry, public area). */
const HOUSEKEEPING_PERMISSIONS: readonly Permission[] = [
  p.HOME_VIEW,
  p.ROOMS_VIEW,
  p.CHAT_VIEW,
  p.TICKETS_VIEW,
  p.ROOMS_READ,
  p.ROOMS_UPDATE_STATUS,
  p.TICKETS_CREATE,
  p.TICKETS_UPDATE_STATUS,
  p.CHAT_CREATE,
  p.LOST_AND_FOUND_READ,
];

/** Engineering / front office / night — no room assignment, no staff/settings. */
const OPERATIONS_PERMISSIONS: readonly Permission[] = [
  p.HOME_VIEW,
  p.CHAT_VIEW,
  p.TICKETS_VIEW,
  p.LOST_AND_FOUND_VIEW,
  p.ROOMS_READ,
  p.TICKETS_CREATE,
  p.TICKETS_ASSIGN,
  p.TICKETS_UPDATE_STATUS,
  p.CHAT_CREATE,
  p.LOST_AND_FOUND_READ,
  p.LOST_AND_FOUND_REGISTER,
];

const CATEGORY_PERMISSIONS: Record<RoleCategory, readonly Permission[]> = {
  admin: ALL_PERMISSIONS,
  housekeepingSupervisor: SUPERVISOR_PERMISSIONS,
  housekeeping: HOUSEKEEPING_PERMISSIONS,
  engineering: OPERATIONS_PERMISSIONS,
  frontOffice: OPERATIONS_PERMISSIONS,
  night: OPERATIONS_PERMISSIONS,
};

const DEFAULT_PERMISSIONS: readonly Permission[] = [p.HOME_VIEW, p.CHAT_VIEW];

export function getRoleCategory(
  roleName: string | null | undefined
): RoleCategory | null {
  if (!roleName) return null;
  return ROLE_CATEGORY_MAP[roleName] ?? null;
}

export function getPermissionsForRole(
  roleName: string | null | undefined
): readonly Permission[] {
  const category = getRoleCategory(roleName);
  if (!category) return DEFAULT_PERMISSIONS;
  return CATEGORY_PERMISSIONS[category];
}

export function getPermissionSet(
  roleName: string | null | undefined
): ReadonlySet<Permission> {
  return new Set(getPermissionsForRole(roleName));
}

export function roleHasPermission(
  roleName: string | null | undefined,
  permission: Permission
): boolean {
  return getPermissionSet(roleName).has(permission);
}
