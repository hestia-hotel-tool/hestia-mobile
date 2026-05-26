import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { colors } from '@shared/theme';
import { normalizedScaleX } from '@shared/utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

interface MoreMenuItemProps {
  icon: any;
  label: string;
  onPress: () => void;
  iconWidth?: number;
  iconHeight?: number;
}

export default function MoreMenuItem({ 
  icon, 
  label, 
  onPress, 
  iconWidth = 40, 
  iconHeight = 40 
}: MoreMenuItemProps) {
  const iconStyle = {
    width: Math.round(iconWidth * normalizedScaleX),
    height: Math.round(iconHeight * normalizedScaleX),
    tintColor: colors.primary.main,
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Image
          source={icon}
          style={iconStyle}
          resizeMode="contain"
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

