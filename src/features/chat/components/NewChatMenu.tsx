import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal, Dimensions } from 'react-native';
import { typography } from '@/theme';
import { BlurView } from 'expo-blur';
import { scaleX } from '../constants/chatStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type NewChatMenuOption = 'createGroup' | 'newChat';

interface NewChatMenuProps {
  visible: boolean;
  onClose: () => void;
  onOptionPress: (option: NewChatMenuOption) => void;
}

interface MenuItemProps {
  icon: any;
  label: string;
  onPress: () => void;
  isLast?: boolean;
}

function MenuItem({ icon, label, onPress, isLast }: MenuItemProps) {
  return (
    <>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Image source={icon} style={styles.icon} resizeMode="contain" />
        </View>
        <Text style={styles.menuItemText}>{label}</Text>
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </>
  );
}

export default function NewChatMenu({
  visible,
  onClose,
  onOptionPress,
}: NewChatMenuProps) {
  const handleCreateGroup = () => {
    onOptionPress('createGroup');
    onClose();
  };

  const handleNewChat = () => {
    onOptionPress('newChat');
    onClose();
  };

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
        <BlurView intensity={80} style={styles.blurOverlay} tint="light">
          <View style={styles.blurDarkener} />
        </BlurView>

        {/* Menu Popup */}
        <View style={styles.menuContainer}>
          <MenuItem
            icon={require('../../../../assets/icons/staff-icon.png')} // Temporary: using staff icon as placeholder for group icon
            label="Create Chat Group"
            onPress={handleCreateGroup}
          />
          <MenuItem
            icon={require('../../../../assets/icons/chat-icon.png')} // Temporary: using chat icon as placeholder for new chat icon
            label="New Chat"
            onPress={handleNewChat}
            isLast
          />
        </View>

        {/* Bottom Floating Action Button */}
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <View style={styles.bottomButtonInner}>
            <Text style={styles.bottomButtonIcon}>+</Text>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFill,
  },
  blurDarkener: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(200, 200, 200, 0.6)',
  },
  menuContainer: {
    position: 'absolute',
    top: 125 * scaleX, // From Figma: y=125 (positioned below header)
    left: 97 * scaleX, // From Figma: x=97 (aligned with message button)
    width: 302 * scaleX, // From Figma: width=302
    backgroundColor: '#ffffff',
    borderRadius: 12 * scaleX, // Rounded corners
    shadowColor: 'rgba(100, 131, 176, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 35 * scaleX,
    elevation: 10,
    paddingVertical: 8 * scaleX, // Padding for menu items
    zIndex: 1001,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30 * scaleX, // From Figma: icon at x=127, menu starts at x=97, so 127-97=30px padding
    paddingVertical: 12 * scaleX,
    minHeight: 50 * scaleX,
  },
  iconContainer: {
    width: 27 * scaleX, // From Figma: icon width ~27px
    height: 27 * scaleX, // From Figma: icon height ~27px
    marginRight: 13 * scaleX, // From Figma: text starts at x=167, icon ends at ~154, so ~13px spacing
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 27 * scaleX,
    height: 27 * scaleX,
    tintColor: '#1e1e1e', // Dark grey icon color
  },
  menuItemText: {
    fontSize: 17 * scaleX, // From Figma: fontSize=17
    fontFamily: typography.fontFamily.regular,
    fontWeight: typography.fontWeights.regular as any,
    color: '#1e1e1e',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#e6e6e6', // Light grey divider
    marginLeft: 30 * scaleX, // From Figma: divider starts at x=127, menu starts at x=97, so 30px padding
    marginRight: 15 * scaleX, // From Figma: divider width=256, menu width=302, so (302-256-30)/2 = 8px, using 15px for visual balance
    marginVertical: 4 * scaleX,
  },
  bottomButton: {
    position: 'absolute',
    left: 294 * scaleX, // From Figma: x=294 (centered: (440-86)/2 = 177px, but Figma shows 294px from left)
    bottom: 244 * scaleX, // From Figma: y=712, screen height=956, so bottom = 956-712 = 244px from screen bottom
    width: 86 * scaleX, // From Figma: width=86
    height: 54 * scaleX, // From Figma: height=54
    borderRadius: 17 * scaleX, // From Figma: borderRadius=17 (or 45px as shown in design context)
    backgroundColor: 'rgba(90, 117, 157, 0.59)', // Semi-transparent blue (same as top button)
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1002, // Above menu
  },
  bottomButtonInner: {
    width: 54 * scaleX, // Inner circle size
    height: 54 * scaleX,
    borderRadius: 27 * scaleX, // Circular
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomButtonIcon: {
    fontSize: 32 * scaleX,
    fontWeight: '300' as any,
    color: '#ffffff',
    lineHeight: 32 * scaleX,
  },
});

