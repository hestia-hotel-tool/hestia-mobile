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
};

export const HOME_CHROME: Record<HomeVariant, HomeChrome> = {
  /** Housekeeping and everyone else — Figma 2702:3231. */
  default: {
    searchTarget: 'rooms',
    searchSize: 'default',
  },
  /** Engineering's ticket dashboard — Figma 3843-52. */
  engineering: {
    searchTarget: 'tickets',
    searchSize: 'large',
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
  },
};

export default HOME_CHROME;
