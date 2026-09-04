import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@/theme';
import { Icon, useDesignScale } from '@/ui';

/**
 * The support badge at the foot of the login screen: a white house mark with
 * the pink handset laid over it, beside two lines of copy.
 *
 * Note there is no pill background — the comp (Figma 263:40, Group 210) has
 * only the mark, the handset and the two texts. A translucent rounded
 * rectangle that used to be drawn here was not in the design.
 */
export function CustomerServiceCard() {
  const { s } = useDesignScale();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', alignItems: 'center' },
        badge: { width: s(42.07), height: s(39.69), justifyContent: 'center' },
        // Offsets are measured from the comp: the handset sits slightly right
        // of and below the mark's centre, inside the roof opening.
        handset: { position: 'absolute', left: s(14.07), top: s(12.99) },
        copy: { marginLeft: s(16.93) },
        title: {
          fontSize: s(15),
          lineHeight: s(17),
          fontFamily: typography.fontFamily.bold,
          color: colors.primary.main,
        },
        subtitle: {
          marginTop: s(3),
          fontSize: s(15),
          lineHeight: s(22),
          fontFamily: typography.fontFamily.light,
          color: colors.text.primary,
        },
      }),
    [s],
  );

  return (
    <View style={styles.row}>
      <View style={styles.badge}>
        <Icon name="misc-house" size={s(42.07)} color={colors.text.white} />
        <View style={styles.handset}>
          <Icon name="action-phone" size={s(20)} color={colors.text.pink} />
        </View>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} maxFontSizeMultiplier={1.3}>
          Customer Service
        </Text>
        <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
          Having issues with the app?
        </Text>
      </View>
    </View>
  );
}
