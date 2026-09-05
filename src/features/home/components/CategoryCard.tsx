import React from 'react';
import { View, Text, Pressable } from '@/tw';
import { Card, CardDivider, CountBadge, StatusCircle, ROOM_STATUS_ORDER } from '@/components';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme';
import type { CategorySection, RoomStatus } from '../types/home.types';

/**
 * Figma pins the divider (node 2702:3401) 79px below the card top on all three
 * cards, including the StayOvers card that has no priority pill. So the header
 * is a fixed band, not one that shrinks when the pill is absent: 20px of top
 * padding, the 47px pill (node 2702:3390), then 12px to the rule.
 */
const HEADER_HEIGHT = 79;
const PILL_HEIGHT = 47;
/** Node 2702:3402 is a 23px line box at 20px Helvetica Bold. */
const TITLE_LINE_HEIGHT = 23;

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
 * The title is one weight and one colour. An earlier pass rendered the label
 * at 70% opacity behind a solid count; node 2702:3402 is a single run of
 * Helvetica Bold 20px at #1e1e1e.
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
        <View
          className="flex-row items-start justify-between px-xl pt-xl"
          style={{ height: HEADER_HEIGHT }}
        >
          {/* Centred against the pill's box so the title sits at the same
              height whether or not this category has a priority count. */}
          <View className="flex-1 justify-center" style={{ height: PILL_HEIGHT }}>
            <Text
              className="font-hestia-primary text-hestia-4xl font-bold text-ink-primary"
              style={{ lineHeight: TITLE_LINE_HEIGHT }}
              numberOfLines={1}
            >
              {category.total} {category.name}
            </Text>
          </View>

          {priority > 0 && (
            <Pressable
              // The badge overhangs 8px, and the design leaves it 20px clear of
              // the card edge — so the pill itself sits 28px in.
              className="mr-sm"
              onPress={() => onPriorityPress?.(category)}
              accessibilityRole="button"
              accessibilityLabel={`${priority} priority`}
              hitSlop={8}
            >
              <View
                className="w-[58px] items-center justify-center rounded-full bg-badge-priority"
                style={{ height: PILL_HEIGHT }}
              >
                <Icon name="action-flag" size={19} color={colors.status.dirty} />
              </View>
              {/* Overhangs the pill's top-right corner. */}
              <View className="absolute -right-[8px] top-0">
                <CountBadge count={priority} size={24} fontSize={15} />
              </View>
            </Pressable>
          )}
        </View>

        <CardDivider />

        <View className="flex-row items-start justify-between px-xl pb-[36px] pt-[27px]">
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
