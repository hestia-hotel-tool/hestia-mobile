import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { colors, typography } from '@/theme';
import { useDesignScale } from '@/ui';

interface TabBarItemProps {
  icon: any;
  label: string;
  active?: boolean;
  badge?: number;
  onPress: () => void;
  iconWidth?: number;
  iconHeight?: number;
  iconOpacity?: number;
  /** Some PNGs are not visually centered; allow a small horizontal nudge. */
  iconOffsetX?: number;
}

export default function TabBarItem({
  icon,
  label,
  active = false,
  badge,
  onPress,
  iconWidth,
  iconHeight,
  iconOpacity,
  iconOffsetX = 0,
}: TabBarItemProps) {
  const { normalizedScaleX: ns } = useDesignScale();
  const styles = useMemo(() => buildTabBarItemStyles(ns), [ns]);

  const finalOpacity = iconOpacity !== undefined ? iconOpacity : 1;
  const activeColor = colors.text.pink;
  const inactiveColor = colors.primary.main;
  const iconColor = active ? activeColor : inactiveColor;
  const labelNumberOfLines = 1;
  const iconStyle = iconWidth && iconHeight
    ? ([
        {
          width: Math.round(iconWidth * ns),
          height: Math.round(iconHeight * ns),
          opacity: finalOpacity,
          tintColor: iconColor,
          ...(iconOffsetX ? { transform: [{ translateX: iconOffsetX * ns }] } : null),
        },
      ] as any)
    : ([
        styles.icon,
        { opacity: finalOpacity, tintColor: iconColor },
        iconOffsetX ? { transform: [{ translateX: iconOffsetX * ns }] } : null,
      ].filter(Boolean) as any);

  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
      hitSlop={{ top: 24, bottom: 24, left: 20, right: 20 }}
      accessibilityRole="button"
    >
      <View style={styles.contentWrapper}>
        <View style={styles.iconWrapper}>
          <View style={styles.iconContainer}>
            <Image source={icon} style={iconStyle} resizeMode="contain" />
            {badge !== undefined && badge > 0 ? (
              <View style={styles.badgeContainer}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {badge > 99 ? '99+' : String(badge)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
        {label ? (
          <View style={[styles.labelContainer, labelNumberOfLines > 1 ? styles.labelContainerTwoLines : null]}>
            <Text
              style={[styles.label, label === 'Lost & Found' ? styles.labelLostAndFound : null, active && styles.labelActive]}
              numberOfLines={labelNumberOfLines}
              ellipsizeMode="clip"
            >
              {label}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function buildTabBarItemStyles(normalizedScaleX: number) {
  const ns = normalizedScaleX;
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      minWidth: Math.round(40 * ns),
    },
    contentWrapper: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapper: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 0,
    },
    labelContainer: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: Math.round(20 * ns),
      marginTop: Math.round(2 * ns),
    },
    labelContainerTwoLines: {
      minHeight: Math.round(34 * ns),
    },
    iconContainer: {
      position: 'relative',
      width: Math.round(70 * ns),
      height: Math.round(56 * ns),
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'visible',
    },
    icon: {
      width: '100%',
      height: '100%',
    },
    // Inset from icon corner so the pill doesn’t sit flush on the artwork (Chat + Tickets).
    badgeContainer: {
      position: 'absolute',
      top: Math.round(10 * ns),
      right: Math.round(18 * ns),
      zIndex: 10,
    },
    badge: {
      backgroundColor: colors.text.pink,
      borderRadius: Math.round(10.2275 * ns),
      minWidth: Math.round(20.455 * ns),
      height: Math.round(20.455 * ns),
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: Math.round(4 * ns),
      borderWidth: Math.round(2 * ns),
      borderColor: colors.background.primary,
    },
    badgeText: {
      color: colors.text.white,
      fontSize: Math.round(13 * ns),
      fontFamily: typography.fontFamily.light,
      fontWeight: typography.fontWeights.light as any,
      includeFontPadding: false,
    },
    label: {
      fontSize: Math.round(15 * ns),
      lineHeight: Math.round(15 * ns),
      fontFamily: typography.fontFamily.regular,
      fontWeight: typography.fontWeights.regular as any,
      color: colors.primary.main,
      includeFontPadding: false,
      textAlign: 'center',
      flexWrap: 'nowrap',
    },
    labelLostAndFound: {
      fontSize: Math.round(13 * ns),
      lineHeight: Math.round(13 * ns),
      letterSpacing: -0.2,
      flexShrink: 0,
    },
    labelActive: {
      fontFamily: typography.fontFamily.bold,
      fontWeight: '700' as any,
      color: colors.text.pink,
      includeFontPadding: false,
    },
  });
}
