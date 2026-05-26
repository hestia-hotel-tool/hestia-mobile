/**
 * Design tokens extracted from Figma for Tickets screen
 * Based on design: https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=667-3068
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
export const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

/** Use with `useWindowDimensions().width` for rotation / split-screen. */
export function ticketsScaleX(windowWidth: number): number {
  return windowWidth / DESIGN_WIDTH;
}

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

// Ticket Card Styles
export const TICKET_CARD = {
  width: 409,
  height: 216,
  marginHorizontal: 16, // From Figma: card starts at x=16, screen width=440, so (440-409)/2 = 15.5px, rounded to 16px
  marginBottom: 16, // Spacing between cards
  borderRadius: 9,
  backgroundColor: '#f9fafc',
  borderWidth: 1,
  borderColor: '#e3e3e3',
  paddingHorizontal: 22, // From Figma: content starts at x=38, card starts at x=16, so 38-16=22px
  paddingTop: 24, // From Figma: title at y=237, card starts at y=213, so 237-213=24px
  paddingBottom: 19, // From Figma: button at y=602, card ends at y=629, so 629-602-8=19px
} as const;

/**
 * Change Status popover (Figma node 3129:1647 Union, Tickets frame 3129:1500).
 * W=396, left=21 on 440-wide artboard — narrower than the 409-wide card, not edge-aligned to card.
 */
export const TICKET_STATUS_POPOVER = {
  width: 396,
  left: 21,
} as const;

// Ticket Content Styles
export const TICKET_CONTENT = {
  title: {
    left: 22, // From Figma: x=38, card x=16, so 38-16=22px
    top: 24, // From Figma: y=237, card y=213, so 237-213=24px
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  description: {
    left: 22, // From Figma: x=38, card x=16, so 38-16=22px
    top: 47, // From Figma: y=260, card y=213, so 260-213=47px
    fontSize: 13,
    fontWeight: 'light' as const,
    color: '#000000',
    lineHeight: 15,
    maxWidth: 190, // From Figma: description width
  },
  dueDateBadge: {
    backgroundColor: '#FFEBEB', // Light pink/red
    borderRadius: 44,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 11,
    fontWeight: 'light' as const,
    color: '#000000',
    position: 'absolute',
    // Note: Positioning differs between cards:
    // First card (TV not working): centered - left-[calc(50%-140.5px)], top-[calc(50%-167.5px)]
    // Second card (Deliver Laundry): top-left - left-[7px], top-[4px]
  },
  dueDateBadgeCentered: {
    // First card: centered position
    // Card width: 409px, center: 204.5px, offset: -140.5px = 64px from left
    // Card height: 216px, center: 108px, offset: -167.5px = -59.5px (this seems wrong, using visual position instead)
    // Actually, from visual inspection, it appears around 87px from top (below description)
    left: ((409 / 2) - 140.5), // = 64px
    top: 87, // Positioned below description area (visual inspection from Figma)
  },
  dueDateBadgeTopLeft: {
    // Badge positioned below description
    // Description starts at top: 47px, has 2 lines with lineHeight: 15px
    // Description ends approximately at: 47 + (15 * 2) = 77px
    // Add spacing: 77 + 10 = 87px from card top
    top: 87, // Below description area
    left: 18, // Aligned with description (x=34, card x=16, so 34-16=18px, but badge starts at x=34 which is 18px from card left)
  },
  category: {
    iconSize: 21,
    iconWidth: 21, // From Figma: Group width
    iconHeight: 19.4, // From Figma: Group height
    iconLeft: 22, // From Figma: icon x=38, card x=16, so 38-16=22px
    iconTop: 78, // From Figma: icon y=523, card y=445, so 523-445=78px (for second card, but same relative position)
    textLeft: 56, // From Figma: text x=72, card x=16, so 72-16=56px
    textTop: 79, // From Figma: text y=524, card y=445, so 524-445=79px
    fontSize: 16,
    fontWeight: 'regular' as const,
    color: '#a0a0a0',
  },
} as const;

// Location Section Styles
export const TICKET_LOCATION = {
  icon: {
    left: 258, // From Figma: x=274, card x=16, so 274-16=258px
    top: 41, // From Figma: y=254, card y=213, so 254-213=41px
    size: 33,
    backgroundColor: '#ffc107', // Yellow pin color (approximate)
  },
  pinIcon: {
    left: 268, // From Figma: Group x=284, card x=16, so 284-16=268px
    top: 47.5, // From Figma: Group y=260.5, card y=213, so 260.5-213=47.5px
    width: 14,
    height: 20.2, // From Figma: exact height
  },
  label: {
    left: 305, // From Figma: x=321, card x=16, so 321-16=305px
    top: 40, // From Figma: y=253, card y=213, so 253-213=40px
    fontSize: 11,
    fontWeight: 'light' as const,
    color: '#000000',
  },
  roomNumber: {
    left: 305, // From Figma: x=321, card x=16, so 321-16=305px
    top: 56, // From Figma: y=269, card y=213, so 269-213=56px
    fontSize: 13,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
} as const;

// Creator Section Styles
export const TICKET_CREATOR = {
  avatar: {
    left: 22, // From Figma: x=38, card x=16, so 38-16=22px
    top: 164, // From Figma: y=377, card y=213, so 377-213=164px
    size: 25,
  },
  label: {
    left: 60, // From Figma: x=76, card x=16, so 76-16=60px
    top: 163, // From Figma: y=376, card y=213, so 376-213=163px
    fontSize: 11,
    fontWeight: 'light' as const,
    color: '#000000',
  },
  name: {
    left: 60, // From Figma: x=76, card x=16, so 76-16=60px
    top: 177, // From Figma: y=390, card y=213, so 390-213=177px
    fontSize: 11,
    fontWeight: 'regular' as const,
    color: '#000000',
  },
} as const;

// Status Button Styles
export const TICKET_STATUS = {
  button: {
    height: 37,
    borderRadius: 41,
    position: 'absolute',
  },
  done: {
    left: 258, // From Figma: x=274, card x=16, so 274-16=258px
    top: 157, // From Figma: y=602, card y=445, so 602-445=157px
    backgroundColor: '#41d541', // Green
    width: 122,
    textColor: '#ffffff',
    textLeft: 304, // From Figma: text x=320, card x=16, so 320-16=304px absolute
    textTop: 166, // From Figma: text y=611, card y=445, so 611-445=166px absolute
    // Icon position: need to find exact icon position from Figma
    iconLeft: 275, // Calculated: text at 304, spacing ~8px, icon width 20.9, so 304-8-20.9=275.1
    iconTop: 165, // Aligned slightly above text for visual balance
    iconWidth: 20.9,
    iconHeight: 18.5,
  },
  unsolved: {
    left: 243, // From Figma: x=259, card x=16, so 259-16=243px
    top: 157, // From Figma: y=370, card y=213, so 370-213=157px
    backgroundColor: 'rgba(249, 36, 36, 0.06)', // Light red background
    width: 137,
    textColor: '#f92424', // Red text
    textLeft: 288, // From Figma: text x=304, card x=16, so 304-16=288px absolute
    // Vertically center text in button: button top 157, height 37, center = 157 + 18.5 = 175.5px
    // Text height ~18px (fontSize 16), so text top = 175.5 - 9 = 166.5px
    textTop: 166.5, // Vertically centered in button
    // Calculate icon position based on text position and spacing (similar to Done button)
    // Done button: text at 304, icon at 275, spacing = 304 - 275 - 20.9 = 8.1px
    // For Unsolved: text at 288, desired spacing ~8px, so icon left = 288 - 8 - 20.9 = 259.1px
    iconLeft: 259, // Calculated: text at 288, spacing ~8px, icon width 20.9, so 288-8-20.9=259.1
    // Vertically center icon with text: text top is 166.5, text height ~18px, so text center ≈ 175.5px
    // Icon height is 18.5px, so icon center at 175.5px means icon top = 175.5 - 9.25 = 166.25px
    iconTop: 166.25, // Vertically centered with text
    iconWidth: 20.9,
    iconHeight: 18.5,
    iconRotate: 180, // Rotate 180 degrees to make thumb point downward
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
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

