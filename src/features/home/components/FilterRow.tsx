import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { colors, typography } from '@/theme';
import FilterCheckbox from './FilterCheckbox';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

interface FilterRowProps {
  label: string;
  icon: any;
  iconColor?: string;
  iconTintColor?: string;
  count: number;
  selected: boolean;
  onToggle: () => void;
  showCount?: boolean;
  isCircular?: boolean; // For room state icons that should be circular
  isPriority?: boolean; // For priority icon that should always show
  rowPaddingVertical?: number;
  labelNumberOfLines?: number;
}

export default function FilterRow({
  label,
  icon,
  iconColor,
  iconTintColor,
  count,
  selected,
  onToggle,
  showCount = true,
  isCircular = false,
  isPriority = false,
  rowPaddingVertical = 8,
  labelNumberOfLines = 1,
}: FilterRowProps) {
  return (
    <TouchableOpacity
      style={[
        styles.row,
        rowPaddingVertical !== undefined && { paddingVertical: rowPaddingVertical * scaleX },
      ]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <FilterCheckbox checked={selected} onToggle={onToggle} />
      
      <View
        style={[
          styles.iconContainer,
          isCircular && [
            styles.circularIconContainer,
            iconColor && { backgroundColor: iconColor },
          ],
        ]}
      >
        {icon && (
          <Image
            source={icon}
            style={[
              isCircular ? styles.circularIcon : styles.icon,
              // For circular icons, use white tint; for priority, don't apply tint; otherwise use iconColor/iconTintColor
              isCircular && { tintColor: '#ffffff' },
              !isCircular && iconTintColor && !isPriority && { tintColor: iconTintColor },
              !isCircular && !iconTintColor && iconColor && !isPriority && { tintColor: iconColor },
            ]}
            resizeMode="contain"
          />
        )}
      </View>

      <Text
        style={styles.label}
        numberOfLines={labelNumberOfLines}
        ellipsizeMode="tail"
      >
        {label}
      </Text>

      {showCount && count > 0 && (
        <Text style={styles.count}>
          {count} {count === 1 ? 'Room' : 'Rooms'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8 * scaleX, // Reduced from 12px
    paddingHorizontal: 0,
  },
  iconContainer: {
    width: 24 * scaleX,
    height: 24 * scaleX,
    marginLeft: 12 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularIconContainer: {
    borderRadius: 12 * scaleX, // Half of width/height to make it circular
    width: 24 * scaleX,
    height: 24 * scaleX,
  },
  icon: {
    width: 24 * scaleX,
    height: 24 * scaleX,
  },
  circularIcon: {
    width: 16 * scaleX, // Smaller icon inside circular background
    height: 16 * scaleX,
    tintColor: '#ffffff', // White icon on colored background
  },
  label: {
    flex: 1,
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: colors.text.primary,
    marginLeft: 12 * scaleX,
  },
  count: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: '#A9A9A9',
    marginLeft: 8 * scaleX,
  },
});
