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
    guestSlots: [
      {
        role: 'Arrival',
        match: { by: 'timeLabel', timeLabel: 'ETA' },
        fallbackIndex: 0,
        showsSpecialInstructions: true,
        numberBadge: 'own',
      },
    ],
    cardHeight: 206.09,
    lostAndFoundType: 'empty',
  },
  Departure: {
    type: 'Departure',
    guestSlots: [
      {
        role: 'Departure',
        match: { by: 'timeLabel', timeLabel: 'EDT' },
        fallbackIndex: 0,
        // A departing guest has no arrival instructions to show.
        showsSpecialInstructions: false,
        numberBadge: 'own',
      },
    ],
    cardHeight: 206.09,
    lostAndFoundType: 'empty',
  },
  ArrivalDeparture: {
    type: 'ArrivalDeparture',
    /*
     * Matched by index, not by ETA/EDT label, and deliberately so: the detail
     * screen must list these two in the same order as the room card, or the
     * names and photos silently swap between the two views.
     */
    guestSlots: [
      {
        role: 'Arrival',
        match: { by: 'index', index: 0 },
        showsSpecialInstructions: true,
        numberBadge: 'own',
      },
      {
        role: 'Departure',
        match: { by: 'index', index: 1 },
        // Instructions belong to the arriving guest, so only the first block shows them.
        showsSpecialInstructions: false,
        numberBadge: 'inheritFromFirst',
      },
    ],
    cardHeight: 206.09,
    lostAndFoundType: 'empty',
  },
  Stayover: {
    type: 'Stayover',
    guestSlots: [
      {
        role: 'Stayover',
        match: { by: 'index', index: 0 },
        showsSpecialInstructions: true,
        numberBadge: 'own',
      },
    ],
    cardHeight: 183,
    lostAndFoundType: 'withItems',
  },
  Turndown: {
    type: 'Turndown',
    guestSlots: [
      {
        role: 'Turndown',
        match: { by: 'index', index: 0 },
        showsSpecialInstructions: true,
        numberBadge: 'own',
      },
    ],
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
