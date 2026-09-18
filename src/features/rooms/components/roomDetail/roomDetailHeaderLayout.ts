/**
 * The Room Detail header's geometry — the only hard-coded dimensions in the
 * header tree, modelled on
 * [roomCardLayout.ts](../roomsList/roomCardLayout.ts).
 *
 * **Design units, never multiplied by `scaleX`.** The header is a flex column
 * now: these are the sizes and gaps between its blocks, and the column's height
 * falls out of them rather than being asserted as 232.
 *
 * ---
 *
 * **Standing policy for the state-by-state rebuild.** The shell is shared by all
 * five activity states, so these numbers govern every one of them — and only
 * some have been read off a frame. When a state's frame is read and disagrees
 * with a number here, the disagreement becomes a *per-state override*, not an
 * edit to the shared value, unless the new value is right for every state.
 * `roomDetailHeaderChrome.ts` carries a `verifiedAgainst` field per state; that
 * is the queue.
 *
 * **Provenance — STAGE 2d-ii.** The column is now measured off **Figma
 * 2333-132** (Paused), pixel-sampled from the rendered frame rather than read
 * off node metadata, which disagreed with it. The frame's own vertical
 * arithmetic closes exactly on the header's height:
 *
 *   69 + 28 + 6 + 15 + 39 + 26.38 + 18.62 + 14 + 16 = 232
 *
 * which is why `onLayout` can be trusted: on a device whose top inset makes
 * `insets.top + safeAreaGap` equal 69, the measured height must come back 232.
 * It does not on every device, and that is the point — the old code asserted
 * 232 unconditionally.
 *
 * These replaced values derived from the previous absolute implementation
 * (tops of 69 / 103 / 130 / 176). The status row rises ~19 design px and the
 * activity line ~12.8 for **all five** states, not just Paused, because the
 * shell is shared. That is a correction, not a regression: the old numbers came
 * from the PNG boxes the icons used to be drawn in, not from any frame.
 */

export const ROOM_DETAIL_HEADER_LAYOUT = {
  /**
   * Distance from the top of the safe area to the room number.
   *
   * Applied as `insets.top + safeAreaGap`, not as a literal 69. The old
   * absolute `top: 69 * scaleX` worked by coincidence on the test device
   * (69 × 0.893 = 61.6 against a 59pt inset) and would have been wrong on any
   * other inset. `HomeHeader` already pads by `insets.top + 12`; 10 reproduces
   * 69 exactly on an iPhone 16 Pro.
   */
  safeAreaGap: 10,

  /** Back chevron — Figma 2333-285: 14 x 28 at x26, y69. Absolute: it is the
   *  one element the design does not centre, and it sits beside, not above,
   *  the title block. `action-chevron`'s viewBox aspect is exactly 0.5, so a
   *  height of 28 paints 14 wide. */
  backChevron: { left: 26, height: 28 },

  /** The centred identity column. */
  roomNumber: { height: 28, fontSize: 24, flagGap: 10, flagBadge: 28 },
  numberToCode: 6,
  roomCode: { height: 15, fontSize: 17 },

  /**
   * The optional "Stayover" line. **Absent from 2333-132**, so these stay
   * derived from the old absolute `top: 130` and are unverified — the gap below
   * was narrowed with `codeToStatus` only so the row still lands between the
   * code and the status. Stayover's own frame (1772-406) shows the label but
   * this pass has not measured it.
   */
  codeToFrontOffice: 12,
  frontOffice: { height: 19, fontSize: 16, badgeGap: 6 },
  frontOfficeToStatus: 20,

  /** Gap from the room code to the status row when there is no front-office
   *  line — the common case. Figma 2333-132: 157 - 118. */
  codeToStatus: 39,

  /**
   * The status button row: glyph, label, dropdown chevron.
   *
   * `height` is the row, not the glyph — glyph heights come from
   * `statusGlyphHeight` below, falling back to `STATUS_CONFIGS`.
   *
   * `glyphGap` and `chevronGap` are the frame's: the "Paused" label starts at
   * x190.45 with the 26.38 glyph at x150 (gap 14.07), and the chevron sits at
   * x267 after a label ending at x255.45 (gap 11.55).
   *
   * `height` is **30.769**, the largest of the four measured frames, because a
   * row shorter than its glyph is a clipped glyph. The four disagree:
   * 26.38 (Paused 2333-132), 28 (Return Later 2333-312, Refused 2333-835) and
   * 30.769 (In Progress 408-2669).
   *
   * They also disagree on the row's **top** — 139, 149, 157 and 161 across the
   * four — a 22px spread on a shared element. That is design drift, not intent,
   * so no per-state offset is justified and the shared value stands.
   */
  statusRow: { height: 30.769, glyphGap: 14.07, chevronGap: 11.55, chevron: 22, fontSize: 19 },

  /** Gap from the status row to the activity line. Figma 2333-132: 202 - 183.38. */
  statusToActivity: 18.62,
  activityLine: { height: 14, fontSize: 14, actionGap: 10, actionFontSize: 13 },

  /** Figma 2333-132: the frame's own bottom gap, closing the column on 232. */
  bottomGap: 16,

  /**
   * Status glyph heights the header overrides, per display status.
   *
   * `STATUS_CONFIGS[s].glyphHeight` is shared with the room card's cap and the
   * status pill, where those sizes are right. The header's frame asks for
   * something different: 2333-132 draws the Paused mark at **26.38**, against
   * `STATUS_CONFIGS.Paused.glyphHeight`'s 38.8 — a 47% overdraw if reused.
   *
   * Two entries. Dirty, Cleaned and Inspected fall through to `STATUS_CONFIGS`
   * (unchanged behaviour) and each earns one when its own frame is read — In
   * Progress being 21% off is a reason to expect the others are too.
   */
  statusGlyphHeight: {
    /** Figma 2333-132, against `STATUS_CONFIGS.Paused.glyphHeight`'s 38.8. */
    Paused: 26.38,
    /**
     * Figma 408-2669, against `STATUS_CONFIGS.InProgress.glyphHeight`'s 25.4 —
     * the header draws the vacuum ~21% larger than the card does. The registry
     * aspect (0.958) matches the frame's box exactly (29.48/30.769), so this is
     * the same drawing at a different size, not a different mark.
     */
    InProgress: 30.769,
  } as Partial<Record<string, number>>,
} as const;

export default ROOM_DETAIL_HEADER_LAYOUT;
