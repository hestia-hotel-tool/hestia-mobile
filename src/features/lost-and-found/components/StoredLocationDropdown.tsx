import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native';
import { typography } from '@shared/theme';
import { REGISTER_FORM, scaleX } from '../constants/lostAndFoundStyles';

export type StoredLocationOption = 'hskOffice' | 'frontDesk' | 'securityOffice' | 'lostAndFoundRoom';

interface StoredLocationDropdownProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: StoredLocationOption) => void;
  selectedLocation: StoredLocationOption;
  inputFieldPosition?: { x: number; y: number; width: number; height: number } | null;
}

const locationOptions: { value: StoredLocationOption; label: string }[] = [
  { value: 'hskOffice', label: 'Office' },
  { value: 'frontDesk', label: 'Front Desk' },
  { value: 'securityOffice', label: 'Security Office' },
  { value: 'lostAndFoundRoom', label: 'Lost & Found Room' },
];

const getStyles = (inputFieldPosition?: { x: number; y: number; width: number; height: number } | null) => {
  const screenHeight = Dimensions.get('window').height;
  const modalHeight = REGISTER_FORM.step2.locationDropdown.modal.maxHeight * scaleX;
  const spacing = 10 * scaleX;
  const topPadding = 20 * scaleX; // Ensure modal doesn't touch top edge
  
  let paddingBottom = 100 * scaleX; // Default fallback
  
  if (inputFieldPosition) {
    const fieldTop = inputFieldPosition.y;
    const modalBottom = fieldTop - spacing;
    const modalTop = modalBottom - modalHeight;
    
    // If modal would extend beyond screen top, adjust paddingBottom to keep it on screen
    if (modalTop < topPadding) {
      // Position modal so it fits on screen with padding
      paddingBottom = screenHeight - fieldTop + spacing;
    } else {
      // Normal positioning above field
      paddingBottom = screenHeight - fieldTop + spacing;
    }
  }
  
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingBottom,
    },
  modalWrapper: {
    position: 'relative',
    width: REGISTER_FORM.step2.locationDropdown.modal.width * scaleX,
    alignItems: 'center',
    overflow: 'visible',
    marginBottom: 10 * scaleX, // Small gap between triangle and input field top
  },
  trianglePointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12 * scaleX,
    borderRightWidth: 12 * scaleX,
    borderTopWidth: 10 * scaleX, // Points downward (triangle at bottom of modal pointing to input)
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
    marginTop: -1 * scaleX, // Overlap slightly to remove gap with modal
    alignSelf: 'flex-start',
    marginLeft: REGISTER_FORM.step2.locationDropdown.modal.width * 0.1 * scaleX, // 10% from left
    shadowColor: 'rgba(100, 131, 176, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 5,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: REGISTER_FORM.step2.locationDropdown.modal.backgroundColor,
    borderRadius: REGISTER_FORM.step2.locationDropdown.modal.borderRadius * scaleX,
    shadowColor: REGISTER_FORM.step2.locationDropdown.modal.shadowColor,
    shadowOffset: REGISTER_FORM.step2.locationDropdown.modal.shadowOffset,
    shadowOpacity: REGISTER_FORM.step2.locationDropdown.modal.shadowOpacity,
    shadowRadius: REGISTER_FORM.step2.locationDropdown.modal.shadowRadius,
    elevation: REGISTER_FORM.step2.locationDropdown.modal.elevation,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: REGISTER_FORM.step2.locationDropdown.item.height * scaleX,
    paddingHorizontal: REGISTER_FORM.step2.locationDropdown.item.paddingHorizontal * scaleX,
    paddingVertical: REGISTER_FORM.step2.locationDropdown.item.paddingVertical * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  text: {
    flex: 1,
    fontSize: REGISTER_FORM.step2.locationDropdown.item.text.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step2.locationDropdown.item.text.fontWeight as any,
    color: REGISTER_FORM.step2.locationDropdown.item.text.color,
  },
  checkmark: {
    fontSize: REGISTER_FORM.step2.locationDropdown.item.checkmark.fontSize * scaleX,
    color: REGISTER_FORM.step2.locationDropdown.item.checkmark.color,
    fontWeight: 'bold' as any,
    marginLeft: 12 * scaleX,
  },
  });
};

export default function StoredLocationDropdown({
  visible,
  onClose,
  onSelect,
  selectedLocation,
  inputFieldPosition,
}: StoredLocationDropdownProps) {
  const handleSelect = (location: StoredLocationOption) => {
    onSelect(location);
    onClose();
  };

  if (!visible) return null;

  const dynamicStyles = getStyles(inputFieldPosition);

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={dynamicStyles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={dynamicStyles.modalWrapper}>
          <Pressable
            style={dynamicStyles.modalContainer}
            onPress={() => {}}
            onStartShouldSetResponder={() => true}
          >
            {locationOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={dynamicStyles.item}
              onPress={() => handleSelect(option.value)}
              activeOpacity={0.7}
            >
              <Text style={dynamicStyles.text}>{option.label}</Text>
              {selectedLocation === option.value && (
                <Text style={dynamicStyles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
            ))}
          </Pressable>
          {/* Triangle Pointer - positioned at bottom pointing down to input field */}
          <View style={dynamicStyles.trianglePointer} />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

