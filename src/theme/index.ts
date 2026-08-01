// @ts-ignore - JSON import
import designSystem from '../../design-system.json';

export type DesignSystem = typeof designSystem;

export const theme = designSystem;

// Color helpers
export const colors = theme.colors;
export const statusColors = theme.roomStatus;

// Typography helpers
export const typography = theme.typography;
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

