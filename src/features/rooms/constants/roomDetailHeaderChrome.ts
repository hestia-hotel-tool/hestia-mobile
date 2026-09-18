import type { RoomActivityKind } from '../types/allRooms.types';

/**
 * What the Room Detail header is *made of*, for one room-activity state.
 *
 * Structural switches only — booleans and narrow unions, never a colour and
 * never a pixel. Colours live in
 * [roomDetailHeaderTheme.ts](./roomDetailHeaderTheme.ts) and sizes in
 * [roomDetailHeaderLayout.ts](../components/roomDetail/roomDetailHeaderLayout.ts).
 * The split is not tidiness: the two have different *validity*. A structural
 * fact ("this state has a line under the status") survives a re-read of a
 * frame; a palette row is per-frame colour, and three of the five below have
 * never been checked against one.
 *
 * Shape follows
 * [roomsListChrome.ts](./roomsListChrome.ts) and `homeChrome.ts` — a type of
 * independent switches plus a `Record` keyed by the variant.
 *
 * **Not to be confused with `roomDetailChrome.ts`**, which is keyed by
 * `RoomType` (Arrival, Departure, Stayover…) and decides which *sections* the
 * Overview has. A room has a type *and* an activity; the two tables are
 * orthogonal and must never merge.
 */
export type RoomDetailHeaderChrome = {
  /**
   * Which `STATUS_CONFIGS` row supplies the mark — and, when `ground` is
   * `'status'`, the background. Paused draws the Paused mark rather than the
   * room's housekeeping status.
   */
  statusSource: 'room' | 'activity';
  /**
   * `'status'` = background is the status colour and every foreground is white,
   * the treatment the four core statuses use. `'palette'` = this state has a
   * hand-authored row in `HEADER_STATE_PALETTE`.
   */
  ground: 'status' | 'palette';
  /*
   * There is deliberately no `statusMark` switch here. Whether a mark sits on a
   * tinted disc turned out to be a property of the mark itself, not of the
   * state — Return Later's frame (2333-312) draws the same kind of bespoke
   * glyph as Refused Service but with no disc behind it. It lives in
   * `MARK_SPECS`, beside the colour it would need.
   */
  /** `'strong'` is bold 18; `'regular'` is light 19. */
  labelEmphasis: 'regular' | 'strong';
  /** Whether this state draws a line under the status button. */
  subtitle: boolean;
  /**
   * The trailing text button on that line, if any.
   *
   * **No state currently uses either arm.** Paused (2333-132) and Refused
   * Service (2333-835) both turned out to have no inline control, and the two
   * remaining unread frames are unlikely to add one. Kept because the mechanism
   * is three lines, the affordances existed until their frames were read, and
   * either could come back — but treat a non-null value here as needing a frame
   * to justify it.
   */
  inlineAction: 'resume' | 'clear' | null;
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

export const ROOM_DETAIL_HEADER_CHROME: Record<RoomActivityKind, RoomDetailHeaderChrome> = {
  /**
   * The four core statuses — Figma 408-2669 (In Progress), pixel-sampled.
   *
   * Confirms the rule this row always claimed: the ground is the status colour
   * (`#f0be1b`, exactly `STATUS_CONFIGS.InProgress.color`) and every foreground
   * is white. The `1772-104` it used to cite was another inherited citation;
   * this one was measured.
   *
   * `labelEmphasis: 'strong'` is the correction — the frame sets "In Progress"
   * Bold 18 where this row said light 19. That makes **four of five** states
   * bold 18, with only the unread `promisedTime` still claiming otherwise, so
   * this switch is close to being no switch at all.
   *
   * `subtitle: false` stands even though the frame shows a "Paused at 11:22"
   * line: that row is a layered artifact left visible in several frames (1772-104
   * carries it too), and it contradicts the label above it — a room that is
   * paused reads "Paused", not "In Progress". There is no subtitle *content* for
   * a room with no activity, so the switch is right either way.
   */
  none: {
    statusSource: 'room',
    ground: 'status',
    labelEmphasis: 'strong',
    subtitle: false,
    inlineAction: null,
    verifiedAgainst: '408-2669',
  },
  /**
   * Paused — Figma 2333-132, pixel-sampled from the rendered frame.
   *
   * `ground: 'status'` is the whole fix. The frame's background is `#b0c0c6`,
   * which is *exactly* `STATUS_CONFIGS.Paused.color`, with every foreground
   * white — byte for byte the treatment `none` already applies. So Paused needs
   * no palette row at all, and the previous `#FCF1CF` pale-yellow block (with
   * dark `#334866` / `#6C7D99` / `#000000` text) was wrong on all six colour
   * fields. It has been deleted rather than corrected.
   *
   * `inlineAction: null` because the frame has no Resume button. That also
   * closes a hole: `handleResumePause` never called
   * `blockedBySecondInProgress()`, where `handleStatusSelect` does, so the
   * button let an attendant put a second room In Progress and bypass the
   * one-room-at-a-time rule. Unpausing still works from the status sheet, which
   * clears all four activity columns.
   */
  paused: {
    statusSource: 'activity',
    ground: 'status',
    labelEmphasis: 'strong',
    subtitle: true,
    inlineAction: null,
    verifiedAgainst: '2333-132',
  },
  /**
   * Return Later — Figma 2333-312, pixel-sampled from the rendered frame.
   *
   * `labelEmphasis: 'strong'` because the frame draws "Return Later" Bold 18,
   * as Paused does. That is now three of five states on the bold label, which
   * is why it stopped being a refuse-service-only `statusTextStyle` on the
   * theme and became a switch here.
   *
   * Its subtitle is the one that made `RoomActivityLine` take two segments: the
   * frame prints "Return at 11:22" in Regular beside a **Bold** "30min 2s",
   * where the old code built one `11:22 PM · 30 mins` string.
   */
  returnLater: {
    statusSource: 'room',
    ground: 'palette',
    labelEmphasis: 'strong',
    subtitle: true,
    inlineAction: null,
    verifiedAgainst: '2333-312',
  },
  promisedTime: {
    statusSource: 'room',
    ground: 'palette',
    labelEmphasis: 'regular',
    subtitle: true,
    inlineAction: null,
    verifiedAgainst: null,
  },
  /**
   * Refused Service — Figma 2333-835, pixel-sampled from the rendered frame.
   *
   * Read properly at last: this row previously *claimed* `2333-835` on the
   * strength of a comment in the old palette, and the frame turned out to
   * disagree with almost all of it — a `#ff9090` ground rather than `#e4eefe`,
   * white foregrounds rather than dark, a bare mark rather than one on a disc,
   * a bare reason rather than "Refused: <reason>", and no Clear button.
   *
   * `inlineAction: null` for the same reason as Paused: the frame has no inline
   * control. Clearing still works from the status sheet, which writes
   * `activityStateToUpdate({ kind: 'none' })` and blanks all four activity
   * columns.
   */
  refuseService: {
    statusSource: 'room',
    ground: 'palette',
    labelEmphasis: 'strong',
    subtitle: true,
    inlineAction: null,
    verifiedAgainst: '2333-835',
  },
};

export default ROOM_DETAIL_HEADER_CHROME;
