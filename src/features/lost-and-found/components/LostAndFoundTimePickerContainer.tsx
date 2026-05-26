import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { scaleX } from '../constants/lostAndFoundStyles';
import TimePickerWheel from '@shared/ui/TimePickerWheel';
import { typography } from '@shared/theme';

interface LostAndFoundTimePickerContainerProps {
  selectedHour: number; // 0-23
  selectedMinute: number; // 0-59
  selectedPeriod: 'AM' | 'PM';
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
}

export default function LostAndFoundTimePickerContainer({
  selectedHour,
  selectedMinute,
  selectedPeriod,
  onHourChange,
  onMinuteChange,
}: LostAndFoundTimePickerContainerProps) {
  // Generate hours array (1-12 for 12-hour format)
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Generate minutes array (00-59)
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  // Convert 24-hour to 12-hour format for display
  const getDisplayHour = (hour24: number): number => {
    if (hour24 === 0) return 12; // Midnight
    if (hour24 > 12) return hour24 - 12; // Afternoon
    return hour24;
  };

  // Convert 12-hour display hour back to 24-hour format
  const get24Hour = (displayHour: number, period: 'AM' | 'PM'): number => {
    if (period === 'AM') {
      return displayHour === 12 ? 0 : displayHour;
    } else {
      return displayHour === 12 ? 12 : displayHour + 12;
    }
  };

  const displayHour = getDisplayHour(selectedHour);
  const selectedMinuteStr = selectedMinute.toString().padStart(2, '0');

  const handleHourChange = (value: string | number) => {
    const newDisplayHour = typeof value === 'number' ? value : parseInt(value, 10);
    const new24Hour = get24Hour(newDisplayHour, selectedPeriod);
    onHourChange(new24Hour);
  };

  const handleMinuteChange = (value: string | number) => {
    const newMinute = typeof value === 'number' ? value : parseInt(value, 10);
    onMinuteChange(newMinute);
  };

  const columnWidth = 60 * scaleX;
  const itemHeight = 40 * scaleX;
  const gap = 20 * scaleX;
  const containerHeight = 180 * scaleX;
  
  // Calculate the exact center position of the selected text
  // Container height: 180 * scaleX
  // TimePickerWheel has maxHeight: 226 * scaleX with paddingVertical: 93 * scaleX
  // But our container is 180 * scaleX, so we need to adjust
  // The selected item should be at the visual center: 90 * scaleX
  // But since the wheel uses different padding, we may need a small adjustment
  // User reports colon is "one step above", so we need to move it down slightly
  const centerY = containerHeight / 2; // 90 * scaleX (container center)

  return (
    <View style={styles.container}>
      <View style={[styles.column, { left: '50%', marginLeft: -(columnWidth + gap / 2) }]}>
        <TimePickerWheel
          values={hours}
          selectedValue={displayHour}
          onValueChange={handleHourChange}
          itemHeight={itemHeight}
          snapInterval={itemHeight}
          width={columnWidth}
        />
      </View>
      
      {/* Colon separator - aligned with center of selected text */}
      <View style={[styles.colonContainer, { top: centerY }]}>
        <Text style={styles.colonText}>:</Text>
      </View>
      
      <View style={[styles.column, { left: '50%', marginLeft: gap / 2 }]}>
        <TimePickerWheel
          values={minutes}
          selectedValue={selectedMinuteStr}
          onValueChange={handleMinuteChange}
          itemHeight={itemHeight}
          snapInterval={itemHeight}
          width={columnWidth}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    height: 180 * scaleX,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  column: {
    position: 'absolute',
    top: 0,
  },
  colonContainer: {
    position: 'absolute',
    left: '50%',
    marginLeft: -4 * scaleX, // Half of colon width to center it horizontally
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    // User reports colon is "one step above" the hour/minute text
    // Need to move it down significantly to align with selected text
    // One item step is 40 * scaleX, but we need less for text alignment
    // Adjusting to move colon down to match text center
    marginTop: 8 * scaleX, // Move down to align with text center
  },
  colonText: {
    fontSize: 24 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#5a759d',
    lineHeight: 24 * scaleX, // Match fontSize exactly
    includeFontPadding: false, // Remove extra padding for better alignment
    textAlignVertical: 'center',
  },
});

