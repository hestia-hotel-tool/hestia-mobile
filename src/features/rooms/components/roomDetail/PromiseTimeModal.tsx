import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useMessageModal } from '@shared/contexts/MessageModalContext';
import { RETURN_LATER_MODAL } from '../../constants/returnLaterModalStyles';
import TimeSuggestionButton from './TimeSuggestionButton';

const TIME_SUGGESTIONS = ['10 mins', '20 mins', '30 mins', '1 Hour'];
const MIN_MINUTES_FROM_NOW = 5;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scaleX = SCREEN_WIDTH / 430;

function getMinAllowedTime() {
  const now = new Date();
  const min = new Date(now.getTime() + MIN_MINUTES_FROM_NOW * 60 * 1000);
  const hour24 = min.getHours();
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  return {
    date: new Date(min.getFullYear(), min.getMonth(), min.getDate()),
    hour12,
    minute: min.getMinutes(),
    period: (hour24 >= 12 ? 'PM' : 'AM') as 'AM' | 'PM',
  };
}

interface PromiseTimeModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (promiseTime: string, period: 'AM' | 'PM', formattedDateTime?: string, promiseAtTimestamp?: number) => void;
  roomNumber?: string;
}

export default function PromiseTimeModal({
  visible,
  onClose,
  onConfirm,
  roomNumber,
}: PromiseTimeModalProps) {
  const messageModal = useMessageModal();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedHour, setSelectedHour] = useState(() => 12);
  const [selectedMinute, setSelectedMinute] = useState(() => 0);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  const dateScrollRef = useRef<ScrollView>(null);
  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);
  const periodScrollRef = useRef<ScrollView>(null);

  const ITEM_HEIGHT = RETURN_LATER_MODAL.timePicker.itemHeight * scaleX;

  useEffect(() => {
    if (visible) {
      const min = getMinAllowedTime();
      setSelectedDate(min.date);
      setSelectedHour(min.hour12);
      setSelectedMinute(min.minute);
      setSelectedPeriod(min.period);
      setTimeout(() => {
        dateScrollRef.current?.scrollTo({ y: 6 * ITEM_HEIGHT, animated: false });
        hourScrollRef.current?.scrollTo({ y: (min.hour12 - 1) * ITEM_HEIGHT, animated: false });
        minuteScrollRef.current?.scrollTo({ y: min.minute * ITEM_HEIGHT, animated: false });
        periodScrollRef.current?.scrollTo({ y: (min.period === 'AM' ? 0 : 1) * ITEM_HEIGHT, animated: false });
      }, 100);
    }
  }, [visible]);

  const getDayName = (date: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  // Check if we're at the current date
  const isCurrentDate = () => {
    const now = new Date();
    const selected = new Date(selectedDate);
    return now.toDateString() === selected.toDateString();
  };

  const isAtLeast5MinFromNow = (date: Date, hour: number, minute: number, period: 'AM' | 'PM') => {
    const check = new Date(date);
    const hour24 = period === 'PM' ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
    check.setHours(hour24, minute, 0, 0);
    const minAllowed = Date.now() + MIN_MINUTES_FROM_NOW * 60 * 1000;
    return check.getTime() >= minAllowed;
  };

  const handleSuggestionPress = (suggestion: string) => {
    setSelectedSuggestion(suggestion);
    let minutesToAdd = suggestion === '1 Hour' ? 60 : parseInt(suggestion.replace(' mins', ''), 10);
    const currentDate = new Date(selectedDate);
    const hour24 = selectedPeriod === 'PM' ? (selectedHour === 12 ? 12 : selectedHour + 12) : (selectedHour === 12 ? 0 : selectedHour);
    currentDate.setHours(hour24, selectedMinute, 0, 0);
    const newTime = new Date(currentDate.getTime() + minutesToAdd * 60 * 1000);
    const newHour24 = newTime.getHours();
    const newMinute = newTime.getMinutes();
    const newPeriod: 'AM' | 'PM' = newHour24 >= 12 ? 'PM' : 'AM';
    const newHour12 = newHour24 === 0 ? 12 : newHour24 > 12 ? newHour24 - 12 : newHour24;
    const newDate = new Date(newTime.getFullYear(), newTime.getMonth(), newTime.getDate());
    setSelectedDate(newDate);
    setSelectedHour(newHour12);
    setSelectedMinute(newMinute);
    setSelectedPeriod(newPeriod);
    setTimeout(() => {
      dateScrollRef.current?.scrollTo({ y: 6 * ITEM_HEIGHT, animated: true });
      hourScrollRef.current?.scrollTo({ y: (newHour12 - 1) * ITEM_HEIGHT, animated: true });
      minuteScrollRef.current?.scrollTo({ y: newMinute * ITEM_HEIGHT, animated: true });
      periodScrollRef.current?.scrollTo({ y: (newPeriod === 'AM' ? 0 : 1) * ITEM_HEIGHT, animated: true });
    }, 100);
  };

  // Handle scroll events
  const handleDateScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    // Index 6 is the center (selected date), calculate the actual date relative to current selectedDate
    const date = new Date(selectedDate);
    date.setDate(selectedDate.getDate() + index - 6);
    
    // Check if date is in the past
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const isPast = checkDate.getTime() < now.getTime();
    
    // Only update if the date actually changed and is not in the past
    if (date.toDateString() !== selectedDate.toDateString() && !isPast) {
      setSelectedDate(date);
    }
  };
  
  const handleDateScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    // Ensure we're at index 6 (center) and update selectedDate
    const date = new Date(selectedDate);
    date.setDate(selectedDate.getDate() + index - 6);
    
    // Check if date is in the past
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const isPast = checkDate.getTime() < now.getTime();
    
    if (!isPast) {
      setSelectedDate(date);
      // Scroll to center to ensure selected date is always between dividers
      dateScrollRef.current?.scrollTo({ y: 6 * ITEM_HEIGHT, animated: true });
    } else {
      // If scrolled to past date, scroll back to current date
      const currentDate = new Date();
      const selected = new Date(selectedDate);
      const daysDiff = Math.floor((currentDate.getTime() - selected.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff !== 0) {
        setSelectedDate(currentDate);
        dateScrollRef.current?.scrollTo({ y: 6 * ITEM_HEIGHT, animated: true });
      }
    }
  };

  const handleHourScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const hour = index + 1;
    if (hour >= 1 && hour <= 12) {
      setSelectedHour(hour);
    }
  };

  const handleHourScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const hour = index + 1;
    if (hour >= 1 && hour <= 12) {
      // Check if this hour is in the past (only when on current date)
      let isPast = false;
      if (isCurrentDate()) {
        const now = new Date();
        const currentHour24 = now.getHours();
        const currentHour12 = currentHour24 === 0 ? 12 : currentHour24 > 12 ? currentHour24 - 12 : currentHour24;
        const currentPeriod = currentHour24 >= 12 ? 'PM' : 'AM';
        
        if (selectedPeriod === currentPeriod) {
          isPast = hour < currentHour12;
        } else if (selectedPeriod === 'AM' && currentPeriod === 'PM') {
          isPast = true;
        }
      }
      
      if (!isPast) {
        setSelectedHour(hour);
        hourScrollRef.current?.scrollTo({ y: (hour - 1) * ITEM_HEIGHT, animated: true });
      } else {
        // Scroll back to current hour
        const now = new Date();
        const currentHour24 = now.getHours();
        const currentHour12 = currentHour24 === 0 ? 12 : currentHour24 > 12 ? currentHour24 - 12 : currentHour24;
        setSelectedHour(currentHour12);
        hourScrollRef.current?.scrollTo({ y: (currentHour12 - 1) * ITEM_HEIGHT, animated: true });
      }
    }
  };

  const handleMinuteScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const minute = Math.round(offsetY / ITEM_HEIGHT);
    if (minute >= 0 && minute <= 59) {
      setSelectedMinute(minute);
    }
  };

  const handleMinuteScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const minute = Math.round(offsetY / ITEM_HEIGHT);
    if (minute >= 0 && minute <= 59) {
      if (!isAtLeast5MinFromNow(selectedDate, selectedHour, minute, selectedPeriod)) {
        const min = getMinAllowedTime();
        setSelectedDate(min.date);
        setSelectedHour(min.hour12);
        setSelectedMinute(min.minute);
        setSelectedPeriod(min.period);
        setTimeout(() => {
          minuteScrollRef.current?.scrollTo({ y: min.minute * ITEM_HEIGHT, animated: true });
          hourScrollRef.current?.scrollTo({ y: (min.hour12 - 1) * ITEM_HEIGHT, animated: true });
          periodScrollRef.current?.scrollTo({ y: (min.period === 'AM' ? 0 : 1) * ITEM_HEIGHT, animated: true });
        }, 50);
      } else {
        setSelectedMinute(minute);
        minuteScrollRef.current?.scrollTo({ y: minute * ITEM_HEIGHT, animated: true });
      }
    }
  };

  const handlePeriodScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    setSelectedPeriod(index === 0 ? 'AM' : 'PM');
  };

  const handlePeriodScrollEnd = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    const period = index === 0 ? 'AM' : 'PM';
    
    // Check if AM is in the past (only when on current date and we're in PM)
    let isPast = false;
    if (isCurrentDate() && period === 'AM') {
      const now = new Date();
      const currentPeriod = now.getHours() >= 12 ? 'PM' : 'AM';
      if (currentPeriod === 'PM') {
        isPast = true;
      }
    }
    
    if (!isPast) {
      setSelectedPeriod(period);
      periodScrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
    } else {
      // Scroll back to current period
      const now = new Date();
      const currentPeriod = now.getHours() >= 12 ? 'PM' : 'AM';
      setSelectedPeriod(currentPeriod);
      const periodIndex = currentPeriod === 'AM' ? 0 : 1;
      periodScrollRef.current?.scrollTo({ y: periodIndex * ITEM_HEIGHT, animated: true });
    }
  };

  const handleConfirm = () => {
    if (!isAtLeast5MinFromNow(selectedDate, selectedHour, selectedMinute, selectedPeriod)) {
      messageModal.show({
        title: 'Invalid time',
        message: `Promise time must be at least ${MIN_MINUTES_FROM_NOW} minutes from now.`,
        buttons: [{ text: 'OK' }],
      });
      return;
    }
    const timeString = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`;
    const formattedDateTime = `${selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${timeString}`;
    const promiseAt = new Date(selectedDate);
    const hour24 = selectedPeriod === 'PM' ? (selectedHour === 12 ? 12 : selectedHour + 12) : (selectedHour === 12 ? 0 : selectedHour);
    promiseAt.setHours(hour24, selectedMinute, 0, 0);
    onConfirm(timeString, selectedPeriod, formattedDateTime, promiseAt.getTime());
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Modal Overlay - White background */}
        <View style={styles.modalOverlay}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Title - Figma 1121-825 */}
            <Text style={styles.title}>Promise time</Text>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Suggestions */}
            <Text style={styles.suggestionsLabel}>Suggestions</Text>
            <View style={styles.suggestionsButtons}>
              {TIME_SUGGESTIONS.map((suggestion) => (
                <TimeSuggestionButton
                  key={suggestion}
                  label={suggestion}
                  isSelected={selectedSuggestion === suggestion}
                  onPress={() => handleSuggestionPress(suggestion)}
                />
              ))}
            </View>

            {/* Date & Time Picker - 4 columns (Figma) */}
            <View style={styles.dateTimePickerWrapper}>
              <View style={styles.wheelPickerContainer}>
                {/* Selection Dividers */}
                <View style={styles.selectionDividerTop} />
                <View style={styles.selectionDividerBottom} />
                
                {/* Date Column */}
                <View style={styles.wheelColumn}>
                  <ScrollView 
                    ref={dateScrollRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.wheelScrollContent}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    onScroll={handleDateScroll}
                    onMomentumScrollEnd={handleDateScrollEnd}
                    scrollEventThrottle={16}
                  >
                    {[...Array(14)].map((_, i) => {
                      const date = new Date(selectedDate);
                      date.setDate(selectedDate.getDate() + i - 6); // Show 6 days before and 7 days after selected date
                      const isSelected = date.toDateString() === selectedDate.toDateString();
                      
                      // Check if date is in the past
                      const now = new Date();
                      now.setHours(0, 0, 0, 0);
                      const checkDate = new Date(date);
                      checkDate.setHours(0, 0, 0, 0);
                      const isPast = checkDate.getTime() < now.getTime();
                      
                      const dayName = getDayName(date);
                      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
                      const dayNum = date.getDate();
                      
                      return (
                        <TouchableOpacity
                          key={date.toDateString()}
                          onPress={() => {
                            if (!isPast) {
                              setSelectedDate(date);
                            }
                          }}
                          style={styles.wheelItem}
                          disabled={isPast}
                        >
                          <Text 
                            numberOfLines={1}
                            ellipsizeMode="clip"
                            style={[
                              styles.wheelDateText,
                              isSelected && styles.wheelSelectedDateText,
                              isPast && styles.wheelDateTextDisabled
                            ]}
                          >
                            {dayName} {monthName} {dayNum}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Hour Column */}
                <View style={styles.wheelColumn}>
                  <ScrollView 
                    ref={hourScrollRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.wheelScrollContent}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    onScroll={handleHourScroll}
                    onMomentumScrollEnd={handleHourScrollEnd}
                    scrollEventThrottle={16}
                  >
                    {[...Array(12)].map((_, i) => {
                      const hour = i + 1;
                      const isSelected = selectedHour === hour;
                      
                      // Check if this hour is in the past (only when on current date)
                      let isPast = false;
                      if (isCurrentDate()) {
                        const now = new Date();
                        const currentHour24 = now.getHours();
                        const currentHour12 = currentHour24 === 0 ? 12 : currentHour24 > 12 ? currentHour24 - 12 : currentHour24;
                        const currentPeriod = currentHour24 >= 12 ? 'PM' : 'AM';
                        
                        // Check if this hour is before current hour (same period) or in previous period
                        if (selectedPeriod === currentPeriod) {
                          isPast = hour < currentHour12;
                        } else if (selectedPeriod === 'AM' && currentPeriod === 'PM') {
                          isPast = true; // All AM hours are in the past if we're in PM
                        }
                      }
                      
                      return (
                        <TouchableOpacity
                          key={`hour-${hour}`}
                          onPress={() => {
                            if (!isPast) {
                              setSelectedHour(hour);
                            }
                          }}
                          style={styles.wheelItem}
                          disabled={isPast}
                        >
                          <Text style={[
                            styles.wheelNumberText,
                            isSelected && styles.wheelSelectedNumberText,
                            isPast && styles.wheelNumberTextDisabled
                          ]}>
                            {hour}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Minute Column */}
                <View style={styles.wheelColumn}>
                  <ScrollView 
                    ref={minuteScrollRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.wheelScrollContent}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    onScroll={handleMinuteScroll}
                    onMomentumScrollEnd={handleMinuteScrollEnd}
                    scrollEventThrottle={16}
                  >
                    {[...Array(60)].map((_, i) => {
                      const isSelected = selectedMinute === i;
                      
                      // Check if this minute is in the past (only when on current date and current hour)
                      let isPast = false;
                      if (isCurrentDate()) {
                        const now = new Date();
                        const currentHour24 = now.getHours();
                        const currentHour12 = currentHour24 === 0 ? 12 : currentHour24 > 12 ? currentHour24 - 12 : currentHour24;
                        const currentPeriod = currentHour24 >= 12 ? 'PM' : 'AM';
                        const currentMinute = now.getMinutes();
                        
                        // Check if we're in the same hour and period
                        if (selectedHour === currentHour12 && selectedPeriod === currentPeriod) {
                          isPast = i < currentMinute;
                        } else if (selectedPeriod === 'AM' && currentPeriod === 'PM') {
                          isPast = true; // All AM minutes are in the past if we're in PM
                        } else if (selectedPeriod === currentPeriod && selectedHour < currentHour12) {
                          isPast = true; // Past hour in same period
                        }
                      }
                      
                      return (
                        <TouchableOpacity
                          key={`minute-${i}`}
                          onPress={() => {
                            if (!isPast) {
                              setSelectedMinute(i);
                            }
                          }}
                          style={styles.wheelItem}
                          disabled={isPast}
                        >
                          <Text style={[
                            styles.wheelNumberText,
                            isSelected && styles.wheelSelectedNumberText,
                            isPast && styles.wheelNumberTextDisabled
                          ]}>
                            {i.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* AM/PM Column */}
                <View style={styles.wheelColumn}>
                  <ScrollView 
                    ref={periodScrollRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.wheelScrollContent}
                    snapToInterval={ITEM_HEIGHT}
                    decelerationRate="fast"
                    onScroll={handlePeriodScroll}
                    onMomentumScrollEnd={handlePeriodScrollEnd}
                    scrollEventThrottle={16}
                  >
                    {['AM', 'PM'].map((period) => {
                      const isSelected = selectedPeriod === period;
                      
                      // Check if AM is in the past (only when on current date and we're in PM)
                      let isPast = false;
                      if (isCurrentDate() && period === 'AM') {
                        const now = new Date();
                        const currentPeriod = now.getHours() >= 12 ? 'PM' : 'AM';
                        if (currentPeriod === 'PM') {
                          isPast = true; // AM is in the past if we're in PM
                        }
                      }
                      
                      return (
                        <TouchableOpacity
                          key={period}
                          onPress={() => {
                            if (!isPast) {
                              setSelectedPeriod(period as 'AM' | 'PM');
                            }
                          }}
                          style={styles.wheelItem}
                          disabled={isPast}
                        >
                          <Text style={[
                            styles.wheelNumberText,
                            isSelected && styles.wheelSelectedNumberText,
                            isPast && styles.wheelNumberTextDisabled
                          ]}>
                            {period}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  modalOverlay: {
    position: 'absolute',
    top: 232 * scaleX,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 80 * scaleX },
  title: {
    marginTop: 21 * scaleX,
    marginLeft: 24 * scaleX,
    fontSize: 20 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#607aa1',
  },
  divider: {
    marginTop: 17 * scaleX,
    marginHorizontal: 12 * scaleX,
    height: 1,
    backgroundColor: RETURN_LATER_MODAL.divider.backgroundColor,
  },
  suggestionsLabel: {
    marginTop: 24 * scaleX,
    marginLeft: 24 * scaleX,
    fontSize: RETURN_LATER_MODAL.suggestions.labelFontSize * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: RETURN_LATER_MODAL.suggestions.labelFontWeight as any,
    color: RETURN_LATER_MODAL.suggestions.labelColor,
  },
  suggestionsButtons: {
    marginTop: 12 * scaleX,
    marginLeft: 32 * scaleX,
    flexDirection: 'row',
    gap: 13 * scaleX,
    flexWrap: 'wrap',
  },
  dateTimePickerWrapper: {
    marginTop: 32 * scaleX,
    marginHorizontal: 24 * scaleX,
  },
  wheelPickerContainer: {
    flexDirection: 'row',
    height: RETURN_LATER_MODAL.timePicker.height * scaleX,
    position: 'relative',
    alignItems: 'center',
  },
  selectionDividerTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: RETURN_LATER_MODAL.timePicker.height * 0.4 * scaleX,
    height: 1,
    backgroundColor: RETURN_LATER_MODAL.divider.backgroundColor,
    zIndex: 10,
  },
  selectionDividerBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: RETURN_LATER_MODAL.timePicker.height * 0.6 * scaleX,
    height: 1,
    backgroundColor: RETURN_LATER_MODAL.divider.backgroundColor,
    zIndex: 10,
  },
  wheelColumn: { flex: 1, height: '100%' },
  wheelScrollContent: {
    paddingTop: (RETURN_LATER_MODAL.timePicker.height - RETURN_LATER_MODAL.timePicker.itemHeight) / 2 * scaleX,
    paddingBottom: (RETURN_LATER_MODAL.timePicker.height - RETURN_LATER_MODAL.timePicker.itemHeight) / 2 * scaleX,
  },
  wheelItem: {
    height: RETURN_LATER_MODAL.timePicker.itemHeight * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4 * scaleX,
  },
  wheelDateText: {
    fontSize: RETURN_LATER_MODAL.timePicker.unselectedFontSize * scaleX,
    color: RETURN_LATER_MODAL.timePicker.unselectedColor,
    fontFamily: 'Helvetica',
    fontWeight: RETURN_LATER_MODAL.timePicker.unselectedFontWeight as any,
    textAlign: 'center',
  },
  wheelSelectedDateText: {
    fontSize: RETURN_LATER_MODAL.timePicker.selectedFontSize * scaleX,
    color: RETURN_LATER_MODAL.timePicker.selectedColor,
    fontFamily: 'Helvetica',
    fontWeight: RETURN_LATER_MODAL.timePicker.selectedFontWeight as any,
    textAlign: 'center',
  },
  wheelDateTextDisabled: {
    color: RETURN_LATER_MODAL.timePicker.unselectedColor,
    opacity: 0.5,
  },
  wheelNumberText: {
    fontSize: RETURN_LATER_MODAL.timePicker.unselectedFontSize * scaleX,
    color: RETURN_LATER_MODAL.timePicker.unselectedColor,
    fontFamily: 'Helvetica',
    fontWeight: RETURN_LATER_MODAL.timePicker.unselectedFontWeight as any,
    textAlign: 'center',
  },
  wheelSelectedNumberText: {
    fontSize: RETURN_LATER_MODAL.timePicker.selectedFontSize * scaleX,
    color: RETURN_LATER_MODAL.timePicker.selectedColor,
    fontFamily: 'Helvetica',
    fontWeight: RETURN_LATER_MODAL.timePicker.selectedFontWeight as any,
    textAlign: 'center',
  },
  wheelNumberTextDisabled: {
    color: RETURN_LATER_MODAL.timePicker.unselectedColor,
    opacity: 0.5,
  },
  confirmButton: {
    marginTop: 40 * scaleX,
    marginHorizontal: 35 * scaleX,
    height: 70 * scaleX,
    backgroundColor: '#5a759d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 18 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '400',
    color: '#FFFFFF',
  },
});
