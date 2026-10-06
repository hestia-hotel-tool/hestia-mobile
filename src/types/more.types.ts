import type { IconName } from '@/components/Icon';

export type MoreMenuItemId = 'lostAndFound' | 'staff' | 'settings';

export interface MoreMenuOption {
  id: MoreMenuItemId;
  label: string;
  /** Registry SVG — see `assets/icons/nav/`. */
  iconName: IconName;
  /** Glyph height in design px; width follows the SVG's aspect ratio. */
  iconHeight: number;
  navigationTarget: 'LostAndFound' | 'Staff' | 'Settings';
}

/*
 * Heights are the glyphs' own heights in the tab bar of Figma 3128:32
 * (Lost & Found 3128:171 is 40, Staff 3128:164 is 25) and the Assets page's
 * Settings button (1413:1343, 29).
 */
export const MORE_MENU_OPTIONS: MoreMenuOption[] = [
  {
    id: 'lostAndFound',
    label: 'Lost & Found',
    iconName: 'nav-lost-found',
    iconHeight: 40,
    navigationTarget: 'LostAndFound',
  },
  {
    id: 'staff',
    label: 'Staff',
    iconName: 'nav-staff',
    iconHeight: 25,
    navigationTarget: 'Staff',
  },
  {
    id: 'settings',
    label: 'Settings',
    iconName: 'nav-settings',
    iconHeight: 29,
    navigationTarget: 'Settings',
  },
];
