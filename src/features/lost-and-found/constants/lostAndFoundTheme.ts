import type { LostAndFoundCardChrome } from './lostAndFoundCardChrome';

/**
 * Colours for an item card's status pill — Figma **3128:32**.
 *
 * Colours only, keyed by the chrome's `pillTone`. Kept apart from
 * `lostAndFoundCardChrome.ts` on the same principle `roomDetailHeaderTheme.ts`
 * and `roomDetailHeaderChrome.ts` are split: a colour is wrong in a palette, a
 * structural switch is wrong in a state, and the two want reviewing by
 * different eyes.
 *
 * Two of the three map onto existing design tokens exactly:
 * - `stored` `#f0be1b` is `--color-status-in-progress`
 * - `shipped` `#41d541` is `--color-status-inspected`
 *
 * They are written as literals rather than token references because the pill is
 * not semantically "in progress" or "inspected" — it happens to share those
 * hexes. Naming the token here would assert a relationship the design does not
 * make, and would silently re-colour these pills if a room-status token moved.
 */
export const LOST_AND_FOUND_CARD_THEME: Record<
  LostAndFoundCardChrome['pillTone'],
  { pill: string; label: string; glyph: string }
> = {
  stored: { pill: '#f0be1b', label: '#ffffff', glyph: '#ffffff' },
  // Node 3871:3621 — #39d47f, not the #41d541 status green it used to borrow.
  shipped: { pill: '#39d47f', label: '#ffffff', glyph: '#ffffff' },
  /*
   * **`#9ca3af` matches no token in the design system**, and no frame draws a
   * discarded pill to check it against. It is carried over from the previous
   * implementation unchanged.
   *
   * `--color-status-out-of-order` (#c6c5c5) is the nearest thing and is what
   * Tickets uses for its grey state, so it is the likely intent — but "likely"
   * is not a frame, and quietly swapping it would be a design decision dressed
   * up as a refactor. The chrome row carries `verifiedAgainst: null` for this.
   */
  discarded: { pill: '#9ca3af', label: '#ffffff', glyph: '#ffffff' },
};

export default LOST_AND_FOUND_CARD_THEME;
