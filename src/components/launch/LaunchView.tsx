import React, { useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@/theme';
import { useDesignScale } from '@/ui';
import { BrandLockup } from '@/components/brand/BrandLockup';
import { Screen } from '@/components/layout/Screen';

export type LaunchViewProps = {
  /** Fade the content in. Only the cold-start entry should do this. */
  animateIn?: boolean;
  /** Optional footer — an error, a stall notice, a recovery action. */
  children?: React.ReactNode;
};

/**
 * The one launch visual in the app.
 *
 * Rendered by the launch route, by the route guard while permissions resolve,
 * and behind the no-access notice, so a cold start never crosses two different
 * looking screens. It shares the native splash's background exactly, which is
 * what makes that handoff invisible.
 *
 * Pure: no auth, no rbac, no navigation. That is what lets `domain/rbac` render
 * it without an import cycle.
 *
 * Layout note — the comp places content at y 376..589 of a 956pt frame, whose
 * centre (482.5) sits 4.5pt below the frame centre (478). That is 0.47% of
 * screen height, so this centres in the full screen rather than carrying the
 * offset. Safe-area insets are deliberately not applied: the content sits
 * nowhere near the Dynamic Island or the home indicator, and centring inside
 * the safe box would push it 14pt low on a notched device.
 */
export function LaunchView({ animateIn = false, children }: LaunchViewProps) {
  const { s } = useDesignScale();
  const [fade] = useState(() => new Animated.Value(animateIn ? 0 : 1));

  useEffect(() => {
    if (!animateIn) return;
    Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [animateIn, fade]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        // 141.5 (lockup centre -> subtitle centre) - 55/2 - 26/2
        subtitle: {
          marginTop: s(101),
          fontSize: s(22),
          lineHeight: s(26),
          fontFamily: typography.fontFamily.light,
          color: colors.primary.main,
          textAlign: 'center',
        },
        // 32 (subtitle centre -> tagline centre) - 26/2 - 25/2
        tagline: {
          marginTop: s(6.5),
          fontSize: s(21),
          lineHeight: s(25),
          fontFamily: typography.fontFamily.bold,
          color: colors.text.pink,
          textAlign: 'center',
        },
        footer: {
          position: 'absolute',
          left: s(24),
          right: s(24),
          bottom: s(72),
          alignItems: 'center',
        },
      }),
    [s],
  );

  return (
    <Screen>
      <Animated.View style={[styles.content, { opacity: fade }]}>
        <BrandLockup markHeight={50} />
        {/*
          Line boxes are 26 and 25 rather than the comp's tight 22 and 24: a
          22pt box on a 22pt font clips the descenders in "by" and "Housekeepers"
          on Android. The margins above absorb the difference so the optical
          centres still land on the comp.

          Copy matches the design verbatim, including "Build by Housekeepers".
        */}
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.4}>
          Build by Housekeepers
        </Text>
        <Text style={styles.tagline} maxFontSizeMultiplier={1.4}>
          For Housekeeping
        </Text>
      </Animated.View>

      {children ? <View style={styles.footer}>{children}</View> : null}
    </Screen>
  );
}
