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
  /**
   * Pin the In Progress band to the top, so the rooms being worked right now
   * stay in reach while the rest of the list scrolls under them.
   *
   * Figma marks the In Progress card `sticky top-0` (node 3838:1572). This is
   * the single difference between `leadership` and `supervisor`.
   */
  stickyInProgress: boolean;
  /**
   * Front Office's dress for the banded list (Figma 3859:1919): a coloured
   * status cap on Paused and In Progress cards, the other bands' cards in a
   * tray, minutes in place of credits, and pills without the menu chevron.
   */
  frontOffice: boolean;
  /**
   * The shift's linen workload under the title — departures, linen stayovers
   * and arrivals, each a one-tap filter — and a "View only" chip beside it, for
   * readers who work from the list without acting on it (`LinenSummary`).
   */
  linenSummary: boolean;
};

export const ROOMS_LIST_CHROME: Record<RoomsVariant, RoomsListChrome> = {
  /**
   * Everyone outside housekeeping operations: a flat list of every room, drawn
   * with the same Figma 3883:5570 card as Housekeeping (client feedback,
   * 2026-10-27: the legacy card's sizes, icons and weights did not match).
   */
  default: {
    profileHeader: false,
    banded: false,
    assignedOnly: false,
    rebuiltCard: true,
    stickyInProgress: false,
    frontOffice: false,
    linenSummary: false,
  },
  /** Housekeeping leadership — Figma 3883:5570. */
  leadership: {
    profileHeader: true,
    banded: true,
    assignedOnly: false,
    rebuiltCard: true,
    stickyInProgress: false,
    frontOffice: false,
    linenSummary: false,
  },
  /**
   * Supervisors — Figma 3838:1117. The same screen as `leadership` bar one
   * column: they work the floor from this list, so In Progress stays pinned.
   */
  supervisor: {
    profileHeader: true,
    banded: true,
    assignedOnly: false,
    rebuiltCard: true,
    stickyInProgress: true,
    frontOffice: false,
    linenSummary: false,
  },
  /**
   * The attendant titles — Room Attendant, Porter/Houseman, Laundry and Public
   * Area. Figma 3838-1623: the same banded screen as leadership, narrowed to
   * the rooms assigned to the reader and carrying a finished/total pill beside
   * the title. These titles have no Home tab, so this is where they land.
   *
   * `profileHeader` and `rebuiltCard` were held back until that frame could be
   * checked against the rebuild; it has been, and it is the same screen.
   */
  attendant: {
    profileHeader: true,
    banded: true,
    assignedOnly: true,
    rebuiltCard: true,
    stickyInProgress: false,
    frontOffice: false,
    linenSummary: false,
  },
  /**
   * The whole Front Office department — Figma 3859:1919. Leadership's banded
   * list of every room, dressed as `frontOffice` describes.
   */
  front_office: {
    profileHeader: true,
    banded: true,
    assignedOnly: false,
    rebuiltCard: true,
    stickyInProgress: false,
    frontOffice: true,
    linenSummary: false,
  },
  /**
   * Laundry Attendants. Rooms are never assigned to them, so they read every
   * room on the shift that is on now (no AM/PM toggle — useShiftLock), banded
   * like leadership's list. They cannot change a status or assign anyone: the
   * pill is a status badge, the card has no assign action. What they need from
   * the list is the linen run, so the shift's departures, linen stayovers and
   * arrivals sit above it.
   */
  laundry: {
    profileHeader: true,
    banded: true,
    assignedOnly: false,
    rebuiltCard: true,
    stickyInProgress: false,
    frontOffice: false,
    linenSummary: true,
  },
};

export default ROOMS_LIST_CHROME;
