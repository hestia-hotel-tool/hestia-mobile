import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import { INSPECTION_CATEGORY_ORDER, inspectionCategoryLabel } from '../../constants/inspectionImages';
import type { InspectionItem } from '../../services/roomInspection';

/** The categories an inspection has, in chip order (an unknown one last). */
export function inspectionCategories(items: InspectionItem[]): string[] {
  const rank = (k: string) => {
    const i = INSPECTION_CATEGORY_ORDER.indexOf(k);
    return i < 0 ? 99 : i;
  };
  return [...new Set(items.map((i) => i.category))].sort((a, b) => rank(a) - rank(b));
}

/** One category's items, in catalogue order. */
export function inspectionItemsIn(items: InspectionItem[], category: string | null): InspectionItem[] {
  return items.filter((i) => i.category === category).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * The checklist's category chips — Figma 4759:1411: a #f1f6fc pill, 58 tall,
 * 10 from each side; the chosen chip #5a759d with white bold text. Scrolls
 * sideways when they do not fit. Shared by the checklist and its report.
 */
export default function InspectionCategoryChips({
  categories,
  current,
  onSelect,
}: {
  categories: string[];
  current: string | null;
  onSelect: (category: string) => void;
}) {
  return (
    <View style={styles.band}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {categories.map((key) => {
          const active = key === current;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{inspectionCategoryLabel(key)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    height: 58 * scaleX,
    marginTop: 15 * scaleX,
    marginHorizontal: 10 * scaleX,
    borderRadius: 65 * scaleX,
    backgroundColor: '#f1f6fc',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chips: { alignItems: 'center', gap: 15 * scaleX, paddingHorizontal: 14 * scaleX },
  chip: {
    paddingHorizontal: 10 * scaleX,
    height: 37 * scaleX,
    minWidth: 59 * scaleX,
    borderRadius: 33 * scaleX,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: '#5a759d' },
  chipText: { fontSize: 15 * scaleX, fontFamily: typography.fontFamily.primary, color: '#5a759d' },
  chipTextActive: { fontWeight: '700', color: '#ffffff' },
});
