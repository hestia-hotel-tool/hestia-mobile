import React, { forwardRef } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { RoomDisplayStatus, STATUS_CONFIGS } from '../../types/allRooms.types';
import { scaleX, STATUS_BUTTON, CARD_DIMENSIONS, STAFF_SECTION } from '../../constants/allRoomsStyles';
import StatusPill from './StatusPill';

interface StatusButtonProps {
  /** The room's display status (houseKeepingStatus, or 'Paused' when paused — see getRoomDisplayStatus). */
  status: RoomDisplayStatus;
  onPress: () => void;
  isPriority?: boolean;
  isArrivalDeparture?: boolean;
  hasNotes?: boolean;
  frontOfficeStatus?: string; // To identify Arrival vs Departure vs Stayover etc.
  /** Card height in px (used for some legacy layouts and safety checks). */
  cardHeight?: number;
  /**
   * Optional explicit top (in px) for the button.
   * When provided, this is used directly so the button can align with the guest info block.
   */
  buttonTopOverridePx?: number;
  isLoading?: boolean;
}

const StatusButton = forwardRef<any, StatusButtonProps>(({
  status,
  onPress,
  isPriority = false,
  isArrivalDeparture = false,
  hasNotes = false,
  frontOfficeStatus = '',
  cardHeight,
  buttonTopOverridePx,
  isLoading = false,
}, ref) => {
  // Safety check: ensure status is valid and config exists
  if (!status || !STATUS_CONFIGS[status]) {
    return null; // Return null if status is invalid or config doesn't exist
  }

  const config = STATUS_CONFIGS[status];
  const buttonWidth = STATUS_BUTTON.width * scaleX;
  const buttonHeight = STATUS_BUTTON.height * scaleX;

  // Center horizontally in the right column (from divider to card right edge)
  const rightColumnLeft = STAFF_SECTION.dividerStandard.left * scaleX;
  const cardWidthScaled = CARD_DIMENSIONS.width * scaleX;
  const rightColumnWidth = cardWidthScaled - rightColumnLeft;
  const buttonLeft = rightColumnLeft + (rightColumnWidth - buttonWidth) / 2;

  // Legacy top positions avoid overlapping guest info on Arrival/Departure, with-notes, and departure cards
  const legacyTop = isArrivalDeparture
    ? STATUS_BUTTON.positions.arrivalDeparture.top
    : hasNotes
      ? STATUS_BUTTON.positions.arrivalWithNotes.top
      : frontOfficeStatus === 'Departure'
        ? STATUS_BUTTON.positions.departure.top
        : STATUS_BUTTON.positions.standard.top;
  // Use explicit override when provided so we can align with guest block; otherwise use legacy top
  const top = buttonTopOverridePx != null
    ? buttonTopOverridePx
    : legacyTop * scaleX;

  // Icon-only status button - always displays the room's display status
  // (Dirty, In Progress, Cleaned, Inspected, or Paused).
  if (!config.iconName) {
    return null;
  }

  return (
    <TouchableOpacity
      ref={ref}
      style={[
        styles.containerIconOnly,
        {
          width: buttonWidth,
          height: buttonHeight,
          borderRadius: STATUS_BUTTON.borderRadius * scaleX,
          backgroundColor: config.color,
          left: buttonLeft,
          top,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={isLoading}
    >
      <StatusPill
        status={status}
        scaleX={scaleX}
        isLoading={isLoading}
        showChevron
        pillWidth={buttonWidth}
        pillHeight={buttonHeight}
      />
    </TouchableOpacity>
  );
});

export default StatusButton;

const styles = StyleSheet.create({
  containerIconOnly: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerFlagged: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  flagIcon: {
    width: STATUS_BUTTON.flagged.flagIcon.width * scaleX,
    height: STATUS_BUTTON.flagged.flagIcon.height * scaleX,
  },
  dropdownIcon: {
    width: STATUS_BUTTON.icon.width * scaleX,
    height: STATUS_BUTTON.icon.height * scaleX,
  },
});

