import type { TextStyle } from 'react-native';

/**
 * Font families, addressed BY WEIGHT.
 *
 * Inter is bundled natively via the `expo-font` config plugin (see
 * app.config.ts), so there is no `useFonts` call and nothing to wait on at
 * launch.
 *
 * Each weight is its own family on purpose. TrueType's legacy name table only
 * lets four styles share a family name, so `Inter-Light.ttf` reports the family
 * "Inter Light" and `Inter-SemiBold.ttf` reports "Inter SemiBold". Asking for
 * family "Inter" with `fontWeight: '300'` therefore resolves on Android (which
 * maps weights through a generated XML family) but silently falls back to
 * Regular on iOS. Naming the exact family removes that divergence: iOS matches
 * the PostScript name and Android the registered file name, and both land on
 * the same face.
 *
 * Consequence: set `fontFamily` alone. Do NOT pair it with `fontWeight` — the
 * weight is already carried by the family, and specifying both can make iOS
 * re-resolve against a family that does not exist.
 */
export const fontFamily = {
  light: 'Inter-Light',
  regular: 'Inter-Regular',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',

} as const;

export type FontFamily = keyof typeof fontFamily;

/**
 * @deprecated Weight is carried by the font family now — use `fontFamily.bold`
 * rather than `fontFamily.primary` + `fontWeights.bold`. Kept only so that any
 * remaining call site still compiles; do not add new uses.
 */
export const fontWeights = {
  light: '300',
  regular: '400',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

/**
 * NUMERIC, in design-frame px. The old `fontSizes` were strings ("13px") and
 * therefore unusable in a React Native `StyleSheet` — which is why nothing
 * ever consumed them.
 */
export const fontSize = {
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 15,
  xl: 16,
  '2xl': 17,
  '3xl': 18,
  '4xl': 20,
  '5xl': 21,
  '6xl': 22,
  '7xl': 24,
  '8xl': 34,
  '9xl': 39,
} as const;

/** Multipliers — multiply by a `fontSize` to get a numeric RN `lineHeight`. */
export const lineHeight = {
  tight: 1.147,
  normal: 1.3,
  relaxed: 1.5,
} as const;

export const typography = {
  fontFamily,
  fontWeights,
  fontSize,
  lineHeight,

  /** @deprecated px-strings, unusable in StyleSheet. Use `fontSize` (numeric). */
  fontSizes: {
    xs: '11px',
    sm: '12px',
    base: '13px',
    md: '14px',
    lg: '15px',
    xl: '16px',
    '2xl': '17px',
    '3xl': '18px',
    '4xl': '20px',
    '5xl': '21px',
    '6xl': '22px',
    '7xl': '24px',
    '8xl': '34px',
    '9xl': '39px',
  },

  /** @deprecated `'normal'` is not a valid RN lineHeight. Use `lineHeight`. */
  lineHeights: { tight: '1.147', normal: 'normal' },
} as const;

export type FontSize = keyof typeof fontSize;
export type FontWeight = keyof typeof fontWeights;
