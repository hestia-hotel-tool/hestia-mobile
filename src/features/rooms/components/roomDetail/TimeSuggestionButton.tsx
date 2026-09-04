import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { typography } from '@/theme';
import { RETURN_LATER_MODAL, scaleX } from '../../constants/returnLaterModalStyles';

interface TimeSuggestionButtonProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

export default function TimeSuggestionButton({
  label,
  isSelected,
  onPress,
}: TimeSuggestionButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isSelected && styles.buttonSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.text,
          isSelected && styles.textSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: RETURN_LATER_MODAL.suggestions.buttonHeight * scaleX,
    minWidth: RETURN_LATER_MODAL.suggestions.buttonMinWidth * scaleX,
    paddingHorizontal: RETURN_LATER_MODAL.suggestions.buttonPaddingHorizontal * scaleX,
    paddingVertical: RETURN_LATER_MODAL.suggestions.buttonPaddingVertical * scaleX,
    borderRadius: RETURN_LATER_MODAL.suggestions.buttonBorderRadius * scaleX,
    borderWidth: RETURN_LATER_MODAL.suggestions.buttonBorderWidth,
    borderColor: RETURN_LATER_MODAL.suggestions.buttonBorderColor,
    backgroundColor: RETURN_LATER_MODAL.suggestions.buttonBackgroundUnselected,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonSelected: {
    backgroundColor: RETURN_LATER_MODAL.suggestions.buttonBackgroundSelected,
  },
  text: {
    fontSize: RETURN_LATER_MODAL.suggestions.buttonFontSize * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: RETURN_LATER_MODAL.suggestions.buttonTextWeightUnselected,
    color: RETURN_LATER_MODAL.suggestions.buttonTextColorUnselected,
    lineHeight: RETURN_LATER_MODAL.suggestions.buttonLineHeight * scaleX,
  },
  textSelected: {
    fontWeight: RETURN_LATER_MODAL.suggestions.buttonTextWeightSelected,
    color: RETURN_LATER_MODAL.suggestions.buttonTextColorSelected,
  },
});
