import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Icon } from '@/components/Icon';
import { RoomDisplayStatus, STATUS_CONFIGS } from '../../types/allRooms.types';

interface StatusPillProps {
  status: RoomDisplayStatus;
  /** Scale factor already applied by the caller (matches the rest of allRooms' scaleX system). */
  scaleX: number;
  isLoading?: boolean;
  /**
   * Show the dropdown chevron next to the icon, spread to the pill's edges
   * (Figma 3883:6387 etc — every status pill pairs its glyph with a chevron).
   * When true, pass the pill's own width/height so the row can fill it.
   * Off for contexts with no room for it, e.g. the vacant-row icon-only treatment.
   */
  showChevron?: boolean;
  pillWidth?: number;
  pillHeight?: number;
}

/** Figma's chevron glyph points left; the pill shows it rotated to point down. */
const CHEVRON_HEIGHT = 26;
const CHEVRON_ROTATION = '-90deg';
/** Figma 3883:6387/6417/6543 — icon sits ~16% in from the pill's left edge, chevron ~15px from the right. */
const ICON_LEFT_INSET = 21;
const CHEVRON_RIGHT_INSET = 15;

/**
 * Renders a room's status glyph (or a loading spinner) and, optionally, the
 * dropdown chevron — the pill's background/border/position stay owned by the
 * caller (StatusButton's Figma-measured geometry, RoomCard's vacant-row icon),
 * which differs per call site.
 *
 * Every glyph in Figma 3883:5570 renders white regardless of pill color,
 * including Paused — no per-status tint special-casing needed.
 *
 * Replaces three previously-separate copies of "which icon for this status":
 * StatusButton's normal-status branch, its assignmentPaused branch, and
 * RoomCard's inline vacant-row copy.
 */
export default function StatusPill({
  status,
  scaleX,
  isLoading = false,
  showChevron = false,
  pillWidth,
  pillHeight,
}: StatusPillProps) {
  const config = STATUS_CONFIGS[status];
  if (!config) return null;

  if (isLoading) {
    return <ActivityIndicator size="small" color="#FFF" />;
  }

  const icon = <Icon name={config.iconName} size={config.glyphHeight * scaleX} color="#ffffff" />;

  if (!showChevron) return icon;

  return (
    <View
      style={[
        styles.row,
        {
          width: pillWidth,
          height: pillHeight,
          paddingLeft: ICON_LEFT_INSET * scaleX,
          paddingRight: CHEVRON_RIGHT_INSET * scaleX,
        },
      ]}
    >
      {icon}
      <Icon
        name="action-chevron"
        size={CHEVRON_HEIGHT * scaleX}
        color="#ffffff"
        style={{ transform: [{ rotate: CHEVRON_ROTATION }] }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
