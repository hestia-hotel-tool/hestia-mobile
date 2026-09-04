import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@/theme';
import { Icon, useDesignScale } from '@/ui';

export const LANGUAGES = [
  { code: 'EN', name: 'English' },
  { code: 'FR', name: 'French' },
  { code: 'DE', name: 'German' },
  { code: 'IT', name: 'Italian' },
] as const;

export type LanguageSelectorProps = {
  value: string;
  onChange: (code: string) => void;
};

/** "Language EN" with a chevron that opens a short list. */
export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const { s } = useDesignScale();
  const [open, setOpen] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', alignItems: 'center' },
        label: {
          fontSize: s(17),
          lineHeight: s(22),
          fontFamily: typography.fontFamily.light,
          color: colors.primary.main,
        },
        value: {
          fontFamily: typography.fontFamily.bold,
          color: colors.text.pink,
        },
        // The chevron is authored pointing right; 90deg makes it point down.
        // Its 8x17 leaf sits centred in a 24 box, so nudge the box right to put
        // the visible glyph where the comp has it.
        chevron: { transform: [{ rotate: '90deg' }], marginRight: -s(4.5) },
        chevronOpen: { transform: [{ rotate: '-90deg' }], marginRight: -s(4.5) },
        menu: {
          position: 'absolute',
          top: s(30),
          right: 0,
          zIndex: 1000,
          backgroundColor: colors.background.primary,
          borderWidth: 1,
          borderColor: colors.border.light,
          borderRadius: s(4),
        },
        item: { paddingHorizontal: s(16), paddingVertical: s(12), minWidth: s(150) },
        itemText: {
          fontSize: s(16),
          fontFamily: typography.fontFamily.regular,
          color: colors.text.primary,
        },
        itemTextSelected: {
          fontFamily: typography.fontFamily.bold,
          color: colors.text.pink,
        },
      }),
    [s],
  );

  return (
    <View>
      <Pressable
        style={styles.row}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`Language ${value}`}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.label} maxFontSizeMultiplier={1.3}>
          Language <Text style={styles.value}>{value}</Text>
        </Text>
        <View style={open ? styles.chevronOpen : styles.chevron}>
          <Icon name="nav-chevron-right" size={s(24)} color={colors.primary.light} />
        </View>
      </Pressable>

      {open && (
        <View style={styles.menu}>
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang.code}
              style={styles.item}
              accessibilityRole="button"
              onPress={() => {
                onChange(lang.code);
                setOpen(false);
              }}
            >
              <Text
                style={[styles.itemText, value === lang.code && styles.itemTextSelected]}
              >
                {lang.name} ({lang.code})
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
