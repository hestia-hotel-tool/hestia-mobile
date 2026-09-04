import type { TextStyle } from 'react-native';

/**
 * KNOWN ISSUE (documented, not fixed here):
 *
 * `primary: 'Helvetica'` resolves on iOS only. No custom font is bundled —
 * `expo-font` is installed but never registers a family — so Android's
 * `Typeface.create` silently falls back to Roboto. The brand therefore renders
 * in a different typeface per platform.
 *
 * Fixing this shifts text metrics on every screen, so it ships as its own
 * change, not as part of the token refactor.
 */
export const fontFamily = {
  primary: 'Helvetica',
  secondary: 'Inter',
} as const;

/**
 * Literal-typed, so `fontWeight:` needs no cast. Many call sites still write
 * `as any` / `as '700'` against the old JSON-derived `string` type; those casts
 * are now harmless no-ops and can be swept as screens are refactored.
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
