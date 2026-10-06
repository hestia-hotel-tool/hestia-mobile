/**
 * Design tokens extracted from Figma for Tickets screen
 * Based on design: https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=667-3068
 */

import { scaleX, scaleXForWindowWidth } from '@/utils/responsive';

/*
 * The scale comes from `@/utils/responsive`, not a local copy.
 *
 * This file used to declare its own `DESIGN_WIDTH = 440` and divide
 * `Dimensions.get('window')` by it — one of 31 such copies in the repo, and one
 * of five inside this feature alone. They cannot disagree today, but nothing
 * stopped them, and a second definition is how a design-frame change becomes a
 * bug that only shows on one screen.
 *
 * Both names are re-exported so consumers did not have to change.
 */
export { scaleX };

/** Use with `useWindowDimensions().width` for rotation / split-screen. */
export const ticketsScaleX = scaleXForWindowWidth;

// Header Styles
export const TICKETS_HEADER = {
  height: 133,
  background: {
    height: 133,
    backgroundColor: '#e4eefe', // Light blue background
  },
  backButton: {
    left: 27,
    top: 69,
    width: 32, // Same size as Chat/AllRooms headers
    height: 32,
  },
  title: {
    left: 69, // From Figma: x=69
    top: 69,
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#607aa1',
  },
  // Create Ticket AI (Figma frame 152×74, node 3005:59 under 667:3068).
  // Vertical position is derived in TicketsHeader to align with backButton center.
  createButton: {
    right: 27,
    width: 152,
    height: 74,
  },
} as const;

/** Same vertical center as back arrow for Tickets header controls */
export function getTicketsCreateButtonTopPx(): number {
  const { backButton, createButton } = TICKETS_HEADER;
  return backButton.top + (backButton.height - createButton.height) / 2;
}

/**
 * How far the Tickets header — and everything positioned below it — drops to
 * clear the top inset.
 *
 * Figma 667-3068 is notch-naive: its topmost control, the Create Ticket pill,
 * sits at y=47, which is 42pt on an iPhone 16 Pro and therefore *behind* the
 * 59pt Dynamic Island. Shifting by the smallest amount that clears the inset
 * preserves every gap the frame specifies and is exactly zero on a device with
 * no inset, so the frame still renders as drawn where it can.
 *
 * Shared rather than computed twice: the header, the tab row and the scroll
 * content all hang off absolute tops measured from the screen edge, so they
 * have to move together or they collide.
 */
export function getTicketsTopShift(insetTop: number, scale: number): number {
  return Math.max(0, insetTop - getTicketsCreateButtonTopPx() * scale);
}

// Tab Navigation Styles
export const TICKETS_TABS = {
  container: {
    top: 158,
    height: 31, // Tab height + indicator
  },
  tab: {
    fontSize: 16,
    fontWeight: 'light' as const,
    color: '#5a759d',
    activeFontWeight: 'bold' as const,
    spacing: 53, // Spacing between tabs (All: x=170, My Tickets ends at ~117, so ~53px spacing)
  },
  tabs: {
    myTickets: {
      left: 25,
      top: 158,
      width: 82, // Text width from Figma
      indicatorWidth: 92, // Indicator width from Figma (wider than text)
    },
    all: {
      left: 170,
      top: 158,
      width: 18, // Text width from Figma
      indicatorWidth: 18, // Same as text width
    },
    open: {
      left: 223,
      top: 158,
      width: 41, // Text width from Figma
      indicatorWidth: 41, // Same as text width
    },
    closed: {
      left: 287,
      top: 158,
      width: 51, // Text width from Figma
      indicatorWidth: 51, // Same as text width
    },
  },
  indicator: {
    height: 4,
    backgroundColor: '#5a759d',
    borderRadius: 2,
    top: 189, // Below tabs (y=189 from screen top, container top=158, so 189-158=31px from container top)
  },
} as const;

/**
 * Change Status popover (Figma node 3129:1647 Union, Tickets frame 3129:1500).
 * W=396, left=21 on 440-wide artboard — narrower than the 409-wide card, not edge-aligned to card.
 */
export const TICKET_STATUS_POPOVER = {
  width: 396,
  left: 21,
} as const;

// Divider Styles
export const TICKET_DIVIDER = {
  left: 0, // From Figma: x=16, card x=16, so relative to card: 0
  top: 135, // From Figma: y=348, card y=213, so 348-213=135px
  width: 409, // Same as card width
  height: 1,
  color: '#e3e3e3', // Light grey
} as const;

// Spacing
export const TICKETS_SPACING = {
  contentPaddingTop: 220, // Header (133) + tabs (31) + spacing (56) = 220px
  contentPaddingBottom: 152, // Bottom nav height
  cardSpacing: 16, // Space between cards
} as const;

// Colors
export const TICKETS_COLORS = {
  background: '#ffffff',
  headerBackground: '#e4eefe',
  cardBackground: '#f9fafc',
  cardBorder: '#e3e3e3',
  textPrimary: '#000000',
  textSecondary: '#5a759d',
  textTertiary: '#a0a0a0',
  tabActive: '#5a759d',
  tabInactive: '#5a759d', // Same color but different weight
  dueDateBadge: '#FFEBEB',
  statusDone: '#41d541',
  statusUnsolved: '#f92424',
  statusUnsolvedBg: 'rgba(249, 36, 36, 0.06)',
  locationPin: '#ffc107', // Yellow (approximate)
} as const;

// Typography
export const TICKETS_TYPOGRAPHY = {
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#607aa1',
  },
  tab: {
    fontSize: 16,
    fontWeight: 'light' as const,
    activeFontWeight: 'bold' as const,
    color: '#5a759d', // All tabs use same color, weight differs
    activeColor: '#5a759d', // Active tab color (same, but bold weight)
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  ticketDescription: {
    fontSize: 13,
    fontWeight: 'light' as const,
    color: '#000000',
    lineHeight: 15,
  },
  dueDate: {
    fontSize: 11,
    fontWeight: 'light' as const,
    color: '#000000',
  },
  category: {
    fontSize: 16,
    fontWeight: 'regular' as const,
    color: '#a0a0a0',
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: 'light' as const,
    color: '#000000',
  },
  locationRoom: {
    fontSize: 13,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  creatorLabel: {
    fontSize: 11,
    fontWeight: 'light' as const,
    color: '#000000',
  },
  creatorName: {
    fontSize: 11,
    fontWeight: 'regular' as const,
    color: '#000000',
  },
  statusButton: {
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
} as const;

