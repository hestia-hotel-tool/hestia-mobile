import type { ImageSourcePropType } from 'react-native';

/**
 * The pictures the Room Checklist draws for each catalogue item, by
 * `consumables.image_key`. Bundled, so they show offline and load instantly.
 * An unknown key falls back to the category's picture.
 */
const IMAGES: Record<string, ImageSourcePropType> = {
  'sparkling-water': require('../../../../assets/images/sparling-water.png'),
  'still-water': require('../../../../assets/images/valser-still-water.png'),
  'coca-cola-zero': require('../../../../assets/images/coca-cola-zero.png'),
  rivella: require('../../../../assets/images/rivella.png'),
  'large-towels': require('../../../../assets/images/large-towels.png'),
  'medium-towels': require('../../../../assets/images/medium-towels.png'),
  'face-towels': require('../../../../assets/images/face-towels.png'),
};

const CATEGORY_FALLBACK: Record<string, ImageSourcePropType> = {
  mini_bar: IMAGES['still-water'],
  laundry: IMAGES['large-towels'],
  towels: IMAGES['large-towels'],
};

export function checklistImage(imageKey: string | null, category: string): ImageSourcePropType {
  return (imageKey && IMAGES[imageKey]) || CATEGORY_FALLBACK[category] || IMAGES['still-water'];
}

/** Section names and order: Mini Bar first, then Laundry, then anything else. */
export const CHECKLIST_CATEGORY_LABEL: Record<string, string> = {
  mini_bar: 'Mini Bar',
  laundry: 'Laundry',
  towels: 'Towels',
};

export const CHECKLIST_CATEGORY_ORDER = ['mini_bar', 'laundry', 'towels'];
