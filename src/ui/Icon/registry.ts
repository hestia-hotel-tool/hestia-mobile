/**
 * Icon registry — the single place every UI icon is declared.
 *
 * Adding an icon:
 *   1. Export the frame from Figma as SVG (24×24 frame, not rescaled by hand).
 *   2. Normalize it — see `assets/README.md` › "Icons: authoring".
 *   3. Save to `assets/icons/<group>/<domain>-<concept>[-<variant>].svg`.
 *   4. Add an import and one `icons` entry below.
 *
 * The registry key is always the filename minus `.svg`, which keeps review
 * mechanical. Naming: kebab-case, `domain-concept[-variant]`, no `-icon` suffix.
 *
 * Never `require()` an icon inside a screen or component.
 *
 * Imports are explicit rather than a `require.context` glob: the glob is
 * unstable across Expo SDKs, defeats `IconName` autocomplete, and bundles every
 * icon whether or not it is used. One line per icon is the right cost.
 */
import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

/**
 * Brand marks are NOT icons and are deliberately absent here.
 * `assets/brand/logo-mark.svg` is 53×50, multi-colour and not tintable — it
 * fails every property `<Icon>` assumes (square, single-colour, `currentColor`).
 * It is imported directly by the component that draws the brand lockup.
 */
export const icons = {
  // Empty until the first screen is refactored — icons are exported from Figma
  // per screen, so only glyphs actually in use enter the system. Groups:
  //   nav/          nav-home, nav-rooms, nav-tickets, nav-chat, nav-more
  //   room-status/  status-dirty, status-in-progress, status-cleaned, status-inspected
  //   guest-status/ guest-arrival, guest-departure, guest-stayover, guest-turndown
  //   departments/  dept-engineering, dept-reception, dept-laundry, …
  //   actions/      action-plus, action-search, action-flag, action-print, …
} satisfies Record<string, FC<SvgProps>>;

export type IconName = keyof typeof icons;
