/**
 * Design tokens extracted from Figma for Staff screen
 * Based on design: https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=843-7
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
export const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

export const STAFF_HEADER = {
  height: 133,
  background: {
    height: 133,
    backgroundColor: '#e4eefe',
  },
  backButton: {
    left: 27,
    top: 69,
    width: 14,
    height: 28,
  },
  title: {
    left: 69, // 27px (back button left) + 14px (back button width) + 28px (gap) = 69px
    top: 69,
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#607aa1',
  },
  searchIcon: {
    right: 32,
    top: 158, // Aligned with navigation tabs
    width: 19,
    height: 19,
  },
} as const;

export const STAFF_TABS = {
  container: {
    top: 158,
    height: 39,
  },
  tab: {
    fontSize: 16,
    fontWeight: 'light' as const,
    activeFontWeight: 'bold' as const,
    color: '#5a759d',
    inactiveColor: 'rgba(90,117,157,0.55)',
  },
  tabs: {
    shifts: {
      left: 32,
      top: 158,
      width: 68,
      indicatorWidth: 68,
      indicatorLeft: 32,
    },
    am: {
      left: 131,
      top: 158,
      width: 20, // Approximate
      indicatorWidth: 20,
      indicatorLeft: 131,
    },
    pm: {
      left: 198,
      top: 158,
      width: 20, // Approximate
      indicatorWidth: 20,
      indicatorLeft: 198,
    },
  },
  indicator: {
    height: 4,
    backgroundColor: '#5a759d',
    borderRadius: 2,
    top: 192, // 34px from container top
  },
  divider: {
    top: 197,
    height: 1,
    width: 448,
    color: '#e3e3e3',
  },
  searchIcon: {
    right: 24,
    size: 24,
    color: '#5a759d',
  },
} as const;

export const STAFF_DATE = {
  top: 218,
  left: 23,
  fontSize: 11,
  fontWeight: 'semiBold' as const,
  color: '#000000',
  fontFamily: 'Inter',
} as const;

export const STAFF_CARD = {
  width: 401,
  height: {
    standard: 156,
    compact: 131, // For cards without current task
  },
  borderRadius: 9,
  backgroundColor: '#f9fafc',
  borderColor: '#e3e3e3',
  borderWidth: 1,
  marginHorizontal: 17,
  marginBottom: 20,
  avatar: {
    left: 42,
    top: 16, // Relative to card top
    width: 29,
    height: 29,
    borderRadius: 14.5,
  },
  name: {
    left: 77,
    top: 16, // Relative to card top
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#1e1e1e',
  },
  progressRatio: {
    right: 34, // 367px from left, so right = 401 - 367 = 34
    top: 18, // Relative to card top
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#000000',
  },
  progressBar: {
    left: 42,
    top: 50, // Relative to card top
    height: 9,
    borderRadius: 27, // For rounded ends
    completedColor: '#ff4dd8',
    remainingColor: '#cdd3dd',
  },
  taskStats: {
    top: 65, // Relative to card top
    fontSize: 16,
    fontWeight: 'light' as const,
    color: '#000000',
    inProgress: {
      left: 42,
    },
    cleaned: {
      left: 168,
    },
    dirty: {
      left: 291,
    },
  },
  currentTask: {
    top: 106, // Relative to card top
    circle: {
      left: 44, // or 39 for some cards
      width: 34,
      height: 34,
      borderRadius: 37,
      backgroundColor: '#f7eecf',
    },
    bellIcon: {
      width: 20, // Approximate
      height: 20,
    },
    roomText: {
      left: 80, // Approximate, centered with circle
      fontSize: 13,
      fontWeight: 'bold' as const,
      color: '#f0be1b',
    },
    timer: {
      left: 80, // or 83 for some cards
      top: 17, // Relative to currentTask top
      fontSize: 13,
      fontWeight: 'regular' as const,
      activeColor: '#f92424',
      inactiveColor: '#1e1e1e',
    },
  },
} as const;

/** Department row in Staff > Departments tab (Figma node 1085-3083).
 * Replaced by STAFF_DEPARTMENT_GRID to match Figma (same as Create Ticket grid). */
export const STAFF_DEPARTMENT = {
  card: {
    width: 401,
    height: 72,
    borderRadius: 9,
    backgroundColor: '#f9fafc',
    borderColor: '#e3e3e3',
    borderWidth: 1,
    marginHorizontal: 17,
    marginBottom: 16,
  },
  iconWrap: {
    left: 20,
    top: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffebeb',
  },
  name: {
    left: 68,
    top: 26,
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#1e1e1e',
  },
} as const;

/** Staff > Departments tab – vertical list, name below icon (Figma node 1085-3057).
 * Icon on top, department name directly below. No cards, icons on screen. */
export const STAFF_DEPARTMENT_LIST = {
  container: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  item: {
    marginBottom: 20,
    alignItems: 'flex-start' as const,
  },
  icon: {
    width: 55.482,
    height: 55.482,
    aspectRatio: 1,
    size: 55.482,
    borderRadius: 37,
    backgroundColor: '#ffebeb',
  },
  label: {
    fontSize: 14,
    fontWeight: '300' as const,
    fontFamily: 'Inter',
    color: '#000000',
    marginTop: 8,
    textAlign: 'left' as const,
  },
  /** When a department panel is open, its name uses these styles. */
  labelActive: {
    color: '#F92424',
    fontFamily: 'Inter',
    fontSize: 14,
    fontStyle: 'normal' as const,
    fontWeight: '600' as const,
    lineHeight: undefined,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 14,
    gap: 16,
  },
} as const;

/** Staff > Departments tab grid – matches Figma (same as Create Ticket DEPARTMENT_GRID).
 * Circular icon + label below. Kept for reference; list uses STAFF_DEPARTMENT_LIST. */
export const STAFF_DEPARTMENT_GRID = {
  container: {
    paddingHorizontal: 17,
    paddingTop: 8,
    paddingBottom: 24,
    columnGap: 16,
    rowGap: 24,
  },
  item: {
    size: 55.482,
    borderRadius: 37,
    backgroundColor: '#ffebeb',
  },
  label: {
    fontSize: 14,
    fontWeight: '300' as const,
    fontFamily: 'Inter',
    color: '#000000',
    marginTop: 8,
    textAlign: 'center' as const,
  },
} as const;

/** Staff-by-department panel (slides in from right with triangle pointing to department row).
 * Figma: https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=1085-3083
 * Matches InspectedStatusSlideModal triangle/shadow and Reassign modal staff list layout. */
export const STAFF_DEPARTMENT_PANEL = {
  width: 280,
  backgroundColor: '#ffffff',
  borderRadius: 12,
  shadowColor: 'rgba(100, 131, 176, 0.4)',
  shadowOffset: { width: -4, height: 0 },
  shadowOpacity: 1,
  shadowRadius: 35,
  triangle: {
    borderRightWidth: 12,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderRightColor: '#ffffff',
    shadowColor: 'rgba(100, 131, 176, 0.4)',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e3e3e3',
    titleFontSize: 18,
    titleColor: '#1e1e1e',
    closeIconColor: '#5a759d',
  },
  listItem: {
    profilePictureSize: 32,
    nameLeft: 83,
    profilePictureLeft: 37,
    paddingVertical: 20,
    paddingRight: 20,
    nameFontSize: 16,
    departmentFontSize: 14,
    nameColor: '#1e1e1e',
    departmentColor: '#334866',
    itemMinHeight: 76,
  },
  /** Row below header divider showing "X selected" when any staff selected. */
  selectedCount: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 12,
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '400' as const,
    color: '#334866',
  },
} as const;

/** Expanded staff row — shift calendar card (Figma node 3232-71). */
export const STAFF_SHIFT_CALENDAR = {
  card: {
    maxWidth: 401,
    borderRadius: 9,
    backgroundColor: '#f9fafc',
    borderColor: '#e3e3e3',
    borderWidth: 1,
    marginHorizontal: 19,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
  },
  monthTitle: {
    fontSize: 16,
    color: '#5a759d',
  },
  editPill: {
    paddingHorizontal: 19,
    paddingVertical: 10,
    borderRadius: 57,
    backgroundColor: 'rgba(90,117,157,0.06)',
    fontSize: 12,
    color: '#5a759d',
  },
  weekdayLabel: {
    fontSize: 14,
    color: '#000000',
  },
  dayCircle: {
    size: 36,
    fontSize: 14,
  },
} as const;

/** Shift-day fill colors (Figma: green / red / pink / yellow). */
export const STAFF_SHIFT_DAY_COLORS = ['#28c76f', '#f92424', '#ff4dd8', '#f0be1b'] as const;

export const STAFF_SHIFT_DAY_NEUTRAL = '#e8ecf2';

/** Department chips on Staff screen — active/inactive use same sizes and paired colors. */
export const STAFF_DEPT_CHIP = {
  iconWrapSize: 55.482,
  iconInnerSize: 28,
  borderRadius: 37,
  activeBackgroundColor: '#5a759d',
  inactiveBackgroundColor: '#e4eefe',
  activeIconTint: '#ffffff',
  inactiveIconTint: '#5a759d',
} as const;

