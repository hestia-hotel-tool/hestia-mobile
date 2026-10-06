/**
 * Generate default task text based on room type
 */
import type { RoomType } from '../types/roomDetail.types';

export function getDefaultTaskText(roomType: RoomType): string {
  switch (roomType) {
    case 'Arrival':
    case 'ArrivalDeparture':
      return "Deep clean bathroom. Change all linens + pillow protectors. Vacuum thoroughly. Restock all amenities.";
    case 'Departure':
      return "Deep clean bathroom. Change all linens + pillow protectors. Vacuum thoroughly. Restock all amenities. Check for guest items.";
    case 'Stayover':
      return "Refresh bathroom. Change linens (if needed). Vacuum. Restock amenities. Check minibar.";
    case 'Turndown':
      return "Evening turndown service. Refresh bathroom. Prepare bed. Restock amenities. Check lighting.";
    default:
      return "Deep clean bathroom. Change all linens + pillow protectors. Vacuum thoroughly. Restock all amenities.";
  }
}
