import React from 'react';
import { View, Text, Pressable } from '@/tw';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '@/theme';
import { GuestKindDisc, type GuestRowKind } from '../roomsList/GuestRow';
import { scaleX } from '../../constants/allRoomsStyles';

/** The guest filters a tile stands for — keys of `FilterState['guests']`. */
export type LinenFocus = 'departures' | 'stayOverWithLinen' | 'arrivals';

export type LinenCounts = Record<LinenFocus, number>;

/**
 * The tiles, in the order the linen run works: strip the departures, change
 * the stayovers due fresh linen, then make up the arrivals. Each carries the
 * same disc its rooms show on the card (GuestRow), so a tile and its rooms
 * read as one thing.
 */
const TILES: { key: LinenFocus; label: string; hint: string; kind: GuestRowKind }[] = [
  { key: 'departures', label: 'Departures', hint: 'Full strip', kind: 'departure' },
  { key: 'stayOverWithLinen', label: 'Stayovers', hint: 'Linen change', kind: 'stayover-linen' },
  { key: 'arrivals', label: 'Arrivals', hint: 'Make up', kind: 'arrival' },
];

/** Every tile's filter key, for telling a tile's selection from any other. */
export const LINEN_FOCI: readonly LinenFocus[] = TILES.map((t) => t.key);

const INK = colors.primary.dark;
const ACCENT = colors.primary.main;

export type LinenSummaryProps = {
  /** Counted over the whole shift, not the filtered list — see AllRoomsScreen. */
  counts: LinenCounts;
  /** The tile whose filter is on, or null. */
  selected: LinenFocus | null;
  /** Tapping the selected tile again clears it. */
  onSelect: (focus: LinenFocus) => void;
};

/**
 * The shift's linen workload — the Laundry Attendant's Rooms header
 * (`ROOMS_LIST_CHROME.laundry`).
 *
 * Three tiles on their own white ground, so they read the same on the AM page
 * and on PM's dark slate. Each is a one-tap filter for its rooms; the selected
 * tile takes the brand outline and a tint, the way a segmented control does.
 */
export function LinenSummary({ counts, selected, onSelect }: LinenSummaryProps) {
  return (
    <View className="flex-row" style={{ gap: 8 * scaleX }} accessibilityRole="tablist">
      {TILES.map((tile) => {
        const active = selected === tile.key;
        const count = counts[tile.key];
        return (
          <Pressable
            key={tile.key}
            onPress={() => onSelect(tile.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${count} ${tile.label.toLowerCase()}, ${tile.hint.toLowerCase()}`}
            accessibilityHint={active ? 'Shows every room again' : `Shows only ${tile.label.toLowerCase()}`}
            className="flex-1"
            style={{
              paddingHorizontal: 12 * scaleX,
              paddingVertical: 10 * scaleX,
              borderRadius: 12 * scaleX,
              borderWidth: active ? 1.5 : 1,
              borderColor: active ? ACCENT : colors.border.medium,
              backgroundColor: active ? colors.background.tertiary : colors.background.primary,
            }}
          >
            <View className="flex-row items-center justify-between">
              <Text
                style={{
                  fontFamily: typography.fontFamily.primary,
                  fontSize: 24 * scaleX,
                  lineHeight: 28 * scaleX,
                  fontWeight: '700',
                  color: INK,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {count}
              </Text>
              <GuestKindDisc kind={tile.kind} size={22 * scaleX} />
            </View>
            <Text
              numberOfLines={1}
              style={{
                marginTop: 2 * scaleX,
                fontFamily: typography.fontFamily.primary,
                fontSize: 13 * scaleX,
                fontWeight: '700',
                color: INK,
              }}
            >
              {tile.label}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                fontFamily: typography.fontFamily.primary,
                fontSize: 11 * scaleX,
                fontWeight: '300',
                color: ACCENT,
              }}
            >
              {tile.hint}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * "View only" beside the title: this reader works from the list but does not
 * act on it, which is why no pill opens a menu and no card offers assignment.
 */
export function ViewOnlyChip({ onDark = false }: { onDark?: boolean }) {
  const color = onDark ? 'rgba(255, 255, 255, 0.78)' : ACCENT;
  return (
    <View
      className="flex-row items-center rounded-full"
      style={{
        gap: 4 * scaleX,
        paddingHorizontal: 10 * scaleX,
        height: 26 * scaleX,
        backgroundColor: onDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(90, 117, 157, 0.12)',
      }}
      accessibilityLabel="View only: you can read rooms but not change them"
    >
      <Ionicons name="eye-outline" size={14 * scaleX} color={color} />
      <Text style={{ fontFamily: typography.fontFamily.primary, fontSize: 12 * scaleX, fontWeight: '700', color }}>
        View only
      </Text>
    </View>
  );
}

export default LinenSummary;
