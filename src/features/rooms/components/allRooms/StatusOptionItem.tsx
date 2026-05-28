import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { typography } from '@shared/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

interface StatusOptionItemProps {
  icon: any;
  label: string;
  onPress: () => void;
  /** Optional tint for the icon (e.g. for white-on-black assets to match status color) */
  tintColor?: string;
  /** Optional circular background color (same style as Dirty, Cleaned, etc.) */
  backgroundColor?: string;
  /** Optional scale so icon matches visual size of others (e.g. 1.2 for assets with more padding) */
  iconScale?: number;
}

const ICON_SIZE = 50 * scaleX;
/** Icon drawn smaller so it fits with padding inside the circle (same as Dirty, Cleaned) */
const ICON_FIT_SIZE = ICON_SIZE * 0.5;

export default function StatusOptionItem({
  icon,
  label,
  onPress,
  tintColor,
  backgroundColor,
  iconScale = 1,
}: StatusOptionItemProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          backgroundColor != null && {
            backgroundColor,
            borderRadius: ICON_SIZE / 2,
          },
        ]}
      >
        <Image
          source={icon}
          style={[
            styles.icon,
            iconScale !== 1 && {
              width: ICON_FIT_SIZE * iconScale,
              height: ICON_FIT_SIZE * iconScale,
            },
          ]}
          resizeMode="contain"
          {...(tintColor != null && { tintColor })}
        />
      </View>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '25%', // 4 columns: 100% / 4 = 25% each
    marginBottom: 16 * scaleX,
  },
  iconContainer: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    marginBottom: 8 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: ICON_FIT_SIZE,
    height: ICON_FIT_SIZE,
  },
  label: {
    fontFamily: typography.fontFamily.primary,
    fontSize: 12 * scaleX,
    fontWeight: typography.fontWeights.light as any,
    color: '#1e1e1e',
    textAlign: 'center',
    lineHeight: 14 * scaleX,
  },
});

