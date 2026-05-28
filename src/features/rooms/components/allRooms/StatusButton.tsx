import React, { forwardRef } from 'react';
import { TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { RoomStatus, STATUS_CONFIGS } from '../../types/allRooms.types';
import { scaleX, STATUS_BUTTON, CARD_DIMENSIONS, STAFF_SECTION } from '../../constants/allRoomsStyles';

interface StatusButtonProps {
  status: RoomStatus;
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
  /** Assignment paused: show pause icon on cream pill (Figma 2333-132, room list). */
  assignmentPaused?: boolean;
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
  assignmentPaused = false,
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

  if (assignmentPaused) {
    return (
      <TouchableOpacity
        ref={ref}
        style={[
          styles.containerIconOnly,
          {
            width: buttonWidth,
            height: buttonHeight,
            borderRadius: STATUS_BUTTON.borderRadius * scaleX,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: 'rgba(90,117,157,0.23)',
            left: buttonLeft,
            top,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#5a759d" />
        ) : (
          <Image
            source={require('../../../../../assets/icons/pause.png')}
            style={[styles.iconPaused, { tintColor: '#000000' }]}
            resizeMode="contain"
          />
        )}
      </TouchableOpacity>
    );
  }

  // Safety check: ensure config exists before rendering
  if (!config) {
    return null;
  }

  // Icon-only status button - always displays houseKeepingStatus (Dirty, In Progress, Cleaned, Inspected)
  if (!config.icon) {
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
      {isLoading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <Image
          source={config.icon}
          style={styles.iconLarge}
          resizeMode="contain"
        />
      )}
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
  icon: {
    width: STATUS_BUTTON.icon.width * scaleX,
    height: STATUS_BUTTON.icon.height * scaleX,
  },
  iconLarge: {
    width: STATUS_BUTTON.iconInProgress.width * scaleX,
    height: STATUS_BUTTON.iconInProgress.height * scaleX,
  },
  iconPaused: {
    width: STATUS_BUTTON.icon.width * scaleX,
    height: STATUS_BUTTON.icon.width * scaleX,
  },
});

