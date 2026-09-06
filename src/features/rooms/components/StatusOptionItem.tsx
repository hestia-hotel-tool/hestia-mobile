import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { typography } from '@/theme';
import { Icon, type IconName } from '@/components/Icon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

interface StatusOptionItemProps {
  iconName: IconName;
  /** Glyph height in design px; width follows the glyph's own aspect ratio. */
  glyphHeight: number;
  /** Fill of the circle behind the glyph. */
  circleColor: string;
  /** Tint of the glyph. */
  glyphColor: string;
  label: string;
  onPress: () => void;
}

/** Figma 2365:49 — every option is a 51.007px circle, label ~10px beneath it. */
const CIRCLE_SIZE = 51.007 * scaleX;
const CIRCLE_TO_LABEL_GAP = 10 * scaleX;
const LABEL_FONT_SIZE = 13 * scaleX;

export default function StatusOptionItem({
  iconName,
  glyphHeight,
  circleColor,
  glyphColor,
  label,
  onPress,
}: StatusOptionItemProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: circleColor }]}>
        <Icon name={iconName} size={glyphHeight * scaleX} color={glyphColor} />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
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
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    marginBottom: CIRCLE_TO_LABEL_GAP,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontFamily: typography.fontFamily.secondary,
    fontSize: LABEL_FONT_SIZE,
    fontWeight: typography.fontWeights.light as any,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 15 * scaleX,
  },
});
