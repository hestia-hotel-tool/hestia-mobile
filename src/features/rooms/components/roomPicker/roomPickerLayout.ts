/**
 * Geometry for the room picker, in **design units** on the 440-wide artboard.
 *
 * Never multiplied by `scaleX` in this table — the component does that once,
 * at the point of use, so every number here can be read straight off Figma.
 *
 * Measured against node **1102:3287** (Lost & Found → Register, step 1, in
 * frame 733:7). Node **3005:494** (Create Ticket → Select Location) is the
 * same component to the last decimal: both draw a 394 x 90.7627 card under a
 * `Vector 46` tab 16 in from the left, 55.7818 x 20.2187, protruding 7.4726
 * above the card's top edge. Two placements of one design, which is why one
 * component now serves both.
 *
 * Offsets below are relative to the card box, i.e. Figma's absolute value
 * minus the card origin (23, 621.2373) in frame 733:7.
 */
export const ROOM_PICKER_LAYOUT = {
  /**
   * The card stretches to its container rather than pinning 394.
   *
   * 394 is what the frame draws inside a 440 artboard with a 23 gutter, but
   * the two hosts have different gutters (the Register sheet's content box and
   * the ticket screen's 24 padding), and a fixed width would clip in one of
   * them. Height is the frame's, and is a minimum: a long guest name wraps.
   */
  card: {
    minHeight: 90.7627,
    radius: 12,
    /**
     * Blue-grey and broad. The page behind the card is pure white and
     * immediately outside the card it reads `#e5e9f1`, i.e. `rgb(100,131,176)`
     * at ~17% — the same tint the nav shadow token uses. A neutral black
     * shadow at 10% is both too weak and the wrong hue.
     */
    shadowColor: '#6483b0',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffsetY: 4,
  },

  /**
   * The tab on the card's top edge — `Vector 46`, 16 in from the left.
   *
   * **A known approximation.** The frame's tab is a shallow curve 55.7818 wide
   * that rises 7.4726 above the card. What is drawn here is a square turned 45
   * degrees, whose apex is always a right angle, so its width is exactly twice
   * its protrusion — it cannot be both 55.78 wide and 7.47 tall. Width reads
   * as the more noticeable of the two, so the protrusion is inflated to 10 to
   * buy a 20-wide tab.
   *
   * A square, not a border-triangle: in the design the tab and the card are
   * one unioned shape under one shadow, and React Native gives a
   * border-triangle no shadow at all, because it has no background. A
   * shadowless white tab on a white page is invisible — which is exactly how
   * it first rendered. Doing this exactly needs the path as an SVG, and an
   * SVG cannot take the card's `shadow*`.
   *
   * `centerX`, not a left edge: the square is rotated about its own centre, so
   * the only offset that lines it up with the frame is the tab's centre.
   * `Vector 46` spans 16 to 71.78 across the card, centred on 43.89. Taking
   * its *left* edge as the square's left edge puts the apex 15 too far in.
   */
  notch: {
    centerX: 43.89,
    protrusion: 10,
    side: 26,
    radius: 4,
  },

  /** "Room 201" — Helvetica Regular 16 `#5a759d`, at x=64 (41 into the card). */
  roomNumber: {
    paddingLeft: 41,
    fontSize: 16,
  },

  /** `Vector 81` — x=188 (165 into the card), 54 tall, vertically centred. */
  divider: {
    left: 165,
    height: 54,
    color: '#e5e7eb',
  },

  guest: {
    /** Thumb at x=202; the divider sits at 165 and is 1 wide. */
    paddingLeft: 13,
    /** `Rectangle 232`, 34.5882 square, corner 5. */
    thumb: { size: 34.5882, radius: 5 },
    /** Thumb ends at 213.59, the name starts at 228. */
    thumbToText: 14.4,
    /**
     * `Ellipse 97`, 14.1176, hung off the thumb's bottom-right corner: the
     * disc sits at (223.88, 669.71) against a thumb at (202, 645), so it
     * overhangs 1.41 to the right and 4.24 below. The arrow inside it is
     * `guest-arrow` mirrored — the glyph points left, the badge points right.
     */
    vip: { size: 14.1176, right: -1.41, bottom: -4.24, arrow: 6.1172 },
    /** Name 14 bold `#000` at y=646; dates 14 light at y=666. */
    name: { fontSize: 14 },
    rowGap: 3,
    /** VIP code 12 light `#334866`. */
    code: { fontSize: 12, marginLeft: 6 },
    /** Dates end at x=304, the occupancy glyph starts at x=314. */
    dates: { fontSize: 14, marginRight: 10 },
    /** `Group 332` — 13.0001 x 12.0004; "2/2" follows at x=356. */
    occupancy: { width: 13, height: 12, marginRight: 6 },
    count: { fontSize: 14 },
  },

  /**
   * The field that opens the picker.
   *
   * No frame: the design only ever draws the *chosen* state, and both hosts
   * had independently invented the same 50-high bordered field. Carried over,
   * and flagged here so the next reader knows there is nothing to check it
   * against.
   */
  field: {
    height: 50,
    radius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    borderColor: '#e5e7eb',
    chevronBox: 12,
  },

  /**
   * The full-screen picker.
   *
   * This replaced an inline dropdown that both hosts had built: a 400-tall
   * absolutely-positioned menu hanging off the field, inside a ScrollView, in
   * one case inside a Modal as well. It needed `zIndex: 9999` plus
   * `elevation: 12` to sit above the form at all, it clipped at the bottom of
   * the sheet, and its own nested scroll view fought the form's.
   *
   * Numbers follow `ReassignModal` and the header band of
   * `SelectTicketLocationScreen`, which is the app's existing answer to
   * "choose one of these from a long list".
   */
  modal: {
    /** `#e4eefe`, as the Create Ticket and Lost & Found headers use. */
    headerBackground: '#e4eefe',
    /** Below the safe-area inset, matching ROOM_DETAIL_HEADER_LAYOUT. */
    headerSafeAreaGap: 10,
    headerPaddingBottom: 18,
    headerTitleFontSize: 24,
    headerTitleColor: '#607aa1',
    backChevron: 28,
    searchIcon: 22,
    gutter: 24,
    search: {
      height: 46,
      radius: 10,
      fontSize: 15,
      glyph: 16,
      clear: 18,
      /** Reveal/collapse duration in ms. */
      duration: 180,
      marginTop: 12,
    },
    countFontSize: 13,
  },

  list: {
    rowGap: 12,
    paddingTop: 14,
    /** Clear of the home indicator once the safe-area inset is added. */
    paddingBottom: 24,
  },
} as const;
