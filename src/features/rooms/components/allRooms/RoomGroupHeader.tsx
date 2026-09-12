import React from 'react';
import { View as RNView, Text as RNText, StyleSheet } from 'react-native';
import { View, Text } from '@/tw';
import { typography } from '@/theme';
import { Icon, type IconName } from '@/components/Icon';
import { scaleX } from '../../constants/allRoomsStyles';

/** Figma 3838:1575 — the pinned band's coloured cap. */
const STRIP_HEIGHT = 73;
const STRIP_RADIUS = 12;
const DISC_SIZE = 50.017;
const DISC_LEFT = 31;

export type RoomGroupHeaderProps = {
  label: string;
  color: string;
};

/**
 * A plain band heading — Paused, In Progress, Priority, Dirty, Cleaned,
 * Inspected. Figma 3883:5953 (Paused) and 3883:5968 (Inspected).
 *
 * A hairline, the label, a hairline — the rules flank the label at its own
 * vertical centre rather than running underneath it, and they take the band's
 * colour, not a neutral grey. Both were checked against the exported vectors:
 * the Paused rule strokes #B0C0C6 and the Inspected rule #41D541, each matching
 * its own label.
 *
 * `flex-1` on the rules reproduces the design's asymmetric spans (139/138px
 * under "Paused", 119/119 under "Cleaned") for free — the label takes its
 * natural width at any label length and any device width, so the two rules
 * always balance.
 */
export function RoomGroupHeader({ label, color }: RoomGroupHeaderProps) {
  return (
    <View className="flex-row items-center gap-2xl px-3xl pb-2xl pt-3xl">
      <View className="h-px flex-1" style={{ backgroundColor: color }} />
      <Text
        className="font-hestia-secondary text-hestia-3xl font-bold"
        style={{ color }}
      >
        {label}
      </Text>
      <View className="h-px flex-1" style={{ backgroundColor: color }} />
    </View>
  );
}

export type RoomGroupStripProps = {
  label: string;
  color: string;
  /** The status glyph shown in the white disc. */
  iconName: IconName;
  iconColor: string;
};

/**
 * The cap on the pinned band — Figma 3838:1575.
 *
 * A full-bleed strip in the band's colour with a white disc holding the status
 * glyph, rounded at the top so it reads as the lid of the card beneath it.
 */
export function RoomGroupStrip({ label, color, iconName, iconColor }: RoomGroupStripProps) {
  return (
    <RNView style={[styles.strip, { backgroundColor: color }]}>
      <RNView style={styles.disc}>
        <Icon name={iconName} size={24 * scaleX} color={iconColor} />
      </RNView>
      <RNText style={styles.stripLabel}>{label}</RNText>
    </RNView>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: STRIP_HEIGHT * scaleX,
    borderTopLeftRadius: STRIP_RADIUS * scaleX,
    borderTopRightRadius: STRIP_RADIUS * scaleX,
    paddingLeft: DISC_LEFT * scaleX,
  },
  disc: {
    width: DISC_SIZE * scaleX,
    height: DISC_SIZE * scaleX,
    borderRadius: (DISC_SIZE / 2) * scaleX,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripLabel: {
    marginLeft: 16 * scaleX,
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#f9fafc',
  },
});
