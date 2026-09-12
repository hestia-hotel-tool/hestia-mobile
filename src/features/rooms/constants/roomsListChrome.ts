import type { RoomsVariant } from '@/domain/rbac/matrix';

/**
 * What a Rooms list is made of, for one job-title variant.
 *
 * Four independent switches rather than one `variant === 'supervisor'` test
 * repeated down the screen. They were entangled: the rebuilt card was drawn
 * only where the profile header was, so a role could not take one without the
 * other, and adding a variant meant hunting seventeen call sites.
 *
 * Giving a new role a screen is now a row in the table below.
 */
export type RoomsListChrome = {
  /**
   * The profile band, search field and "Rooms" title, in the flex flow —
   * Figma 3883:5570. Otherwise the legacy `AllRoomsHeader`, absolutely
   * positioned with a back arrow and an "All Rooms" heading.
   */
  profileHeader: boolean;
  /** Banded by housekeeping status, rather than one flat list. */
  banded: boolean;
  /** Only rooms assigned to this user, and a finished/total pill in the header. */
  assignedOnly: boolean;
  /**
   * The rebuilt flex card (`components/roomsList`), rather than the legacy
   * `allRooms/RoomCard` and its absolute `scaleX` geometry.
   */
  rebuiltCard: boolean;
};

export const ROOMS_LIST_CHROME: Record<RoomsVariant, RoomsListChrome> = {
  /** Everyone outside housekeeping operations: a flat list of every room. */
  default: { profileHeader: false, banded: false, assignedOnly: false, rebuiltCard: false },
  /** Housekeeping leadership and supervisors — Figma 3883:5570 / 3838:1117. */
  supervisor: { profileHeader: true, banded: true, assignedOnly: false, rebuiltCard: true },
  /**
   * Room attendants — the banded list narrowed to their own rooms.
   *
   * Still on the legacy card and header: its own frame has not been checked
   * against the rebuild, and neither has the progress pill's placement. Flip
   * these two when it has been.
   */
  attendant: { profileHeader: false, banded: true, assignedOnly: true, rebuiltCard: false },
};

export default ROOMS_LIST_CHROME;
