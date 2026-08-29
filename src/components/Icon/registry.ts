/**
 * Icon registry — the single place every UI icon is declared.
 *
 * Add an icon:
 *   1. Drop the optimized SVG in the right `assets/icons/<group>/` folder
 *      (24×24 viewBox, `currentColor` fills/strokes, no hardcoded width/height).
 *   2. `import` it here and add one entry to `icons` keyed by `group-concept`.
 *
 * Naming: kebab-case, `domain-concept[-variant]`, no `-icon` suffix.
 *   status-dirty, status-in-progress, guest-arrival, dept-engineering,
 *   nav-home, action-flag
 *
 * Consume via <Icon name="status-dirty" /> — never `require()` an icon in a
 * screen or component.
 */

// import StatusDirty from '@assets/icons/room-status/status-dirty.svg';
// import StatusCleaned from '@assets/icons/room-status/status-cleaned.svg';
// import NavHome from '@assets/icons/nav/nav-home.svg';

export const icons = {
  // 'status-dirty': StatusDirty,
  // 'status-cleaned': StatusCleaned,
  // 'nav-home': NavHome,
} as const;

export type IconName = keyof typeof icons;
