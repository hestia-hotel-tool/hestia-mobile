import type { ImageSourcePropType } from 'react-native';

/**
 * The room inspection's categories and pictures (Figma 4759:225, Extras 4759:1432). Pictures are
 * bundled, by `inspection_items.image_key`; an item without one shows a plain
 * tile with its initial.
 */
const IMAGES: Record<string, ImageSourcePropType> = {
  lightbulbs: require('../../../../assets/images/inspection/lightbulbs.png'),
  'heating-cooling': require('../../../../assets/images/inspection/heating-cooling.png'),
  safe: require('../../../../assets/images/inspection/safe.png'),
  'tv-remote': require('../../../../assets/images/inspection/tv-remote.png'),
  'kitchen-appliances': require('../../../../assets/images/inspection/kitchen-appliances.png'),
  'hair-dryer': require('../../../../assets/images/inspection/hair-dryer.png'),
  'hand-ventilator': require('../../../../assets/images/inspection/hand-ventilator.png'),
};

export function inspectionImage(imageKey: string | null): ImageSourcePropType | null {
  return (imageKey && IMAGES[imageKey]) || null;
}

/** The chips, in order; a category the app does not know goes last. */
export const INSPECTION_CATEGORY_ORDER = ['electrical', 'plumbing', 'woodwork', 'extras'];

export const INSPECTION_CATEGORY_LABEL: Record<string, string> = {
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  woodwork: 'Wood work',
  extras: 'Extras',
};

export function inspectionCategoryLabel(key: string): string {
  return INSPECTION_CATEGORY_LABEL[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
