/**
 * The fixed pixels of a Lost & Found item card, from Figma **3128:32**.
 *
 * Cards read off nodes `3871:3585` (a room item, stored) and `3871:3619` (a
 * public-area item, shipped). Values are card-relative: the frame gives
 * absolute coordinates, and the card sits at (16, 215), so every `y` below is
 * the frame's minus 215 and every `x` minus 16.
 *
 * **Design units, never multiplied by `scaleX` here.** A 34.588 guest thumb is
 * that size on every device; scaling it against a 440pt frame makes it wrong
 * everywhere except one phone. Callers scale at the point of use, the same rule
 * `ticketCardLayout.ts`, `roomCardLayout.ts` and `roomDetailHeaderLayout.ts`
 * state.
 *
 * Only what the design actually fixes lives here. The frame's 271 card height
 * is **not** below: both cards reach it from different content — one with a
 * 121x115 photo, one with 144x119 — which is the proof it is an outcome of the
 * column rather than a constraint on it.
 */
export const LOST_AND_FOUND_CARD_LAYOUT = {
  /** Node 3871:3586 — 409 wide at x=16 in a 440 frame. */
  gutter: 16,
  radius: 9,

  /**
   * 18, not the 16 the old constant used.
   *
   * Card 1 ends at y=486 (215+271) and card 2 starts at y=504.
   */
  gapBetweenCards: 18,

  /** Content inset: title at x=34, card at x=16. */
  paddingLeft: 18,
  paddingTop: 17,

  /**
   * Where the right-hand column starts, card-relative (frame x=194).
   *
   * One value for "Found In", the guest/public row and the location block,
   * which all share it — as `ROOM_CARD.rightColumn` does. It is also what
   * settles the photo-width disagreement below: 18 + 144 + 16 = 178.
   */
  rightColumn: 178,

  /**
   * Node 3871:3671 — **144x119**, the second card's photo.
   *
   * The first card (3871:3589) draws 121x115 instead. Drift, not intent: both
   * sit at the same x=34 and the same 55 below the card top, and the boxes were
   * drawn around two different mock photographs. 144 is the one that agrees
   * with the right column — 18 + 144 + 16 lands exactly on 178 — so it wins.
   */
  photo: { width: 144, height: 119, radius: 10, top: 55 },

  /** Node 3871:3601 — Helvetica Bold, and the tracking chip follows it in flow. */
  titleFontSize: 18,

  /** Nodes 3871:3602 (tracking), 3871:3615 (room), 3871:3721 (public area). */
  trackingChip: { height: 22, paddingX: 10, paddingY: 3, fontSize: 14 },
  chip: { height: 18, paddingX: 10, paddingY: 4, fontSize: 10 },

  /** Node 3871:3607. */
  guestThumb: { size: 34.588, radius: 5 },
  /** Nodes 3871:3608 / 3871:3609 — the disc and the mirrored arrow inside it. */
  vipDisc: { size: 14.118, glyph: 3.294 },
  /** Nodes 3871:3704 / 3871:3706 — the public-area tile and its glyph. */
  publicTile: { width: 41, height: 38, radius: 5, glyph: 24 },

  /** "Found In" label, card-relative y (frame 274). */
  foundInTop: 59,

  /** Location block — label at frame y=348, value at 366. */
  locationLabelTop: 133,
  locationValueTop: 151,

  /**
   * Node 3871:3593 — 408 wide inside a 409 card, so it runs the full width and
   * cancels the horizontal padding with a negative margin (the `TicketCard`
   * divider idiom).
   */
  divider: { height: 1, top: 184 },

  /**
   * Node 3871:3590 — **28**.
   *
   * Card 2 (3871:3673) draws 33. Drift: the optical centres land at divider+49
   * and divider+48.5, i.e. the same slot at two sizes. 28 also matches
   * `TICKET_CARD_LAYOUT.footerAvatar.creator`, so the two features' footers
   * agree rather than differing by five pixels for no reason.
   */
  footerAvatar: 28,
  footerLabelTop: 194,

  /**
   * Node 3871:3587 / 3871:3621 — the status pill.
   *
   * **Content-hugging, not two fixed widths.** The frame draws 118 under
   * "Stored" and 126 under "Shipped", which looks like two values but is one
   * pill and one label length: both end at x=412 and both put the chevron at
   * x=375.6. Solving for the padding gives 50 from card 1 and 45 from card 2 —
   * the frame disagrees with itself by 5px — so these are the mean. They render
   * 115.4 and 128.4 against the frame's 118 and 126, inside its own spread.
   *
   * Do not "fix" this back to two constants. That would make a mock label's
   * length into an API.
   */
  statusPill: {
    height: 54,
    radius: 75,
    top: 205,
    rightInset: 13,
    paddingLeft: 21,
    gap: 7,
    paddingRight: 19.4,
    fontSize: 16,
    /** Node 3871:3596 — 17x8, a chevron turned down. */
    chevron: { width: 17, height: 8 },
    /** Node 3871:3630 — the tick on a shipped pill. */
    tick: { width: 14, height: 10 },
  },
} as const;

export default LOST_AND_FOUND_CARD_LAYOUT;
