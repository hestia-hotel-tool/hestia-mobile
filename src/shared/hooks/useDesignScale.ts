import { useMemo } from 'react';
import { Platform, PixelRatio, useWindowDimensions } from 'react-native';
import {
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_DESIGN_HEIGHT,
  scaleXForWidth,
  scaleYForHeight,
} from '../utils/layoutScale';

export interface UseDesignScaleOptions {
  designWidth?: number;
  designHeight?: number;
}

/**
 * Live responsive scale from current window size (rotation, split-screen, folding).
 * Prefer this over module-level `Dimensions.get('window')` + `scaleX` for layouts.
 */
export function useDesignScale(options?: UseDesignScaleOptions) {
  const { width, height, fontScale } = useWindowDimensions();
  const designWidth = options?.designWidth ?? DEFAULT_DESIGN_WIDTH;
  const designHeight = options?.designHeight ?? DEFAULT_DESIGN_HEIGHT;

  const scaleX = width / designWidth;
  const scaleY = height / designHeight;
  /** Matches legacy `utils/responsive` clamp so tab/icons don’t over-scale on tablets */
  const normalizedScaleX = Math.max(0.8, Math.min(1.2, scaleX));

  return useMemo(
    () => ({
      width,
      height,
      fontScale,
      designWidth,
      designHeight,
      scaleX,
      scaleY,
      normalizedScaleX,
      sx: (n: number) => scaleXForWidth(n, width, designWidth),
      sy: (n: number) => scaleYForHeight(n, height, designHeight),
      round: (n: number) => PixelRatio.roundToNearestPixel(n * scaleX),
      /** Spread on `Text` to align Android metrics closer to iOS */
      textMetrics: Platform.select({
        android: { includeFontPadding: false } as const,
        default: {} as const,
      }),
    }),
    [width, height, fontScale, designWidth, designHeight, scaleX, scaleY, normalizedScaleX],
  );
}
