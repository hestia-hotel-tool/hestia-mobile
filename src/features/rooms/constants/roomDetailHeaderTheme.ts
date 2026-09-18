/**
 * The detail header's palette, by room activity state.
 *
 * Split out of `roomDetailStyles.ts`, which is otherwise a table of Figma
 * coordinates. This is not geometry: it is 58 lines of real branching over
 * `RoomActivityState`, and it survives the layout rebuild that will delete most
 * of the coordinates around it. Keeping the two together meant every importer of
 * a pixel offset also pulled in the branching, and vice versa.
 *
 * Palette reference: 2333-835 (Refused Service, Arrival).
 *
 * **The other two hand-authored rows are unverified.** This comment used to
 * claim "Figma 2333-132 (Paused)" over a `#FCF1CF` pale-yellow block; that frame
 * contains no `#FCF1CF` at all — it is `#b0c0c6` with white foregrounds. The
 * citation pointed at a frame saying the opposite of the values beneath it.
 * `returnLater` carries the identical `#FCF1CF` and is under the same
 * suspicion, having presumably been copied from the same misreading; it stays
 * as-is until its own frame is read rather than being "fixed" on a hunch. See
 * `verifiedAgainst` in
 * [roomDetailHeaderChrome.ts](./roomDetailHeaderChrome.ts).
 */

import {
  ROOM_ACTIVITY_LABEL,
  STATUS_CONFIGS,
  type RoomActivityState,
  type RoomDisplayStatus,
  type RoomStatus,
} from '../types/allRooms.types';
import type { StatusMarkSpec } from '../components/roomDetail/RoomHeaderStatusButton';
import { ROOM_DETAIL_HEADER_CHROME } from './roomDetailHeaderChrome';
import { ROOM_DETAIL_HEADER_LAYOUT } from '../components/roomDetail/roomDetailHeaderLayout';

/** Which dedicated PNG overlays the status icon, if any. */
export type HeaderOverlayIcon = 'refuseService' | 'returnLater' | 'promisedTime';

/**
 * Every colour the detail header varies by state, resolved in one go.
 *
 * The header used to re-derive this seven times — background, back arrow, room
 * number, room code, front-office label, status text and dropdown arrow each
 * carried their own copy of the same four-way branch, and they had already
 * drifted (the ternaries put paused first, the style arrays let refuse-service
 * override it).
 */
export interface RoomDetailHeaderTheme {
  headerBackground: string;
  roomNumberColor: string;
  /** Also used for the front-office label. */
  roomCodeColor: string;
  backArrowTint: string;
  /** Status label, dropdown arrow, and the status glyph. */
  statusTextAndIconColor: string;
  /** The "Paused at:" / return time / refused-reason line beneath the status. */
  subtitleColor: string;
  overlayIcon: HeaderOverlayIcon | null;
}

/**
 * The colours each state overrides. Only states that appear in
 * `resolveRoomDetailHeaderTheme` below live here; the `Dirty`/`InProgress`/
 * `Cleaned`/`Inspected` header is the status colour itself, read from
 * `STATUS_CONFIGS`, and the flagged variant's palette still sits beside its pill
 * geometry in `ROOM_DETAIL_HEADER`.
 */
const WHITE = '#ffffff';

const HEADER_STATE_PALETTE = {
  /*
   * Return Later — Figma 2333-312, pixel-sampled from the rendered frame.
   *
   * Two colours and no more: a `#ead7f6` ground with every foreground
   * `#334866`. The ground is `STATUS_OPTIONS.returnLater.circleColor`, so the
   * header takes the colour the status picker already gives this state.
   *
   * This replaced a `#FCF1CF` pale-yellow block with three different greys
   * (`#6C7D99`, `#000000`, `#334866`) — the same wrong palette Paused carried,
   * which is what made it look copied rather than measured.
   */
  returnLater: {
    headerBackground: '#ead7f6',
    backArrowTint: '#334866',
    roomNumberColor: '#334866',
    roomCodeColor: '#334866',
    statusTextAndIconColor: '#334866',
    returnTimeColor: '#334866',
  },
  /*
   * Promised Time — **unverified**. It shared the block above until Return
   * Later's frame was read, and nothing says the two agree; keeping the old
   * values here rather than inheriting the new ones means this pass changes
   * only the state whose frame was actually measured.
   */
  promisedTime: {
    headerBackground: '#FCF1CF',
    backArrowTint: '#6C7D99',
    roomNumberColor: '#334866',
    roomCodeColor: '#6C7D99',
    statusTextAndIconColor: '#000000',
    returnTimeColor: '#6C7D99',
  },
  /*
   * Refused Service — Figma 2333-835, pixel-sampled from the rendered frame.
   *
   * A `#ff9090` salmon ground with white foregrounds, which replaced a
   * `#e4eefe` pale blue with dark text. Like Return Later's `#ead7f6`, the
   * ground is `STATUS_OPTIONS.refuseService.circleColor` — so both bespoke-mark
   * states take the header colour from the circle the status picker already
   * gives them. Worth knowing before promisedTime's frame is read, where the
   * same rule would predict `rgba(240,190,27,0.21)`.
   *
   * `backArrowTint` is the one exception to "everything is white": the frame
   * draws the back chevron dark (measured ~`#334866` under heavy antialiasing
   * over the salmon) while every other mark on it is white. The other three
   * frames tint the chevron like the rest of their foregrounds, so this is
   * either deliberate contrast or a slip in this one frame — drawn as
   * specified, and flagged.
   */
  refuseServiceLight: {
    headerBackground: '#ff9090',
    backArrowTint: '#334866',
    roomNumberColor: WHITE,
    roomCodeColor: WHITE,
    statusTextAndIconColor: WHITE,
    subtitleColor: WHITE,
  },
} as const;

/**
 * Resolve the header's palette for a room.
 *
 * Adding a designed variant is a case here plus, if it needs new colours, one
 * block in `HEADER_STATE_PALETTE` above — no JSX changes.
 */
export function resolveRoomDetailHeaderTheme(
  activity: RoomActivityState,
  status: RoomStatus
): RoomDetailHeaderTheme {
  switch (activity.kind) {
    case 'refuseService': {
      const r = HEADER_STATE_PALETTE.refuseServiceLight;
      return {
        headerBackground: r.headerBackground,
        roomNumberColor: r.roomNumberColor,
        roomCodeColor: r.roomCodeColor,
        backArrowTint: r.backArrowTint,
        statusTextAndIconColor: r.statusTextAndIconColor,
        subtitleColor: r.subtitleColor,
        overlayIcon: 'refuseService',
      };
    }
    case 'returnLater':
    case 'promisedTime': {
      const p =
        activity.kind === 'returnLater'
          ? HEADER_STATE_PALETTE.returnLater
          : HEADER_STATE_PALETTE.promisedTime;
      return {
        headerBackground: p.headerBackground,
        roomNumberColor: p.roomNumberColor,
        roomCodeColor: p.roomCodeColor,
        backArrowTint: p.backArrowTint,
        statusTextAndIconColor: p.statusTextAndIconColor,
        subtitleColor: p.returnTimeColor,
        overlayIcon: activity.kind === 'returnLater' ? 'returnLater' : 'promisedTime',
      };
    }
    /*
     * Paused shares the default treatment, which is the finding that shrank
     * this file: Figma 2333-132's background is `STATUS_CONFIGS.Paused.color`
     * with white foregrounds, so it is the `none` rule applied to the *display*
     * status rather than the housekeeping one. It had a hand-authored pale
     * yellow palette that no frame asked for.
     */
    case 'paused':
    case 'none': {
      const displayStatus = activity.kind === 'paused' ? 'Paused' : status;
      const config = STATUS_CONFIGS[displayStatus] ?? STATUS_CONFIGS.Dirty;
      return {
        headerBackground: config.color,
        roomNumberColor: WHITE,
        roomCodeColor: WHITE,
        backArrowTint: WHITE,
        statusTextAndIconColor: WHITE,
        subtitleColor: WHITE,
        overlayIcon: null,
      };
    }
  }
}

/**
 * The bespoke mark each activity state draws, where it has one.
 *
 * Two of the three are bare and one is not, which is the opposite of what the
 * code assumed. It drew a disc behind all three because the 51x51 PNGs it
 * replaced baked one in — reading the frames is what separated "the asset had a
 * disc" from "the design has a disc". Return Later (2333-312) and Refused
 * Service (2333-835) are both bare glyphs on the header's own ground, at 24 x
 * 28, inheriting the header's foreground colour.
 *
 * Promised Time keeps the numbers **measured out of its PNG**: its frame has
 * not been read, so it is the last one still drawing a disc, and
 * `verifiedAgainst` in `roomDetailHeaderChrome.ts` records that. For it the
 * disc is the whole 24.367 the image occupied, since the asset's circle was
 * inscribed in its box, and the glyph keeps its share of it:
 * `viewBox height / 51 x 24.367`.
 *
 * The three registry viewBoxes match the PNGs' glyph bounding boxes to the
 * decimal (28.38 vs 28x28, 29.75 vs 25x29, 30.75 vs 22x31), which is how we
 * know they are the same drawings.
 */
const OVERLAY_DISC = 24.367;

export const MARK_SPECS: Record<HeaderOverlayIcon, StatusMarkSpec> = {
  /** Bare, white, 24 x 28 — Figma 2333-835. No disc, same as Return Later. */
  refuseService: {
    icon: 'action-refuse-service',
    glyphHeight: 28,
    disc: null,
    glyph: null,
  },
  /** Bare, and inheriting the header's `#334866` — Figma 2333-312: 24 x 28. */
  returnLater: {
    icon: 'action-return-later',
    glyphHeight: 28,
    disc: null,
    glyph: null,
  },
  promisedTime: {
    icon: 'action-promised-time',
    glyphHeight: (30.75 / 51) * OVERLAY_DISC,
    disc: { color: 'rgba(236, 189, 28, 0.212)', size: OVERLAY_DISC },
    glyph: '#3f4c5f',
  },
};

/**
 * Everything the header needs for one render, resolved in a single call.
 *
 * The component asks once and indexes no table itself — the two tables have
 * different lifetimes (see `roomDetailHeaderChrome.ts`) and a view that reaches
 * into both is a view that has to be edited whenever either moves.
 */
export function resolveRoomDetailHeader(activity: RoomActivityState, status: RoomStatus) {
  const chrome = ROOM_DETAIL_HEADER_CHROME[activity.kind];
  const theme = resolveRoomDetailHeaderTheme(activity, status);
  // `RoomDisplayStatus`, not `RoomStatus`: Paused is a display state the room's
  // housekeeping column cannot hold, which is exactly why `statusSource` exists.
  const effectiveStatus: RoomDisplayStatus = chrome.statusSource === 'activity' ? 'Paused' : status;
  const config = STATUS_CONFIGS[effectiveStatus] ?? STATUS_CONFIGS.Dirty;

  return {
    chrome,
    theme,
    effectiveStatus,
    label: ROOM_ACTIVITY_LABEL[activity.kind] ?? config.label ?? effectiveStatus,
    /*
     * One mark, however it is drawn.
     *
     * A state with a bespoke mark (`theme.overlayIcon`) uses it; everything else
     * falls back to the room's own status glyph from `STATUS_CONFIGS`, at the
     * header's size where its frame asks for one.
     */
    mark: theme.overlayIcon
      ? MARK_SPECS[theme.overlayIcon]
      : {
          icon: config.iconName,
          glyphHeight:
            ROOM_DETAIL_HEADER_LAYOUT.statusGlyphHeight[effectiveStatus] ??
            config.glyphHeight,
          disc: null,
          glyph: null,
        },
  };
}
