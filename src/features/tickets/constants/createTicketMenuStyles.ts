/**
 * Design tokens extracted from Figma for Create Ticket Menu
 * This menu appears when user clicks the "+ Create" button in Tickets screen
 * Based on design pattern similar to NewChatMenu
 * Design: https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=667-3068
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
export const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

// Create Ticket Menu Styles
export const CREATE_TICKET_MENU = {
  backdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  blurOverlay: {
    intensity: 80,
    tint: 'light' as const,
    darkenerColor: 'rgba(200, 200, 200, 0.6)',
  },
  menuContainer: {
    position: 'absolute',
    top: 125, // Positioned below header (header height 133px, menu starts at 125px)
    left: 97, // Aligned with create button (create button at x=315, menu width ~302px, so left = 315-302/2 = 164px, but using 97px to match NewChatMenu pattern)
    width: 302, // Menu width (similar to NewChatMenu)
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: 'rgba(100, 131, 176, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 35,
    elevation: 10,
    paddingVertical: 8,
    zIndex: 1001,
  },
  menuItem: {
    paddingHorizontal: 30, // Icon at x=127, menu starts at x=97, so 127-97=30px padding
    paddingVertical: 12,
    minHeight: 50,
  },
  iconContainer: {
    width: 27, // Icon width
    height: 27, // Icon height
    marginRight: 13, // Spacing between icon and text (text starts at x=167, icon ends at ~154, so ~13px spacing)
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 27,
    height: 27,
    tintColor: '#1e1e1e', // Dark grey icon color
  },
  divider: {
    height: 1,
    backgroundColor: '#e6e6e6', // Light grey divider
    marginLeft: 30, // Divider starts at x=127, menu starts at x=97, so 30px padding
    marginRight: 15, // Divider width=256, menu width=302, so (302-256-30)/2 = 8px, using 15px for visual balance
    marginVertical: 4,
  },
  bottomButton: {
    position: 'absolute',
    left: 294, // From Figma: x=294 (centered: (440-86)/2 = 177px, but Figma shows 294px from left)
    bottom: 244, // From Figma: y=712, screen height=956, so bottom = 956-712 = 244px from screen bottom
    width: 86,
    height: 54,
    borderRadius: 17, // Or 45px as shown in design context
    backgroundColor: 'rgba(90, 117, 157, 0.59)', // Semi-transparent blue (same as top button)
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1002, // Above menu
  },
  bottomButtonInner: {
    width: 54, // Inner circle size
    height: 54,
    borderRadius: 27, // Circular
    justifyContent: 'center',
    alignItems: 'center',
  },
} as const;

// Menu Item Typography
export const CREATE_TICKET_MENU_TYPOGRAPHY = {
  menuItemText: {
    fontSize: 17,
    fontWeight: 'regular' as const,
    color: '#1e1e1e',
  },
  bottomButtonIcon: {
    fontSize: 32,
    fontWeight: '300' as const,
    color: '#ffffff',
    lineHeight: 32,
  },
} as const;

// Menu Options (to be defined based on design)
export const CREATE_TICKET_MENU_OPTIONS = {
  // Options will be defined when design is available
  // Example: 'newTicket', 'quickTicket', etc.
} as const;

// Colors
export const CREATE_TICKET_MENU_COLORS = {
  background: '#ffffff',
  text: '#1e1e1e',
  divider: '#e6e6e6',
  icon: '#1e1e1e',
  bottomButton: 'rgba(90, 117, 157, 0.59)',
  bottomButtonText: '#ffffff',
  blurDarkener: 'rgba(200, 200, 200, 0.6)',
} as const;

