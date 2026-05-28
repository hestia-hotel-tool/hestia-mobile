import React from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import MoreMenuItem from './MoreMenuItem';
import { MORE_MENU_OPTIONS, MoreMenuItemId } from '@shared/types/more.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

interface MorePopupProps {
  visible: boolean;
  onClose: () => void;
  onMenuItemPress: (menuItem: MoreMenuItemId) => void;
}

export default function MorePopup({ visible, onClose, onMenuItemPress }: MorePopupProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.popupWrapper}>
          <View style={styles.popupContainer}>
            {MORE_MENU_OPTIONS.map((option) => (
              <MoreMenuItem
                key={option.id}
                icon={option.icon}
                label={option.label}
                iconWidth={option.iconWidth}
                iconHeight={option.iconHeight}
                onPress={() => onMenuItemPress(option.id)}
              />
            ))}
          </View>
          <View style={styles.trianglePointer} />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  popupWrapper: {
    position: 'absolute',
    bottom: 162 * scaleX, // Position above bottom nav
    right: 20 * scaleX, // Positioned further to the right as per Figma design
    zIndex: 1001, // Above everything including bottom nav
  },
  popupContainer: {
    width: 316 * scaleX,
    height: 114.928 * scaleX,
    backgroundColor: '#ffffff',
    borderRadius: 12 * scaleX,
    shadowColor: 'rgba(100, 131, 176, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 35 * scaleX,
    elevation: 10,
    flexDirection: 'row',
    justifyContent: 'space-evenly', // Equal spacing between items
    alignItems: 'center', // Center items vertically
    paddingHorizontal: 16 * scaleX,
    paddingVertical: 0, // Remove vertical padding to allow true centering
  },
  trianglePointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12 * scaleX,
    borderRightWidth: 12 * scaleX,
    borderTopWidth: 10 * scaleX,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
    marginTop: -1, // Overlap slightly to remove any gap
    position: 'absolute',
    // Align triangle tip with More icon center
    // More icon center: 56px from screen right
    // Popup right edge: 20px from screen right
    // Triangle offset: 20 - 56 = -36px (so triangle is 36px inside from popup right edge)
    right: 36 * scaleX, // Position triangle tip to align with More icon center
    bottom: -9 * scaleX, // Position at bottom of popup
  },
});

