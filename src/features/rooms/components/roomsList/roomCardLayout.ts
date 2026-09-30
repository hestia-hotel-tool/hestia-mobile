/**
 * The Rooms card's dimensions, measured from Figma 3883:5570.
 *
 * The frame is 440 wide. On a narrower phone every measure — sizes, insets
 * and type — shrinks by the same factor (`CARD_SCALE`, never above 1), so the
 * card keeps the design's proportions instead of squeezing the guest column
 * until its text overlaps. Numbers below are the design's; `cardPx` and the
 * exported objects are already scaled.
 */
import { Dimensions } from 'react-native';
import type { RoomDisplayStatus } from '../../types/allRooms.types';

const DESIGN_WIDTH = 440;
export const CARD_SCALE = Math.min(1, Dimensions.get('window').width / DESIGN_WIDTH);

/** A design measure at this phone's size, to the half pixel. */
export const cardPx = (n: number) => Math.round(n * CARD_SCALE * 2) / 2;

/** Every number in `value`, scaled; strings and the rest untouched. */
function scaled<T>(value: T): T {
  if (typeof value === 'number') return cardPx(value) as T;
  if (Array.isArray(value)) return value.map(scaled) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scaled(v)])) as T;
  }
  return value;
}

export const ROOM_CARD = scaled({
  /** Node 3883:6417. Radius comes from design-system.json button.status. */
  pill: { width: 134, height: 70 },
  /** Node 3883:6159 — the assignee's photo. */
  assigneeAvatar: 35,
  /** Name to the photo's left edge: 43 (a 35 photo and an 8 gap), every card. */
  assigneeGap: 8,
  /** Node 3883:6143 (photo, radius 5) and 3883:6144 (the arrow disc on its corner). */
  guest: { photo: 49, photoRadius: 5, badge: 20, badgeRight: -2, badgeBottom: -6, textGap: 12 },
  /** Two guests on one card: their photos are 73 apart (3883:5881), no rule between. */
  guestGap: 24,
  /** Least room between the guest text and the pill (3883:6008 ends 24 before 4349:2876). */
  textToPill: 16,
  /** The guest panel's corners (3883:6141). */
  panelRadius: 10,
  /** The header's vertical rule, 50.5 tall on every card. */
  headerRule: 50.5,
  /** Slot padding the list gives every card (AllRoomsScreen `roomCardSlot`). */
  listGutter: 9,
} as const);

/**
 * The design draws four kinds of card, by state (Figma 3883:5570):
 *
 * - `grey`: 422 wide, #f9fafc, radius 12, a blue-grey hairline, the guest in a
 *   tinted panel — Paused (3883:5974) and In Progress with one guest (3883:6122).
 * - `whitePanel`: 392 wide, white, radius 9, #e3e3e3, a panel — In Progress
 *   Arrival/Departure (4349:2226), Cleaned (4349:2227) and Inspected (4349:2302).
 * - `offWhitePanel`: 392, #f9fafc, #e3e3e3, a panel — Dirty with one guest (3883:5803).
 * - `whiteDivider`: 392, white, a full-width rule under the header and the
 *   guests on the card itself — Dirty Arrival/Departure (3883:5881), Refused
 *   (4349:2537), Return Later (4349:2581) and Do Not Disturb (4349:2631).
 *
 * A priority room is the off-white card inside a red frame (3883:5765).
 *
 * Every number is the design's, relative to the card's own top-left.
 */
export type RoomCardSpec = {
  /** Extra side margin beyond the list's 9: 0 for a 422 card, 15 for a 392 one. */
  inset: number;
  background: string;
  border: string | null;
  radius: number;
  /** Room number's left edge and top. */
  numberLeft: number;
  numberTop: number;
  /** Space between the number and the category ("ST2K - 1.4"). */
  categoryGap: number;
  /** Category's top below the number's. */
  categoryDrop: number;
  /** Type label's ("Departure") top below the number's. */
  typeDrop: number;
  /** The header rule's top, and the card width to its right (rule included). */
  ruleTop: number;
  rightColumn: number;
  /** Photo's left edge after the rule, and its top. */
  avatarGap: number;
  avatarTop: number;
  body: PanelBody | DividerBody;
};

type PanelBody = {
  kind: 'panel';
  /** Panel's top, and its left and right insets from the card. */
  top: number;
  left: number;
  right: number;
  /** Card below the panel. */
  bottom: number;
  /** Panel height with one guest. */
  minHeight: number;
  /** Guest photo inside the panel, and the pill's inset from its right edge. */
  photoLeft: number;
  photoTop: number;
  pillRight: number;
};

type DividerBody = {
  kind: 'divider';
  /** The full-width rule's top. */
  top: number;
  photoLeft: number;
  /** Photo's top below the rule. */
  photoTop: number;
  pillRight: number;
  /** Body height under the rule with one guest, and with two. */
  minHeight: number;
  minHeightTwo: number;
};

const WHITE_HEADER = {
  inset: 15,
  background: '#ffffff',
  border: '#e3e3e3',
  radius: 9,
  numberLeft: 14,
  numberTop: 11,
  categoryGap: 7,
  categoryDrop: 9,
  typeDrop: 30,
  ruleTop: 11,
  rightColumn: 165,
  avatarGap: 9,
  avatarTop: 22,
} as const;

const GREY_HEADER = {
  inset: 0,
  background: '#f9fafc',
  border: 'rgba(90, 117, 157, 0.23)',
  radius: 12,
  numberLeft: 33,
  categoryGap: 11,
  categoryDrop: 8,
  typeDrop: 28,
  rightColumn: 193,
  avatarGap: 10,
} as const;

const DESIGN_SPECS = {
  /** 3883:5974 — Paused. */
  greyPaused: {
    ...GREY_HEADER,
    numberTop: 11.5,
    ruleTop: 9,
    avatarTop: 13,
    body: { kind: 'panel', top: 68, left: 16, right: 14, bottom: 21, minHeight: 101, photoLeft: 15, photoTop: 19.5, pillRight: 31 },
  },
  /** 3883:6122 — In Progress, one guest. The same card 8 lower inside. */
  greyInProgress: {
    ...GREY_HEADER,
    numberTop: 19.5,
    ruleTop: 17,
    avatarTop: 21,
    body: { kind: 'panel', top: 76, left: 16, right: 14, bottom: 21, minHeight: 101, photoLeft: 15, photoTop: 19.5, pillRight: 31 },
  },
  /** 4349:2226 — In Progress, Arrival/Departure. */
  whitePanel: {
    ...WHITE_HEADER,
    body: { kind: 'panel', top: 75, left: 8, right: 9, bottom: 14, minHeight: 101, photoLeft: 14, photoTop: 15, pillRight: 11 },
  },
  /** 4349:2227 / 4349:2302 — Cleaned and Inspected: the rule sits at 215, not 227. */
  whitePanelDone: {
    ...WHITE_HEADER,
    rightColumn: 177,
    body: { kind: 'panel', top: 75, left: 8, right: 9, bottom: 14, minHeight: 101, photoLeft: 14, photoTop: 15, pillRight: 11 },
  },
  /** 3883:5803 — Dirty, one guest. */
  offWhitePanel: {
    ...WHITE_HEADER,
    background: '#f9fafc',
    numberLeft: 17,
    numberTop: 14,
    categoryGap: 11,
    categoryDrop: 8,
    typeDrop: 28,
    ruleTop: 11.5,
    rightColumn: 179,
    avatarGap: 10,
    avatarTop: 20,
    body: { kind: 'panel', top: 70, left: 9, right: 11, bottom: 6, minHeight: 101, photoLeft: 6, photoTop: 20, pillRight: 16 },
  },
  /** 3883:5765 — the card inside a priority room's red frame (see PRIORITY_FRAME). */
  priority: {
    ...WHITE_HEADER,
    inset: 0,
    background: '#eef2f7',
    border: null,
    numberLeft: 18,
    numberTop: 14,
    categoryGap: 11,
    categoryDrop: 8,
    typeDrop: 28,
    ruleTop: 11.5,
    rightColumn: 178,
    avatarGap: 16,
    avatarTop: 19,
    body: { kind: 'panel', top: 70, left: 10, right: 10, bottom: 6, minHeight: 101, photoLeft: 6, photoTop: 20, pillRight: 20 },
  },
  /** 3883:5881 / 4349:2537 — the rule-and-no-panel card. */
  whiteDivider: {
    ...WHITE_HEADER,
    body: { kind: 'divider', top: 75, photoLeft: 13, photoTop: 15, pillRight: 29, minHeight: 104, minHeightTwo: 166 },
  },
} satisfies Record<string, RoomCardSpec>;

export type RoomCardSpecName = keyof typeof DESIGN_SPECS;

export const ROOM_CARD_SPECS: Record<RoomCardSpecName, RoomCardSpec> = scaled(DESIGN_SPECS);

/**
 * 3883:5765 — a priority room: a 422 frame, #f9fafc with a red hairline at
 * radius 12, holding the card 15 in from each side, 22 from the top and 15
 * from the bottom.
 */
export const PRIORITY_FRAME = scaled({
  background: '#f9fafc',
  border: '#f92424',
  radius: 12,
  paddingX: 15,
  paddingTop: 22,
  paddingBottom: 15,
} as const);

/** Which of the design's cards a room gets. */
export function roomCardSpecName(
  status: RoomDisplayStatus,
  arrivalDeparture: boolean,
  priority: boolean
): RoomCardSpecName {
  if (priority) return 'priority';
  switch (status) {
    case 'Paused':
      return 'greyPaused';
    case 'InProgress':
      return arrivalDeparture ? 'whitePanel' : 'greyInProgress';
    case 'Cleaned':
    case 'Inspected':
      return 'whitePanelDone';
    case 'Dirty':
      return arrivalDeparture ? 'whiteDivider' : 'offWhitePanel';
    default:
      // Refused, Return Later, Do Not Disturb.
      return 'whiteDivider';
  }
}
