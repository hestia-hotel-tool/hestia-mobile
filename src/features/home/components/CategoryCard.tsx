import React from 'react';
import { View, Text, Pressable } from '@/tw';
import { Card, CardDivider, CountBadge, StatusCircle, ROOM_STATUS_ORDER } from '@/components';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme';
import type { CategorySection, RoomStatus } from '../types/home.types';

export type CategoryCardProps = {
  category: CategorySection;
  onPress?: () => void;
  /** A status with count >= 1 was tapped, e.g. Cleaned under Flagged. */
  onStatusPress?: (category: CategorySection, status: keyof RoomStatus) => void;
  /** The priority pill was tapped — filter to priority rooms. */
  onPriorityPress?: (category: CategorySection) => void;
};

/**
 * One dashboard category — Figma nodes 2702:3233 (Flagged), :3385 (Arrivals),
 * :3323 (StayOvers).
 *
 * Title, an optional priority pill, a divider, then the four room states.
 *
 * `CategorySection.borderColor` is deliberately ignored: it was set to five
 * different values and never rendered — the old card hardcoded #e3e3e3 — so
 * honouring it now would be a visual change nobody asked for. The border comes
 * from the card token instead.
 */
export function CategoryCard({
  category,
  onPress,
  onStatusPress,
  onPriorityPress,
}: CategoryCardProps) {
  const priority = category.priority ?? 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${category.total} ${category.name}`}
    >
      <Card>
        <View className="flex-row items-center justify-between px-xl pb-lg pt-2xl">
          {/* Count is solid; the label sits back at 70% — Figma node 2702:3250. */}
          <Text className="font-hestia-primary text-hestia-4xl font-bold text-ink-primary">
            {category.total}{' '}
            <Text className="font-hestia-primary text-hestia-4xl font-bold text-ink-primary opacity-70">
              {category.name}
            </Text>
          </Text>

          {priority > 0 && (
            <Pressable
              onPress={() => onPriorityPress?.(category)}
              accessibilityRole="button"
              accessibilityLabel={`${priority} priority`}
              hitSlop={8}
            >
              <View className="h-[47px] w-[58px] items-center justify-center rounded-full bg-badge-priority">
                <Icon name="action-flag" size={19} color={colors.status.dirty} />
              </View>
              {/* Overhangs the pill's top-right corner. */}
              <View className="absolute -right-[8px] top-0">
                <CountBadge count={priority} size={24} />
              </View>
            </Pressable>
          )}
        </View>

        <CardDivider />

        <View className="flex-row items-start justify-between px-xl pb-2xl pt-3xl">
          {ROOM_STATUS_ORDER.map((status) => (
            <StatusCircle
              key={status}
              status={status}
              count={category.status[status]}
              onPress={() => onStatusPress?.(category, status)}
            />
          ))}
        </View>
      </Card>
    </Pressable>
  );
}

export default CategoryCard;
