import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { colors, typography } from '@/theme';
import FilterRow from './FilterRow';
import { FilterOption } from '@/types/filter.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

interface FilterSectionProps {
  title: string;
  options: FilterOption[];
  onToggle: (id: string) => void;
  isRoomState?: boolean; // Indicates if this is room state section (circular icons)
  reducedMargin?: boolean; // For Guest section to reduce top margin
}

export default function FilterSection({
  title,
  options,
  onToggle,
  isRoomState = false,
  reducedMargin = false,
}: FilterSectionProps) {
  // Safety check: ensure options is an array
  const safeOptions = Array.isArray(options) ? options : [];
  
  return (
    <View style={[styles.section, reducedMargin && styles.sectionReducedMargin]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.optionsContainer}>
        {safeOptions.map((option) => {
          // Safety check: skip undefined or invalid options
          if (!option || !option.id || !option.icon) {
            return null;
          }
          // Room state options (except priority) and turnDown/stayOver should be circular
          // Priority should show just the icon without circular background
          const shouldBeCircular = (isRoomState && option.id !== 'priority') || option.id === 'turnDown' || option.id === 'stayOver';
          // Priority should always show icon, not circular
          const isPriority = option.id === 'priority';
          return (
            <FilterRow
              key={option.id}
              label={option.label || ''}
              icon={option.icon}
              iconColor={option.iconColor}
              count={option.count || 0}
              selected={option.selected || false}
              onToggle={() => onToggle(option.id)}
              showCount={(option.count || 0) > 0}
              isCircular={shouldBeCircular}
              isPriority={isPriority}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20 * scaleX, // Reduced from 32px
  },
  sectionReducedMargin: {
    marginTop: -16 * scaleX, // Reduce top margin for Guest section
    marginBottom: 8 * scaleX, // Reduced margin since actions follow directly
  },
  sectionTitle: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.semibold as any,
    color: colors.text.primary,
    marginBottom: 12 * scaleX, // Reduced from 16px
  },
  optionsContainer: {
    // No additional styling needed, rows handle their own spacing
  },
});
