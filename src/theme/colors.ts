/**
 * Hestia colour tokens.
 *
 * This file is the source of truth. `design-system.json` is a Figma-sync
 * artifact and is no longer read at runtime.
 *
 * The nested shape is deliberately identical to the old
 * `design-system.json.colors` so that every existing
 * `import { colors } from '@/theme'` site keeps working unchanged.
 */
export const colors = {
  primary: {
    main: '#5A759D',
    light: '#607AA1',
    dark: '#334866',
  },
  status: {
    dirty: '#F92424',
    inProgress: '#F0BE1B',
    cleaned: '#4A91FC',
    inspected: '#41D541',
    priority: '#FFEBEB',
    priorityText: '#F92424',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#EEF0F6',
    tertiary: '#F1F6FC',
    card: '#F9FAFC',
    header: '#E4EEFE',
    overlay: 'rgba(228, 228, 228, 0.1)',
  },
  text: {
    primary: '#1E1E1E',
    secondary: '#334866',
    tertiary: '#A0A0A0',
    light: '#B1AFAF',
    white: '#FFFFFF',
    accent: '#5A759D',
    pink: '#FF46A3',
  },
  border: {
    light: '#DBDBDB',
    medium: '#E3E3E3',
    dark: '#E6E6E6',
  },
  badge: {
    eta: '#E9F7E9',
    etd: '#FFE3E3',
    group: '#FFEBEB',
    priority: '#FFEBEB',
  },
  transparent: 'transparent',
} as const;

export type Colors = typeof colors;

/**
 * Room-status colour pairs.
 *
 * `color` tints the glyph/label, `backgroundColor` fills the badge. They are
 * equal for the four cleaning states because those render as solid dots.
 */
export const roomStatusColors = {
  dirty: { color: colors.status.dirty, backgroundColor: colors.status.dirty },
  inProgress: { color: colors.status.inProgress, backgroundColor: colors.status.inProgress },
  cleaned: { color: colors.status.cleaned, backgroundColor: colors.status.cleaned },
  inspected: { color: colors.status.inspected, backgroundColor: colors.status.inspected },
  priority: { color: colors.status.priorityText, backgroundColor: colors.status.priority },
} as const;

export type RoomStatusToken = keyof typeof roomStatusColors;
