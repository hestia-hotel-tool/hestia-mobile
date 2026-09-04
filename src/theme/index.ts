/**
 * Hestia design tokens.
 *
 * TypeScript is the source of truth. `design-system.json` at the repo root is a
 * Figma-sync artifact and is no longer read at runtime — see AGENT.md.
 *
 * Tokens are pure data: nothing in this folder imports React or a React Native
 * runtime value (types only, plus `Platform` for shadows). The runtime half of
 * the design system — `<Icon>`, `useDesignScale()` — lives in `@/ui`.
 */

export { colors, roomStatusColors } from './colors';
export type { Colors, RoomStatusToken } from './colors';

export { typography, fontFamily, fontWeights, fontSize, lineHeight } from './typography';
export type { FontSize, FontWeight } from './typography';

export { spacing } from './spacing';
export type { Spacing } from './spacing';

export { radius } from './radius';
export type { Radius } from './radius';

export { shadows } from './shadows';

export { DESIGN_FRAME, SCALE_CLAMP, iconSize, MIN_TOUCH_TARGET } from './layout';
export type { IconSize } from './layout';

// --- deprecated, scheduled for deletion (see compat.ts) ---
export { components, getStatusColor, getStatusBackgroundColor } from './compat';
