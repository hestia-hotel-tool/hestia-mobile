import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { typography } from '@shared/theme';
import { scaleX } from '../constants/lostAndFoundStyles';
import LostAndFoundTimePickerContainer from './LostAndFoundTimePickerContainer';

interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (hour: number, minute: number) => void;
  initialHour?: number;
  initialMinute?: number;
}

export default function TimePickerModal({
  visible,
  onClose,
  onConfirm,
  initialHour,
  initialMinute,
}: TimePickerModalProps) {
  // Default to current time if not provided
  const getCurrentTime = () => {
    const now = new Date();
    return {
      hour: initialHour !== undefined ? initialHour : now.getHours(),
      minute: initialMinute !== undefined ? initialMinute : now.getMinutes(),
    };
  };

  const currentTime = getCurrentTime();
  const [selectedHour24, setSelectedHour24] = useState(currentTime.hour);
  const [selectedMinute, setSelectedMinute] = useState(currentTime.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(
    currentTime.hour >= 12 ? 'PM' : 'AM'
  );

  useEffect(() => {
    if (visible) {
      const time = getCurrentTime();
      setSelectedHour24(time.hour);
      setSelectedMinute(time.minute);
      setSelectedPeriod(time.hour >= 12 ? 'PM' : 'AM');
    }
  }, [visible, initialHour, initialMinute]);

  // Convert 24-hour to 12-hour for display
  const getDisplayHour = (hour24: number): number => {
    if (hour24 === 0) return 12;
    if (hour24 > 12) return hour24 - 12;
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

  const displayHour = getDisplayHour(selectedHour24);

  const handleHourChange = (hour24: number) => {
    setSelectedHour24(hour24);
    // Update period based on new hour
    setSelectedPeriod(hour24 >= 12 ? 'PM' : 'AM');
  };

  const handlePeriodChange = (period: 'AM' | 'PM') => {
    setSelectedPeriod(period);
    // Convert current display hour to new 24-hour format with new period
    const newHour24 = get24Hour(displayHour, period);
    setSelectedHour24(newHour24);
  };

  const handleConfirm = () => {
    onConfirm(selectedHour24, selectedMinute);
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Select Time</Text>
            <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
              <Text style={styles.confirmText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* AM/PM Toggle */}
          <View style={styles.periodContainer}>
            <TouchableOpacity
              style={[
                styles.periodButton,
                selectedPeriod === 'AM' && styles.periodButtonActive,
              ]}
              onPress={() => handlePeriodChange('AM')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === 'AM' && styles.periodTextActive,
                ]}
              >
                AM
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.periodButton,
                selectedPeriod === 'PM' && styles.periodButtonActive,
              ]}
              onPress={() => handlePeriodChange('PM')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.periodText,
                  selectedPeriod === 'PM' && styles.periodTextActive,
                ]}
              >
                PM
              </Text>
            </TouchableOpacity>
          </View>

          {/* Time Picker */}
          <View style={styles.pickerContainer}>
            <LostAndFoundTimePickerContainer
              selectedHour={selectedHour24}
              selectedMinute={selectedMinute}
              selectedPeriod={selectedPeriod}
              onHourChange={handleHourChange}
              onMinuteChange={setSelectedMinute}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12 * scaleX,
    width: 300 * scaleX,
    padding: 16 * scaleX,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12 * scaleX,
  },
  cancelButton: {
    padding: 6 * scaleX,
  },
  cancelText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
  title: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#000000',
  },
  confirmButton: {
    padding: 6 * scaleX,
  },
  confirmText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#5a759d',
  },
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(90, 117, 157, 0.07)',
    borderRadius: 8 * scaleX,
    padding: 4 * scaleX,
    marginBottom: 12 * scaleX,
    alignSelf: 'center',
    width: 110 * scaleX,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 6 * scaleX,
    borderRadius: 6 * scaleX,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#5a759d',
  },
  periodText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
  periodTextActive: {
    color: '#ffffff',
    fontWeight: typography.fontWeights.bold as any,
  },
  pickerContainer: {
    height: 180 * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});

