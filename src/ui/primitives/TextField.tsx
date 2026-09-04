import React, { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, typography } from '@/theme';
import { useDesignScale } from '../useDesignScale';

export type TextFieldProps = TextInputProps & {
  label: string;
};

/**
 * A labelled text input.
 *
 * Matches `design-system.json`'s long-standing input spec — 70pt tall, square
 * corners, 17pt text on white — which, like the button, was written down but
 * never implemented.
 */
export function TextField({ label, style, ...inputProps }: TextFieldProps) {
  const { s } = useDesignScale();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        label: {
          fontSize: s(17),
          lineHeight: s(22),
          fontFamily: typography.fontFamily.regular,
          color: colors.text.primary,
          marginBottom: s(8),
        },
        box: {
          height: s(70),
          backgroundColor: colors.background.primary,
          justifyContent: 'center',
        },
        input: {
          paddingHorizontal: s(12),
          fontSize: s(17),
          fontFamily: typography.fontFamily.light,
          color: colors.text.primary,
        },
      }),
    [s],
  );

  return (
    <View>
      <Text style={styles.label} maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
      <View style={styles.box}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.text.tertiary}
          {...inputProps}
        />
      </View>
    </View>
  );
}
