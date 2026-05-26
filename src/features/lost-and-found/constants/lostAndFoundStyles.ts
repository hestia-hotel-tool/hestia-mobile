/**
 * Design tokens extracted from Figma for Lost and Found screen
 * Based on design: https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=733-662
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
export const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

// Header Styles
export const LOST_AND_FOUND_HEADER = {
  height: 133,
  background: {
    height: 133,
    backgroundColor: '#e4eefe', // Light blue background
  },
  backButton: {
    left: 27,
    top: 69,
    width: 32,
    height: 32,
  },
  title: {
    left: 69, // From Figma: x=69 (centered with back button)
    top: 69,
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#607aa1',
  },
  registerButton: {
    right: 44, // From Figma: x=315, screen width=440, so right = 440-315-81 = 44px
    top: 67,
    plusFontSize: 24, // "+" symbol
    plusFontWeight: 'bold' as const,
    textFontSize: 20, // "Register" text
    textFontWeight: 'light' as const,
    color: '#ff46a3', // Pink color
  },
} as const;

// Tab Navigation Styles
export const LOST_AND_FOUND_TABS = {
  container: {
    top: 158,
    height: 39, // Tab height + indicator + spacing
  },
  tab: {
    fontSize: 16,
    fontWeight: 'light' as const,
    activeFontWeight: 'bold' as const,
    color: '#5a759d',
    inactiveColor: 'rgba(90,117,157,0.55)',
  },
  tabs: {
    created: {
      left: 32, // From Figma: left-[32px]
      top: 158,
      width: 68, // Approximate text width
      indicatorWidth: 68, // From Figma: w-[68px] for indicator
      indicatorLeft: 32, // From Figma: left-[32px] for indicator
    },
    stored: {
      left: 118, // From Figma: left-[118px]
      top: 158,
      width: 54, // Approximate text width
      indicatorWidth: 54,
      indicatorLeft: 118,
    },
    returned: {
      left: 186, // From Figma: left-[186px]
      top: 158,
      width: 68, // Approximate text width
      indicatorWidth: 68,
      indicatorLeft: 186,
    },
    discarded: {
      left: 272, // From Figma: left-[272px]
      top: 158,
      width: 76, // Approximate text width
      indicatorWidth: 76,
      indicatorLeft: 272,
    },
  },
  indicator: {
    height: 4, // From Figma: h-[4px]
    backgroundColor: '#5a759d', // From Figma: bg-[#5a759d]
    borderRadius: 2,
    top: 192, // From Figma: top-[192px] (34px from container top: 192-158=34)
  },
  searchIcon: {
    right: 32, // From Figma: approximately right side
    top: 158, // Same as tabs
    width: 19, // From Figma design
    height: 19,
  },
} as const;

// Item Card Styles
export const LOST_AND_FOUND_CARD = {
  width: 409,
  height: 271,
  marginHorizontal: 16, // From Figma: card starts at x=16
  marginBottom: 16, // Spacing between cards
  borderRadius: 9,
  backgroundColor: '#f9fafc',
  borderWidth: 1,
  borderColor: '#e3e3e3',
  paddingHorizontal: 21, // From Figma: content starts at x=37, card starts at x=16, so 37-16=21px
  paddingTop: 15, // From Figma: title at y=228, card starts at y=213, so 228-213=15px
} as const;

// Item Content Styles
export const LOST_AND_FOUND_CONTENT = {
  itemName: {
    left: 21, // From Figma: x=37, card x=16, so 37-16=21px
    top: 15, // From Figma: y=228, card y=213, so 228-213=15px
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  itemId: {
    left: 149, // From Figma: x=165, card x=16, so 165-16=149px
    top: 17, // From Figma: y=230, card y=213, so 230-213=17px
    fontSize: 14,
    fontWeight: 'light' as const,
    color: '#000000',
  },
  copyIcon: {
    left: 214, // From Figma: x=230, card x=16, so 230-16=214px
    top: 18, // From Figma: y=231, card y=213, so 231-213=18px
    width: 13, // From Figma: width=13
    height: 13, // From Figma: height=13
  },
  location: {
    left: 21, // Same as itemName
    top: 53, // From Figma: y=266, card y=213, so 266-213=53px
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  guestName: {
    left: 21, // Same as itemName
    top: 80, // From Figma: y=293, card y=213, so 293-213=80px
    fontSize: 17,
    fontWeight: 'light' as const,
    color: '#000000',
  },
  roomBadge: {
    left: 168, // From Figma: x=184, card x=16, so 184-16=168px
    top: 80, // Same as guestName
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#000000',
  },
  roomBadgeText: {
    fontSize: 12,
    fontWeight: 'bold' as const,
    color: '#f9fafc',
  },
} as const;

// Stored Location Section
export const LOST_AND_FOUND_STORED_LOCATION = {
  icon: {
    left: 21, // From Figma: x=33, card x=16, so 33-16=21px (adjusted to match padding)
    top: 129, // From Figma: y=342, card y=213, so 342-213=129px
    size: 33,
    backgroundColor: '#f0be1b', // Yellow
  },
  pinIcon: {
    width: 14,
    height: 20.2,
  },
  label: {
    left: 57, // From Figma: x=73, card x=16, so 73-16=57px
    top: 130, // From Figma: y=343, card y=213, so 343-213=130px
    fontSize: 11,
    fontWeight: 'light' as const,
    color: '#000000',
  },
  name: {
    left: 57, // Same as label
    top: 146, // From Figma: y=359, card y=213, so 359-213=146px
    fontSize: 13,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
} as const;

// Registered/Stored By Section
export const LOST_AND_FOUND_REGISTERED_BY = {
  avatar: {
    left: 21, // From Figma: x=37, card x=16, so 37-16=21px
    top: 220, // From Figma: y=433, card y=213, so 433-213=220px
    size: 28,
  },
  label: {
    left: 21, // From Figma: x=35, card x=16, so 35-16=19px, but using 21 for consistency
    top: 194, // From Figma: y=407, card y=213, so 407-213=194px
    fontSize: 11,
    fontWeight: 'light' as const,
    color: '#000000',
  },
  name: {
    left: 55, // From Figma: x=72, card x=16, so 72-16=56px
    top: 219, // From Figma: y=432, card y=213, so 432-213=219px
    fontSize: 13,
    fontWeight: 'bold' as const,
    color: '#1e1e1e',
  },
  timestamp: {
    left: 55, // Same as name
    top: 235, // From Figma: y=448, card y=213, so 448-213=235px
    fontSize: 12,
    fontWeight: 'light' as const,
    color: '#000000',
  },
} as const;

// Item Image
export const LOST_AND_FOUND_IMAGE = {
  left: 250, // From Figma: x=266, card x=16, so 266-16=250px
  top: 13, // From Figma: y=226, card y=213, so 226-213=13px
  width: 146, // First card
  height: 153, // First card
  borderRadius: 10, // First card
  // Second card variations:
  // width: 144, height: 158, borderRadius: 16
} as const;

// Status Button Styles
export const LOST_AND_FOUND_STATUS = {
  button: {
    height: 54,
    borderRadius: 75, // Pill shape
    position: 'absolute',
  },
  stored: {
    left: 278, // legacy (prefer right)
    top: 199, // From Figma: y=412, card y=213, so 412-213=199px
    right: 13, // From Figma: card width 409, 409 - (278 + 118) = 13px
    backgroundColor: '#f0be1b', // Yellow
    width: 118,
    textColor: '#ffffff',
    textLeft: 301, // From Figma: text x=317, card x=16, so 317-16=301px
    textTop: 217, // From Figma: text y=430, card y=213, so 430-213=217px
    textHeight: 18, // From Figma: text height=18px
    iconLeft: 359.6, // From Figma: icon x=375.6, card x=16, so 375.6-16=359.6px
    // Align icon center with text center: text center at 217 + 9 = 226, icon height 8, so icon top = 226 - 4 = 222
    iconTop: 222, // Aligned with text center
    iconWidth: 17, // From Figma: icon width=17px
    iconHeight: 8, // From Figma: icon height=8px
  },
  shipped: {
    left: 278, // legacy (prefer right)
    top: 199, // From Figma: button y=708, second card y=509, so 708-509=199px
    right: 13,
    backgroundColor: '#41d541', // Green
    width: 118,
    textColor: '#ffffff',
    textLeft: 295,
    textTop: 217,
    textHeight: 18,
    iconLeft: 365,
    iconTop: 221,
    iconWidth: 14,
    iconHeight: 10,
  },
  discarded: {
    // Wider label ("Discarded") but keep same right padding as other status pills (118w @ left 278)
    left: 258,
    top: 199,
    right: 13,
    backgroundColor: '#9ca3af', // Gray
    width: 138,
    textColor: '#ffffff',
    // Keep text/icon gap consistent with "Shipped"
    textLeft: 295,
    textTop: 217,
    textHeight: 18,
    iconLeft: 365,
    iconTop: 221,
    iconWidth: 14,
    iconHeight: 10,
  },
  text: {
    fontSize: 16, // From Figma: font-size: 16px
    fontWeight: 'bold' as const, // From Figma: font-weight: bold
    lineHeight: 18, // From Figma: text height=18px
  },
} as const;

// Divider Styles
export const LOST_AND_FOUND_DIVIDER = {
  left: 16, // From Figma: x=16, card x=16, so relative to card: 0, but using 16 for padding
  top: 184, // From Figma: y=397, card y=213, so 397-213=184px
  width: 377, // From Figma: width=408, but accounting for padding: 409-32=377px
  height: 1,
  color: '#e3e3e3',
} as const;

// Spacing
export const LOST_AND_FOUND_SPACING = {
  // Figma (node 2702:6676): first card starts at y=213.
  // Header (133) + tabs row (39) + gap to first card (41) = 213px.
  // Divider sits at y=197, so first card begins below it.
  contentPaddingTop: 213,
  contentPaddingBottom: 152, // Bottom nav height
  cardSpacing: 16, // Space between cards
} as const;

// Colors
export const LOST_AND_FOUND_COLORS = {
  background: '#ffffff',
  headerBackground: '#e4eefe',
  cardBackground: '#f9fafc',
  cardBorder: '#e3e3e3',
  textPrimary: '#000000',
  textSecondary: '#1e1e1e',
  tabActive: '#5a759d',
  tabInactive: 'rgba(90,117,157,0.55)',
  statusStored: '#f0be1b',
  statusShipped: '#41d541',
  locationPin: '#f0be1b', // Yellow
  registerButton: '#ff46a3', // Pink
} as const;

// Typography
export const LOST_AND_FOUND_TYPOGRAPHY = {
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#607aa1',
  },
  registerButton: {
    plusFontSize: 24,
    plusFontWeight: 'bold' as const,
    textFontSize: 20,
    textFontWeight: 'light' as const,
    color: '#ff46a3',
  },
  tab: {
    fontSize: 16,
    fontWeight: 'light' as const,
    activeFontWeight: 'bold' as const,
    color: '#5a759d',
    inactiveColor: 'rgba(90,117,157,0.55)',
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  itemId: {
    fontSize: 14,
    fontWeight: 'light' as const,
    color: '#000000',
  },
  location: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  guestName: {
    fontSize: 17,
    fontWeight: 'light' as const,
    color: '#000000',
  },
  storedLocationLabel: {
    fontSize: 11,
    fontWeight: 'light' as const,
    color: '#000000',
  },
  storedLocationName: {
    fontSize: 13,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  registeredByLabel: {
    fontSize: 11,
    fontWeight: 'light' as const,
    color: '#000000',
  },
  staffName: {
    fontSize: 13,
    fontWeight: 'bold' as const,
    color: '#1e1e1e',
  },
  timestamp: {
    fontSize: 12,
    fontWeight: 'light' as const,
    color: '#000000',
  },
  statusButton: {
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
} as const;

// Registration Form Styles
export const REGISTER_FORM = {
  header: {
    height: 133,
    backgroundColor: '#e4eefe',
    backButton: {
      left: 27,
      top: 69,
      width: 14,
      height: 28,
    },
    title: {
      left: 68.99999809265137, // From Figma
      top: 69,
      fontSize: 24,
      fontWeight: 'bold' as const,
      color: '#607aa1',
    },
  },
  title: {
    left: 31, // From Figma: x=31
    top: 150,
    fontSize: 20,
    fontWeight: 'light' as const,
    color: '#607aa1',
  },
  stepIndicator: {
    left: 32, // From Figma: x=32
    top: 179,
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  progressBar: {
    left: 27, // From Figma: x=27
    top: 216,
    height: 6,
    width: 385, // Total width of all 3 bars
    activeColor: '#5a759d',
    inactiveColor: 'rgba(90,117,157,0.24)',
    bars: [
      { width: 122 }, // Step 1
      { width: 123 }, // Step 2
      { width: 122 }, // Step 3
    ],
  },
  dateTime: {
    label: {
      left: 27, // From Figma: x=27
      top: 248,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#000000',
    },
    dateInput: {
      left: 27, // From Figma: x=27
      top: 288,
      width: 196,
      height: 68,
      borderRadius: 8,
      borderColor: '#afa9ad',
      borderWidth: 1,
    },
    timeInput: {
      left: 237, // From Figma: x=237
      top: 288,
      width: 99,
      height: 68,
      borderRadius: 8,
      borderColor: '#afa9ad',
      borderWidth: 1,
    },
    dateText: {
      left: 42, // From Figma: x=42
      top: 313,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#5a759d',
    },
    timeText: {
      left: 267, // From Figma: x=267
      top: 313,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#5a759d',
    },
  },
  location: {
    label: {
      left: 26, // From Figma: x=26
      top: 382,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#000000',
    },
    roomOption: {
      left: 28, // From Figma: x=28
      top: 425,
      checkboxSize: 28,
      checkboxBorderColor: '#5a759d',
      checkboxBorderWidth: 2,
      textLeft: 66, // From Figma: x=66
      textTop: 430,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#5a759d',
    },
    publicAreaOption: {
      left: 130, // From Figma: x=130
      top: 425,
      checkboxSize: 28,
      checkboxBorderColor: '#5a759d',
      checkboxBorderWidth: 2,
      textLeft: 173, // From Figma: x=173
      textTop: 430,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#5a759d',
    },
  },
  roomNumber: {
    label: {
      left: 25, // From Figma: x=25
      top: 490,
      fontSize: 16,
      fontWeight: 'light' as const,
      color: '#000000',
    },
    selector: {
      left: 23, // From Figma: x=23
      top: 520,
      width: 394,
      height: 98,
      borderRadius: 8,
      borderColor: '#afa9ad',
      borderWidth: 1,
    },
    roomText: {
      left: 64, // From Figma: x=64
      top: 563,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#5a759d',
    },
    guestText: {
      left: 204, // From Figma: x=204
      top: 564,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#5a759d',
    },
    avatar: {
      left: 357, // From Figma: x=357
      top: 563,
      size: 26,
    },
    divider: {
      left: 188, // From Figma: x=188
      top: 546,
      width: 0,
      height: 54,
      color: '#5a759d',
    },
    badge: {
      left: 502, // From Figma: x=502
      top: 568.96,
      size: 20,
      backgroundColor: '#5a759d',
      textColor: '#f9fafc',
      fontSize: 12,
      fontWeight: 'bold' as const,
    },
  },
  pictures: {
    label: {
      left: 26, // From Figma: x=26
      top: 643.96,
      fontSize: 16,
      fontWeight: 'regular' as const,
      color: '#000000',
    },
    image1: {
      left: 26, // From Figma: x=26
      top: 680,
      width: 185,
      height: 158,
      borderRadius: 16,
    },
    image2: {
      left: 223, // From Figma: x=223
      top: 679.96,
      width: 183,
      height: 156,
      borderRadius: 11,
      backgroundColor: '#f2f2f2',
    },
    addIcon: {
      left: 295, // From Figma: x=295
      top: 726,
      width: 33,
      height: 32.832,
    },
  },
  notes: {
    labelContainer: {
      left: 28, // From Figma: x=28
      top: 875,
    },
    label: {
      left: 68.99999809265137, // From Figma: centered
      top: 883,
      fontSize: 18,
      fontWeight: 'bold' as const,
      color: '#000000',
    },
    icon: {
      left: 28, // From Figma: x=28
      top: 875,
      width: 31.9743595123291,
      height: 31.9743595123291,
    },
    text: {
      left: 30, // From Figma: x=30
      top: 957,
      fontSize: 14,
      fontWeight: 'light' as const,
      color: '#000000',
      width: 374,
    },
    divider: {
      left: 28, // From Figma: x=28
      top: 996,
      width: 378,
      height: 0,
      color: '#000000',
    },
  },
  nextButton: {
    left: 36, // From Figma: x=36
    top: 1122,
    width: 351,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#5a759d',
    text: {
      left: 193, // From Figma: x=193 (centered)
      top: 1146,
      fontSize: 18,
      fontWeight: 'regular' as const,
      color: '#ffffff',
    },
  },
  // Step 2 Styles
  step2: {
    foundedBy: {
      label: {
        fontSize: 14,
        fontWeight: 'light' as const,
        color: '#000000',
      },
      field: {
        width: 388,
        height: 68,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#afa9ad',
        paddingHorizontal: 20,
      },
      avatar: {
        size: 32,
      },
      name: {
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#5a759d',
      },
      searchIcon: {
        width: 19,
        height: 19,
      },
    },
    registeredBy: {
      label: {
        fontSize: 14,
        fontWeight: 'light' as const,
        color: '#000000',
      },
      field: {
        width: 388,
        height: 68,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#afa9ad',
        paddingHorizontal: 20,
      },
      avatar: {
        size: 32,
      },
      name: {
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#5a759d',
      },
      searchIcon: {
        width: 19,
        height: 19,
      },
    },
    status: {
      label: {
        fontSize: 14,
        fontWeight: 'light' as const,
        color: '#000000',
      },
      field: {
        width: 387,
        height: 68,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#afa9ad',
        paddingHorizontal: 20,
      },
      icon: {
        size: 27,
      },
      text: {
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#5a759d',
      },
      chevron: {
        width: 14,
        height: 7,
      },
    },
    storedLocation: {
      label: {
        fontSize: 14,
        fontWeight: 'light' as const,
        color: '#000000',
      },
      field: {
        width: 387,
        height: 68,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#afa9ad',
        paddingHorizontal: 20,
      },
      text: {
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#5a759d',
      },
      chevron: {
        width: 14,
        height: 7,
      },
    },
    staffSelector: {
      modal: {
        width: 394,
        maxHeight: 337,
        borderRadius: 8,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
      },
      header: {
        height: 50,
        paddingHorizontal: 18,
        title: {
          fontSize: 17,
          fontWeight: 'bold' as const,
          color: '#607aa1',
        },
        selectedCount: {
          fontSize: 14,
          fontWeight: 'light' as const,
          color: '#000000',
        },
        closeIcon: {
          width: 18,
          height: 18,
        },
      },
      divider: {
        height: 1,
        backgroundColor: '#e3e3e3',
      },
      listItem: {
        height: 60,
        paddingHorizontal: 18,
        paddingVertical: 14,
        avatar: {
          size: 32,
        },
        name: {
          fontSize: 16,
          fontWeight: 'bold' as const,
          color: '#1e1e1e',
        },
        department: {
          fontSize: 14,
          fontWeight: 'light' as const,
          color: '#000000',
        },
        meLabel: {
          fontSize: 11,
          fontWeight: 'regular' as const,
          color: '#5a759d',
        },
        checkmark: {
          fontSize: 18,
          color: '#5a759d',
        },
      },
      footer: {
        paddingVertical: 12,
        seeAll: {
          fontSize: 14,
          fontWeight: 'regular' as const,
          color: '#5a759d',
        },
      },
    },
    statusDropdown: {
      modal: {
        width: 387,
        maxHeight: 200,
        borderRadius: 8,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
      },
      item: {
        height: 60,
        paddingHorizontal: 20,
        paddingVertical: 16,
        icon: {
          size: 27,
        },
        text: {
          fontSize: 16,
          fontWeight: 'regular' as const,
          color: '#5a759d',
        },
        checkmark: {
          fontSize: 18,
          color: '#5a759d',
        },
      },
    },
    locationDropdown: {
      modal: {
        width: 387,
        maxHeight: 200,
        borderRadius: 8,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
      },
      item: {
        height: 60,
        paddingHorizontal: 20,
        paddingVertical: 16,
        text: {
          fontSize: 16,
          fontWeight: 'regular' as const,
          color: '#5a759d',
        },
        checkmark: {
          fontSize: 18,
          color: '#5a759d',
        },
      },
    },
  },
  step3: {
    itemImage: {
      width: 214,
      height: 140,
      borderRadius: 5,
      left: 29,
      top: 243,
    },
    itemDescription: {
      left: 36,
      top: 406,
      fontSize: 16,
      fontWeight: 'light' as const,
      color: '#000000',
      width: 262,
    },
    editIcon: {
      size: 28,
    },
    foundIn: {
      label: {
        left: 36,
        top: 466,
        fontSize: 16,
        fontWeight: 'bold' as const,
        color: '#000000',
      },
      checkbox: {
        left: 37,
        top: 507,
        size: 28,
      },
      guestInfo: {
        left: 40,
        top: 573,
      },
      guestName: {
        left: 84,
        top: 573,
        fontSize: 16,
        fontWeight: 'bold' as const,
        color: '#1e1e1e',
      },
      roomNumber: {
        left: 83,
        top: 593,
        fontSize: 14,
        fontWeight: 'light' as const,
        color: '#000000',
      },
    },
    emailCheckbox: {
      left: 45,
      top: 653,
      size: 28,
      textLeft: 84,
      textTop: 659,
      fontSize: 16,
      color: '#5a759d',
    },
    dateTime: {
      label: {
        left: 45,
        top: 731,
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#000000',
      },
      date: {
        left: 45,
        top: 763,
        fontSize: 16,
        color: '#5a759d',
      },
      time: {
        left: 202,
        top: 763,
        fontSize: 16,
        color: '#5a759d',
      },
    },
    foundedBy: {
      label: {
        left: 45,
        top: 821,
        fontSize: 16,
        fontWeight: 'bold' as const,
        color: '#000000',
      },
      avatar: {
        left: 46,
        top: 857,
        size: 32,
      },
      name: {
        left: 92,
        top: 857,
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#1e1e1e',
      },
      department: {
        left: 93,
        top: 876,
        fontSize: 14,
        fontWeight: 'light' as const,
        color: '#000000',
      },
    },
    registeredBy: {
      label: {
        left: 47,
        top: 927,
        fontSize: 16,
        fontWeight: 'bold' as const,
        color: '#000000',
      },
      avatar: {
        left: 45,
        top: 961,
        size: 32,
      },
      name: {
        left: 91,
        top: 961,
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#1e1e1e',
      },
      department: {
        left: 92,
        top: 980,
        fontSize: 14,
        fontWeight: 'light' as const,
        color: '#000000',
      },
    },
    status: {
      label: {
        left: 47,
        top: 1042,
        fontSize: 16,
        fontWeight: 'bold' as const,
        color: '#000000',
      },
      value: {
        left: 78,
        top: 1078,
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#5a759d',
      },
      icon: {
        left: 51,
        top: 1078,
        size: 18,
      },
    },
    storedLocation: {
      label: {
        left: 55,
        top: 1137,
        fontSize: 16,
        fontWeight: 'regular' as const,
        color: '#000000',
      },
      value: {
        left: 56,
        top: 1161,
        fontSize: 16,
        fontWeight: 'bold' as const,
        color: '#1e1e1e',
      },
    },
    doneButton: {
      left: 44.5, // Centered: (440 - 351) / 2
      top: 1223,
      width: 351,
      height: 70,
      backgroundColor: '#5a759d',
      borderRadius: 0,
      fontSize: 18,
      fontWeight: 'regular' as const,
      color: '#ffffff',
    },
    divider: {
      height: 1,
      backgroundColor: '#c6c5c5',
    },
  },
} as const;

// Item Registered Success Screen
export const ITEM_REGISTERED_SUCCESS = {
      container: {
        width: 440,
        height: 956,
        backgroundColor: '#ffffff',
      },
      successIcon: {
        top: 242,
        left: 144,
        width: 151.24,
        height: 164.983,
      },
      checkmarkIcon: {
        top: 212,
        left: 194,
        width: 51.194,
        height: 39.818,
      },
      itemRegisteredText: {
        top: 435,
        fontSize: 19,
        fontWeight: 'regular' as const,
        color: '#5a759d',
      },
      trackingNumberLabel: {
        top: 514,
        fontSize: 24,
        fontWeight: 'bold' as const,
        color: '#607aa1',
      },
      trackingNumberValue: {
        top: 558,
        left: 144,
        // Slightly larger than original for better readability
        fontSize: 42,
        fontWeight: 'light' as const,
        color: '#000000',
      },
      instructionsText: {
        top: 622,
        fontSize: 16,
        fontWeight: 'light' as const,
        color: '#000000',
        width: 280,
      },
      printButton: {
        top: 723,
        width: 141,
        height: 55,
        borderRadius: 50,
        backgroundColor: 'rgba(100,131,176,0.4)',
      },
      printButtonText: {
        fontSize: 19,
        fontWeight: 'regular' as const,
        color: '#ffffff',
      },
      closeLink: {
        top: 856,
        fontSize: 18,
        fontWeight: 'regular' as const,
        color: '#5a759d',
      },
} as const;

