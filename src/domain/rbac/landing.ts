/**
 * Where the app opens.
 *
 * Not every role can see the Dashboard — F&B and Kitchen staff have Chat,
 * Tickets, Lost & Found and Settings only. Rather than hardcoding a fallback,
 * we walk the tab order and take the first tab the user actually holds, so this
 * stays correct for any role the spec grows.
 */
import { TAB_ORDER, TAB_PERMISSION } from './permissions';
import type { Permission } from './permissions';

/** Tab id → the route to push for it. */
export const TAB_ROUTE: Record<string, string> = {
  Home: '/(tabs)/(home)',
  Rooms: '/(tabs)/(rooms)',
  Chat: '/(tabs)/(chats)',
  Tickets: '/(tabs)/(tickets)',
  LostAndFound: '/(tabs)/(lost_and_found)',
  Staff: '/(tabs)/(staff)',
  Settings: '/(tabs)/(settings)',
};

/**
 * The first tab route the user may open, or `null` when they hold no tab
 * permission at all — that means an unassigned account, and the caller should
 * show an explanation rather than redirect into a loop.
 */
export function resolveLandingRoute(permissions: ReadonlySet<Permission>): string | null {
  for (const tabId of TAB_ORDER) {
    const required = TAB_PERMISSION[tabId];
    if (required && permissions.has(required)) {
      const route = TAB_ROUTE[tabId];
      if (route) return route;
    }
  }
  return null;
}
