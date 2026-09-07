/**
 * Typed view over the RBAC matrix.
 *
 * `matrix.json` is the single source of truth for roles, job titles and
 * permissions. It is parsed out of the signed-off spec
 * (`docs/spec/hestia-roles-2026-01-03.pdf`) by `scripts/rbac/parse-spec.py`,
 * and turned into `permissions.ts` + the Supabase seed migration by
 * `scripts/generateRbac.js`. Nothing here is hand-maintained.
 *
 * 54 job titles collapse to 11 distinct permission profiles: 20 titles across
 * Front Office, Concierge and In-Room Dining share an identical row, Engineering
 * and IT match each other, and the 6 senior Housekeeping titles match the 3
 * executive ones. Modelling one role per title would mean 972 hand-kept cells;
 * this is 208.
 *
 * At runtime the database is authoritative — the client reads the caller's real
 * permission set from `get_my_permissions()`. This file is what seeds it, and
 * what gives the app compile-time-safe permission keys.
 *
 * Same pattern as `design-system.json` + `src/theme/index.ts`.
 */

// @ts-ignore - JSON import
import matrix from './matrix.json';

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export interface PermissionDefinition {
  key: string;
  description: string;
}

export const PERMISSIONS_LIST: readonly PermissionDefinition[] = matrix.permissions;

/** Every permission key, in spec order. */
export const PERMISSION_KEYS: readonly string[] = PERMISSIONS_LIST.map((p) => p.key);

/**
 * Keys the spec does not distinguish (it has no admin column). Granted to
 * `full_access` only, kept explicit so every other grant still verifies 1:1
 * against the signed-off matrix.
 */
export const ADMIN_ONLY_PERMISSIONS: readonly string[] = matrix.adminOnlyPermissions;

// ---------------------------------------------------------------------------
// Rights — the 18 columns of the signed-off matrix
// ---------------------------------------------------------------------------

export interface RightDefinition {
  /** Camel-case id, e.g. `changeHousekeepingStatus`. */
  key: string;
  /** Column heading as written in the spec, e.g. "Change Housekeeping Status". */
  label: string;
  /**
   * The permission keys this column grants. One spec column can expand to
   * several keys: the spec is a single YES/NO per feature, but we split view
   * from write so the schema can express "may read notes, may not add one"
   * later without a migration. Today both halves are granted together.
   */
  permissions: readonly string[];
}

export const RIGHTS: readonly RightDefinition[] = matrix.rights;

// ---------------------------------------------------------------------------
// Departments, roles, job titles
// ---------------------------------------------------------------------------

export interface DepartmentDefinition {
  key: string;
  name: string;
  description: string;
}

export const DEPARTMENTS: readonly DepartmentDefinition[] = matrix.departments;

export interface RoleDefinition {
  key: string;
  name: string;
  description: string;
  /** How many job titles map onto this role. Informational. */
  titleCount: number;
  /** The 18 spec columns, keyed by `RightDefinition['key']`. */
  rights: Record<string, boolean>;
}

export const ROLES: readonly RoleDefinition[] = matrix.roles;

/** Which HomeScreen layout a person sees. A presentation concern, not a right. */
export type HomeVariant = 'default' | 'engineering' | 'hsk_portier';

/**
 * Which Rooms list a person sees. Same idea as `HomeVariant` — it describes how
 * someone works, not what they may do, so two titles can share a role and still
 * differ here.
 *
 * `default` is the flat list. `supervisor` groups by housekeeping status and
 * pins In Progress to the top (Figma 3838:1117). `attendant` is that same banded
 * list narrowed to the rooms assigned to the person reading it, with a
 * finished/total counter (Figma 3838:1623).
 */
export type RoomsVariant = 'default' | 'supervisor' | 'attendant';

export interface JobTitleDefinition {
  key: string;
  name: string;
  /** `DepartmentDefinition['key']` */
  department: string;
  /** `RoleDefinition['key']` */
  role: string;
  homeVariant: HomeVariant;
  roomsVariant: RoomsVariant;
}

export const JOB_TITLES: readonly JobTitleDefinition[] = matrix.jobTitles as readonly JobTitleDefinition[];

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

/** Flatten a role's 18 rights into the permission keys it grants. */
export function permissionsForRole(role: RoleDefinition): string[] {
  const keys = new Set<string>();

  for (const right of RIGHTS) {
    if (!role.rights[right.key]) continue;
    for (const key of right.permissions) keys.add(key);
  }

  if (role.key === 'full_access') {
    for (const key of ADMIN_ONLY_PERMISSIONS) keys.add(key);
  }

  return [...keys];
}

export function findRole(key: string): RoleDefinition | undefined {
  return ROLES.find((r) => r.key === key);
}

export function findJobTitle(key: string): JobTitleDefinition | undefined {
  return JOB_TITLES.find((t) => t.key === key);
}
