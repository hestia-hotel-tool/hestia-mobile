/**
 * Which permission each route requires.
 *
 * This is the whole point of route-level gating: a screen should never ask
 * "may I be here?", because it cannot be reached without the permission listed
 * here. Screens are then free to worry only about which of their optional
 * elements are switched on.
 *
 * It also closes a real hole. Hiding a tab button never stopped anything —
 * deep links (`hestia://room/<uuid>`) and the push-notification router in
 * `app/_layout.tsx` navigate straight past the tab bar.
 *
 * Keyed by expo-router segment path. Add a route here the moment you add it to
 * `app/`; anything under a guarded prefix inherits its requirement.
 */
import { PERMISSIONS } from './permissions';
import type { Permission } from './permissions';

export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  // Tab groups
  '(tabs)/(home)': PERMISSIONS.HOME_VIEW,
  '(tabs)/(rooms)': PERMISSIONS.ROOMS_VIEW,
  '(tabs)/(chats)': PERMISSIONS.CHAT_VIEW,
  '(tabs)/(tickets)': PERMISSIONS.TICKETS_VIEW,
  '(tabs)/(lost_and_found)': PERMISSIONS.LOST_AND_FOUND_VIEW,
  '(tabs)/(staff)': PERMISSIONS.STAFF_VIEW,
  '(tabs)/(settings)': PERMISSIONS.SETTINGS_VIEW,

  // Room detail and its siblings read room data.
  'room': PERMISSIONS.ROOMS_READ,
  'arrival-departure': PERMISSIONS.ROOMS_READ,

  // Assigning is a distinct right — most roles can open a room but not reassign it.
  'assign-rooms': PERMISSIONS.ROOMS_REASSIGN,

  // Chat
  'chat': PERMISSIONS.CHAT_VIEW,
  'new-chat': PERMISSIONS.CHAT_CREATE,
  'create-chat-group': PERMISSIONS.CHAT_GROUPS_MANAGE,

  // Tickets
  'create-ticket': PERMISSIONS.TICKETS_CREATE,
  'create-ticket-form': PERMISSIONS.TICKETS_CREATE,
  'select-ticket-location': PERMISSIONS.TICKETS_CREATE,
};

/**
 * Routes any signed-in user may open, whatever their role. Listed explicitly so
 * that "not in ROUTE_PERMISSIONS" never silently means "allowed".
 */
export const UNGATED_ROUTES: ReadonlySet<string> = new Set([
  'index', // splash — it is what decides where to send you
  '(auth)',
  'user-profile', // your own profile
]);

/**
 * The permission the given route segments require.
 *
 * Returns `undefined` when the route is explicitly ungated, and `null` when the
 * route is unknown — callers must treat `null` as denied, so forgetting to
 * register a new screen fails closed rather than exposing it.
 */
export function resolveRoutePermission(
  segments: readonly string[]
): Permission | undefined | null {
  if (segments.length === 0) return undefined; // splash

  const path = segments.join('/');

  if (UNGATED_ROUTES.has(segments[0])) return undefined;

  // Longest prefix wins, so '(tabs)/(rooms)' beats a hypothetical '(tabs)'.
  let match: string | null = null;
  for (const key of Object.keys(ROUTE_PERMISSIONS)) {
    if (path === key || path.startsWith(`${key}/`)) {
      if (!match || key.length > match.length) match = key;
    }
  }

  if (match) return ROUTE_PERMISSIONS[match];

  // `(tabs)` on its own is the group shell before a child resolves.
  if (path === '(tabs)') return undefined;

  return null; // unknown route — deny
}
