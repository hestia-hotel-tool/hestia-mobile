import React from 'react';
import { View } from '@/tw';
import CategoryCard from './CategoryCard';
import type { CategorySection, RoomStatus } from '../types/home.types';

export type HousekeepingDashboardProps = {
  categories: CategorySection[];
  onCategoryPress: (category: CategorySection) => void;
  onStatusPress: (category: CategorySection, status: keyof RoomStatus) => void;
  onPriorityPress: (category: CategorySection) => void;
};

/**
 * The dashboard housekeeping leadership sees — Figma node 2702:3231.
 *
 * Shown for job titles whose role resolves to the `default` home variant, which
 * covers Executive Housekeeper, Housekeeping Manager and Assistant Housekeeping
 * Manager among others.
 *
 * A stack of category cards, one per bucket the shift produces. Spacing comes
 * from `gap` rather than each card carrying its own margin, so the rhythm holds
 * whatever the list length.
 */
export function HousekeepingDashboard({
  categories,
  onCategoryPress,
  onStatusPress,
  onPriorityPress,
}: HousekeepingDashboardProps) {
  return (
    <View className="gap-xl px-sm">
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          onPress={() => onCategoryPress(category)}
          onStatusPress={onStatusPress}
          onPriorityPress={onPriorityPress}
        />
      ))}
    </View>
  );
}

export default HousekeepingDashboard;
