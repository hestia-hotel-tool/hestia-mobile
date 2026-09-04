/**
 * The Hestia design system runtime.
 *
 * Generic and app-agnostic: nothing here may import from `features/`, `domain/`,
 * `lib/` or `store/`. Pure token *data* lives one layer down in `@/theme`;
 * app-level composites that know Hestia's domain shapes live one layer up in
 * `@/components`.
 *
 * Primitives land in `./primitives` only when a real screen needs one — they are
 * designed against actual call sites, not guessed. Button and TextField arrived
 * with the login screen; Card and Modal have not been needed yet.
 */

export { Icon } from './Icon';
export type { IconName, IconProps } from './Icon';

export { Button } from './primitives/Button';
export type { ButtonProps, ButtonVariant } from './primitives/Button';

export { TextField } from './primitives/TextField';
export type { TextFieldProps } from './primitives/TextField';

export { useDesignScale } from './useDesignScale';
export type { DesignScale } from './useDesignScale';
