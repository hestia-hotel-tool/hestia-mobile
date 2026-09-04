import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal } from 'react-native';
import { typography } from '@/theme';
import { BlurView } from 'expo-blur';
import {
  CREATE_TICKET_MENU,
  CREATE_TICKET_MENU_TYPOGRAPHY,
  CREATE_TICKET_MENU_COLORS,
  scaleX,
} from '../constants/createTicketMenuStyles';

export type CreateTicketMenuOption = 'newTicket' | 'quickTicket';

interface CreateTicketMenuProps {
  visible: boolean;
  onClose: () => void;
  onOptionPress: (option: CreateTicketMenuOption) => void;
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

export default function CreateTicketMenu({
  visible,
  onClose,
  onOptionPress,
}: CreateTicketMenuProps) {
  const handleNewTicket = () => {
    onOptionPress('newTicket');
    onClose();
  };

  const handleQuickTicket = () => {
    onOptionPress('quickTicket');
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
        <BlurView
          intensity={CREATE_TICKET_MENU.blurOverlay.intensity}
          style={styles.blurOverlay}
          tint={CREATE_TICKET_MENU.blurOverlay.tint}
        >
          <View style={styles.blurDarkener} />
        </BlurView>

        {/* Menu Popup */}
        <View style={styles.menuContainer}>
          <MenuItem
            icon={require('../../../../assets/icons/tickets-icon.png')}
            label="New Ticket"
            onPress={handleNewTicket}
          />
          <MenuItem
            icon={require('../../../../assets/icons/tickets-icon.png')}
            label="Quick Ticket"
            onPress={handleQuickTicket}
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
    backgroundColor: CREATE_TICKET_MENU.backdrop.backgroundColor,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFill,
  },
  blurDarkener: {
    ...StyleSheet.absoluteFill,
    backgroundColor: CREATE_TICKET_MENU_COLORS.blurDarkener,
  },
  menuContainer: {
    position: 'absolute',
    top: CREATE_TICKET_MENU.menuContainer.top * scaleX,
    left: CREATE_TICKET_MENU.menuContainer.left * scaleX,
    width: CREATE_TICKET_MENU.menuContainer.width * scaleX,
    backgroundColor: CREATE_TICKET_MENU_COLORS.background,
    borderRadius: CREATE_TICKET_MENU.menuContainer.borderRadius * scaleX,
    shadowColor: CREATE_TICKET_MENU.menuContainer.shadowColor,
    shadowOffset: CREATE_TICKET_MENU.menuContainer.shadowOffset,
    shadowOpacity: CREATE_TICKET_MENU.menuContainer.shadowOpacity,
    shadowRadius: CREATE_TICKET_MENU.menuContainer.shadowRadius * scaleX,
    elevation: CREATE_TICKET_MENU.menuContainer.elevation,
    paddingVertical: CREATE_TICKET_MENU.menuContainer.paddingVertical * scaleX,
    zIndex: CREATE_TICKET_MENU.menuContainer.zIndex,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CREATE_TICKET_MENU.menuItem.paddingHorizontal * scaleX,
    paddingVertical: CREATE_TICKET_MENU.menuItem.paddingVertical * scaleX,
    minHeight: CREATE_TICKET_MENU.menuItem.minHeight * scaleX,
  },
  iconContainer: {
    width: CREATE_TICKET_MENU.iconContainer.width * scaleX,
    height: CREATE_TICKET_MENU.iconContainer.height * scaleX,
    marginRight: CREATE_TICKET_MENU.iconContainer.marginRight * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: CREATE_TICKET_MENU.icon.width * scaleX,
    height: CREATE_TICKET_MENU.icon.height * scaleX,
    tintColor: CREATE_TICKET_MENU_COLORS.icon,
  },
  menuItemText: {
    fontSize: CREATE_TICKET_MENU_TYPOGRAPHY.menuItemText.fontSize * scaleX,
    fontFamily: typography.fontFamily.regular,
    fontWeight: CREATE_TICKET_MENU_TYPOGRAPHY.menuItemText.fontWeight as any,
    color: CREATE_TICKET_MENU_COLORS.text,
    flex: 1,
  },
  divider: {
    height: CREATE_TICKET_MENU.divider.height,
    backgroundColor: CREATE_TICKET_MENU_COLORS.divider,
    marginLeft: CREATE_TICKET_MENU.divider.marginLeft * scaleX,
    marginRight: CREATE_TICKET_MENU.divider.marginRight * scaleX,
    marginVertical: CREATE_TICKET_MENU.divider.marginVertical * scaleX,
  },
  bottomButton: {
    position: 'absolute',
    left: CREATE_TICKET_MENU.bottomButton.left * scaleX,
    bottom: CREATE_TICKET_MENU.bottomButton.bottom * scaleX,
    width: CREATE_TICKET_MENU.bottomButton.width * scaleX,
    height: CREATE_TICKET_MENU.bottomButton.height * scaleX,
    borderRadius: CREATE_TICKET_MENU.bottomButton.borderRadius * scaleX,
    backgroundColor: CREATE_TICKET_MENU_COLORS.bottomButton,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: CREATE_TICKET_MENU.bottomButton.zIndex,
  },
  bottomButtonInner: {
    width: CREATE_TICKET_MENU.bottomButtonInner.width * scaleX,
    height: CREATE_TICKET_MENU.bottomButtonInner.height * scaleX,
    borderRadius: CREATE_TICKET_MENU.bottomButtonInner.borderRadius * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomButtonIcon: {
    fontSize: CREATE_TICKET_MENU_TYPOGRAPHY.bottomButtonIcon.fontSize * scaleX,
    fontWeight: CREATE_TICKET_MENU_TYPOGRAPHY.bottomButtonIcon.fontWeight as any,
    color: CREATE_TICKET_MENU_COLORS.bottomButtonText,
    lineHeight: CREATE_TICKET_MENU_TYPOGRAPHY.bottomButtonIcon.lineHeight * scaleX,
  },
});

