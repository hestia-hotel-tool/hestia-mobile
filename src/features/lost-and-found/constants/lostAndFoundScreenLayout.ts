/**
 * The chrome around the Lost & Found list — Figma **3128:32**.
 *
 * Design units, never multiplied by `scaleX` here; callers scale at the point of
 * use. Frame is 440x956.
 *
 * This replaces the absolute-position table in `lostAndFoundStyles.ts`, which
 * gave every element a `top` measured from the screen edge —
 * `LOST_AND_FOUND_TABS.container.top = 158`, `indicator.top = 192`,
 * `LOST_AND_FOUND_SPACING.contentPaddingTop = 213`. Those numbers are all
 * *differences* the frame expresses as absolutes, and holding them as absolutes
 * meant the header, the tab row and the scroll content each had to add the safe
 * area inset separately and stay in step by hand. Here they are the gaps they
 * actually are, and the flex column adds them up.
 */
export const LOST_AND_FOUND_SCREEN_LAYOUT = {
  /**
   * Distance from the top of the safe area to the title row.
   *
   * Applied as `insets.top + safeAreaGap`, not as the frame's literal y=69.
   * 3128:32 is notch-naive; on an iPhone 16 Pro the 59pt inset plus this 10
   * reproduces 69 exactly, and on a device with no inset the row simply moves
   * up rather than floating. This is the same value and the same reasoning as
   * `ROOM_DETAIL_HEADER_LAYOUT.safeAreaGap`, from a frame that puts its first
   * row at the same y.
   *
   * What this replaces added the raw `insets.top` to the frame's 69 — but 69
   * already includes the status bar, so the title landed at ~122pt and every
   * constant below it inherited the error.
   */
  safeAreaGap: 10,

  /** Node 3128:119 — the band. Its height is derived, not asserted: see below. */
  header: {
    /** Node 3128:123 — 14x28, so `<Icon size={28}>`. */
    backChevron: 28,
    /** Node 3128:121 — the 32x32 touch target around that chevron. */
    backButton: 32,
    /** Title x=69 against the chevron's x=27. */
    titleGap: 42,
    titleFontSize: 24,
    /** Node 3128:120 — "+ Register" is one text node; the `+` is a character. */
    registerRight: 46,
    registerPlusFontSize: 24,
    registerTextFontSize: 20,
    /**
     * Space below the title row inside the band: the band ends at 133 and the
     * row ends at 97.
     */
    bottomGap: 36,
  },

  /** Band bottom (133) to the tab labels (158). */
  bandToTabs: 25,

  tabRow: {
    /** Labels start at x=32; the search glyph ends at 393, so 47 from the edge. */
    paddingLeft: 32,
    paddingRight: 47,
    fontSize: 16,
    labelHeight: 18,
    /** Labels end at 176, node 3128:43 starts at 192. */
    ruleGap: 16,
    ruleHeight: 4,
    /**
     * The rule is 68 wide under a 60-wide "Created" and starts at the same x.
     * Left-aligned, label width plus 8 — not a fixed 68, which under the
     * 47-wide "Stored" would end at 186, exactly where "Returned" begins.
     */
    ruleOverhang: 8,
    /** Node 3128:34. */
    searchGlyph: 19,
  },

  /** Node 3128:42 — spans x=-4 to 444, i.e. past both screen edges. */
  divider: { height: 1, top: 197 },

  /** Divider at 197, first card at 215. */
  dividerToFirstCard: 18,

  /** Node 3128:124 — the bottom bar the list must clear. */
  listBottomInset: 152,
} as const;

export default LOST_AND_FOUND_SCREEN_LAYOUT;
