/**
 * Dynamic Position Calculator for Room Detail Screen
 * Calculates all element positions based on room type configuration
 * 
 * This utility ensures pixel-perfect layouts for different room types
 * by calculating positions dynamically based on:
 * - Number of guests (single vs dual)
 * - Presence of special instructions
 * - Card height variations
 */

import { RoomTypeConfig } from '../types/roomDetail.types';
import { CONTENT_AREA } from '../constants/roomDetailStyles';

export interface CalculatedPositions {
  // Guest Info Section
  guestInfoTitle: number;
  firstGuestTop: number;
  firstGuestDateTop: number;
  specialInstructionsTitle?: number;
  specialInstructionsText?: number;
  divider1: number;
  
  // Second Guest (if applicable)
  secondGuestTop?: number;
  secondGuestDateTop?: number;
  divider2: number;
  
  // Assigned To & Card Section
  assignedToTitle: number;
  cardTop: number;
  cardHeight: number;
  
  // Lost & Found Section
  lostAndFoundTitle: number;
  lostAndFoundBox: number;
  
  // Notes Section
  notesIconTop: number;
  notesTitleTop: number;
  notesDividerTop: number;
}

/** Approximate chars per line for special instructions at ~13px and ~390px width */
const SPECIAL_INSTRUCTIONS_CHARS_PER_LINE = 48;
const SPECIAL_INSTRUCTIONS_LINE_HEIGHT = 18;

/**
 * Calculate all positions for a given room type
 * All positions are absolute from the top of the screen
 * @param config Room type configuration
 * @param hasSpecialInstructionsData Whether special instructions are actually present in the room data
 * @param firstGuestName Optional first guest name to check if it wraps (for Arrival/Departure rooms)
 * @param specialInstructionsText Optional text to estimate wrapped height so divider/second guest don't overlap
 */
export function calculatePositions(
  config: RoomTypeConfig,
  hasSpecialInstructionsData?: boolean,
  firstGuestName?: string,
  specialInstructionsText?: string | null
): CalculatedPositions {
  const { guestInfoStartTop, hasSpecialInstructions, numberOfGuests, cardHeight } = config;
  
  // Use actual presence of special instructions data if provided, otherwise fall back to config
  const actuallyHasSpecialInstructions = hasSpecialInstructionsData !== undefined 
    ? hasSpecialInstructionsData 
    : hasSpecialInstructions;
  
  // Guest Info Section
  const guestInfoTitle = guestInfoStartTop;
  // Gap from title to guest name varies by room type (Figma):
  // - Arrival: 46px (303 -> 349)
  // - Departure: 66px (303 -> 369)
  // - Stayover/Turndown: 50px (310 -> 360, Figma 1772-406)
  const gapToGuest = config.type === 'Departure' ? 66 : config.type === 'Stayover' || config.type === 'Turndown' ? 50 : 46;
  const firstGuestTop = guestInfoTitle + gapToGuest;
  
  // Check if first guest name wraps (for Arrival/Departure rooms)
  const MAX_NAME_LENGTH = 23;
  const firstGuestNameWraps = firstGuestName ? firstGuestName.length > MAX_NAME_LENGTH : false;
  // When name wraps, GuestInfoDisplay adds WRAP_SPACING (26px) to date top position
  const WRAP_SPACING = 26; // lineHeight (18px) + marginTop (2px) + bottomMargin (6px)
  const baseGapToDate = 28; // Base gap from name to date
  const actualGapToDate = firstGuestNameWraps ? baseGapToDate + WRAP_SPACING : baseGapToDate; // 54px if wrapped, 28px if not
  
  const firstGuestDateTop = firstGuestTop + actualGapToDate; // Dates appear below name (adjusted for wrapped names)
  
  let currentTop = firstGuestDateTop;
  
  const positions: CalculatedPositions = {
    guestInfoTitle,
    firstGuestTop,
    firstGuestDateTop,
    divider1: 0,
    divider2: 0,
    assignedToTitle: 0,
    cardTop: 0,
    cardHeight,
    lostAndFoundTitle: 0,
    lostAndFoundBox: 0,
    notesIconTop: 0,
    notesTitleTop: 0,
    notesDividerTop: 0,
  };
  
  // Special Instructions (if applicable AND actually present)
  if (actuallyHasSpecialInstructions) {
    // Figma: Stayover 1772-406 dates 388, special title 441, text 466, divider 536
    // Figma: Arrival 1772-104 dates 377, special title 417, text 442, divider 510
    const isStayoverOrTurndown = config.type === 'Stayover' || config.type === 'Turndown';
    const gapToTitle = isStayoverOrTurndown ? 53 : 40; // 53px Stayover/Turndown (441-388), 40px Arrival
    
    positions.specialInstructionsTitle = currentTop + gapToTitle;
    positions.specialInstructionsText = positions.specialInstructionsTitle + 25; // 25px below title (Figma)
    
    // Divider below special instructions text (Figma: 536 = 466+70 Stayover; 510 Arrival)
    const gapFromTextToDivider = isStayoverOrTurndown ? 52 : 40; // 52 so 466+18+52=536; 40 for Arrival
    const estimatedLines = specialInstructionsText && specialInstructionsText.length > 0
      ? Math.min(5, Math.max(1, Math.ceil(specialInstructionsText.length / SPECIAL_INSTRUCTIONS_CHARS_PER_LINE)))
      : 1;
    const specialInstructionsTextHeight = estimatedLines * SPECIAL_INSTRUCTIONS_LINE_HEIGHT;
    positions.divider1 = positions.specialInstructionsText + specialInstructionsTextHeight + gapFromTextToDivider;
  } else {
    // No special instructions - place divider closer to dates
    // For Departure: dates at 397, divider at 436 (39px gap)
    // For other types without special instructions: use similar spacing
    const gapToDivider = config.type === 'Departure' ? 39 : 39; // Consistent 39px gap when no special instructions
    positions.divider1 = currentTop + gapToDivider;
  }
  
  // Second Guest (if dual guest - ArrivalDeparture only)
  if (numberOfGuests === 2) {
    // Calculate actual height of first guest card
    // Name line height: 21px per line (from guestName style)
    const nameLineHeight = 21;
    const nameHeight = firstGuestNameWraps ? nameLineHeight * 2 : nameLineHeight; // 42px if wrapped, 21px if not
    
    // Date row height: For Room Detail screen, date + guestcount + ETA are all inline in one row
    // Approximate height: ~18px (line height of date/time text)
    const dateRowHeight = 18;
    
    // Calculate first guest card bottom position
    // Name top + name height + actual gap to date (already calculated above) + date row height
    const firstGuestCardBottom = firstGuestTop + nameHeight + actualGapToDate + dateRowHeight;
    
    // Ensure divider is below first guest card with proper spacing
    // The divider position was already calculated above (either from special instructions or from currentTop)
    // But we need to ensure it's below the first guest card when name wraps
    const minGapFromFirstGuest = firstGuestNameWraps ? 28 : 12; // More gap when name wraps (28px vs 12px)
    const minDividerPosition = firstGuestCardBottom + minGapFromFirstGuest;
    
    // Update divider1 position if needed to prevent overlap
    // This ensures divider is always below the first guest card, even when name wraps
    if (positions.divider1 < minDividerPosition) {
      positions.divider1 = minDividerPosition;
    }
    
    // Second guest starts with proper gap from divider
    // Significantly increase gap when first guest name wraps to push second guest down
    const gapToSecondGuest = firstGuestNameWraps ? 56 : 32; // Much more gap when name wraps (56px vs 32px)
    positions.secondGuestTop = positions.divider1 + gapToSecondGuest;
    positions.secondGuestDateTop = positions.secondGuestTop + 26; // 26px from name to dates for departure
    positions.divider2 = positions.secondGuestDateTop + 57; // 57px from dates to divider2
  } else {
    // Single guest - divider2 is same as divider1
    positions.divider2 = positions.divider1;
  }
  
  // Assigned To Section
  // Gap from divider to "Assigned to" title varies by room type:
  // - Departure: 26px (436 -> 462)
  // - Others: 19px
  const gapToAssignedTitle = config.type === 'Departure' ? 26 : 19;
  positions.assignedToTitle = positions.divider2 + gapToAssignedTitle;
  
  // Card Section
  positions.cardTop = positions.assignedToTitle + 30; // 30px gap from title to card
  
  const cardEnd = positions.cardTop + cardHeight;
  
  // Lost & Found Section (Figma 1772-406: card ends 768, L&F title 806, box 844)
  const isStayoverOrTurndown = config.type === 'Stayover' || config.type === 'Turndown';
  const gapToLostFoundTitle = isStayoverOrTurndown ? 38 : 26; // 806-768=38
  const gapToLostFoundBox = isStayoverOrTurndown ? 38 : 34;   // 844-806=38
  
  positions.lostAndFoundTitle = cardEnd + gapToLostFoundTitle;
  positions.lostAndFoundBox = positions.lostAndFoundTitle + gapToLostFoundBox;
  
  const lostAndFoundBoxEnd = positions.lostAndFoundBox + 97; // Box height is 97px
  
  // Notes Section
  positions.notesDividerTop = lostAndFoundBoxEnd + 38; // 38px gap from box end to divider
  positions.notesIconTop = positions.notesDividerTop + 30; // 30px gap from divider to icon
  positions.notesTitleTop = positions.notesIconTop + 5; // 5px from icon to title (vertically aligned)
  
  return positions;
}

/**
 * Calculate relative position from absolute position
 * Used to convert Figma absolute positions to component-relative positions
 */
export function getRelativePosition(absoluteTop: number, referenceTop: number): number {
  return absoluteTop - referenceTop;
}

/**
 * Calculate card spacer height for ScrollView
 * This ensures proper spacing between guest info and the card
 */
export function calculateCardSpacerHeight(positions: CalculatedPositions): number {
  return (positions.cardTop - CONTENT_AREA.top) + positions.cardHeight;
}
