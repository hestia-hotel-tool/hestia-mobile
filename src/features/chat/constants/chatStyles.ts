/**
 * Design tokens extracted from Figma for Chat screen
 * Based on design: https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=667-2925
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
export const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

// Compact chat header bar height (WhatsApp-style, used for chat detail)
export const CHAT_HEADER_BAR_HEIGHT = 56;

// Header Styles (legacy / list header)
export const CHAT_HEADER = {
  height: 217,
  background: {
    height: 133,
    backgroundColor: '#e4eefe', // Light blue background
  },
  backButton: {
    left: 27,
    top: 69,
    width: 32, // Increased size to match Figma design (same as AllRoomsHeader)
    height: 32, // Increased size to match Figma design (same as AllRoomsHeader)
  },
  title: {
    left: 87, // Positioned after back button: 27 (arrow start) + 32 (arrow width) + 28 (spacing) = 87px to match Figma visual spacing
    top: 69,
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#607aa1',
  },
  messageButton: {
    right: 38, // 440 - 316 - 54 = 38px from right (adjusted for circular button)
    top: 57,
    width: 54,
    height: 54,
    borderRadius: 27, // Half of width/height to make it fully circular
    backgroundColor: 'rgba(90, 117, 157, 0.59)', // Semi-transparent blue
    borderRadiusInner: 27, // Inner circle border radius (same as outer for circular)
  },
} as const;

// Search Bar Styles
export const SEARCH_BAR = {
  container: {
    left: 26,
    top: 158,
    width: 301,
    height: 59,
    borderRadius: 82,
    backgroundColor: '#f1f6fc',
    paddingLeft: 20,
    paddingRight: 20,
  },
  placeholder: {
    left: 46,
    top: 180,
    fontSize: 13,
    fontWeight: 'semiBold' as const,
    color: '#000000',
    opacity: 0.36,
  },
  searchIcon: {
    width: 19,
    height: 19,
    tintColor: '#b1afaf',
    rotation: 270, // Rotated 270 degrees
  },
  filterIcon: {
    left: 354, // Positioned to the right of search bar
    top: 176,
    width: 26,
    height: 12,
  },
} as const;

// Chat List Item Styles
export const CHAT_ITEM = {
  avatar: {
    size: 44,
    left: 27,
    borderRadius: 22, // Circular
  },
  name: {
    left: 88, // Avatar (27) + size (44) + spacing (17) = 88px
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#1e1e1e',
  },
  message: {
    left: 88,
    fontSize: 13,
    fontWeight: 'regular' as const,
    color: '#1e1e1e',
    maxWidth: 181,
  },
  messageLight: {
    fontWeight: 'light' as const, // For messages with sender name prefix
  },
  badge: {
    /** Match BottomTabBar / TabBarItem chat tab badge */
    minHeight: 22,
    minWidth: 22,
    paddingHorizontal: 6,
    backgroundColor: '#FF46A3',
    borderRadius: 11,
    fontSize: 13,
    fontWeight: 'bold' as const,
    color: '#ffffff',
    right: 48, // legacy; list row uses flex layout (kept for any absolute refs)
  },
  groupLabel: {
    backgroundColor: '#ffebeb',
    borderRadius: 44,
    paddingHorizontal: 20,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: 'light' as const,
    color: '#000000',
    left: 88,
  },
  divider: {
    height: 0, // 1px line
    width: 440,
    color: '#e6e6e6', // Light gray
  },
} as const;

// Chat Item Positions (from Figma metadata)
export const CHAT_ITEM_POSITIONS = {
  first: {
    avatar: { top: 269 },
    name: { top: 272 },
    message: { top: 295 },
    groupLabel: { top: 319 },
    badge: { top: 277 },
    divider: { top: 356 },
  },
  second: {
    avatar: { top: 382 },
    name: { top: 385 },
    message: { top: 408 },
    badge: { top: 390 },
    divider: { top: 454 },
  },
} as const;

// Spacing
export const CHAT_SPACING = {
  itemHeight: 98, // Approximate height per chat item (382 - 269 = 113px, but accounting for spacing)
  itemSpacing: 16, // Space between items
  contentPaddingTop: 240, // Space below header (217 header + 23 spacing)
  contentPaddingBottom: 152, // Bottom nav height
} as const;

// Colors
export const CHAT_COLORS = {
  background: '#ffffff',
  headerBackground: '#e4eefe',
  searchBackground: '#f1f6fc',
  badgeBackground: '#FF46A3',
  divider: '#e6e6e6',
  textPrimary: '#1e1e1e',
  textSecondary: '#607aa1',
  textPlaceholder: '#000000', // With 0.36 opacity
} as const;

// Typography
export const CHAT_TYPOGRAPHY = {
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#607aa1',
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#1e1e1e',
  },
  message: {
    fontSize: 13,
    fontWeight: 'regular' as const,
    color: '#1e1e1e',
  },
  messageLight: {
    fontSize: 13,
    fontWeight: 'light' as const,
    color: '#1e1e1e',
  },
  badge: {
    fontSize: 13,
    fontWeight: 'bold' as const,
    color: '#ffffff',
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: 'light' as const,
    color: '#000000',
  },
  searchPlaceholder: {
    fontSize: 13,
    fontWeight: 'semiBold' as const,
    color: '#000000',
    opacity: 0.36,
  },
} as const;

