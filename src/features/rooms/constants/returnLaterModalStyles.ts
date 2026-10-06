/**
 * Return Later Modal Styles - Exact values from Figma
 * Design: https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=1121-328&m=dev
 * 
 * All measurements extracted from Figma Inspect mode
 * Design width: 440px (iPhone 14 Pro Max baseline)
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
export const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

export const RETURN_LATER_MODAL = {
  // Modal overlay - starts after header (232px)
  overlay: {
    top: 232,
    backgroundColor: '#ffffff',
  },
  
  // Title: "Return Later"
  title: {
    top: 253, // 21px from overlay start
    left: 32,
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#607aa1',
    lineHeight: 23,
  },
  
  // Instruction text
  instruction: {
    top: 280, // 27px from title
    left: 32,
    fontSize: 14,
    fontWeight: '300' as const,
    color: '#1e1e1e',
    lineHeight: 18,
    width: 358,
  },
  
  // Divider line
  divider: {
    top: 312, // 32px from instruction
    left: 12,
    width: 416,
    height: 1,
    backgroundColor: '#c6c5c5',
  },
  
  // Suggestions section
  suggestions: {
    labelTop: 336, // 24px from divider
    labelLeft: 35,
    labelFontSize: 14,
    labelFontWeight: '300' as const,
    labelColor: '#1e1e1e',
    labelLineHeight: 16,
    
    // Buttons container
    buttonsTop: 371, // 35px from label
    buttonsLeft: 32,
    buttonsGap: 12,
    
    // Individual button styling
    buttonHeight: 39,
    buttonMinWidth: 74,
    buttonPaddingHorizontal: 16,
    buttonPaddingVertical: 11,
    buttonBorderRadius: 41,
    buttonBorderWidth: 1,
    buttonBorderColor: '#000000',
    
    // Unselected state
    buttonBackgroundUnselected: '#ffffff',
    buttonTextColorUnselected: '#000000',
    buttonTextWeightUnselected: '300' as const,
    
    // Selected state
    buttonBackgroundSelected: '#f5f5f5',
    buttonTextColorSelected: '#000000',
    buttonTextWeightSelected: '700' as const,
    
    buttonFontSize: 14,
    buttonLineHeight: 16,
  },
  
  // AM/PM Toggle
  toggle: {
    top: 466, // 95px from buttons
    left: 154, // Centered horizontally
    width: 121,
    height: 35.243,
  },
  
  // Time Picker
  timePicker: {
    top: 556.39, // 90px from toggle
    height: 226,
    
    // Hours column
    hoursColumnLeft: 156.3,
    
    // Minutes column
    minutesColumnLeft: 273.06,
    
    // Column specs
    columnWidth: 50,
    
    // Item specs
    itemHeight: 40,
    snapInterval: 40,
    
    // Selected item
    selectedFontSize: 24,
    selectedFontWeight: '700' as const,
    selectedColor: '#5a759d',
    
    // Unselected item
    unselectedFontSize: 16,
    unselectedFontWeight: '400' as const,
    unselectedColor: '#999999',
  },
  
  // Confirm Button
  confirmButton: {
    top: 848, // 66px from time picker
    left: -1,
    width: 441,
    height: 107,
    backgroundColor: '#5a759d',
    
    // Text
    fontSize: 18,
    fontWeight: '400' as const,
    textColor: '#ffffff',
    lineHeight: 21,
  },
  
  // Assigned To Section
  assignedTo: {
    top: 1185, // 230px from confirm button
    titleLeft: 28,
    titleFontSize: 15,
    titleFontWeight: '700' as const,
    titleColor: '#000000',
    titleLineHeight: 17,
  },
} as const;
