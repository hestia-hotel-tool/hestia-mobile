/**
 * The detail header's palette, by room activity state.
 *
 * Split out of `roomDetailStyles.ts`, which is otherwise a table of Figma
 * coordinates. This is not geometry: it is 58 lines of real branching over
 * `RoomActivityState`, and it survives the layout rebuild that will delete most
 * of the coordinates around it. Keeping the two together meant every importer of
 * a pixel offset also pulled in the branching, and vice versa.
 *
 * Palette reference: Figma 2333-132 (Paused), 2333-835 (Refused Service,
 * Arrival), and the Return Later frames.
 */

import { scaleX } from '@/utils/responsive';
import { STATUS_CONFIGS, type RoomActivityState, type RoomStatus } from '../types/allRooms.types';

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
  /** Refused Service draws its label bolder and larger. */
  statusTextStyle?: { fontWeight: '700'; fontSize: number };
  overlayIcon: HeaderOverlayIcon | null;
}

/**
 * The colours each state overrides. Only states that appear in
 * `resolveRoomDetailHeaderTheme` below live here; the `Dirty`/`InProgress`/
 * `Cleaned`/`Inspected` header is the status colour itself, read from
 * `STATUS_CONFIGS`, and the flagged variant's palette still sits beside its pill
 * geometry in `ROOM_DETAIL_HEADER`.
 */
const HEADER_STATE_PALETTE = {
  // Paused (Figma node 2333-132) — light header, black/dark text and icons,
  // "Paused at" below.
  paused: {
    headerBackground: '#FCF1CF',
    roomNumberColor: '#334866',
    roomCodeColor: '#6C7D99',
    backArrowTint: '#6C7D99',
    statusTextAndIconColor: '#000000',
    pausedTimeColor: '#6C7D99',
  },
  // Return Later — light header #FCF1CF, time only plus remaining countdown.
  returnLater: {
    headerBackground: '#FCF1CF',
    backArrowTint: '#6C7D99',
    roomNumberColor: '#334866',
    roomCodeColor: '#6C7D99',
    statusTextAndIconColor: '#000000',
    returnTimeColor: '#6C7D99',
  },
  // Refused Service — light blue header (Figma node 2333-835, Arrival room detail).
  refuseServiceLight: {
    headerBackground: '#e4eefe',
    backArrowTint: '#6C7D99',
    roomNumberColor: '#334866',
    roomCodeColor: '#334866',
    statusTextAndIconColor: '#334866',
    subtitleColor: '#000000',
  },
} as const;

const WHITE = '#ffffff';

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
    case 'paused': {
      const p = HEADER_STATE_PALETTE.paused;
      return {
        headerBackground: p.headerBackground,
        roomNumberColor: p.roomNumberColor,
        roomCodeColor: p.roomCodeColor,
        backArrowTint: p.backArrowTint,
        statusTextAndIconColor: p.statusTextAndIconColor,
        subtitleColor: p.pausedTimeColor,
        // Paused has a real status glyph (STATUS_CONFIGS.Paused), not an overlay.
        overlayIcon: null,
      };
    }
    case 'refuseService': {
      const r = HEADER_STATE_PALETTE.refuseServiceLight;
      return {
        headerBackground: r.headerBackground,
        roomNumberColor: r.roomNumberColor,
        roomCodeColor: r.roomCodeColor,
        backArrowTint: r.backArrowTint,
        statusTextAndIconColor: r.statusTextAndIconColor,
        subtitleColor: r.subtitleColor,
        statusTextStyle: { fontWeight: '700', fontSize: 18 * scaleX },
        overlayIcon: 'refuseService',
      };
    }
    case 'returnLater':
    case 'promisedTime': {
      // Promised Time reuses the Return Later palette, as the design does today.
      const rl = HEADER_STATE_PALETTE.returnLater;
      return {
        headerBackground: rl.headerBackground,
        roomNumberColor: rl.roomNumberColor,
        roomCodeColor: rl.roomCodeColor,
        backArrowTint: rl.backArrowTint,
        statusTextAndIconColor: rl.statusTextAndIconColor,
        subtitleColor: rl.returnTimeColor,
        overlayIcon: activity.kind === 'returnLater' ? 'returnLater' : 'promisedTime',
      };
    }
    case 'none': {
      const config = STATUS_CONFIGS[status] ?? STATUS_CONFIGS.Dirty;
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
