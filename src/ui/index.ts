/**
 * The Hestia design system runtime.
 *
 * Generic and app-agnostic: nothing here may import from `features/`, `domain/`,
 * `lib/` or `store/`. Pure token *data* lives one layer down in `@/theme`;
 * app-level composites that know Hestia's domain shapes live one layer up in
 * `@/components`.
 *
 * Primitives (Button, Card, Modal, …) land in `./primitives` only when a real
 * screen needs one — they are designed against actual call sites, not guessed.
 */

export { Icon } from './Icon';
export type { IconName, IconProps } from './Icon';

export { useDesignScale } from './useDesignScale';
export type { DesignScale } from './useDesignScale';
