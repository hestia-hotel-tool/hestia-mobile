import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PROMISE_TIME_MODAL, scaleX } from '../../constants/promiseTimeModalStyles';
import DatePickerWheel from '@shared/ui/DatePickerWheel';

interface DatePickerContainerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export default function DatePickerContainer({
  selectedDate,
  onDateChange,
}: DatePickerContainerProps) {
  // Generate dates array (7 days: today and 6 days ahead)
  const generateDates = (): string[] => {
    const dates: string[] = [];
    const today = new Date();
    
    for (let i = -2; i <= 4; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[date.getMonth()];
      const day = date.getDate();
      dates.push(`${month} ${day}`);
    }
    
    return dates;
  };

  const dates = generateDates();
  
  // Format selected date to match the format in the array
  const formatDate = (date: Date): string => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    return `${month} ${day}`;
  };

  const selectedDateStr = formatDate(selectedDate);
  
  // Find the closest date in the array, or use the first one
  const currentSelectedDate = dates.includes(selectedDateStr) 
    ? selectedDateStr 
    : dates[Math.floor(dates.length / 2)]; // Default to middle date (today)

  const handleDateChange = (dateStr: string) => {
    // Parse the date string (e.g., "Dec 20")
    const [monthStr, dayStr] = dateStr.split(' ');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames.indexOf(monthStr);
    const day = parseInt(dayStr, 10);
    
    if (month !== -1 && !isNaN(day)) {
      const today = new Date();
      const newDate = new Date(today.getFullYear(), month, day);
      onDateChange(newDate);
    }
  };

  return (
    <View style={styles.container}>
      <DatePickerWheel
        values={dates}
        selectedValue={currentSelectedDate}
        onValueChange={handleDateChange}
        itemHeight={PROMISE_TIME_MODAL.datePicker.itemHeight}
        snapInterval={PROMISE_TIME_MODAL.datePicker.itemHeight}
        width={120} // Approximate width for date strings
        selectedFontSize={PROMISE_TIME_MODAL.datePicker.selectedFontSize}
        unselectedFontSize={PROMISE_TIME_MODAL.datePicker.unselectedFontSize}
        mediumFontSize={PROMISE_TIME_MODAL.datePicker.mediumFontSize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: PROMISE_TIME_MODAL.datePicker.height * scaleX,
    alignItems: 'flex-start',
  },
});

