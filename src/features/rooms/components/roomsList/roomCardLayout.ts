/**
 * The only hard-coded dimensions in the Rooms card tree.
 *
 * Everything else is a Tailwind token or is derived from content. These survive
 * as real pixels because the design fixes them: a 50px disc is a 50px disc on
 * every device, and scaling it against a 440pt frame — which is what the card
 * this replaces did for every single value — makes it wrong everywhere except
 * an iPhone 16 Pro Max.
 *
 * Measured from Figma 3883:5570.
 */
export const ROOM_CARD = {
  /** Node 3883:6124 — the coloured lid on a Paused or In Progress card. */
  cap: { height: 73, disc: 50 },
  /** Node 3883:6417. Radius comes from design-system.json button.status. */
  pill: { width: 134, height: 70 },
  /** Node 3883:6159 — the assignee's photo. */
  assigneeAvatar: 35,
  /** Node 3883:6143 (photo) and 3883:6144 (the arrow disc on its corner). */
  guest: { photo: 49, badge: 20 },
  /** Node 3883:6141 — the tinted panel holding the guest rows and the pill. */
  panelMinHeight: 101,
  /**
   * Width of the right-hand column: the assignee block in the header and the
   * pill slot in the panel.
   *
   * One value for both so they cannot drift apart. The design hand-places the
   * divider at 213/392 on a plain card and 225/422 on a capped one — 54.3% and
   * 53.3% — and the card this replaces encoded that spread as four separate
   * magic lefts (227, 228, 255, 270).
   */
  rightColumn: 168,
} as const;
