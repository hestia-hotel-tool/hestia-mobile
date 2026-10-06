import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/theme';
import { normalizedScaleX } from '@/utils/responsive';
import { Icon, type IconName } from '@/components/Icon';
import { TINTABLE_ICONS } from '@/components/Icon/registry';

interface MoreMenuItemProps {
  iconName: IconName;
  label: string;
  onPress: () => void;
  /** Glyph height in design px; width follows the SVG's aspect ratio. */
  iconHeight?: number;
}

export default function MoreMenuItem({ iconName, label, onPress, iconHeight = 40 }: MoreMenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Icon
          name={iconName}
          size={Math.round(iconHeight * normalizedScaleX)}
          {...(TINTABLE_ICONS.has(iconName) ? { color: colors.primary.main } : null)}
        />
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center', // Center content vertically
    minWidth: Math.round(96 * normalizedScaleX), // Consistent width for all items
  },
  iconContainer: {
    height: Math.round(68 * normalizedScaleX), // Accommodate tallest icon (68) - rounded for pixel-perfect
    marginBottom: Math.round(6 * normalizedScaleX),
    justifyContent: 'center', // Center icon vertically within container
    alignItems: 'center',
  },
  label: {
    fontFamily: 'Helvetica',
    fontSize: Math.round(15 * normalizedScaleX),
    color: colors.primary.main,
    textAlign: 'center',
    lineHeight: Math.round(16 * normalizedScaleX),
  },
});

