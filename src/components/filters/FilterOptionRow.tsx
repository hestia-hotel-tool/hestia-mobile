import React from 'react';
import { View, Text, Pressable } from '@/tw';
import { Checkbox } from '@/components/ui/Checkbox';
import { Icon, type IconName } from '@/components/Icon';

/**
 * The mark between the checkbox and the label.
 *
 * Housekeeping statuses are plain colour discs in the design — no glyph inside
 * them — while front-office and reservation states are line icons. Modelling
 * these as one union keeps the row from guessing which it got: the old code
 * inferred "circular" from `iconColor !== undefined`, which is why a status with
 * both a colour and an icon rendered as neither.
 */
export type FilterIndicator =
  | { kind: 'dot'; color: string }
  | { kind: 'icon'; name: IconName; color?: string };

/** How a row's count reads. The design uses all three. */
export type CountFormat =
  /** "24 Rooms" — the housekeeping section. */
  | 'rooms'
  /** "18" — the front-office section. */
  | 'number'
  /** No count — the reservations section. */
  | 'none';

export type FilterOptionRowProps = {
  label: string;
  indicator?: FilterIndicator;
  count?: number;
  countFormat?: CountFormat;
  selected: boolean;
  onToggle: () => void;
};

/** Figma node 1966:3906 — indicators sit in a 24px slot so dots (19px) and
 *  icons (22-23px) share one left edge for the label to align against. */
const INDICATOR_SLOT = 24;
const DOT_SIZE = 19;
const ICON_SIZE = 22;

function formatCount(count: number | undefined, format: CountFormat): string | null {
  if (format === 'none' || count === undefined) return null;
  if (format === 'number') return String(count);
  return `${count} ${count === 1 ? 'Room' : 'Rooms'}`;
}

/**
 * One checkbox row in the rooms filter — Figma node 1966:3906.
 *
 * Checkbox, indicator, label, and an optional count pinned right.
 *
 * The whole row is the hit target, not just the checkbox: these rows are 25px
 * tall and thumb-sized targets matter more than matching the design's implied
 * tap area.
 */
export function FilterOptionRow({
  label,
  indicator,
  count,
  countFormat = 'rooms',
  selected,
  onToggle,
}: FilterOptionRowProps) {
  const countText = formatCount(count, countFormat);

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={countText ? `${label}, ${countText}` : label}
      className="flex-row items-center"
    >
      {/* Nested inside the row's own accessibility node, so the checkbox must
          not announce itself a second time. */}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Checkbox checked={selected} onToggle={onToggle} />
      </View>

      <View className="ml-lg items-center justify-center" style={{ width: INDICATOR_SLOT }}>
        {indicator?.kind === 'dot' && (
          <View
            className="rounded-full"
            style={{
              width: DOT_SIZE,
              height: DOT_SIZE,
              backgroundColor: indicator.color,
            }}
          />
        )}
        {indicator?.kind === 'icon' && (
          <Icon name={indicator.name} size={ICON_SIZE} color={indicator.color} />
        )}
      </View>

      <Text
        className="ml-md flex-1 font-hestia-secondary text-hestia-xl font-light text-ink-primary"
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>

      {countText && (
        <Text className="ml-sm font-hestia-secondary text-hestia-xs font-light text-ink-muted">
          {countText}
        </Text>
      )}
    </Pressable>
  );
}

export default FilterOptionRow;
