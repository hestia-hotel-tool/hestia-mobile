/**
 * The Figma frame every Hestia screen is drawn against (iPhone 16 Pro Max).
 *
 * Note the height: the old `layoutScale.ts` declared 800, which contradicted
 * every 956-tall comp in the file. That mismatch is why `scaleY` was never
 * trustworthy and why nothing consumed it.
 */
export const DESIGN_FRAME = { width: 440, height: 956 } as const;

/**
 * Bounds on the width ratio, so type and icons stay legible from a small phone
 * to a tablet. An iPad at 1024pt would otherwise scale everything 2.3×.
 */
export const SCALE_CLAMP = { min: 0.85, max: 1.15 } as const;

/** Canonical square icon sizes, in design-frame px. */
export const iconSize = {
  xs: 8,
  sm: 14,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 44,
} as const;

export type IconSize = keyof typeof iconSize;

/** Minimum comfortable touch target, in design-frame px. */
export const MIN_TOUCH_TARGET = 44;
