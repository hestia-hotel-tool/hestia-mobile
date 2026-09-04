import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { CategorySection, ShiftType, RoomStatus } from '../types/home.types';
import { colors, typography } from '@/theme';
import { Dimensions } from 'react-native';
import { normalizedScaleX, scaleX } from '@/utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
import StatusIndicator from './StatusIndicator';
import PriorityBadge from './PriorityBadge';

interface CategoryCardProps {
  category: CategorySection;
  onPress?: () => void;
  /** When a status badge with count >= 1 is tapped (e.g. cleaned[2] under Flagged). */
  onStatusPress?: (category: CategorySection, status: keyof RoomStatus) => void;
  /** When the priority badge is tapped - filter and show priority rooms. */
  onPriorityPress?: (category: CategorySection) => void;
  selectedShift?: ShiftType;
}

// Status configuration
/** Default icon box (design px); dirty asset has more padding so it gets a larger box to match others visually. */
const DEFAULT_STATUS_ICON_W = 29.478;
const DEFAULT_STATUS_ICON_H = 30.769;

const STATUS_CONFIG: Record<
  keyof RoomStatus,
  {
    color: string;
    icon: any;
    label: string;
    iconTintColor?: string;
    rightLabelIcon?: any;
    iconWidth?: number;
    iconHeight?: number;
  }
> = {
  dirty: {
    color: '#f92424',
    // Use the same asset as Change Status modal for iOS parity.
    icon: require('../../../../assets/icons/dirty-status.png'),
    label: 'Dirty',
    // Slightly larger so glyph matches in-progress / cleaned / inspected on screen.
    iconWidth: 40,
    iconHeight: 41.5,
  },
  inProgress: {
    color: '#f0be1b',
    icon: require('../../../../assets/icons/in-progress-icon.png'),
    label: 'In Progress',
  },
  cleaned: {
    color: '#4a91fc',
    icon: require('../../../../assets/icons/cleaned-icon.png'),
    label: 'Cleaned',
  },
  inspected: {
    color: '#41d541',
    icon: require('../../../../assets/icons/inspected-icon.png'),
    label: 'Inspected',
  },
};

const CARD_RADIUS = 12 * scaleX;

export default function CategoryCard({ category, onPress, onStatusPress, onPriorityPress, selectedShift }: CategoryCardProps) {
  const statusKeys: (keyof RoomStatus)[] = ['dirty', 'inProgress', 'cleaned', 'inspected'];
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.totalCount}>
            {category.total}{' '}
          </Text>
          <Text style={styles.categoryName}>
            {category.name}
          </Text>
        </View>
        {category.priority !== undefined && category.priority > 0 && (
          <PriorityBadge
            count={category.priority}
            onPress={onPriorityPress ? () => onPriorityPress(category) : undefined}
          />
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Status Indicators - tappable when count >= 1 to filter by category + status */}
      <View style={styles.statusGrid}>
        {statusKeys.map((statusKey) => (
          <StatusIndicator
            key={statusKey}
            color={STATUS_CONFIG[statusKey].color}
            icon={STATUS_CONFIG[statusKey].icon}
            count={category.status[statusKey]}
            label={STATUS_CONFIG[statusKey].label}
            iconWidth={STATUS_CONFIG[statusKey].iconWidth ?? DEFAULT_STATUS_ICON_W}
            iconHeight={STATUS_CONFIG[statusKey].iconHeight ?? DEFAULT_STATUS_ICON_H}
            iconTintColor={STATUS_CONFIG[statusKey].iconTintColor}
            rightLabelIcon={STATUS_CONFIG[statusKey].rightLabelIcon}
            isPM={false}
            onPress={category.status[statusKey] >= 1 && onStatusPress ? () => onStatusPress(category, statusKey) : undefined}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff', // White background as per Figma design
    borderRadius: 12 * scaleX, // 12px border radius
    borderWidth: 1,
    borderColor: '#e3e3e3', // Light grey border color
    width: 422 * scaleX, // Exact width from Figma: 422px
    height: 223 * scaleX, // Exact height from Figma: 223px
    marginHorizontal: 9 * scaleX, // (440 - 422) / 2 = 9px on each side
    marginVertical: 13 * scaleX, // 13px vertical spacing between cards
    alignSelf: 'center', // Center cards horizontally
    position: 'relative',
    overflow: 'hidden', // Keep overflow hidden for clean edges
    flexDirection: 'column',
    // Subtle light grey shadow around edges as per Figma design
    shadowColor: '#a0a0a0', // Light grey shadow color
    shadowOffset: { width: 0, height: 2 * scaleX },
    shadowOpacity: 0.15, // Subtle shadow opacity
    shadowRadius: 8 * scaleX, // Shadow blur radius
    elevation: 4, // Android shadow
  },
  containerPM: {
    backgroundColor: '#3A3D49', // Dark background for PM mode
    borderColor: '#4A4D59', // Darker border for PM mode
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 21 * scaleX,
    paddingTop: 17 * scaleX,
    paddingBottom: 20 * scaleX,
    minHeight: 67 * scaleX, // Fixed height so all cards (Flagged, Arrivals, StayOvers) leave same space for status row
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as any,
    color: 'rgba(30, 30, 30, 0.7)',
  },
  categoryNamePM: {
    color: colors.text.white,
  },
  totalCount: {
    fontSize: 24 * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as any,
    color: '#000000',
  },
  totalCountPM: {
    color: colors.text.white,
  },
  divider: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: (17 + 30 + 20 + 10) * scaleX, // paddingTop (17) + content height (~30px for 24px font with line height) + paddingBottom (20) + extra spacing (10) = 77px
    height: 1,
    backgroundColor: '#e3e3e3', // Light grey divider color (same as other cards)
  },
  dividerPM: {
    backgroundColor: '#4A4D59', // Darker divider for PM mode
  },
  statusGrid: {
    flex: 1,
    minHeight: 90 * scaleX, // Reserve space for icon + label so labels always visible (Flagged, Arrivals, StayOvers)
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingLeft: 21 * scaleX,
    paddingRight: 21 * scaleX,
    paddingTop: 30 * normalizedScaleX,
    flexWrap: 'nowrap',
  },
});

