/**
 * The fixed pixels of the Staff screen, from Figma 3240:561.
 *
 * **Design units, never multiplied by `scaleX` here.** A 55.482 department disc
 * is that size on every device; scaling it against a 440pt frame makes it wrong
 * everywhere except one phone. Callers scale at the point of use — the rule
 * `ticketCardLayout.ts`, `roomCardLayout.ts` and `roomPickerLayout.ts` state.
 *
 * Only what the design actually fixes. The On Shift card's 218 height is
 * deliberately absent: it falls out of the column, and asserting it would clip
 * the moment a guest name wraps or the user raises their type size.
 */
/*
 * **Spacing was measured against the frame, not estimated.**
 *
 * A first pass eyeballed these and came out 5-12 units tight on almost every
 * vertical gap — the screen read as cramped without any single value looking
 * wrong. Each number below was then set from the delta between the rendered
 * screenshot and Figma, band by band, so the rhythm matches rather than
 * approximates.
 */
export const STAFF_LIST_LAYOUT = {
  /** Content gutter. The frame is inconsistent — see `compactRow.paddingLeft`. */
  gutter: 25,

  /** Node 3240:713 — the blue band. */
  header: {
    /** Below the safe-area inset, the `RoomDetailHeader` idiom. */
    safeAreaGap: 10,
    paddingBottom: 18,
    backChevron: 28,
    /** Node 3240:715 — Helvetica Bold 24 `#607aa1`, x=69 against a chevron box ending at 55. */
    titleFontSize: 24,
    titleMarginLeft: 14,
    /**
     * 54 — the height of the + the band no longer draws.
     *
     * Node 3241:795 was a 54 disc, and it is what set the blue band's height:
     * the back chevron is 28 and the title's line box smaller still. Deleting
     * the control without this would shrink the band by 26 units and shift the
     * whole screen up, which is a change to the design rather than the removal
     * of one control. The band keeps the proportions the frame drew.
     */
    contentMinHeight: 54,
  },

  /** Node 3883:6783 — "Departments", 26 tall at x=27,y=153. */
  departments: {
    headingFontSize: 20,
    headingMarginTop: 20,
    /** Node 3883:6744 — the disc. Fully round, so radius is size/2. */
    disc: 55.482,
    /** Gap from the disc to its label (3883:6750 sits 76 from the group top). */
    discToLabel: 17,
    labelFontSize: 14,
    /** For a department with no registry glyph; see StaffDepartmentStrip. */
    fallbackInitialsFontSize: 18,
    gap: 26,
    /**
     * A ceiling on the chip, so the discs keep a sane pitch.
     *
     * The chip is as wide as its label, which is invisible in the frame — every
     * name it draws is short (HSK 33, Engineering 79, In Room Dining 119.65,
     * Laundry 63, Concierge 75, Reception 76). The real table has
     * "Food & Beverage / Kitchen" and "Executive and Administration", which
     * blew the pitch out to 280 and then 435 device px between disc centres and
     * left the strip looking broken.
     *
     * 120 clears the frame's own widest label, so nothing it draws changes; only
     * the two names it never anticipated wrap to a second line.
     */
    maxChipWidth: 120,
    /** Two lines, then ellipsis — enough for the longest real name. */
    labelLines: 2,
    marginTop: 28,
    marginBottom: 29,
  },

  /** Nodes 3883:6785 (y=330) and 3240:571 (y=391) — both full bleed, x=-8..440. */
  tabRow: {
    /**
     * 7 — to the **field**, not to the labels.
     *
     * The row is as tall as its tallest child, and that is the 38pt search
     * field (379..417), not the 18pt labels (389..407). Measuring the frame's
     * divider-to-label distance (17) and applying it as the row's padding
     * stacked 17 on top of a 38 box and pushed everything 10 too low. The
     * field starts 7 below the divider; the labels then centre within it and
     * land at the frame's 389 on their own.
     */
    paddingTop: 7,
    /** Node 3240:573 — now **49**x4 at x=33, was 68 at x=28. */
    ruleWidth: 49,
    ruleHeight: 4,
    /**
     * 6 — field bottom (417) to rule top (423), for the same reason: the gap
     * hangs off the row's box, which the field defines.
     */
    ruleGap: 6,
    /** AM ends x=68, PM starts x=111. */
    labelGap: 43,
    fontSize: 16,
    /**
     * The row is inset past the gutter.
     *
     * "AM" starts at x=43 while the section header sits at 29 and
     * "Departments" at 27 — the gutter did not move, the tab row is indented
     * within it. The search field's right edge is 427 of 440, a 13 inset,
     * tighter than the gutter on the other side.
     */
    paddingLeft: 43,
    paddingRight: 13,
    /**
     * Node 4211:623 — a field now, not the bare glyph it replaced, and it
     * sits *beside* the tabs rather than replacing them, so there is no
     * expand/collapse state any more.
     */
    search: {
      width: 233,
      height: 38,
      radius: 60,
      background: 'rgba(217,217,217,0.19)',
      /** Node 3240:563 — 14 square at x=215 against a field starting at 194. */
      glyph: 14,
      glyphInset: 21,
      /** Node 4211:622 — "Search staff" 16px at x=242. */
      fontSize: 16,
      textInset: 48,
    },
  },

  /** Nodes 3240:705 / 706 — "<Dept> Staff and Shifts" and the count. */
  /**
   * Nodes 4211:621 / 3240:705 / 3240:706 — **now above the tab row**, y=332,
   * where it used to sit below it at y=427.
   */
  sectionHeader: {
    fontSize: 16,
    /**
     * Measured, not taken from the frame's 332 − 289 = 43.
     *
     * The chip labels' own line box already carries part of that gap, so 43
     * rendered 19 too wide. This is the residual.
     */
    marginTop: 24,
    /** Header ends 353; the divider is at 372. */
    marginBottom: 19,
  },

  /** Node 3831:94 — a centred label with a rule each side. */
  groupHeading: {
    /** Inter Bold 18. */
    fontSize: 18,
    /** Rules run 38..160 and 283..402, so each is 122 of a 364 span. */
    ruleWidth: 122,
    /** Label baseline to rule: 493 − 481. */
    labelToRule: 12,
    gapAroundLabel: 17,
    /** Divider 3240:571 at y=427 to the label at y=460. */
    marginTop: 33,
    /** Label ends 482; the first entry starts 516. */
    marginBottom: 34,
  },

  /** Node 3809:147 — (25,532) 401 wide. Height is an outcome. */
  card: {
    radius: 12,
    /**
     * 22, and it was right the first time.
     *
     * A measurement pass briefly pushed this to 33, having compared the card's
     * top *shadow* band against its bottom one rather than against the avatar.
     * The frame puts the card at y=531.3 and the avatar at 554.5 — 23.2 apart,
     * which 22 plus the disc's antialiasing reproduces.
     */
    paddingTop: 22,
    paddingBottom: 18,
    /** Avatar at x=44 against a card at x=25. */
    paddingHorizontal: 19,
    /** A hairline, not a border: node 3952:52 is 401x1 across the full width. */
    dividerHeight: 1,
  },

  /** Shared by the card header and the compact row. */
  identity: {
    /** Nodes 3240:635 / 3240:645 — both 32. */
    avatar: 32,
    /** Node 3241:779 — the state dot, hung off the avatar's bottom-right. */
    dot: 13,
    dotOffset: { right: -2, bottom: -1 },
    /**
     * 35 inside a card (node 4211:617), 32 in a row (3240:645 / 4211:612).
     *
     * The revised frame grew only the open card's avatar; the collapsed entry
     * and the On Break / Shift End rows stayed at 32.
     */
    cardAvatar: 35,
    avatarToText: 14,
    nameFontSize: 15,
    /** Node 3240:637 — "HSK" under the name. */
    subFontSize: 13,
    nameToSub: 2,
    /** Node 3240:708 — 11x21. */
    chevron: 21,
  },

  /** Node 3809:148 — (42,608) 335x9, three segments; "3/7" at x=385. */
  workload: {
    height: 9,
    radius: 5,
    /** Sampled from node 3809:148 — brand blue on a grey track. */
    fillColor: '#5a759d',
    /** Not a token; the same track `rooms/WorkloadProgressBar` uses. */
    trackColor: '#cdd3dd',
    marginTop: 20,
    /** Gap from the bar to the "3/7" that follows it on the same row. */
    countGap: 10,
    countFontSize: 15,
  },

  /** Nodes 3809:152-154 — y=628, 12px. Spread by flex, not `left: 42/168/291`. */
  taskStats: {
    fontSize: 12,
    marginTop: 12,
    /**
     * The row stops short of the content edge.
     *
     * The frame runs the three labels 40..343 inside a content box of 44..407,
     * so "Dirty. 3" keeps a clear right margin rather than sitting against the
     * card edge. Spread across the full width they read as a different row.
     */
    paddingRight: 60,
  },

  /** The "Current" block. */
  current: {
    /** Node 3952:67 — the 11px "Current" caption. */
    /** Node 3952:67 — 11px, sampled at `#8b8c8e`. */
    captionFontSize: 11,
    captionColor: '#8b8c8e',
    dividerMarginTop: 16,
    captionMarginTop: 12,
    rowMarginTop: 12,
    /** Node 3952:70 — 49 square, rounded. */
    thumb: 49,
    thumbRadius: 6,
    /** Node 3952:71 — the VIP disc, 20, hung off the thumb's corner. */
    vipDisc: 20,
    vipArrow: 9,
    thumbToText: 12,
    /** Nodes 3952:77 / 3952:96 / 3952:97. */
    roomFontSize: 13,
    guestFontSize: 13,
    elapsedFontSize: 12,
    lineGap: 4,
    /** Node 3952:86 — the yellow status pill. */
    pill: { width: 90, height: 47, radius: 24, glyph: 22, chevron: 11 },
  },

  /** Node 3240:643 — avatar 32 at y=842, next row at y=920: pitch 78. */
  compactRow: {
    /**
     * 14, not the card's 19.
     *
     * The frame puts On Break rows at x=39 and Shift End rows at x=34 — the
     * same component drawn twice, 5 apart. One value for both; the midpoint
     * against a 25 gutter.
     */
    paddingLeft: 14,
    paddingVertical: 14,
    gap: 12,
  },

  /**
   * Node 4211:500 — "See rooms" plus a chevron, right-aligned in the card's
   * identity row. The chevron is `3240:708`, drawn at −90° (pointing **down**)
   * for the closed state; open turns it up.
   */
  disclosure: {
    /** Helvetica Regular 16 `#5a759d`. */
    fontSize: 16,
    chevron: 21,
    gap: 6,
  },

  /**
   * The assigned-room list the disclosure reveals. No frame draws these rows,
   * so the geometry follows the card's own rhythm rather than inventing one.
   */
  assignedRooms: {
    marginTop: 14,
    rowGap: 10,
    /** A tinted disc carrying the status glyph, per `ROOM_STATUS`. */
    disc: 26,
    discToText: 12,
    fontSize: 14,
    captionFontSize: 11,
  },

  /**
   * The closed entry — node 4211:609, identity at (42,516) with a chevron at
   * (376,544) and **no card background**. It reads as a row, not a card, which
   * is what makes a long roster scannable.
   */
  collapsedRow: {
    paddingVertical: 12,
    paddingHorizontal: 17,
  },

  list: {
    /**
     * 152 — the bottom bar's height, not a comfortable-looking margin.
     *
     * `BottomTabBar` is `position: absolute; bottom: 0` with
     * `minHeight: 152 * scaleX`, so it floats *over* the list rather than
     * sitting after it. At 32 the last card and the bottom of any search
     * result were underneath it and could not be scrolled into view.
     * `lostAndFoundScreenLayout.listBottomInset` is 152 for the same reason.
     */
    paddingBottom: 152,
  },
} as const;

export default STAFF_LIST_LAYOUT;
