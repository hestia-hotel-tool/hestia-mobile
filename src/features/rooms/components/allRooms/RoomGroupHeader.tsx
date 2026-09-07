import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography } from '@/theme';
import { Icon, type IconName } from '@/components/Icon';
import { scaleX } from '../../constants/allRoomsStyles';

/** Figma 3838:1510 — centred label over a hairline rule spanning the list. */
const RULE_INSET = 29;
const LABEL_SIZE = 18;

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
 * A plain band heading — Priority, Dirty, Cleaned, Inspected, Paused.
 *
 * The label carries the band's colour; the rule underneath is neutral, so a run
 * of headings reads as one list rather than a stack of coloured blocks.
 */
export function RoomGroupHeader({ label, color }: RoomGroupHeaderProps) {
  return (
    <View style={styles.plainContainer}>
      <Text style={[styles.plainLabel, { color }]}>{label}</Text>
      <View style={styles.rule} />
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
    <View style={[styles.strip, { backgroundColor: color }]}>
      <View style={styles.disc}>
        <Icon name={iconName} size={24 * scaleX} color={iconColor} />
      </View>
      <Text style={styles.stripLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plainContainer: {
    alignItems: 'center',
    paddingTop: 20 * scaleX,
    paddingBottom: 4 * scaleX,
  },
  plainLabel: {
    fontSize: LABEL_SIZE * scaleX,
    fontFamily: typography.fontFamily.secondary,
    fontWeight: typography.fontWeights.bold as any,
    marginBottom: 12 * scaleX,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: RULE_INSET * scaleX,
    backgroundColor: '#e3e3e3',
  },
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
