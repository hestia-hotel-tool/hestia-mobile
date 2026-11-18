import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Icon } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';

export type FloorOption = { label: string; count: number };

export interface FloorPickerBarProps {
  floors: FloorOption[];
  /** The floor being shown, or `null` for every floor. */
  selected: string | null;
  /** How many rooms the list below shows ("Rooms (n)"). */
  roomCount: number;
  onSelectFloor: (floor: string | null) => void;
}

const roomsLabel = (n: number) => `${n} ${n === 1 ? 'Room' : 'Rooms'}`;

/**
 * Engineering's Rooms tab — the floor bar over the list, Figma 4684:62.
 *
 * "Floors" over the chosen floor as a pale bar (its number in the blue square,
 * its room count, a chevron that opens every floor and "All floors"), then
 * "Rooms (n)" over the list. Home → Floors → View Rooms lands here with that
 * floor chosen.
 */
export default function FloorPickerBar({ floors, selected, roomCount, onSelectFloor }: FloorPickerBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const current = selected !== null ? floors.find((f) => f.label === selected) : undefined;
  const total = floors.reduce((sum, f) => sum + f.count, 0);
  const barCount = selected === null ? roomsLabel(total) : roomsLabel(current?.count ?? roomCount);

  const pick = (floor: string | null) => {
    setMenuOpen(false);
    onSelectFloor(floor);
  };

  return (
    <View style={styles.wrap}>
      {/* 4702:2273 */}
      <Text style={styles.title}>Floors</Text>

      {/* 4702:2253 — #f1f6fc, 420 x 58, radius 5 */}
      <TouchableOpacity
        style={styles.floorBar}
        onPress={() => setMenuOpen((open) => !open)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${selected === null ? 'All floors' : `Floor ${selected}`}, ${barCount}. Change floor`}
        accessibilityState={{ expanded: menuOpen }}
      >
        {selected === null ? (
          <Text style={styles.allFloors}>All floors</Text>
        ) : (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1} adjustsFontSizeToFit>
              {selected}
            </Text>
          </View>
        )}
        <Text style={styles.barCount}>{barCount}</Text>
        <View style={menuOpen ? styles.chevronOpen : undefined}>
          <Icon name="action-chevron-down-wide" width={25 * scaleX} height={12 * scaleX} color="#5a759d" />
        </View>
      </TouchableOpacity>

      {menuOpen ? (
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => pick(null)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === null }}
          >
            <Text style={[styles.menuText, selected === null && styles.menuTextActive]}>All floors</Text>
            {selected === null ? <Icon name="action-check" width={14 * scaleX} height={12 * scaleX} color="#5a759d" /> : null}
          </TouchableOpacity>
          {floors.map((f) => (
            <TouchableOpacity
              key={f.label}
              style={styles.menuRow}
              onPress={() => pick(f.label)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: f.label === selected }}
            >
              <View style={[styles.badge, styles.menuBadge]}>
                <Text style={[styles.badgeText, styles.menuBadgeText]}>{f.label}</Text>
              </View>
              <Text style={[styles.menuText, f.label === selected && styles.menuTextActive]}>{roomsLabel(f.count)}</Text>
              {f.label === selected ? <Icon name="action-check" width={14 * scaleX} height={12 * scaleX} color="#5a759d" /> : null}
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* 4702:2274 / 2275 */}
      <Text style={[styles.title, styles.roomsTitle]}>
        Rooms  <Text>({roomCount})</Text>
      </Text>
    </View>
  );
}

const androidText = Platform.select({ android: { includeFontPadding: false } as const, default: {} as const });

const styles = StyleSheet.create({
  /* Under the search pill (no gutter in the header's footer slot): the bar spans 420 at x=10. */
  wrap: {
    paddingHorizontal: 10 * scaleX,
    paddingTop: 16 * scaleX,
    paddingBottom: 12 * scaleX,
  },
  /* Helvetica Bold 15 #1e1e1e at x=13. */
  title: {
    marginLeft: 3 * scaleX,
    marginBottom: 0,
    fontSize: 15 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#1e1e1e',
    ...androidText,
  },
  floorBar: {
    marginTop: 0,
    height: 58 * scaleX,
    borderRadius: 5 * scaleX,
    backgroundColor: '#f1f6fc',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12 * scaleX,
    paddingRight: 31 * scaleX,
  },
  /* 4702:2254 — 38 square, radius 7. */
  badge: {
    width: 38 * scaleX,
    height: 38 * scaleX,
    borderRadius: 7 * scaleX,
    borderWidth: 1,
    borderColor: '#5a759d',
    backgroundColor: 'rgba(90, 117, 157, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3 * scaleX,
  },
  badgeText: {
    fontSize: 26 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#5a759d',
    ...androidText,
  },
  barCount: {
    flex: 1,
    marginLeft: 12 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: '#7c7878',
    ...androidText,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  allFloors: {
    fontSize: 15 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#5a759d',
    ...androidText,
  },
  menu: {
    marginTop: 6 * scaleX,
    borderRadius: 8 * scaleX,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  menuRow: {
    minHeight: 48 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14 * scaleX,
    gap: 12 * scaleX,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e3e3e3',
  },
  menuBadge: {
    width: 30 * scaleX,
    height: 30 * scaleX,
  },
  menuBadgeText: {
    fontSize: 18 * scaleX,
  },
  menuText: {
    flex: 1,
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: '#1e1e1e',
    ...androidText,
  },
  menuTextActive: {
    fontWeight: '700',
    color: '#5a759d',
  },
  /* "Rooms (20)" 17 under the bar. */
  roomsTitle: {
    marginTop: 17 * scaleX,
  },
});
