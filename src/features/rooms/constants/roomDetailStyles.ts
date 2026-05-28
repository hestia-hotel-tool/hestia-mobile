/**
 * Room Detail Screen Styles - Exact values from Figma
 * Layout reference: Room Detail - Overview (node 1772-104)
 * https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=1772-104
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
export const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

// Header Section (Yellow Background)
export const ROOM_DETAIL_HEADER = {
  height: 232,
  backgroundColor: '#f0be1b', // Yellow
  backButton: {
    left: 26,
    top: 69,
    width: 35, // Increased from 28
    height: 18, // Increased from 14 (maintaining aspect ratio)
  },
  roomNumber: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#ffffff',
    top: 69,
    // Centered
  },
  roomCode: {
    fontSize: 17,
    fontWeight: 'light' as const,
    color: '#ffffff',
    top: 103,
    // Centered
  },
  statusIndicator: {
    left: 131,
    top: 176,
    width: 168,
    height: 30.769,
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#ffffff',
  },
  profilePicture: {
    left: 352,
    top: 56,
    width: 54,
    height: 54,
  },
  // Flagged state (Figma node 2333-646) - when user opens room detail from flagged card
  flagged: {
    headerBackground: '#FFEBEB',
    roomNumberColor: '#F92424',
    roomCodeColor: '#6C7D99',
    backArrowTint: '#F92424',
    pill: {
      background: '#FFEBEB',
      textAndIconTint: '#F92424',
      borderRadius: 45,
      flagIcon: { width: 24, height: 24 },
      dropdownArrow: { width: 24.367, height: 25.434 },
    },
  },
  // Paused state (Figma node 2333-132) - light header, black/dark text/icons, "Paused at" below
  paused: {
    headerBackground: '#FCF1CF',
    roomNumberColor: '#334866',
    roomCodeColor: '#6C7D99',
    backArrowTint: '#6C7D99',
    statusTextAndIconColor: '#000000',
    pausedTimeColor: '#6C7D99',
  },
  // Return Later state - light header #FCF1CF, time only + remaining countdown
  returnLater: {
    headerBackground: '#FCF1CF',
    backArrowTint: '#6C7D99',
    roomNumberColor: '#334866',
    roomCodeColor: '#6C7D99',
    statusTextAndIconColor: '#000000',
    returnTimeColor: '#6C7D99',
  },
  // Refused Service — light blue header (Figma node 2333-835, Arrival room detail)
  refuseServiceLight: {
    headerBackground: '#e4eefe',
    backArrowTint: '#6C7D99',
    roomNumberColor: '#334866',
    roomCodeColor: '#334866',
    statusTextAndIconColor: '#334866',
    subtitleColor: '#000000',
  },
  // Refuse Service / Promise Time - dark header (white text)
  specialDark: {
    headerBackground: '#202A2F',
  },
} as const;

// Tab Navigation
export const DETAIL_TABS = {
  container: {
    top: 252,
    height: 29, // 252 to 281
  },
  tabs: {
    fontSize: 16,
    fontWeight: 'bold' as const, // Active tab
    fontWeightInactive: 'light' as const, // Inactive tabs
    color: '#5a759d',
    spacing: 122, // Space between tabs
  },
  overview: {
    left: 21,
    top: 252,
  },
  tickets: {
    left: 143,
    top: 252,
  },
  checklist: {
    left: 235,
    top: 252,
  },
  history: {
    left: 362,
    top: 252,
  },
  underline: {
    height: 4,
    backgroundColor: '#5a759d',
    left: 15,
    top: 281,
    width: 92,
  },
} as const;

// Content Area
export const CONTENT_AREA = {
  top: 285,
  backgroundColor: '#ffffff',
  backgroundTop: '#f1f3f8', // Light gray background at top
  backgroundTopHeight: 285,
} as const;

// Guest Info Section
export const GUEST_INFO = {
  title: {
    fontSize: 15,
    fontWeight: 'bold' as const,
    color: '#000000',
    left: 20, // From Figma: left: calc(50%-205px) = 220-205 = 15px, but actual visual shows ~20px
    top: 303, // Absolute position from top of screen
  },
  divider: {
    left: 0,
    top: 510,
    width: 448,
    height: 1,
    color: '#c6c5c5',
  },
  divider2: {
    left: 0,
    top: 625,
    width: 448,
    height: 1,
    color: '#c6c5c5',
  },
  // Vertical spacing (px) between rows for proper alignment
  rowGap: 10, // gap between name row and date/time/count row
  arrival: {
    icon: {
      left: 21,
      top: 349,
      width: 28.371,
      height: 29.919,
    },
    name: {
      left: 77, // 21 + 21 icon + 12 gap + 23 name start
      top: 349,
      fontSize: 14,
      fontWeight: 'bold' as const,
      color: '#000000',
    },
    numberBadge: {
      left: 189,
      top: 350,
      fontSize: 12,
      fontWeight: 'light' as const,
      color: '#334866',
    },
    categoryBadge: {
      left: 209,
      top: 349,
      backgroundColor: '#41d541',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 'bold' as const,
      color: '#ffffff',
    },
    dates: {
      left: 79,
      top: 377, // name (349) + 28
      fontSize: 14,
      fontWeight: 'light' as const,
      color: '#000000',
    },
    occupancy: {
      iconLeft: 172, // date block ~79+90 + 12 spacing
      textLeft: 191,
      top: 378,
      fontSize: 14,
      fontWeight: 'light' as const,
      color: '#000000',
    },
    eta: {
      left: 223, // occupancy text ~191+20 + 12 spacing
      top: 377,
      fontSize: 14,
      fontWeight: 'regular' as const,
      color: '#000000',
    },
    specialInstructions: {
      title: {
        left: 20, // From Figma: left: calc(50%-200px) = 20px (consistent with Guest Info)
        top: 417,
        fontSize: 13,
        fontWeight: 'bold' as const,
        color: '#000000',
      },
      text: {
        left: 20,
        top: 442,
        fontSize: 13,
        fontWeight: 'light' as const,
        color: '#000000',
        width: 392,
      },
    },
  },
  departure: {
    icon: {
      left: 21,
      top: 542,
      width: 28.371,
      height: 29.919,
    },
    name: {
      left: 77,
      top: 542,
      fontSize: 14,
      fontWeight: 'bold' as const,
      color: '#000000',
    },
    numberBadge: {
      left: 157,
      top: 543,
      fontSize: 12,
      fontWeight: 'light' as const,
      color: '#334866',
    },
    categoryBadge: {
      left: 177,
      top: 542,
      backgroundColor: '#f92424',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 'bold' as const,
      color: '#ffffff',
    },
    dates: {
      left: 78,
      top: 568,
      fontSize: 14,
      fontWeight: 'light' as const,
      color: '#000000',
    },
    occupancy: {
      iconLeft: 171,
      textLeft: 190,
      top: 566,
      fontSize: 14,
      fontWeight: 'light' as const,
      color: '#000000',
    },
    edt: {
      left: 230,
      top: 567,
      fontSize: 14,
      fontWeight: 'regular' as const,
      color: '#000000',
    },
  },
  // Stayover/Turndown (Figma 1772-406): Guest Info at 310, guest block 360, special 441/466, divider 536
  stayover: {
    icon: {
      left: 29,
      top: 339,
      width: 28.371,
      height: 29.919,
    },
    name: {
      left: 122,
      top: 360,
      fontSize: 14,
      fontWeight: 'bold' as const,
      color: '#000000',
    },
    numberBadge: {
      left: 232,
      top: 361,
      fontSize: 12,
      fontWeight: 'light' as const,
      color: '#334866',
    },
    categoryBadge: {
      left: 122,
      top: 341,
      fontSize: 13,
      fontWeight: 'bold' as const,
      color: '#3BC1F6',
    },
    dates: {
      left: 122,
      top: 388,
      fontSize: 14,
      fontWeight: 'light' as const,
      color: '#000000',
    },
    occupancy: {
      iconLeft: 207,
      textLeft: 226,
      top: 389,
      fontSize: 14,
      fontWeight: 'light' as const,
      color: '#000000',
    },
    eta: {
      left: 258,
      top: 388,
      fontSize: 14,
      fontWeight: 'regular' as const,
      color: '#000000',
    },
    specialInstructions: {
      title: {
        left: 24,
        top: 441,
        fontSize: 13,
        fontWeight: 'bold' as const,
        color: '#000000',
      },
      text: {
        left: 24,
        top: 466,
        fontSize: 13,
        fontWeight: 'light' as const,
        color: '#000000',
        width: 392,
      },
    },
  },
} as const;

// Notes Section - Positioned after Lost and Found section
export const NOTES_SECTION = {
  icon: {
    left: 32, // From Figma: icon left position (Group464)
    top: 1105, // From Figma: icon top position (inset calculation)
    width: 31.974,
    height: 31.974,
  },
  badge: {
    left: 59, // From Figma: left: 59px (absolute position) - overlays on icon
    top: 1109, // From Figma: top: 1109px (absolute position)
    fontSize: 15,
    fontWeight: 'light' as any,
    color: '#ffffff',
    backgroundColor: '#f92424', // Red badge (Ellipse7 in Figma)
    width: 20.455,
    height: 20.455,
    borderRadius: 10.2275,
  },
  badgeText: {
    left: 65.55, // From Figma: left: 65.55px (centered in badge)
    top: 1110.45, // From Figma: top: 1110.45px (centered in badge)
  },
  title: {
    left: 90, // From Figma: left: calc(50%-130px) = 220 - 130 = 90px (not 32px!)
    top: 1110, // From Figma: top: 1110px (absolute position)
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  addButton: {
    left: 335, // From Figma: left: 335px (absolute position)
    top: 1098, // From Figma: top: 1098px (absolute position)
    width: 74,
    height: 39,
    borderRadius: 41,
    borderWidth: 1,
    borderColor: '#000000',
    fontSize: 14,
    fontWeight: 'light' as const,
    color: '#000000',
  },
  divider: {
    left: 0,
    top: 1075.09, // From Figma: divider after Lost & Found box (940 + 97 = 1037, but Figma shows no visible divider)
    width: 448,
    height: 1,
    color: '#c6c5c5',
  },
  note: {
    text: {
      left: 27, // From Figma: calc(50%-185px) = 220-185 = 35px, but visually ~27px for left padding
      top: 1169, // From Figma: first note text at top: 1169px (absolute position)
      fontFamily: 'Helvetica',
      fontSize: 13,
      fontStyle: 'normal' as const,
      fontWeight: '300' as const,
      color: '#000',
      width: 353,
      // line-height: normal (omit lineHeight for default)
    },
    profilePicture: {
      left: 36, // From Figma: left: 36px (absolute position for profile picture)
      top: 1230, // From Figma: top: 1230px (absolute position for first profile picture)
      width: 25,  // 25px
      height: 25, // 25px
    },
    staffName: {
      left: 70, // From Figma: left: 70px (absolute position for staff name)
      top: 1235, // From Figma: top: 1235px (absolute position for first staff name)
      fontFamily: 'Helvetica',
      fontSize: 11,
      fontStyle: 'normal' as const,
      fontWeight: '700' as const, // bold
      color: '#000',
      // line-height: normal (omit for default)
    },
    note2: {
      textTop: 1265, // Second note text (if any - from visual spacing)
      profileTop: 1326, // Second profile picture (if any)
      staffNameTop: 1331, // Second staff name (if any)
    },
  },
} as const;

// Lost and Found Section - Positioned after Assigned/Task card
export const LOST_AND_FOUND = {
  title: {
    left: 32,
    top: 906, // From Figma: top: 906px (updated from 856.09px to match Figma exactly)
    fontSize: 15,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  box: {
    left: 20, // From Figma: left: 20px (updated from 25px)
    top: 940, // From Figma: top: 940px (updated from 895.09px)
    width: 390,
    height: 97,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(90, 117, 157, 0.23)', // rgba(90, 117, 157, 0.23)
    borderStyle: 'solid' as const, // Changed from dashed to solid
    backgroundColor: '#F9FAFC',
  },
  icon: {
    left: 42, // From Figma absolute position (updated for correct horizontal centering)
    top: 960, // From Figma: absolute top: 960px (icon starts here)
    width: 53.176,
    height: 58.008,
  },
  plusIcon: {
    left: 95, // From Figma: left: 95px (absolute position)
    top: 952, // From Figma: absolute top position
    fontSize: 42,
    fontWeight: 'light' as const,
    color: '#5a759d',
  },
  addPhotosText: {
    left: 51, // From Figma: calc(50%-51px) centered position for text
    top: 970, // From Figma: absolute top position
    fontSize: 19,
    fontWeight: 'bold' as const,
    color: '#5a759d',
  },
} as const;

// Card container for Assigned to and Task sections
export const ASSIGNED_TASK_CARD = {
  left: 20, // From Figma: left: 20px (updated from 25px to match Figma exactly)
  top: 674, // From Figma: top: 674px (updated from 650px to match Figma exactly)
  width: 390, // Card width from Figma
  height: 206.09, // From Figma: height: 206.09px (reverted to original Figma value)
  borderRadius: 9,
  backgroundColor: '#f9fafc',
  borderWidth: 1,
  borderColor: '#e3e3e3',
  paddingHorizontal: 16, // Padding inside card
  paddingVertical: 16, // Padding inside card
  divider: {
    // Divider between Assigned to and Task sections
    // Positioned with equal left and right padding matching card padding
    left: 0, // Relative to card content area (starts at content area edge)
    top: 80, // Reduced from 90px to bring divider closer to Assigned to section
    width: 358, // Full width minus padding (390 - 16*2 = 358) - ensures equal left and right padding
    height: 1,
    backgroundColor: '#e3e3e3', // Same as card border color
  },
} as const;

// Assigned to Section - Title is outside card, content is inside card
export const ASSIGNED_TO = {
  title: {
    left: 32, // From Figma: left: calc(50%-193px) = 32px (absolute position from screen left)
    top: 644, // From Figma: top: 644px (updated from 630px to match Figma exactly)
    fontSize: 15,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  profilePicture: {
    left: 15, // Relative to card content area (31 - 16 = 15)
    top: 17, // Relative to card content area top (33 - 16 padding = 17px)
    width: 35,
    height: 35,
  },
  staffName: {
    left: 69, // Relative to card content area (85 - 16 = 69)
    top: 18, // Relative to card content area top (aligned with profile picture top)
    fontSize: 13,
    fontWeight: 'bold' as const,
    color: '#1e1e1e',
  },
  department: {
    left: 69, // Same as staffName
    top: 34, // Below staff name (18 + 13 + 3 spacing = 34)
    fontSize: 11,
    fontWeight: 'light' as const,
    color: '#5a759d', // Lighter grey color
  },
  reassignButton: {
    left: 236, // Relative to card content area (390 - 16 - 122 - 16 = 236px from content area left)
    top: 9, // Relative to card content area top (25 - 16 padding = 9px)
    width: 122,
    height: 49,
    borderRadius: 41,
    backgroundColor: '#f1f6fc',
    fontSize: 18,
    fontWeight: 'regular' as const,
    color: '#5a759d',
  },
} as const;

// Task Section - Inside card container, positioned below Assigned to
// Based on Figma design: Task text and Add button are horizontally aligned within the card
export const TASK_SECTION = {
  title: {
    left: 36, // From Figma: absolute left: 36px (will be used as relative to card)
    top: 777, // From Figma: absolute top: 777px (will be converted to relative to card)
    fontSize: 14, // From Figma: text-[14px] (updated from 15px)
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  addButton: {
    left: 335, // From Figma: absolute left: 335px (will be converted to relative to card)
    top: 1098, // From Figma: absolute top: 1098px (note: this is for Notes section, Task button at 761px)
    width: 74,
    height: 39,
    borderRadius: 41,
    borderWidth: 1,
    borderColor: '#000000',
    fontSize: 14,
    fontWeight: 'light' as const,
    color: '#000000',
  },
  // Add button for Task section specifically
  taskAddButton: {
    left: 311, // From Figma: left: 311px (absolute position)
    top: 761, // From Figma: top: 761px (absolute position for Task Add button)
    width: 74,
    height: 39,
  },
} as const;

// Urgent Badge
export const URGENT_BADGE = {
  left: 376,
  top: 870,
  fontSize: 13,
  fontWeight: 'bold' as const,
  color: '#ffffff',
  backgroundColor: '#f92424', // Red
} as const;

// Stayover/Turndown Specific Constants
// These room types have smaller card height (183px vs 206.09px)
// and display actual lost & found items instead of empty box
export const STAYOVER_TURNDOWN = {
  cardHeight: 183, // Smaller card height for Stayover/Turndown
  lostAndFoundItem: {
    image: {
      width: 76,
      height: 80,
      borderRadius: 10,
    },
    name: {
      fontSize: 19,
      fontWeight: 'bold' as const,
      color: '#5a759d',
    },
    description: {
      fontSize: 11,
      fontWeight: 'light' as const,
      color: '#000000',
    },
    status: {
      fontSize: 12,
      fontWeight: 'bold' as const,
      color: '#ffffff',
    },
    location: {
      fontSize: 12,
      fontWeight: 'regular' as const,
      color: '#000000',
    },
  },
} as const;

// History Section
export const HISTORY_SECTION = {
  container: {
    paddingTop: 20 * scaleX,
    paddingHorizontal: 20 * scaleX,
    paddingBottom: 40 * scaleX,
  },
  downloadButton: {
    width: 179 * scaleX,
    height: 49 * scaleX,
    borderRadius: 41 * scaleX,
    backgroundColor: '#F1F6FC',
    marginBottom: 24 * scaleX,
    alignItems: 'center', // Center content inside button
  },
  downloadButtonText: {
    fontSize: 14 * scaleX,
    fontWeight: 'regular' as const,
    color: '#000000',
  },
  dateSeparator: {
    marginTop: 24 * scaleX,
    marginBottom: 16 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 14 * scaleX,
    fontWeight: 'bold' as const,
    color: '#1e1e1e',
    paddingHorizontal: 12 * scaleX,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  timelineContainer: {
    position: 'relative',
    paddingLeft: 20 * scaleX, // Space for timeline connector
  },
  timelineConnector: {
    position: 'absolute',
    left: 12 * scaleX, // Center of avatar circle (24px / 2)
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#5a759d', // Blue color
  },
  eventItem: {
    flexDirection: 'row',
    marginBottom: 20 * scaleX,
    position: 'relative',
  },
  avatarContainer: {
    width: 24 * scaleX,
    height: 24 * scaleX,
    borderRadius: 12 * scaleX,
    marginRight: 12 * scaleX,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  initialsCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 12 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 12 * scaleX,
    fontWeight: 'bold' as const,
    color: '#ffffff',
  },
  eventContent: {
    flex: 1,
  },
  eventDescription: {
    fontSize: 14 * scaleX,
    fontWeight: 'regular' as const,
    color: '#000000',
    marginBottom: 4 * scaleX,
  },
  eventTimestamp: {
    fontSize: 12 * scaleX,
    fontWeight: 'light' as const,
    color: '#999999',
  },
} as const;
