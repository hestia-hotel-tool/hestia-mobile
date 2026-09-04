/** Corner radii, in design-frame units. Numeric — the old tokens were px-strings. */
export const radius = {
  none: 0,
  sm: 6,
  md: 9,
  lg: 10,
  xl: 12,
  '2xl': 17,
  '3xl': 31,
  '4xl': 37,
  '5xl': 41,
  '6xl': 44,
  '7xl': 45,
  '8xl': 68,
  '9xl': 81,
  '10xl': 82,
  full: 9999,
} as const;

export type Radius = keyof typeof radius;
