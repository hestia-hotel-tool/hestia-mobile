/**
 * Shared component barrel.
 *
 * Grouping:
 *   ui/        visual primitives — reusable anywhere, no feature knowledge
 *   layout/    app chrome — tab bar and its items
 *   feedback/  overlays and transient UI
 *   Icon/      the SVG icon system
 *
 * Anything that only one feature uses belongs in that feature, not here.
 * GuestProfileImageModal used to live in this folder and was imported solely by
 * rooms; it now sits in src/features/rooms/components/.
 */

// ui
export { Card, CardDivider } from './ui/Card';
export type { CardProps } from './ui/Card';
export { CountBadge } from './ui/CountBadge';
export type { CountBadgeProps } from './ui/CountBadge';
export { StatusCircle, ROOM_STATUS, ROOM_STATUS_ORDER } from './ui/StatusCircle';
export type { StatusCircleProps, RoomStatusKey } from './ui/StatusCircle';
export { SegmentedToggle } from './ui/SegmentedToggle';
export type { SegmentedToggleProps, SegmentedOption } from './ui/SegmentedToggle';
export { Avatar } from './ui/Avatar';
export type { AvatarProps } from './ui/Avatar';
export { default as SearchInput } from './ui/SearchInput';
export { default as SeeRoomsButton } from './ui/SeeRoomsButton';

// layout
export { default as BottomTabBar } from './layout/BottomTabBar';
export { default as TabBarItem } from './layout/TabBarItem';

// feedback
export { LoadingOverlay } from './feedback/LoadingOverlay';
export { default as MorePopup } from './feedback/MorePopup';
export { default as MoreMenuItem } from './feedback/MoreMenuItem';

// icons
export { Icon } from './Icon';
export type { IconProps, IconName } from './Icon';
