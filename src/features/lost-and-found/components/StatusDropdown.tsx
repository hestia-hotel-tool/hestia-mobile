import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  Pressable,
} from 'react-native';
import { typography } from '@/theme';
import { REGISTER_FORM, scaleX } from '../constants/lostAndFoundStyles';

export type StatusOption = 'stored' | 'shipped' | 'discarded';

interface StatusDropdownProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (status: StatusOption) => void;
  selectedStatus: StatusOption;
  inputFieldPosition?: { x: number; y: number; width: number; height: number } | null;
}

const statusOptions: { value: StatusOption; label: string; icon: any }[] = [
  {
    value: 'stored',
    label: 'Stored',
    icon: require('../../../../assets/icons/down-arrow.png'), // Yellow circle or down arrow
  },
  {
    value: 'shipped',
    label: 'Shipped',
    icon: require('../../../../assets/icons/tick.png'),
  },
  {
    value: 'discarded',
    label: 'Discarded',
    icon: require('../../../../assets/icons/down-arrow.png'), // Can be updated with trash icon
  },
];

const getStyles = (inputFieldPosition?: { x: number; y: number; width: number; height: number } | null) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: inputFieldPosition ? inputFieldPosition.y + inputFieldPosition.height + 10 * scaleX : 900 * scaleX,
  },
  modalWrapper: {
    position: 'relative',
    width: REGISTER_FORM.step2.statusDropdown.modal.width * scaleX,
    alignItems: 'center',
    overflow: 'visible',
    marginTop: 10 * scaleX, // Small gap between triangle and input field bottom
  },
  trianglePointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12 * scaleX,
    borderRightWidth: 12 * scaleX,
    borderBottomWidth: 10 * scaleX, // Points upward (triangle at top of modal pointing to input)
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffffff',
    marginBottom: -1 * scaleX, // Overlap slightly to remove gap with modal
    alignSelf: 'flex-start',
    marginLeft: REGISTER_FORM.step2.statusDropdown.modal.width * 0.1 * scaleX, // 10% from left
    shadowColor: 'rgba(100, 131, 176, 0.4)',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 5,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: REGISTER_FORM.step2.statusDropdown.modal.backgroundColor,
    borderRadius: REGISTER_FORM.step2.statusDropdown.modal.borderRadius * scaleX,
    shadowColor: REGISTER_FORM.step2.statusDropdown.modal.shadowColor,
    shadowOffset: REGISTER_FORM.step2.statusDropdown.modal.shadowOffset,
    shadowOpacity: REGISTER_FORM.step2.statusDropdown.modal.shadowOpacity,
    shadowRadius: REGISTER_FORM.step2.statusDropdown.modal.shadowRadius,
    elevation: REGISTER_FORM.step2.statusDropdown.modal.elevation,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    height: REGISTER_FORM.step2.statusDropdown.item.height * scaleX,
    paddingHorizontal: REGISTER_FORM.step2.statusDropdown.item.paddingHorizontal * scaleX,
    paddingVertical: REGISTER_FORM.step2.statusDropdown.item.paddingVertical * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  icon: {
    width: REGISTER_FORM.step2.statusDropdown.item.icon.size * scaleX,
    height: REGISTER_FORM.step2.statusDropdown.item.icon.size * scaleX,
    marginRight: 12 * scaleX,
  },
  statusCircle: {
    width: REGISTER_FORM.step2.statusDropdown.item.icon.size * scaleX,
    height: REGISTER_FORM.step2.statusDropdown.item.icon.size * scaleX,
    borderRadius: (REGISTER_FORM.step2.statusDropdown.item.icon.size / 2) * scaleX,
    marginRight: 12 * scaleX,
  },
  text: {
    flex: 1,
    fontSize: REGISTER_FORM.step2.statusDropdown.item.text.fontSize * scaleX,
    fontFamily: typography.fontFamily.regular,
    fontWeight: REGISTER_FORM.step2.statusDropdown.item.text.fontWeight as any,
    color: REGISTER_FORM.step2.statusDropdown.item.text.color,
  },
  checkmark: {
    fontSize: REGISTER_FORM.step2.statusDropdown.item.checkmark.fontSize * scaleX,
    color: REGISTER_FORM.step2.statusDropdown.item.checkmark.color,
    fontWeight: 'bold' as any,
    marginLeft: 12 * scaleX,
  },
});

export default function StatusDropdown({
  visible,
  onClose,
  onSelect,
  selectedStatus,
  inputFieldPosition,
}: StatusDropdownProps) {
  const handleSelect = (status: StatusOption) => {
    onSelect(status);
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
          {/* Triangle Pointer - positioned at top pointing up to input field */}
          <View style={dynamicStyles.trianglePointer} />
          
          <Pressable
            style={dynamicStyles.modalContainer}
            onPress={() => {}}
            onStartShouldSetResponder={() => true}
          >
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={dynamicStyles.item}
              onPress={() => handleSelect(option.value)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  dynamicStyles.statusCircle,
                  {
                    backgroundColor:
                      option.value === 'stored'
                        ? '#f0be1b'
                        : option.value === 'shipped'
                        ? '#41d541'
                        : '#f0be1b',
                  },
                ]}
              />
              <Text style={dynamicStyles.text}>{option.label}</Text>
              {selectedStatus === option.value && (
                <Text style={dynamicStyles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
          </Pressable>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

