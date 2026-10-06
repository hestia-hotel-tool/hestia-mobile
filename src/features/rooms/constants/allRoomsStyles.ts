/**
 * Design tokens extracted from Figma for All Rooms screen
 * Based on design: https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=1-1172
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
export const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

/** Extra space between room header and guest/status block so content isn't flush */
export const CONTENT_OFFSET_TOP = 12;

// Card Dimensions - different card types have different content so heights differ
// Heights include CONTENT_OFFSET_TOP so guest/status block has breathing room below header
export const CARD_DIMENSIONS = {
  width: 426,
  heights: {
    standard: 177 + CONTENT_OFFSET_TOP,        // Departure: 1 guest only
    withGuestInfo: 185 + CONTENT_OFFSET_TOP,   // Arrival / Stayover / Turndown: 1 guest
    withNotes: 244 + CONTENT_OFFSET_TOP,       // Any type with notes/rush section: 1 guest + notes container
    arrivalDeparture: 292 + CONTENT_OFFSET_TOP, // Arrival/Departure: 2 guest infos
  },
  marginHorizontal: 7,
  marginBottom: 16,
  borderRadius: 9,
} as const;

// Card Colors - Exact values from Figma design
export const CARD_COLORS = {
  background: '#f9fafc', // Default white/light gray for all non-priority cards
  border: '#e3e3e3',
  priorityBackground: 'rgba(249, 36, 36, 0.08)', // Light pink/reddish for priority cards (exact from Figma)
  priorityBorder: '#f92424', // Red border for priority cards
  /** Paused assignment — matches room detail paused header (Figma 2333-132) */
  pausedBackground: '#FCF1CF',
} as const;

// Room Header Styles - Exact values from Figma
export const ROOM_HEADER = {
  paddingTop: 17,
  paddingHorizontal: 14,
  icon: {
    width: 29.348,
    height: 22.581,
    left: 14, // Room 201: left-[14px], Room 202/203/204: left-[21px] (average: 17.5, using 14 for priority card)
    top: 24.59, // Exact from Figma
  },
  iconArrivalDeparture: {
    width: 45, // Updated size for Arrival/Departure icon
    height: 29.348,
  },
  iconStandard: {
    left: 21, // For non-priority cards
  },
  roomNumber: {
    fontSize: 21,
    fontWeight: 'bold' as const,
    color: '#334866',
    left: 72, // Room 201: left-[72px], Room 202/203/204: left-[79px] (using 72 for priority, 79 for standard)
    top: 17, // Exact from Figma
    lineHeight: 27,
  },
  roomNumberStandard: {
    left: 79, // For non-priority cards
  },
  roomType: {
    fontSize: 12,
    fontWeight: 'light' as const,
    color: '#334866',
    left: 111, // Room 201 (Priority): left-[111px] top-[22px]
    top: 22, // Exact from Figma - consistent across all cards
    lineHeight: 14,
  },
  roomTypeStandard: {
    left: 118, // Room 202/203/204/205: left-[118px] top-[22px] (all standard cards)
  },
  category: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#334866',
    left: 70, // Room 201: left-[70px], Room 202/203/204: left-[77px]
    top: 40, // Exact from Figma
    lineHeight: 19,
  },
  categoryStandard: {
    left: 77, // For non-priority cards
  },
  chevron: {
    width: 7,
    height: 14,
    right: 15, // 426 - 401 - 7 = 18, but Figma shows left-[401px] which is 426-401=25px from right, icon width 7px, so right: 18px
    top: 29, // Exact from Figma
  },
  priorityBadge: {
    fontSize: 12,
    fontWeight: 'light' as const,
    color: '#334866',
    positions: {
      standard: { left: 185, top: 82 }, // Room 203 badge "11" (relative to card top: 853-771=82px)
    },
  },
} as const;

// Guest Info Styles - Exact values from Figma
export const GUEST_INFO = {
  // Container positions
  container: {
    left: 73, // Room 201 (Priority): left-[73px]
  },
  containerStandard: {
    left: 73, // Room 204: name/date at x=80 absolute, card starts at x=7, so relative to card: 80-7=73px
  },
  containerWithNotes: {
    left: 70, // Room 203: name at x=77 absolute, card starts at x=7, so relative to card: 77-7=70px
  },
  icon: {
    width: 28.371,
    height: 29.919,
  },
  /** Two-column layout: image left, info right (Figma) */
  guestImage: {
    width: 65, // Increased to be taller than guest info height
    height: 65, // Increased to be taller than guest info height
    borderRadius: 5,
    marginRight: 12, // Gap between image and info column (increased for better spacing)
  },
  infoColumn: {
    marginTop: 0,
    gapBetweenNameAndDate: 2,
    gapBetweenDateAndTime: 4,
  },
  iconArrivalDeparture: {
    width: 28.371, // Larger icon size for Arrival/Departure guest icons
    height: 29.919,
    positions: {
      firstGuest: { left: 17, top: 88 + CONTENT_OFFSET_TOP }, // Room 201 first guest icon
      secondGuest: { left: 18, top: 173 + CONTENT_OFFSET_TOP }, // Room 201 second guest icon
    },
  },
  iconStandardDeparture: {
    left: 17,
    top: 93 + CONTENT_OFFSET_TOP,
  },
  iconStandardArrival: {
    left: 17,
    top: 87 + CONTENT_OFFSET_TOP,
  },
  iconWithNotes: {
    left: 14,
    top: 89 + CONTENT_OFFSET_TOP,
  },
  // Guest name styles and positions
  name: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: '#000000',
    lineHeight: 18, // Increased from 10px to 18px to prevent text clipping (font size 14px needs at least 18px line height)
    top: 87 + CONTENT_OFFSET_TOP, // Room 201 first guest
  },
  nameSecond: {
    top: 162 + CONTENT_OFFSET_TOP, // Room 201 second guest
  },
  nameStandard: {
    top: 92 + CONTENT_OFFSET_TOP, // Room 202 (Departure)
  },
  nameStandardArrival: {
    top: 87 + CONTENT_OFFSET_TOP, // Room 204 (Arrival)
  },
  nameWithNotes: {
    top: 86 + CONTENT_OFFSET_TOP, // Room 203
  },
  // Date range styles and positions
  dateRange: {
    fontSize: 14,
    fontWeight: 'light' as const,
    color: '#000000',
    lineHeight: 17,
    top: 109 + CONTENT_OFFSET_TOP, // Room 201 first
  },
  dateRangeSecond: {
    top: 184 + CONTENT_OFFSET_TOP, // Room 201 second
  },
  dateRangeStandard: {
    top: 114 + CONTENT_OFFSET_TOP, // Room 202 (Departure)
  },
  dateRangeStandardArrival: {
    top: 105 + CONTENT_OFFSET_TOP, // Room 204 (Arrival) - reduced from 109 to 105 for much tighter spacing
  },
  dateRangeWithNotes: {
    top: 108 + CONTENT_OFFSET_TOP, // Room 203
  },
  // Time (ETA/EDT) positions - Exact from Figma
  time: {
    fontSize: 14,
    fontWeight: 'regular' as const,
    color: '#000000',
    lineHeight: 18,
    positions: {
      priorityFirst: { left: 75, top: 130 + CONTENT_OFFSET_TOP },
      prioritySecond: { left: 73, top: 204 + CONTENT_OFFSET_TOP },
      standardDeparture: { left: 154, top: 115 + CONTENT_OFFSET_TOP },
      standardArrival: { left: 154, top: 105 + CONTENT_OFFSET_TOP }, // Aligned with date (was 110, now 105)
      withNotes: { left: 151, top: 109 + CONTENT_OFFSET_TOP },
    },
  },
  // Guest count positions - Exact from Figma
  guestCount: {
    fontSize: 14,
    fontWeight: 'light' as const,
    color: '#000000',
    lineHeight: 18,
    icon: {
      width: 13,
      height: 12,
    },
    positions: {
      priorityFirst: { iconLeft: 151, textLeft: 170, iconTop: 109 + CONTENT_OFFSET_TOP, textTop: 109 + CONTENT_OFFSET_TOP },
      prioritySecond: { iconLeft: 151, textLeft: 170, iconTop: 184 + CONTENT_OFFSET_TOP, textTop: 184 + CONTENT_OFFSET_TOP },
      standardDeparture: { iconLeft: 151, textLeft: 177, iconTop: 116 + CONTENT_OFFSET_TOP, textTop: 116 + CONTENT_OFFSET_TOP },
      standardArrival: { iconLeft: 73, textLeft: 92, iconTop: 105 + CONTENT_OFFSET_TOP, textTop: 105 + CONTENT_OFFSET_TOP }, // Aligned with date (was 109, now 105)
      withNotes: { iconLeft: 70, textLeft: 89, iconTop: 131 + CONTENT_OFFSET_TOP, textTop: 130 + CONTENT_OFFSET_TOP },
    },
  },
  priorityBadge: {
    fontSize: 12,
    fontWeight: 'light' as const,
    color: '#334866',
    lineHeight: 11,
    positions: {
      firstGuest: { left: 165, top: 89 + CONTENT_OFFSET_TOP },
      secondGuest: { left: 135, top: 164 + CONTENT_OFFSET_TOP },
      standard: { left: 161, top: 82 + CONTENT_OFFSET_TOP },
    },
  },
} as const;

// Staff Section Styles - Exact values from Figma
export const STAFF_SECTION = {
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    left: 236, // Room 201: left-[236px]
    top: 22, // Room 201: top-[22px] - aligns with room type
  },
  avatarStandard: {
    left: 238, // Room 202 (Departure): x=245 from screen, card at x=7, so 245-7=238px relative to card. Room 202: avatar at y=583 from screen, card at y=563, so 583-563=20px
    top: 20, // Room 202: y=583 from screen, card at y=563, so 583-563=20px relative to card
  },
  name: {
    fontSize: 13,
    fontWeight: 'bold' as const,
    color: '#1e1e1e',
    left: 279, // Room 201: left-[279px]
    top: 23, // Room 201: top-[23px] - aligns just below room number (17px)
    width: 104, // Width: 104px
    lineHeight: 21, // Height: 21px (lineHeight matches height)
  },
  nameStandard: {
    left: 281, // Room 203/204: x=288 from screen, card at x=7, so 288-7=281px relative to card
    top: 23, // Room 203: y=794 from screen, card at y=771, so 794-771=23px. Room 204: y=1047 from screen, card at y=1024, so 1047-1024=23px
  },
  nameStandardDeparture: {
    left: 281, // Room 202 (Departure): x=288 from screen, card at x=7, so 288-7=281px relative to card
    top: 12, // Room 202: y=575 from screen, card at y=563, so 575-563=12px relative to card (different from other cards)
  },
  status: {
    fontSize: 12,
    fontWeight: 'light' as const,
    left: 279, // Room 201: left-[279px]
    top: 40, // Room 201: top-[40px] - aligns with category
    lineHeight: 15, // Figma shows h-[15px]
    width: 101, // Room 201: w-[101px]
    colors: {
      default: '#1e1e1e',
      finished: '#41d541',
      error: '#f92424',
    },
  },
  statusStandard: {
    left: 281, // Room 202/203/204: x=288 from screen, card at x=7, so 288-7=281px relative to card
    top: 40, // Room 203: y=811 from screen, card at y=771, so 811-771=40px. Room 204: y=1064 from screen, card at y=1024, so 1064-1024=40px. Room 205 Stayover/Turndown: also 40px - aligns with category name
    width: 120, // Increased to accommodate "Finished: 65 mins" on one line (was 94px)
  },
  statusStandardDeparture: {
    left: 281, // Room 202 (Departure): x=288 from screen, card at x=7, so 288-7=281px relative to card
    top: 29, // Room 202: y=592 from screen, card at y=563, so 592-563=29px relative to card (different from other cards due to promiseTime)
    width: 92, // Room 202: w-[92px] from Figma
  },
  promiseTime: {
    fontSize: 13,
    fontWeight: 'bold' as const,
    color: '#1e1e1e',
    left: 281, // Room 202 (Departure): x=288 from screen, card at x=7, so 288-7=281px relative to card
    top: 44, // Room 202: y=607 from screen, card at y=563, so 607-563=44px relative to card
    lineHeight: 15, // Figma shows h-[15px]
    width: 139, // Room 202: w-[139px]
  },
  forwardArrow: {
    width: 10, // Increased size for better visibility
    height: 18, // Increased size for better visibility
    left: 390, // Positioned to the right of staff name/status
    top: 29, // Aligned with staff section
  },
  forwardArrowStandard: {
    left: 399, // For non-priority cards
  },
  divider: {
    left: 227, // Room 201: left-[227px] relative to card
    top: 11.5, // Room 201: top-[11px], Room 202: top-[574.5px] from screen, card at y=563, so 574.5-563=11.5px relative to card
    width: 1,
    height: 50.5,
    color: '#e3e3e3',
  },
  dividerStandard: {
    left: 228, // Room 202 (Departure): x=235 from screen, card at x=7, so 235-7=228px relative to card
    top: 11.5, // Room 202: y=574.5 from screen, card at y=563, so 574.5-563=11.5px relative to card
  },
} as const;

// Status Button Styles - Exact values from Figma (+ CONTENT_OFFSET_TOP so not flush with header)
export const STATUS_BUTTON = {
  width: 134,
  height: 70,
  borderRadius: 35,
  left: 255,
  top: 114 + CONTENT_OFFSET_TOP,
  icon: {
    width: 31,
    height: 31,
  },
  iconInProgress: {
    width: 134,
    height: 70,
  },
  chevron: {
    width: 7,
    height: 14,
    right: 12,
  },
  iconGap: 8,
  colors: {
    dirty: '#f92424',
    inProgress: '#F0BE1B',
    cleaned: '#5a759d',
    inspected: '#41d541',
  },
  positions: {
    arrivalDeparture: { left: 255, top: 114 + CONTENT_OFFSET_TOP }, // Room 201
    departure: { left: 262, top: 81 + CONTENT_OFFSET_TOP }, // Room 202
    arrivalWithNotes: { left: 256, top: 80 + CONTENT_OFFSET_TOP }, // Room 203
    standard: { left: 270, top: 87 + CONTENT_OFFSET_TOP }, // Room 204/205
  },
  flagged: {
    borderRadius: 45,
    background: '#FFEBEB',
    iconTint: '#F92424',
    flagIcon: { width: 24, height: 24 },
    dropdownArrow: { width: 12, height: 32 },
  },
} as const;

// Notes Section Styles - Exact values from Figma
export const NOTES_SECTION = {
  width: 414, // Figma node 1061:1243; card 426 so 6px padding from card left/right
  height: 54,
  borderRadius: 10,
  background: '#ffffff', // Arrival/Departure cards
  backgroundWithNotes: 'rgba(223, 230, 240, 0.4)', // Cards with notes (Room 203)
  paddingHorizontal: 16, // Clear internal padding from container edges
  paddingVertical: 10,
  paddingTop: 14, // Small padding top inside container so icons don't sit flush with top edge
  // Room 201 (Arrival/Departure): From Figma metadata
  // Container should span full width within card (card is 426px, container is 416px with 5px margin on each side)
  // Card height is 292px, container height is 54px
  // Container should have padding from bottom: 292 - 54 - bottomPadding = top position
  // Elements: rushed icon x=19 y=245, notes icon x=45.03 y=245, badge x=75 y=247, text x=112 y=252 (all relative to card)
  // For top: icons at y=245, so container top should be ~238 (245-7=238 where 7 accounts for visual alignment)
  // But we need padding from bottom: card height 292 - container height 54 - bottom padding 5 = 233px top
  // Figma: container centered in card (426−414)/2 = 6px from left; top from Figma frame (e.g. 897−758 = 139 for Room 203)
  /** Bottom margin from card bottom (px). When cardHeight is passed, notes container is positioned so it stays this far from bottom. */
  bottomMarginFromCard: {
    arrivalDeparture: 5,  // 292−54−233=5
    withNotes: 8,         // 244−182−54=8
  },
  positions: {
    arrivalDeparture: { left: 6, top: 240 + CONTENT_OFFSET_TOP }, // 6px from card left; increased top to avoid overlap with second guest time
    withNotes: { left: 6, top: 182 + CONTENT_OFFSET_TOP }, // 6px from card left; 8px gap below guest info
  },
  icon: {
    width: 31.974,
    height: 31.974,
    // Notes icon at x=45.03, y=245 (card coordinates) - this is the RIGHT icon
    // Container at x=5, so icon at 45.03-5=40.03 from container edge (absolute positioning, padding doesn't affect)
    // Container top is now 233 (was 238), so icon top relative to container: 245-233=12
    positions: {
      arrivalDeparture: { left: 40.03, top: 10 }, // Figma: notes at 45.03; top (54-34)/2 for alignment
      withNotes: { left: 40.03, top: 10 }, // Same as arrival for consistent Figma alignment
    },
  },
  rushedIcon: {
    width: 33.974,
    height: 33.974,
    // Figma: priority at x=19 → 14 from container; same top as notes for alignment
    positions: {
      arrivalDeparture: { left: 14, top: 10 },
      withNotes: { left: 14, top: 10 },
    },
  },
  badge: {
    width: 20.455,
    height: 20.455,
    borderRadius: 10.2275,
    backgroundColor: '#FF46A3',
    // Figma: badge at x=75 y=247 → left 70, top 14
    positions: {
      arrivalDeparture: { left: 70, top: 14 },
      withNotes: { left: 70, top: 14 }, // Align with notes icon (40.03 + 31.97 - 10.23 ≈ 62, use 70 for Figma)
    },
    fontSize: 15,
    fontWeight: 'light' as const,
    color: '#ffffff',
    lineHeight: 13.909, // Figma shows h-[13.909px]
  },
  text: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: '#5a759d',
    // Text at x=112, y=252 (card coordinates)
    // Container at x=5, so text at 112-5=107 from container edge
    // Container top is now 233 (was 238), so text top relative to container: 252-233=19
    positions: {
      arrivalDeparture: { left: 107, top: 18 }, // Figma: text at 112; top (54-17)/2 for vertical center
      withNotes: { left: 107, top: 18 },
    },
    lineHeight: 17,
  },
  // Priority badge: top-right of priority icon, vertically centered on icon (14+33.97-10.23, 10+(33.97-20.46)/2)
  priorityBadge: { left: 37.74, top: 17 },
} as const;

// Guest Container Background - Exact values from Figma
export const GUEST_CONTAINER_BG = {
  width: 414,
  borderRadius: 10,
  background: 'rgba(223, 230, 240, 0.4)',
  left: 6, // Relative to card (centered: (426-414)/2 = 6px)
  // Different heights and positions for different card types (+ CONTENT_OFFSET_TOP so not flush with header)
  positions: {
    departure: { height: 101, top: 70 + CONTENT_OFFSET_TOP }, // Room 202
    arrival: { height: 100, top: 74 + CONTENT_OFFSET_TOP }, // Room 204
    stayover: { height: 100, top: 74 + CONTENT_OFFSET_TOP }, // Room 205
    turndown: { height: 100, top: 74 + CONTENT_OFFSET_TOP }, // Room 205 (Turndown)
  },
  // Note: Room 201 (Arrival/Departure) and Room 203 (with notes) don't have this background
} as const;

// Divider Styles
export const DIVIDERS = {
  horizontal: {
    height: 1,
    color: '#e3e3e3',
    marginVertical: 8,
  },
  vertical: {
    width: 1,
    height: 50.5,
    color: '#e3e3e3',
  },
} as const;

// Typography
export const TYPOGRAPHY = {
  fontFamily: 'Helvetica',
  weights: {
    light: '300',
    regular: '400',
    semibold: '600',
    bold: '700',
  },
} as const;

