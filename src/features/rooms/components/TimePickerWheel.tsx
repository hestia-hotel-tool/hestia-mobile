import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { typography } from '@/theme';
import { scaleX } from '../constants/roomDetailStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;

interface TimePickerWheelProps {
  values: (string | number)[];
  selectedValue: string | number;
  onValueChange: (value: string | number) => void;
  itemHeight?: number;
  snapInterval?: number;
  width?: number;
  selectedTextStyle?: any;
  unselectedTextStyle?: any;
}

export default function TimePickerWheel({
  values,
  selectedValue,
  onValueChange,
  itemHeight = 40,
  snapInterval = 40,
  width = 50,
  selectedTextStyle,
  unselectedTextStyle,
}: TimePickerWheelProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const itemHeightScaled = itemHeight * scaleX;
  const snapIntervalScaled = snapInterval * scaleX;

  useEffect(() => {
    // Scroll to selected value on mount or when selectedValue changes
    const selectedIndex = values.findIndex((v) => v === selectedValue);
    if (selectedIndex !== -1 && scrollViewRef.current) {
      const scrollPosition = selectedIndex * itemHeightScaled;
      scrollViewRef.current.scrollTo({
        y: scrollPosition,
        animated: false,
      });
    }
  }, [selectedValue, values, itemHeightScaled]);

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / itemHeightScaled);
    const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
    const newValue = values[clampedIndex];
    
    if (newValue !== selectedValue) {
      onValueChange(newValue);
    }
  };

  const handleItemPress = (value: string | number) => {
    onValueChange(value);
    const index = values.findIndex((v) => v === value);
    if (index !== -1 && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: index * itemHeightScaled,
        animated: true,
      });
    }
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={[styles.container, { width: width * scaleX }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      snapToInterval={snapIntervalScaled}
      decelerationRate="fast"
      onMomentumScrollEnd={handleScroll}
      onScrollEndDrag={handleScroll}
    >
      {values.map((value, index) => {
        const isSelected = value === selectedValue;
        const displayValue = typeof value === 'number' ? value.toString().padStart(2, '0') : value;
        
        return (
          <TouchableOpacity
            key={`${value}-${index}`}
            style={[styles.item, { height: itemHeightScaled }]}
            onPress={() => handleItemPress(value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.text,
                isSelected ? styles.textSelected : styles.textUnselected,
                isSelected && selectedTextStyle,
                !isSelected && unselectedTextStyle,
              ]}
            >
              {displayValue}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 226 * scaleX, // Match time picker height
  },
  contentContainer: {
    paddingVertical: 93 * scaleX, // Center content vertically (226 / 2 - 40 / 2 = 93)
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8 * scaleX,
  },
  text: {
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },
  textSelected: {
    fontSize: 24 * scaleX,
    fontWeight: typography.fontWeights.bold as any,
    color: '#5a759d',
  },
  textUnselected: {
    fontSize: 16 * scaleX,
    fontWeight: typography.fontWeights.regular as any,
    color: '#999999',
  },
});

