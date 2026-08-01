import { PixelRatio } from 'react-native';

/** Default Figma / design reference width used across Hestia screens */
export const DEFAULT_DESIGN_WIDTH = 440;
/** Default design height when using vertical scale (varies per screen; 800 is a common baseline) */
export const DEFAULT_DESIGN_HEIGHT = 800;

export function scaleXForWidth(
  designPixels: number,
  windowWidth: number,
  designWidth: number = DEFAULT_DESIGN_WIDTH,
): number {
  return designPixels * (windowWidth / designWidth);
}

export function scaleYForHeight(
  designPixels: number,
  windowHeight: number,
  designHeight: number = DEFAULT_DESIGN_HEIGHT,
): number {
  return designPixels * (windowHeight / designHeight);
}

export function roundToDevicePixels(value: number): number {
  return PixelRatio.roundToNearestPixel(value);
}
