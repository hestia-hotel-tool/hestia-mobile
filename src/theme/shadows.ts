import { Platform, type ViewStyle } from 'react-native';

/**
 * Real React Native shadow objects.
 *
 * These replace `design-system.json`'s `colors.shadow.nav`, which was a CSS
 * `box-shadow` string ("0px 0px 105.1px -35px rgba(...)") — valid in the
 * Tailwind mirror, meaningless to RN, and consumed by nothing.
 *
 * iOS takes the shadow* props; Android only honours `elevation`, which also
 * drives z-order, so the two branches are not interchangeable.
 */
export const shadows = {
  none: {} as ViewStyle,

  /** Bottom tab bar lift. */
  nav: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#6483B0',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 35,
    },
    default: { elevation: 12 },
  })!,

  /** Soft card lift. */
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    default: { elevation: 2 },
  })!,
} as const;
