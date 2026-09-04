/**
 * Utility functions index
 * Central export point for all utility functions
 *
 * NOTE: `./scaling` is deliberately absent. It exported `scaleX` as a *function*
 * while `utils/responsive.ts` and 12 feature constants files export `scaleX` as a
 * *number*, so importing it from here gave `40 * [Function]` -> NaN. Layout scale
 * comes from `useDesignScale()`; new code should use flex + tokens instead.
 */

export * from './formatting';
export * from './validation';
export * from './encoding';

