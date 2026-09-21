import type { LostAndFoundStatus } from '../types/lostAndFound.types';

/**
 * Which "Found In" row a card draws.
 *
 * A property of the item, not of its status — an item can be stored *or*
 * shipped from either a room or a public area — so it is a separate axis from
 * `LostAndFoundCardChrome` rather than a field on it.
 */
export type FoundInKind = 'room' | 'publicArea';

export type LostAndFoundCardChrome = {
  /** The word on the pill. */
  pillLabel: string;
  /** Which glyph the pill carries: a tick reads as settled, a chevron as changeable. */
  pillGlyph: 'tick' | 'chevron';
  /** Keys `LOST_AND_FOUND_CARD_THEME`; a tone, not a colour. */
  pillTone: 'stored' | 'shipped' | 'discarded';
  /** The footer's lead-in. Node 3871:3594 vs 3871:3628. */
  footerLabel: string;
  /** The location block's label. Node 3871:3600 vs 3871:3719. */
  locationLabel: string;
  /** Which field of the item the location block reads. */
  locationSource: 'stored' | 'shipped';
  /**
   * The Figma node this row was checked against, or `null` for "inherited from
   * the previous implementation and never verified".
   *
   * A field rather than a comment so it is greppable: `verifiedAgainst: null`
   * is the work queue for the remaining states, and a reviewer cannot skim past
   * it the way they can skim a `// TODO`.
   */
  verifiedAgainst: string | null;
};

/**
 * Per-status structure for an item card — Figma **3128:32**.
 *
 * Structural switches and copy only. Never a colour and never a pixel: those
 * live in `lostAndFoundTheme.ts` and `itemCard/lostAndFoundCardLayout.ts`. The
 * split is not tidiness, it is validity — a pixel is wrong on a device, a colour
 * is wrong in a palette, and a boolean is wrong in a state.
 *
 * **On the vocabulary clash.** The frame's third tab says "Returned" while the
 * card inside that tab says "Shipped By", "Shipped Location" and "Shipped" on
 * the pill. One state, two words. Per the user's decision this matches the frame
 * element by element rather than harmonising: the tab reads Returned, the card
 * reads Shipped. It is a design question, surfaced rather than silently
 * resolved — see also `TAB_STATUS` in the screen.
 */
export const LOST_AND_FOUND_CARD_CHROME: Record<
  LostAndFoundStatus,
  LostAndFoundCardChrome
> = {
  stored: {
    pillLabel: 'Stored',
    pillGlyph: 'chevron',
    pillTone: 'stored',
    footerLabel: 'Stored by',
    locationLabel: 'Stored Location',
    locationSource: 'stored',
    verifiedAgainst: '3871:3585',
  },
  shipped: {
    pillLabel: 'Shipped',
    pillGlyph: 'tick',
    pillTone: 'shipped',
    footerLabel: 'Shipped By',
    locationLabel: 'Shipped Location',
    locationSource: 'shipped',
    verifiedAgainst: '3871:3619',
  },
  /*
   * `returned` renders exactly as `shipped`.
   *
   * Nothing in the app ever writes this value — the union permits it and the DB
   * column is free text, so a row can carry it — and the card has always
   * coalesced the two for display. Sharing the shipped row is what the previous
   * implementation did; it is not separately drawn in any frame.
   */
  returned: {
    pillLabel: 'Shipped',
    pillGlyph: 'tick',
    pillTone: 'shipped',
    footerLabel: 'Shipped By',
    locationLabel: 'Shipped Location',
    locationSource: 'shipped',
    verifiedAgainst: '3871:3619',
  },
  /*
   * **No frame draws a discarded card.** The copy below is carried over from the
   * previous implementation and the tone resolves to a grey that matches no
   * design token (see the theme). `verifiedAgainst: null` is the honest record
   * of that; inventing a node id here would read as provenance.
   */
  discarded: {
    pillLabel: 'Discarded',
    pillGlyph: 'chevron',
    pillTone: 'discarded',
    footerLabel: 'Stored by',
    locationLabel: 'Stored Location',
    locationSource: 'stored',
    verifiedAgainst: null,
  },
};

export default LOST_AND_FOUND_CARD_CHROME;
