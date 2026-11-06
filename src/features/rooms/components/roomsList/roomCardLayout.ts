/**
 * The Rooms card's dimensions, measured from Figma 4553:262.
 *
 * The frame is 440 wide. On a narrower phone every measure — sizes, insets
 * and type — shrinks by the same factor (`CARD_SCALE`, never above 1), so the
 * card keeps the design's proportions instead of squeezing the guest column
 * until its text overlaps. Numbers below are the design's; `cardPx` and the
 * exported objects are already scaled.
 *
 * Every state draws the same card (4553:262 replaced the seven per-state
 * styles of 3883:5570): a header, a tinted guest panel, and a footer with the
 * attendant on the left and the status pill on the right. Every number is
 * relative to the card's own top-left.
 */
import { Dimensions } from 'react-native';

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
  /** 4553:854 — white, #e3e3e3 hairline, radius 9. */
  radius: 9,
  /** Slot padding the list gives every card (AllRoomsScreen `roomCardSlot`). */
  listGutter: 9,

  header: {
    /** Room number (4553:855): bold 33, its line starting 12 down, 13 in. */
    top: 12,
    left: 13,
    /** Badges end 17 before the card's right edge (4553:856). */
    right: 17,
    /** Header row height; the panel starts at 60 (12 + 36 + 12). */
    height: 36,
    numberSize: 33,
    /** Number to the first chip: the chip starts at 74, "201" ends at ~68. */
    numberToChip: 6,
  },

  /** 4553:897 — the front-office type chip: 87 x 28 (wider for longer text), radius 9, bold 12. */
  chip: { minWidth: 87, height: 28, radius: 9, paddingX: 10, gap: 4, top: 4, fontSize: 12 },

  /** 4553:856 — badge tiles, 32.6 x 29.5, radius 10, 5.1 apart, 6 below the number's top. */
  badge: { width: 32.6, height: 29.5, radius: 10, gap: 5.1, top: 6 },

  /** 4553:892 — the guest panel. */
  panel: {
    /** Below the header row. */
    top: 12,
    left: 9,
    right: 7,
    radius: 10,
    /** One guest: 84 tall (4553:892). Two: 160 (4553:796). */
    minHeight: 84,
    paddingTop: 7,
    paddingBottom: 11,
    /** Photo's left edge. */
    paddingLeft: 22,
    /** The marker disc ends 48 before the panel's right edge (4553:899). */
    paddingRight: 48,
    /** Second guest's photo is 82 below the first (4553:828). */
    guestGap: 22,
  },

  guest: {
    /** 4553:913 — photo 49, radius 5, 5 below the text's line box. */
    photo: 49,
    photoRadius: 5,
    photoTop: 5,
    /** Photo to the text column (98 - 39 - 49). */
    textGap: 10,
    /** Helvetica 14, lines 20 apart (4553:900 / 921 / 919). */
    fontSize: 14,
    line: 20,
    /** "EDT: 12:00" to "2 Adults, 2 Kids" (4553:921 → 922). */
    timeToCount: 8,
  },

  /** 4553:1674 — the VIP / code disc beside each guest, with the info mark on its corner. */
  marker: { size: 35, top: 12, gap: 8, fontSize: 12, info: 14, infoTop: -2 },

  /** 4553:893 / 4553:901 — the footer row. */
  footer: {
    /** Pill's top below the panel (164 - 144). */
    top: 20,
    left: 13,
    right: 7,
    bottom: 13,
    /** "Room Attendant", light 10. */
    labelSize: 10,
    labelLine: 11.5,
    /** Label's line to the avatar's top (186 - 163 - 11.5). */
    labelToAvatar: 11.5,
  },

  /** 4553:902 — 207 x 70, glyph, label and chevron. */
  pill: { width: 207, height: 70 },

  /** 4553:896 — the assignee's photo, 8 from the name. */
  assigneeAvatar: 35,
  assigneeGap: 8,
} as const);

/** The panel's tint — 4553:892, #dfe6f0 at 40%. */
export const PANEL_FILL = 'rgba(223, 230, 240, 0.4)';
export const CARD_BORDER = '#e3e3e3';
export const INK = '#334866';

/**
 * 3883:5765 — a priority room: a 422 frame, tinted red with a red hairline at
 * radius 12, holding the card 15 in from each side, 22 from the top and 15
 * from the bottom. The card inside is clear so the tint shows; only its guest
 * panel stays white (a translucent panel would pick up the red).
 */
export const PRIORITY_FRAME = {
  ...scaled({
    /**
     * 4488:72 — #f92424 at 8%, flattened over the #f9fafc page. Solid, not the
     * literal alpha: the translucent version let PM mode's dark slate through
     * and the card's dark header text disappeared (client feedback, 2026-10-26).
     */
    background: '#F9E9EB',
    border: '#f92424',
    radius: 12,
    paddingX: 15,
    paddingTop: 22,
    paddingBottom: 15,
  } as const),
  /** Not scaled: a 1pt line like every other card's. */
  borderWidth: 1,
  panelFill: '#ffffff',
};
