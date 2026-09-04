/**
 * Back-compat for the old `design-system.json`-shaped exports.
 *
 * Everything here has an exact replacement in the new token files. Delete a
 * member as soon as its last call site is refactored, and delete this file when
 * it is empty.
 *
 * Only members with real call sites are kept. `theme`, `statusColors`,
 * `borderRadius`, `fontSizes` and `fontWeights` were exported by the old barrel
 * but imported by nobody, so they are simply gone.
 */
import { colors, roomStatusColors, type RoomStatusToken } from './colors';

/**
 * @deprecated One call site (`UserProfileScreen`). Use `colors.background.header`.
 *
 * The old `components` block also described button/input/card/navigation/header/
 * searchBar geometry, none of which was ever read. Only the header colour was.
 */
export const components = {
  header: {
    backgroundColor: colors.background.header,
    height: 133,
  },
} as const;

/** @deprecated Use `roomStatusColors[status].color`. */
export const getStatusColor = (status: RoomStatusToken): string =>
  roomStatusColors[status]?.color ?? colors.text.primary;

/** @deprecated Use `roomStatusColors[status].backgroundColor`. */
export const getStatusBackgroundColor = (status: RoomStatusToken): string =>
  roomStatusColors[status]?.backgroundColor ?? colors.background.primary;
