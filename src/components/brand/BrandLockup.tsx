import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@/theme';
import { useDesignScale } from '@/ui';
import LogoMark from '@assets/brand/logo-mark.svg';

/**
 * The Hestia mark set beside the "Hestia" wordmark.
 *
 * Geometry comes from the launch comp (Figma 3265:2156), where the group is
 * 177x55: a 53x50 mark, a 13pt gap, then a 111pt wordmark whose box starts 10pt
 * lower than the mark's top. Those proportions are preserved at any
 * `markHeight`, so the header-sized lockup on the login screen is the same
 * component.
 *
 * The mark is a multi-colour brand asset, not a UI icon: it keeps its literal
 * fills and is imported directly rather than through the icon registry.
 */
export type BrandLockupProps = {
  /** Mark height in design-frame px. 50 on the launch screen, 33 in headers. */
  markHeight?: number;
  /** Wordmark colour. */
  color?: string;
};

const MARK_ASPECT = 53 / 50;
/** Wordmark cap size relative to the mark, taken from the comp (39 / 50). */
const WORDMARK_RATIO = 39 / 50;
const GAP_RATIO = 13 / 50;
const BASELINE_OFFSET_RATIO = 10 / 50;

export function BrandLockup({
  markHeight = 50,
  color = colors.primary.main,
}: BrandLockupProps) {
  const { s } = useDesignScale();

  const styles = useMemo(() => {
    const h = s(markHeight);
    return StyleSheet.create({
      row: { flexDirection: 'row', alignItems: 'flex-start' },
      mark: { width: h * MARK_ASPECT, height: h },
      wordmark: {
        marginLeft: h * GAP_RATIO,
        marginTop: h * BASELINE_OFFSET_RATIO,
        fontSize: h * WORDMARK_RATIO,
        lineHeight: h * WORDMARK_RATIO * 1.147,
        fontFamily: typography.fontFamily.regular,
        color,
      },
    });
  }, [s, markHeight, color]);

  return (
    <View style={styles.row}>
      <LogoMark width={styles.mark.width} height={styles.mark.height} />
      {/*
        A logotype must stay proportional to the mark beside it, so it opts out
        of the OS text-size setting. The taglines below do not.
      */}
      <Text style={styles.wordmark} allowFontScaling={false}>
        Hestia
      </Text>
    </View>
  );
}
