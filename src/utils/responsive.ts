/**
 * Responsive scaling utility for consistent sizing across all screen sizes
 * Prevents extreme scaling on very small or very large devices
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const DESIGN_WIDTH = 440;

// Calculate base scale (frozen at first import — prefer useDesignScale / scaleXForWindowWidth in UI)
export const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

// Normalized scale - prevents extreme scaling (clamped between 0.8 and 1.2)
// This ensures elements don't become too small on small screens or too large on big screens
export const normalizedScaleX: number = Math.max(0.8, Math.min(1.2, scaleX));

/** Live width scale for responsive layouts (rotation, split view). */
export function scaleXForWindowWidth(windowWidth: number): number {
  return windowWidth / DESIGN_WIDTH;
}

/** Live clamped scale — same formula as `normalizedScaleX` but from current width. */
export function normalizedScaleXForWindowWidth(windowWidth: number): number {
  return Math.max(0.8, Math.min(1.2, scaleXForWindowWidth(windowWidth)));
}

/**
 * Scale a value using normalized scaling
 * @param value - The value to scale
 * @returns Scaled value
 */
export const scale = (value: number): number => {
  return value * normalizedScaleX;
};

/**
 * Scale a value using raw scaling (use with caution)
 * @param value - The value to scale
 * @returns Scaled value
 */
export const scaleRaw = (value: number): number => {
  return value * scaleX;
};

