import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { colors } from '@shared/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

interface FilterCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  size?: number;
}

export default function FilterCheckbox({
  checked,
  onToggle,
  size = 20,
}: FilterCheckboxProps) {
  // Use Figma dimensions: 25px width, 24px height, 1px border
  // If custom size is provided, use it for both dimensions (backward compatibility)
  const isDefaultSize = size === 20;
  const checkboxWidth = isDefaultSize ? 25 * scaleX : size * scaleX;
  const checkboxHeight = isDefaultSize ? 24 * scaleX : size * scaleX;
  const borderWidth = 1 * scaleX; // 1px border
  const checkmarkSize = isDefaultSize ? 18 * scaleX : checkboxWidth * 0.8;

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <View
        style={[
          styles.checkbox,
          {
            width: checkboxWidth,
            height: checkboxHeight,
            borderWidth: borderWidth,
            backgroundColor: checked ? '#1e1e1e' : 'transparent',
            borderColor: checked ? '#1e1e1e' : '#C6C5C5',
          },
        ]}
      >
        {checked && (
          <Text
            style={[
              styles.checkmark,
              { 
                fontSize: checkmarkSize, 
                lineHeight: checkmarkSize 
              },
            ]}
          >
            ✓
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#ffffff',
    fontWeight: '900', // Extra bold for better visibility
    includeFontPadding: false, // Remove extra padding
    textAlignVertical: 'center',
  },
});
