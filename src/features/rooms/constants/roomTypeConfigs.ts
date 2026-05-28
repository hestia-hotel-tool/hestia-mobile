/**
 * Room Type Configurations
 * Defines layout and behavior for each room type based on Figma designs
 * 
 * Figma References:
 * - Arrival: node-id=1772:104
 * - Departure: node-id=1772:255
 * - Arrival/Departure: node-id=1-1506
 * - Stayover: node-id=1772:406
 * - Turndown: node-id=1772:601
 */

import { RoomType, RoomTypeConfig } from '../types/roomDetail.types';

export const ROOM_TYPE_CONFIGS: Record<RoomType, RoomTypeConfig> = {
  Arrival: {
    type: 'Arrival',
    guestInfoStartTop: 303,
    hasSpecialInstructions: true,
    numberOfGuests: 1,
    cardHeight: 206.09,
    lostAndFoundType: 'empty',
  },
  Departure: {
    type: 'Departure',
    guestInfoStartTop: 303,
    hasSpecialInstructions: false,
    numberOfGuests: 1,
    cardHeight: 206.09,
    lostAndFoundType: 'empty',
  },
  ArrivalDeparture: {
    type: 'ArrivalDeparture',
    guestInfoStartTop: 303,
    hasSpecialInstructions: true,
    numberOfGuests: 2,
    cardHeight: 206.09,
    lostAndFoundType: 'empty',
  },
  Stayover: {
    type: 'Stayover',
    guestInfoStartTop: 310, // Figma 1772-406: Guest Info title at 310px
    hasSpecialInstructions: true,
    numberOfGuests: 1,
    cardHeight: 183,
    lostAndFoundType: 'withItems',
  },
  Turndown: {
    type: 'Turndown',
    guestInfoStartTop: 310, // Figma 1772-601: same as Stayover
    hasSpecialInstructions: true,
    numberOfGuests: 1,
    cardHeight: 183,
    lostAndFoundType: 'withItems',
  },
};

/**
 * Get configuration for a specific room type
 */
export function getRoomTypeConfig(roomType: RoomType): RoomTypeConfig {
  return ROOM_TYPE_CONFIGS[roomType];
}
