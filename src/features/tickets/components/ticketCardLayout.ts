/**
 * The fixed pixels of a ticket card, from Figma 667-3068.
 *
 * **Design units, never multiplied by `scaleX` here.** A 34.588 guest thumb is
 * that size on every device; scaling it against a 440pt frame makes it wrong
 * everywhere except one phone. Callers scale at the point of use, the same rule
 * `roomCardLayout.ts` and `roomDetailHeaderLayout.ts` state.
 *
 * Only the dimensions the design actually fixes live here. Heights fall out of
 * the flex column rather than being asserted — the frame's 216 (no photos) and
 * 335 (with photos) are content heights, not constraints, which is exactly why
 * neither appears below.
 */
export const TICKET_CARD_LAYOUT = {
  /**
   * Node 866:524. The card is 409 wide at x=16 in a 440 frame, so its right
   * edge is 425 and the right margin is 15. It is **not** a fixed 409 in code:
   * `409 + 16 + 16` is 441, one pixel wider than the frame it came from, which
   * is why the old card clipped inside any padded container. The card stretches
   * inside a 16pt gutter instead and lands on 408.
   */
  gutter: 16,
  radius: 9,
  gapBetweenCards: 16,

  /** Content inset: title starts at x=38, card at x=16. */
  paddingHorizontal: 22,
  paddingTop: 18,
  paddingBottom: 14,

  /** Node 866:555 — Helvetica Bold 27. */
  titleFontSize: 27,

  /** Node 3129:1139 — the red room chip beside the title. */
  roomBadge: { height: 34, radius: 7, fontSize: 24, paddingHorizontal: 14 },

  /** Node 3147:55 — the pale disc holding the thumb and its chevron. */
  statusPill: { width: 67, height: 44, radius: 75, glyph: 17, chevron: 10 },

  /** Node 3129:931 — the square guest thumb. */
  guestThumb: { size: 34.588, radius: 5 },

  /** Node 3129:1096 — runs the full card width, so it cancels the padding. */
  divider: { height: 1 },

  /** Nodes 3129:1098-1100 — three tiles, 14 apart. */
  photo: { width: 115, height: 114, radius: 5, gap: 14 },

  /**
   * Node 3129:994 — the band behind the creator→assignee row, which the card
   * did not draw at all. 392 wide inside a 409 card, so it insets 8.5 either
   * side of the content box rather than aligning with it.
   */
  footerBand: { height: 67, radius: 8, inset: 9 },

  /** Nodes 3129:1123 / 3129:1127 — the two people. The design sizes them apart. */
  footerAvatar: { creator: 28, assignee: 27 },
  /** Node 3129:1130. Height drives width off the glyph's own aspect. */
  footerArrowHeight: 10,
} as const;

export default TICKET_CARD_LAYOUT;
