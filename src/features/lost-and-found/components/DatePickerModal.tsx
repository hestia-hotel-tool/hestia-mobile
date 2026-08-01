import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { typography } from '@/theme';
import { scaleX } from '../constants/lostAndFoundStyles';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  initialDate?: Date;
}

export default function DatePickerModal({
  visible,
  onClose,
  onConfirm,
  initialDate,
}: DatePickerModalProps) {
  // Default to current date if not provided
  const defaultDate = initialDate || new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate);
  const [currentMonth, setCurrentMonth] = useState(defaultDate.getMonth());
  const [currentYear, setCurrentYear] = useState(defaultDate.getFullYear());

  useEffect(() => {
    if (visible) {
      const dateToUse = initialDate || new Date();
      setSelectedDate(dateToUse);
      setCurrentMonth(dateToUse.getMonth());
      setCurrentYear(dateToUse.getFullYear());
    }
  }, [visible, initialDate]);

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDaySelect = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(newDate);
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedDate);
    onClose();
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const isSelected = (day: number) => {
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth &&
      selectedDate.getFullYear() === currentYear
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth &&
      today.getFullYear() === currentYear
    );
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
            <Text style={styles.title}>Select Date</Text>
            <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
              <Text style={styles.confirmText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Month/Year Selector */}
          <View style={styles.monthYearContainer}>
            <TouchableOpacity
              onPress={() => handleMonthChange('prev')}
              style={styles.monthButton}
            >
              <Text style={styles.monthButtonText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthYearText}>
              {monthNames[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity
              onPress={() => handleMonthChange('next')}
              style={styles.monthButton}
            >
              <Text style={styles.monthButtonText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarContainer}>
            {/* Day Headers */}
            <View style={styles.dayHeaders}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text key={day} style={styles.dayHeaderText}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar Days */}
            <View style={styles.daysContainer}>
              {emptyDays.map((_, index) => (
                <View key={`empty-${index}`} style={styles.dayCell} />
              ))}
              {days.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayCell,
                    isSelected(day) && styles.dayCellSelected,
                    isToday(day) && styles.dayCellToday,
                  ]}
                  onPress={() => handleDaySelect(day)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected(day) && styles.dayTextSelected,
                      isToday(day) && !isSelected(day) && styles.dayTextToday,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
    width: 320 * scaleX,
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
  monthYearContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12 * scaleX,
  },
  monthButton: {
    width: 32 * scaleX,
    height: 32 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthButtonText: {
    fontSize: 20 * scaleX,
    color: '#5a759d',
    fontWeight: typography.fontWeights.bold as any,
  },
  monthYearText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#000000',
  },
  calendarContainer: {
    marginTop: 8 * scaleX,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8 * scaleX,
  },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#5a759d',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4 * scaleX,
    minHeight: 32 * scaleX,
  },
  dayCellSelected: {
    backgroundColor: '#5a759d',
    borderRadius: 14 * scaleX,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: '#5a759d',
    borderRadius: 14 * scaleX,
  },
  dayText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#000000',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: typography.fontWeights.bold as any,
  },
  dayTextToday: {
    color: '#5a759d',
    fontWeight: typography.fontWeights.bold as any,
  },
});

