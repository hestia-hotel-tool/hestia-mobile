import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const DESIGN_HEIGHT = 800; // Default design height, can be adjusted

/**
 * Scale a value based on screen width
 * @param size - The size to scale
 * @returns Scaled size
 */
export const scaleX = (size: number): number => {
  return (SCREEN_WIDTH / DESIGN_WIDTH) * size;
};

/**
 * Scale a value based on screen height
 * @param size - The size to scale
 * @returns Scaled size
 */
export const scaleY = (size: number): number => {
  return (SCREEN_HEIGHT / DESIGN_HEIGHT) * size;
};

/**
 * Scale a value based on screen width (for font sizes)
 * @param size - The font size to scale
 * @returns Scaled font size
 */
export const scaleFont = (size: number): number => {
  return scaleX(size);
};

/**
 * Get screen dimensions
 */
export const getScreenDimensions = () => ({
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  scaleX: SCREEN_WIDTH / DESIGN_WIDTH,
  scaleY: SCREEN_HEIGHT / DESIGN_HEIGHT,
});

/**
 * Design width constant
 */
export const DESIGN_WIDTH_CONSTANT = DESIGN_WIDTH;

