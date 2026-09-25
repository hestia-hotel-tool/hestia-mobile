import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { colors, typography } from '@/theme';
import { useDesignScale } from '@/hooks/useDesignScale';
import { Icon, type IconName } from '@/components/Icon';
import { ICON_ASPECT, TINTABLE_ICONS } from '@/components/Icon/registry';

interface TabBarItemProps {
  /**
   * A registered SVG from `assets/icons/nav/`.
   *
   * Single-colour marks are tinted to the active/inactive colour. Two-tone
   * marks (`nav-home`, `nav-lost-found`, `nav-ai`) keep their own fills —
   * `Icon` warns if a colour is passed to one, and flattening them would
   * destroy the mark.
   */
  iconName: IconName;
  label: string;
  active?: boolean;
  badge?: number;
  onPress: () => void;
  /** Glyph height in design px; width follows the SVG's aspect ratio. */
  iconHeight: number;
}

export default function TabBarItem({
  iconName,
  label,
  active = false,
  badge,
  onPress,
  iconHeight,
}: TabBarItemProps) {
  const { normalizedScaleX: ns } = useDesignScale();
  const styles = useMemo(() => buildTabBarItemStyles(ns), [ns]);

  const glyphHeight = Math.round(iconHeight * ns);
  // Sized exactly to the glyph, so the badge's offsets are the frame's.
  const glyphBox = { width: glyphHeight * (ICON_ASPECT[iconName] ?? 1), height: glyphHeight };
  const iconColor = active ? colors.text.pink : colors.primary.main;
  const labelNumberOfLines = 1;

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
            {/* The badge is placed against the glyph itself, not the 70x56 slot. */}
            <View style={[styles.glyph, glyphBox]}>
              <Icon
                name={iconName}
                size={glyphHeight}
                {...(TINTABLE_ICONS.has(iconName) ? { color: iconColor } : null)}
              />
              {badge !== undefined && badge > 0 ? (
                <View style={styles.badge} accessibilityLabel={`${badge} unread`}>
                  <Text style={styles.badgeText}>{badge > 99 ? '99+' : String(badge)}</Text>
                </View>
              ) : null}
            </View>
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
    glyph: {
      position: 'relative',
      overflow: 'visible',
    },
    /*
     * Figma 3272:62 (node 3272:126): a 20 disc, #ff46a3, no ring, holding the
     * count in Helvetica Light 15 white. The Chat glyph is 28x28 at x205 y850;
     * the disc sits at x228 y849 — 1 above the glyph's top and overhanging its
     * right edge by 15. More digits widen it to the right.
     */
    badge: {
      position: 'absolute',
      top: -1 * ns,
      left: '100%',
      marginLeft: -5 * ns,
      minWidth: 20 * ns,
      height: 20 * ns,
      borderRadius: 10 * ns,
      paddingHorizontal: 4 * ns,
      backgroundColor: '#ff46a3',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    badgeText: {
      color: '#ffffff',
      fontSize: 15 * ns,
      lineHeight: 17 * ns,
      fontFamily: Platform.OS === 'ios' ? 'Helvetica' : typography.fontFamily.primary,
      fontWeight: '300',
      includeFontPadding: false,
      textAlign: 'center',
    },
    label: {
      fontSize: Math.round(15 * ns),
      lineHeight: Math.round(15 * ns),
      fontFamily: Platform.OS === 'ios' ? 'Helvetica' : typography.fontFamily.primary,
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
      fontFamily: Platform.OS === 'ios' ? 'Helvetica' : typography.fontFamily.primary,
      fontWeight: '700' as any,
      color: colors.text.pink,
      includeFontPadding: false,
    },
  });
}
