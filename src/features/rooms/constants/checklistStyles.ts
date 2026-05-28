/**
 * Checklist Styles - Based on Figma design
 * https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=1-2018&m=dev
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
export const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

export const CHECKLIST_SECTION = {
  container: {
    marginTop: 20 * scaleX,
    paddingHorizontal: 20 * scaleX,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#000000',
    marginBottom: 24 * scaleX,
  },
  category: {
    marginBottom: 24 * scaleX,
    header: {
      fontSize: 16,
      fontWeight: 'bold' as const,
      color: '#000000',
      paddingVertical: 12 * scaleX,
    },
    item: {
      marginBottom: 20 * scaleX,
    },
    itemImage: {
      width: 50 * scaleX,
      height: 50 * scaleX,
      marginRight: 16 * scaleX,
    },
    itemName: {
      fontSize: 14,
      fontWeight: 'bold' as const,
      color: '#000000',
    },
    description: {
      fontSize: 12,
      fontWeight: 'light' as const,
      color: '#666666',
    },
    initialStock: {
      fontSize: 14,
      fontWeight: 'bold' as const,
      color: '#000000',
    },
    quantitySelector: {
      borderWidth: 1,
      borderColor: '#e0e0e0',
      borderRadius: 8 * scaleX,
    },
    quantityButton: {
      width: 32 * scaleX,
      height: 32 * scaleX,
    },
    quantityInput: {
      width: 50 * scaleX,
      height: 32 * scaleX,
    },
    loadMore: {
      fontSize: 14,
      fontWeight: 'regular' as const,
      color: '#5a759d',
    },
  },
  footer: {
    paddingTop: 32 * scaleX,
    paddingBottom: 40 * scaleX,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 24 * scaleX,
    profilePicture: {
      width: 40 * scaleX,
      height: 40 * scaleX,
      borderRadius: 20 * scaleX,
    },
    registeredByLabel: {
      fontSize: 12,
      fontWeight: 'light' as const,
      color: '#666666',
    },
    registeredByName: {
      fontSize: 14,
      fontWeight: 'bold' as const,
      color: '#000000',
    },
    time: {
      fontSize: 14,
      fontWeight: 'regular' as const,
      color: '#000000',
    },
    date: {
      fontSize: 12,
      fontWeight: 'light' as const,
      color: '#666666',
    },
    submitButton: {
      width: '100%',
      height: 50 * scaleX,
      backgroundColor: '#5a759d',
      borderRadius: 8 * scaleX,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: 'bold' as const,
      color: '#ffffff',
    },
    cancelButtonText: {
      fontSize: 14,
      fontWeight: 'regular' as const,
      color: '#5a759d',
    },
  },
} as const;

/** Clean Checklist - Figma node 2702:2572 (Clean Checklist on Room Detail) */
export const CLEAN_CHECKLIST = {
  title: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#4a91fc',
  },
  divider: {
    height: 1,
    backgroundColor: '#e3e3e3',
  },
  dividerAfterTitle: { marginTop: 16 * scaleX, marginBottom: 16 * scaleX },
  item: {
    iconCircle: { size: 42 * scaleX, borderRadius: 21 * scaleX, backgroundColor: '#F4F4F4' },
    labelFontSize: 15,
    labelColor: '#000000',
    marginBottom: 16 * scaleX,
    iconMarginRight: 16 * scaleX,
    checkboxSize: 28 * scaleX,
    checkboxBorderRadius: 4 * scaleX,
  },
  optional: {
    titleFontSize: 10,
    titleColor: '#575353',
    marginBottom: 12 * scaleX,
    itemLabelFontSize: 18,
    itemLabelWeight: 'bold' as const,
    itemLabelColor: '#1e1e1e',
    itemMarginBottom: 12 * scaleX,
  },
  slide: {
    trackHeight: 56 * scaleX,
    trackBorderRadius: 28 * scaleX,
    trackBg: '#e3e3e3',
    thumbSize: 44 * scaleX,
    labelFontSize: 18,
    labelColor: '#000000',
    labelWeight: 'regular' as const,
    marginTop: 24 * scaleX,
  },
} as const;
