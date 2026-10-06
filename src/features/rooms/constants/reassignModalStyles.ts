/**
 * Reassign Modal Styles - Exact values from Figma
 * Based on design: https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=1038-441
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
export const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

export const REASSIGN_MODAL = {
  header: {
    height: 133,
    backgroundColor: '#e4eefe',
    backButton: {
      left: 27,
      top: 68,
      fontSize: 24,
      color: '#607aa1',
    },
    autoAssignButton: {
      right: 293,
      top: 62,
      width: 119,
      height: 39,
      borderRadius: 41,
      backgroundColor: '#ffffff',
      fontSize: 14,
      color: '#5a759d',
    },
    searchIcon: {
      right: 41,
      top: 62,
      size: 19,
    },
  },
  tabs: {
    top: 133,
    height: 64,
    backgroundColor: '#ffffff',
    activeTab: {
      fontSize: 16,
      fontWeight: 'bold' as const,
      color: '#5a759d',
    },
    inactiveTab: {
      fontSize: 16,
      fontWeight: 'light' as const,
      color: 'rgba(90,117,157,0.55)',
    },
    underline: {
      height: 4,
      width: 81,
      backgroundColor: '#5a759d',
      left: 23, // For "On Shift" tab
      // AM tab: text at x=131, width=24, center at 143, underline center = 143 - 40.5 = 102.5
      leftAM: 102.5,
      // PM tab: text at x=198, width=24, center at 210, underline center = 210 - 40.5 = 169.5
      leftPM: 169.5,
      top: 192, // 133 + 64 - 4 - 1 = 192
    },
    divider: {
      top: 196,
      height: 1,
      color: '#c6c5c5',
    },
    onShift: {
      left: 32,
      top: 157,
    },
    am: {
      left: 131,
      top: 157,
    },
    pm: {
      left: 198,
      top: 157,
    },
  },
  staffList: {
    top: 196,
    itemHeight: 76, // Approximate height per item
    profilePicture: {
      size: 32,
      left: 37,
    },
    name: {
      left: 83,
      fontSize: 16,
      top: 0, // Relative to item
    },
    department: {
      left: 83,
      fontSize: 14,
      top: 21, // Below name
    },
    progressBar: {
      left: 230,
      width: 172, // Approximate
      height: 8,
      borderRadius: 27,
    },
    workloadNumber: {
      right: 375,
      fontSize: 16,
    },
  },
} as const;

