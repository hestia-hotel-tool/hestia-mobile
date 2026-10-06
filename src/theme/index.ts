import { Platform } from 'react-native';
// @ts-ignore - JSON import
import designSystem from '../../design-system.json';

export type DesignSystem = typeof designSystem;

export const theme = designSystem;

// Color helpers
export const colors = theme.colors;
export const statusColors = theme.roomStatus;

/**
 * Font family, resolved per platform.
 *
 * The design face is Helvetica, which exists on iOS. Android has neither
 * Helvetica nor Inter, and the app bundles no font files (`expo-font` is in
 * app.config.ts but never called), so on Android every `fontFamily: 'Helvetica'`
 * was silently falling back — and an unrecognised family also makes `fontWeight`
 * unreliable there. Declaring the real system face fixes both.
 *
 * Resolving it here means the ~108 files that read `typography.fontFamily`
 * are correct on Android without each one needing a Platform.select.
 * `src/global.css` does the same for `className` consumers via `@media android`.
 */
const fontFamily = Platform.select({
  android: designSystem.typography.fontFamilyAndroid,
  default: designSystem.typography.fontFamily,
}) as typeof designSystem.typography.fontFamily;

// Typography helpers
export const typography = { ...theme.typography, fontFamily };
export const fontSizes = typography.fontSizes;
export const fontWeights = typography.fontWeights;

// Spacing helpers
export const spacing = theme.spacing;

// Border radius helpers
export const borderRadius = theme.borderRadius;

// Component styles
export const components = theme.components;

// Get status color
export const getStatusColor = (status: keyof typeof statusColors) => {
  return statusColors[status]?.color || colors.text.primary;
};

// Get status background color
export const getStatusBackgroundColor = (status: keyof typeof statusColors) => {
  return statusColors[status]?.backgroundColor || colors.background.primary;
};

export default theme;

