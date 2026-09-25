/**
 * Chat list layout — Figma 3272:62.
 * https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=3272-62
 *
 * Every number is in design px on the 440-wide frame; multiply by `scaleX`.
 * Positions quoted in comments are the frame's own x/y.
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
export const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

// Compact chat header bar height (WhatsApp-style, used for chat detail)
export const CHAT_HEADER_BAR_HEIGHT = 56;

export const CHAT_COLORS = {
  background: '#ffffff',
  headerBackground: '#e4eefe',
  searchBackground: '#f1f6fc',
  badge: '#ff46a3',
  /** Full-width rules, 1px black at 11%. */
  divider: 'rgba(0, 0, 0, 0.11)',
  textPrimary: '#1e1e1e',
  title: '#607aa1',
  glyph: '#5a759d',
} as const;

export const CHAT_LIST = {
  header: {
    /** Tinted band, y 0–133. */
    bandHeight: 133,
    /** Back chevron at x27 y69, 14x28; title at x69 (28 past the chevron). */
    left: 27,
    top: 69,
    backChevron: 28,
    titleGap: 28,
    titleFontSize: 24,
  },
  search: {
    /** Pill x26 y158, 301x59, r82. */
    top: 158,
    left: 26,
    width: 301,
    height: 59,
    radius: 82,
    paddingLeft: 20,
    /** Glyph at x274, 19x19 — 34 in from the pill's right edge. */
    iconSize: 19,
    iconRight: 34,
    placeholderFontSize: 13,
    placeholderOpacity: 0.36,
    /** Filter glyph x354 y176, 26x12: 27 past the pill, 18 below its top. */
    filterGap: 27,
    filterTop: 18,
    filterHeight: 14,
    /** Rule under the search row, y241. */
    dividerTop: 241,
  },
  section: {
    fontSize: 16,
    lineHeight: 21,
    /** "Notifications" y256 — 15 below the rule. "Chats" y429 — 20 below. */
    notificationsTop: 15,
    chatsTop: 20,
  },
  notification: {
    /** Pills x26: General 80x33, Tasks 68x33 — text + 20 each side. */
    pillHeight: 33,
    pillPaddingX: 20,
    pillRadius: 44,
    pillFontSize: 11,
    /** General's title starts 9 past its pill. */
    titleGap: 9,
    titleFontSize: 13,
    timeFontSize: 11,
    paddingTop: 18,
    paddingBottom: 15,
    /** Badge sits 6 above the pill's top edge. */
    badgeLift: 6,
    general: '#ff46a3',
    tasks: '#4a91fc',
  },
  chat: {
    /** Avatar x27, 44; name at x88 (17 past it). */
    avatar: 44,
    avatarGap: 17,
    groupAvatarBorder: '#acbdd5',
    /** Row 2: rule y558 → avatar y584 (26) … avatar end 628 → rule y656 (28). */
    paddingTop: 26,
    paddingBottom: 16,
    minHeight: 98,
    nameTop: 3,
    nameFontSize: 16,
    nameLineHeight: 21,
    messageTop: 2,
    messageFontSize: 13,
    messageLineHeight: 15,
    /** "Group" tag x88 y521, 71x21, r44. */
    tagTop: 9,
    tagHeight: 21,
    tagPaddingX: 20,
    tagRadius: 44,
    tagFontSize: 11,
    tagBackground: '#ffebeb',
    /** Badge 5 below the name's top. */
    badgeTop: 8,
  },
  badge: {
    /** 32 disc; x358–391, so 49 in from the right edge. */
    size: 32,
    right: 49,
    fontSize: 15,
  },
  fab: {
    /** 54 disc at x350 y695 — 36 from the right, 207 above the frame's bottom. */
    size: 54,
    right: 36,
    bottom: 207,
    background: 'rgba(90, 117, 157, 0.59)',
    plus: 20,
    plusStroke: 3,
  },
} as const;
