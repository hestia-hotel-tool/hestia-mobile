import type { HomeVariant } from '@/domain/rbac/matrix';

/**
 * What a Home screen is made of, for one job-title variant.
 *
 * The same idea as `ROOMS_LIST_CHROME`: the parts that differ between variants
 * expressed as a table, so giving a role a screen is a row rather than another
 * `homeVariant === '…'` test somewhere down the file.
 *
 * Only the switches that currently differ are here. The body of the screen is
 * still a branch in `HomeScreen`, because the three bodies share almost nothing
 * — unlike the Rooms list, where every variant renders the same cards.
 */
export type HomeChrome = {
  /**
   * What the search field looks through.
   *
   * Engineering has no Rooms tab and no room detail route, so a field searching
   * rooms and guests would return records the reader cannot open. Figma 3843-52
   * draws the housekeeping pill verbatim, placeholder included; that reads as
   * the frame being duplicated rather than a decision to search rooms.
   */
  searchTarget: 'rooms' | 'tickets';
  /**
   * The pill's height. Node 3856:998 is 331x68 — the tall variant, as on the
   * Rooms screen, where the housekeeping Home uses the short one.
   */
  searchSize: 'default' | 'large';
  /**
   * Whose tickets the dashboard summarises, or `null` for the housekeeping
   * category dashboard.
   *
   * The department's **display name**, because that is what a ticket carries:
   * `category` is set from `departments.name` in the tickets service, and the
   * Tickets screen's own `category` param is matched against the same field.
   * One value therefore drives both the counts here and the filter the stat
   * circles navigate to. Compared case-insensitively at both ends, so it has to
   * match `matrix.json`'s department name but not its casing.
   */
  ticketDepartment: string | null;
};

export const HOME_CHROME: Record<HomeVariant, HomeChrome> = {
  /** Housekeeping and everyone else — Figma 2702:3231. */
  default: {
    searchTarget: 'rooms',
    searchSize: 'default',
    ticketDepartment: null,
  },
  /** Engineering's ticket dashboard — Figma 3843-52. */
  engineering: {
    searchTarget: 'tickets',
    searchSize: 'large',
    ticketDepartment: 'Engineering',
  },
  /**
   * In Room Dining's ticket dashboard — Figma 3859:3355.
   *
   * The engineering frame with the header text changed: same "Tickets
   * Overview" title, same {n} Tickets card over Priority / Unsolved / Solved /
   * Out of Order, same Recent activity list and Load more.
   *
   * `searchTarget` is the one real difference, and it is not a duplicated
   * frame this time. Engineering searches tickets because it has no Rooms tab,
   * so a field offering rooms and guests would return records the reader cannot
   * open. Dining does have a Rooms tab, and 3859:3355 draws the rooms
   * placeholder — so here the rooms pill is the design, not an artefact of
   * copying it.
   */
  dining: {
    searchTarget: 'rooms',
    searchSize: 'large',
    ticketDepartment: 'In Room Dining',
  },
  /**
   * The porter's task dashboard.
   *
   * Currently unreachable: `hk_houseman` lost `tab.home.view` when the
   * attendant titles were moved to a Rooms-only workflow, and it is the only
   * title carrying this variant. The row stays so the `Record` remains
   * exhaustive and the screen still resolves if the right comes back.
   */
  hsk_portier: {
    searchTarget: 'rooms',
    searchSize: 'default',
    ticketDepartment: null,
  },
};

export default HOME_CHROME;
