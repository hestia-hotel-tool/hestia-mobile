import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, TextStyle } from 'react-native';
import { typography } from '../theme';
import { scaleX } from '@/constants/roomDetailStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;

interface DatePickerWheelProps {
  values: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  itemHeight?: number;
  snapInterval?: number;
  width?: number;
  selectedFontSize?: number;
  unselectedFontSize?: number;
  mediumFontSize?: number; // For dates that are one step away from selected
}

export default function DatePickerWheel({
  values,
  selectedValue,
  onValueChange,
  itemHeight = 40,
  snapInterval = 40,
  width = 100,
  selectedFontSize = 25,
  unselectedFontSize = 13,
  mediumFontSize = 19,
}: DatePickerWheelProps) {
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

  const handleItemPress = (value: string) => {
    onValueChange(value);
    const index = values.findIndex((v) => v === value);
    if (index !== -1 && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: index * itemHeightScaled,
        animated: true,
      });
    }
  };

  const getFontSize = (index: number, selectedIndex: number): number => {
    const distance = Math.abs(index - selectedIndex);
    if (distance === 0) return selectedFontSize;
    if (distance === 1) return mediumFontSize;
    return unselectedFontSize;
  };

  const getTextColor = (index: number, selectedIndex: number): string => {
    if (index === selectedIndex) return '#5a759d';
    return '#999999';
  };

  const selectedIndex = values.findIndex((v) => v === selectedValue);

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
        const fontSize = getFontSize(index, selectedIndex) * scaleX;
        const textColor = getTextColor(index, selectedIndex);
        
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
                {
                  fontSize,
                  color: textColor,
                  fontWeight: (isSelected ? typography.fontWeights.bold : typography.fontWeights.light) as TextStyle['fontWeight'],
                },
              ]}
            >
              {value}
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
    fontFamily: typography.fontFamily.primary,
    textAlign: 'center',
  },
});

