import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography } from '@shared/theme';
import { normalizedScaleX } from '@shared/utils/responsive';

// Calculate responsive dimensions – slightly smaller than original Figma to feel less heavy
const BASE_CIRCLE_SIZE = 44; // was ~50px before
const iconContainerWidth = (BASE_CIRCLE_SIZE + 20) * normalizedScaleX;
const iconContainerHeight = (BASE_CIRCLE_SIZE + 8) * normalizedScaleX;

interface StatusIndicatorProps {
  color: string;
  icon: any;
  count: number;
  label: string;
  iconWidth?: number;
  iconHeight?: number;
  iconTintColor?: string;
  rightLabelIcon?: any;
  isPM?: boolean;
  /** When count >= 1, tapping the badge navigates/filters. Optional. */
  onPress?: () => void;
}

export default function StatusIndicator({
  color,
  icon,
  count,
  label,
  iconWidth,
  iconHeight,
  iconTintColor,
  rightLabelIcon,
  isPM = false,
  onPress,
}: StatusIndicatorProps) {
  const isPressable = count >= 1 && !!onPress;

  const iconStyle = [
    styles.icon,
    iconWidth ? { width: iconWidth * normalizedScaleX } : null,
    iconHeight ? { height: iconHeight * normalizedScaleX } : null,
  ].filter(Boolean) as any;

  const content = (
    <View style={styles.contentWrapper}>
      <View style={styles.iconContainer}>
        <View style={[styles.circle, { backgroundColor: color }]}>
          <Image
            source={icon}
            style={[iconStyle, iconTintColor ? { tintColor: iconTintColor } : null]}
            resizeMode="contain"
          />
        </View>
        {count > 0 && (
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{count}</Text>
            </View>
          </View>
        )}
      </View>
      <View style={styles.labelRow}>
        <Text
          style={[styles.label, isPM && styles.labelPM]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {label}
        </Text>
        {rightLabelIcon && (
          <Image
            source={rightLabelIcon}
            style={[styles.rightLabelIcon, isPM && styles.rightLabelIconPM]}
            resizeMode="contain"
          />
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {isPressable ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.touchable}>
          {content}
        </TouchableOpacity>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    justifyContent: 'flex-start',
  },
  touchable: {
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  contentWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 8 * normalizedScaleX,
    width: iconContainerWidth,
    height: iconContainerHeight,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  circle: {
    width: BASE_CIRCLE_SIZE * normalizedScaleX,
    aspectRatio: 1, // ensure perfect circle on all screens
    borderRadius: (BASE_CIRCLE_SIZE / 2) * normalizedScaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 18 * normalizedScaleX,
    height: 18 * normalizedScaleX,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -4 * normalizedScaleX,
    right: -16 * normalizedScaleX,
    zIndex: 10,
  },
  badge: {
    backgroundColor: '#ffffff',
    borderRadius: 17 * normalizedScaleX,
    width: 34 * normalizedScaleX,
    height: 34 * normalizedScaleX,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 * normalizedScaleX },
    shadowOpacity: 0.1,
    shadowRadius: 4 * normalizedScaleX,
    elevation: 3,
  },
  badgeText: {
    fontSize: 20 * normalizedScaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#000000',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4 * normalizedScaleX,
    paddingHorizontal: 2 * normalizedScaleX,
    minHeight: 20 * normalizedScaleX, // Keep label visible on all cards (Flagged, Arrivals, StayOvers)
  },
  label: {
    fontSize: 14 * normalizedScaleX,
    fontFamily: typography.fontFamily.secondary as any,
    fontWeight: typography.fontWeights.light as any,
    color: colors.text.primary,
    textAlign: 'center',
  },
  labelPM: {
    color: '#ffffff',
  },
  rightLabelIcon: {
    width: 18 * normalizedScaleX,
    height: 18 * normalizedScaleX,
    marginLeft: 6 * normalizedScaleX,
    tintColor: colors.text.primary,
  },
  rightLabelIconPM: {
    tintColor: '#ffffff',
  },
});

