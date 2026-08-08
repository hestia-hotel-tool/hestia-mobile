/**
 * Canonical permission keys for Hestia.
 *
 * This is the client-side mirror of the RBAC model enforced server-side
 * (public.roles → public.role_permissions → public.permissions, plus RLS).
 * The database is the source of truth for SECURITY; this list is the source
 * of truth for UI gating (tabs, actions, buttons) so the app never has to
 * hardcode role names in screens.
 *
 * Convention: `<domain>.<action>` — e.g. `rooms.assign`.
 * Tab visibility uses the `tab.*` namespace.
 */
export const PERMISSIONS = {
  // --- Tab visibility -----------------------------------------------------
  HOME_VIEW: 'tab.home.view',
  ROOMS_VIEW: 'tab.rooms.view',
  CHAT_VIEW: 'tab.chat.view',
  TICKETS_VIEW: 'tab.tickets.view',
  LOST_AND_FOUND_VIEW: 'tab.lost_and_found.view',
  STAFF_VIEW: 'tab.staff.view',
  SETTINGS_VIEW: 'tab.settings.view',

  // --- Rooms ---------------------------------------------------------------
  ROOMS_READ: 'rooms.read',
  ROOMS_ASSIGN: 'rooms.assign',
  ROOMS_UPDATE_STATUS: 'rooms.status.update',
  ROOMS_MANAGE_NOTES: 'rooms.notes.manage',

  // --- Tickets -------------------------------------------------------------
  TICKETS_CREATE: 'tickets.create',
  TICKETS_ASSIGN: 'tickets.assign',
  TICKETS_UPDATE_STATUS: 'tickets.status.update',

  // --- Chat ----------------------------------------------------------------
  CHAT_CREATE: 'chat.create',
  CHAT_MANAGE_GROUPS: 'chat.groups.manage',

  // --- Staff ---------------------------------------------------------------
  STAFF_READ: 'staff.read',
  STAFF_MANAGE: 'staff.manage',

  // --- Lost & Found ---------------------------------------------------------
  LOST_AND_FOUND_READ: 'lost_and_found.read',
  LOST_AND_FOUND_REGISTER: 'lost_and_found.register',
  LOST_AND_FOUND_MANAGE: 'lost_and_found.manage',

  // --- Settings ------------------------------------------------------------
  SETTINGS_MANAGE: 'settings.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Permission keyed by tab id, used by the tab bar / navigation gating. */
export const TAB_PERMISSION: Record<string, Permission> = {
  Home: PERMISSIONS.HOME_VIEW,
  Rooms: PERMISSIONS.ROOMS_VIEW,
  Chat: PERMISSIONS.CHAT_VIEW,
  Tickets: PERMISSIONS.TICKETS_VIEW,
  LostAndFound: PERMISSIONS.LOST_AND_FOUND_VIEW,
  Staff: PERMISSIONS.STAFF_VIEW,
  Settings: PERMISSIONS.SETTINGS_VIEW,
};
