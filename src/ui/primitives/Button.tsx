import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@/theme';
import { useDesignScale } from '../useDesignScale';
import { Icon, type IconName } from '../Icon';

export type ButtonVariant = 'primary' | 'secondary';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** Swaps the label for a spinner and blocks presses. */
  loading?: boolean;
  disabled?: boolean;
  /** Rendered after the label, e.g. the chevron on "Recover Password". */
  trailingIcon?: IconName;
  /** Degrees to rotate `trailingIcon`. The chevron is authored pointing right. */
  trailingIconRotation?: number;
};

/**
 * The app's button.
 *
 * Geometry is the one `design-system.json` always specified but nothing
 * implemented: 70pt tall, square corners, 18pt label. `primary` is the filled
 * brand action; `secondary` is the bordered row used for softer choices such as
 * "Recover Password".
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  trailingIcon,
  trailingIconRotation = 0,
}: ButtonProps) {
  const { s } = useDesignScale();
  const isPrimary = variant === 'primary';
  const inactive = disabled || loading;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          height: s(70),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: s(8),
          backgroundColor: isPrimary ? colors.primary.main : colors.background.secondary,
          borderWidth: isPrimary ? 0 : 1,
          borderColor: colors.border.light,
        },
        inactive: { opacity: 0.7 },
        label: {
          fontSize: s(18),
          fontFamily: typography.fontFamily.regular,
          color: isPrimary ? colors.text.white : colors.primary.main,
        },
        icon: { transform: [{ rotate: `${trailingIconRotation}deg` }] },
      }),
    [s, isPrimary, trailingIconRotation],
  );

  return (
    <Pressable
      style={[styles.base, inactive && styles.inactive]}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.text.white : colors.primary.main} />
      ) : (
        <>
          <Text style={styles.label} maxFontSizeMultiplier={1.4}>
            {label}
          </Text>
          {trailingIcon && (
            <View style={styles.icon}>
              <Icon
                name={trailingIcon}
                size={s(24)}
                color={isPrimary ? colors.text.white : colors.primary.main}
              />
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}
