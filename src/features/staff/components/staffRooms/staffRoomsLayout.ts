/**
 * The fixed pixels of the Staff Rooms screen — Figma 3810:173.
 *
 * **Design units, never multiplied by `scaleX` here** — the rule every other
 * layout table in this codebase states. Callers scale at the point of use.
 *
 * Small on purpose: everything below the title is the Rooms list's own
 * geometry (`roomCardLayout.ts`, `RoomGroupHeader`), reached by reusing those
 * components rather than restating their numbers.
 */
export const STAFF_ROOMS_LAYOUT = {
  /** Node 3810:674 — the back chevron sits at x=27; "Rooms" at x=30. */
  gutter: 27,

  /** Node 3810:664 — the band, 440x133. */
  header: {
    /**
     * Below the safe-area inset, the `RoomDetailHeader` / `StaffHeader` idiom.
     *
     * Not the frame's literal y=63: that number already contains a status bar
     * of whatever height the design file assumed, so hard-coding it puts the
     * row under the Dynamic Island on a device whose inset differs.
     */
    safeAreaGap: 10,
    paddingBottom: 18,
    /** Node 3810:674 — 14x28. `Icon size` sets height, so 28. */
    backChevron: 28,
    /** Chevron ends x=41, the avatar starts x=67. */
    chevronToIdentity: 26,
    /**
     * Node 3810:691 — 143x44, fully round, white on the band.
     *
     * Its 44 height is also what sets the band's: the identity row is 36 and
     * the chevron 28. Kept as a min-height on the row so the band does not
     * change height if the pill is ever hidden — the lesson from the Staff
     * header's + .
     */
    reassign: { width: 143, height: 44, radius: 22, fontSize: 16 },
    /**
     * Node 4361:6082 — the action pill as 4361:5629 draws it: 151x70, radius
     * 45, "Unassign" bold 19 in #eef2f7, 16 in from its left, ending at x=409
     * (31 from the edge). Taller than the row, so it hangs from the band: its
     * top is y=42, 27 above the row's start. `reassign.height` above still
     * sizes the band, which stays the frame's 133.
     */
    actionPill: { width: 151, height: 70, radius: 45, fontSize: 19, color: '#eef2f7', paddingLeft: 16, right: 31, liftAboveRow: 27 },
  },

  /** Node 3820:75 — "Rooms", 99x33 at (30,161). */
  title: {
    fontSize: 33,
    marginTop: 28,
    marginBottom: 12,
    /** Node 3831:586 — "Reassign Rooms", 26 tall. Smaller than "Rooms". */
    reassignFontSize: 26,
    /** Node 3831:1054 — "Touch to select rooms", 18 tall at y=186. */
    subtitleFontSize: 15,
    subtitleMarginTop: 6,
  },

  /**
   * Reassign mode — Figma 3831:99.
   *
   * The same screen with a selection column down the left: the cards shift from
   * x=25 to x=86 and a 37 checkbox sits at x=19, **vertically centred on the
   * card**. Centred is measured, not assumed — across the frame's eight cards
   * the checkbox's centre lands within 9 units of each card's, and the two
   * agree to within 2 on the tallest and the shortest.
   */
  reassign: {
    /**
     * Node 4361:6099 — a square 29x28 box at x=25, 1pt outline, no radius;
     * the card follows at x=71, so 17 between them. Top-aligned with the card
     * rather than centred: its top sits 12 below the card's (288 vs 276).
     * The tick (4361:6101) is 15x11.
     */
    checkbox: { width: 29, height: 28, left: 25, gapToCard: 17, topOffset: 12, borderWidth: 1, tick: { width: 15, height: 11 } },
    /** Node 4361:6107 — 373x71, square corners, "Unassign" semibold 16; Cancel
     *  (4361:6106) light 16, 17 below. */
    footer: {
      buttonWidth: 373,
      buttonHeight: 71,
      buttonFontSize: 16,
      cancelFontSize: 16,
      cancelMarginTop: 17,
      paddingTop: 16,
      paddingBottom: 16,
    },
  },

  list: {
    /**
     * 24, **not** the 152 the Staff roster uses.
     *
     * That number is `BottomTabBar`'s height, and this screen has no tab bar:
     * it is pushed onto the root stack (`app/staff-rooms/`), outside `(tabs)`,
     * exactly as the frame draws it. The home indicator is cleared with the
     * safe-area inset at the point of use instead.
     */
    paddingBottom: 24,
    /** Node 3810:428 — cards inset 9 and stacked 16 apart, as the Rooms list. */
    cardSlot: { paddingHorizontal: 9, paddingBottom: 16 },
  },
} as const;

/**
 * Colours, sampled from the frame.
 *
 * Kept apart from the geometry above for the reason the rest of this feature
 * does: a value that is not a token has to say so where it is declared.
 */
export const STAFF_ROOMS_CHROME = {
  /**
   * `#eef2f7` — **not** `surface-header` (`#e4eefe`), and not the Rooms tab's
   * own profile header either (`#e3e8f0`). Three nearly-identical greys across
   * three frames; this one is what 3810:173 draws, and the value already
   * appears in `FlagToggle` and `TicketsScreen`. Worth reconciling into a token
   * one day, which is a design decision rather than a rendering one.
   */
  headerBackground: '#eef2f7',
  /** Node 3810:692 — white pill, `ink-accent` label. */
  reassignBackground: '#ffffff',
  reassignLabel: '#5a759d',
  /** Node 3820:75 — plain black, not `ink-primary`'s #1e1e1e. */
  title: '#000000',
  /** Reassign mode — nodes 3831:1059 (ring and tick) and 3831:1078 (bar). */
  selectRing: '#5a759d',
  /** 4361:6099 / 6101 — the square box's outline and tick. */
  selectBox: '#1e1e1e',
  assignBar: '#5a759d',
  assignLabel: '#ffffff',
  cancelLabel: '#5a759d',
} as const;

export default STAFF_ROOMS_LAYOUT;
