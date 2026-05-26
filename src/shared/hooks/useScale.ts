import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  DEFAULT_DESIGN_WIDTH,
  DEFAULT_DESIGN_HEIGHT,
  scaleXForWidth,
  scaleYForHeight,
} from '../utils/layoutScale';

/**
 * Scaling helpers that always use the **current** window size (unlike static `utils/scaling`).
 */
export const useScale = (options?: { designWidth?: number; designHeight?: number }) => {
  const { width, height } = useWindowDimensions();
  const designWidth = options?.designWidth ?? DEFAULT_DESIGN_WIDTH;
  const designHeight = options?.designHeight ?? DEFAULT_DESIGN_HEIGHT;

  return useMemo(() => {
    return {
      scaleX: (size: number) => scaleXForWidth(size, width, designWidth),
      scaleY: (size: number) => scaleYForHeight(size, height, designHeight),
      scaleFont: (size: number) => scaleXForWidth(size, width, designWidth),
      width,
      height,
      designWidth,
      designHeight,
    };
  }, [width, height, designWidth, designHeight]);
};
