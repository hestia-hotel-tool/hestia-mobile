import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { scaleX as defaultScale } from '@/utils/responsive';

/** The dropdown's "Room" choice; every other choice is a public area's name. */
export const LOCATION_ROOM = 'Room';

export type LocationDropdownProps = {
  /** `LOCATION_ROOM` or a public area's name. */
  value: string;
  /** Every choice in order, `LOCATION_ROOM` included. */
  options: readonly string[];
  onChange: (value: string) => void;
  /** Design-px multiplier; screens that size from the window pass their own. */
  scale?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * "Select Location" — Figma 4649:1018 (Create Ticket), also Lost & Found →
 * Register step 2. A 387 x 70 #e1e1e1 box, radius 8: the bed (Room only), the
 * choice, a chevron. Open, the other choices list under it at the label's x,
 * 56 apart, pushing what follows down.
 */
export function LocationDropdown({ value, options, onChange, scale = defaultScale, style }: LocationDropdownProps) {
  const [open, setOpen] = useState(false);
  const s = (n: number) => n * scale;
  const isRoom = value === LOCATION_ROOM;

  const choose = (next: string) => {
    setOpen(false);
    if (next !== value) onChange(next);
  };

  return (
    <View style={style}>
      <TouchableOpacity
        style={[styles.box, { width: s(387), height: s(70), borderRadius: s(8), paddingLeft: s(25), paddingRight: s(35) }]}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Location: ${value}`}
        accessibilityState={{ expanded: open }}
      >
        {/* The bed is 50 wide at x=59; the label starts at x=130. */}
        <View style={{ width: s(71) }}>
          {isRoom ? <Icon name="checklist-bed" size={s(25)} color="#5a759d" /> : null}
        </View>
        <Text style={[styles.label, { fontSize: s(16) }]} numberOfLines={1}>
          {value}
        </Text>
        <Icon
          name="action-chevron-down-wide"
          width={s(21)}
          height={s(9.88)}
          color="#5a759d"
          style={open ? styles.chevronOpen : undefined}
        />
      </TouchableOpacity>

      {open
        ? options
            .filter((o) => o !== value)
            .map((o) => (
              <TouchableOpacity
                key={o}
                // Choices at x=130, one every 56 (the first 13 under the box).
                style={{ height: s(56), justifyContent: 'center', paddingLeft: s(97), paddingBottom: s(11) }}
                onPress={() => choose(o)}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={[styles.label, { fontSize: s(16) }]}>{o}</Text>
              </TouchableOpacity>
            ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    flex: 1,
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
    ...Platform.select({ android: { includeFontPadding: false }, default: {} }),
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
});

export default LocationDropdown;
