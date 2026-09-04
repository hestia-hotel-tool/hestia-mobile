/**
 * NUMERIC spacing, in design-frame units (the 440×956 Figma frame).
 *
 * Pass these through `useDesignScale().s()` where the value should track the
 * device width. The old `spacing` tokens were px-strings ("4px") and had zero
 * consumers, so changing the shape here breaks nothing.
 */
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

export type Spacing = keyof typeof spacing;
