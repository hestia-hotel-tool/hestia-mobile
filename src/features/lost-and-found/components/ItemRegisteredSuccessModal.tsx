import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { typography } from '@shared/theme';
import { ITEM_REGISTERED_SUCCESS } from '../constants/lostAndFoundStyles';

const DESIGN_WIDTH = 440;

interface ItemRegisteredSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  trackingNumber: string;
  itemImage?: string; // URI of the first uploaded picture
  onPrint?: () => void; // Optional print handler
}

export default function ItemRegisteredSuccessModal({
  visible,
  onClose,
  trackingNumber,
  itemImage,
  onPrint,
}: ItemRegisteredSuccessModalProps) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      // Default print behavior - could use expo-print here
      console.log('Print tracking number:', trackingNumber);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#ffffff',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      alignItems: 'center',
      paddingBottom: 20 * scaleX,
      flexGrow: 1,
    },
    successIconsContainer: {
      position: 'relative',
      marginTop: ITEM_REGISTERED_SUCCESS.checkmarkIcon.top * scaleX * 0.7,
      width: ITEM_REGISTERED_SUCCESS.successIcon.width * scaleX,
      height: (ITEM_REGISTERED_SUCCESS.successIcon.top + ITEM_REGISTERED_SUCCESS.successIcon.height - ITEM_REGISTERED_SUCCESS.checkmarkIcon.top) * scaleX,
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    checkmarkIcon: {
      position: 'absolute',
      top: 0,
      left: (ITEM_REGISTERED_SUCCESS.checkmarkIcon.left - ITEM_REGISTERED_SUCCESS.successIcon.left) * scaleX,
      width: ITEM_REGISTERED_SUCCESS.checkmarkIcon.width * scaleX,
      height: ITEM_REGISTERED_SUCCESS.checkmarkIcon.height * scaleX,
    },
    boxIcon: {
      position: 'absolute',
      top: (ITEM_REGISTERED_SUCCESS.successIcon.top - ITEM_REGISTERED_SUCCESS.checkmarkIcon.top) * scaleX,
      left: 0,
      width: ITEM_REGISTERED_SUCCESS.successIcon.width * scaleX,
      height: ITEM_REGISTERED_SUCCESS.successIcon.height * scaleX,
    },
    itemRegisteredText: {
      marginTop:
        (ITEM_REGISTERED_SUCCESS.itemRegisteredText.top -
          (ITEM_REGISTERED_SUCCESS.successIcon.top +
            ITEM_REGISTERED_SUCCESS.successIcon.height)) *
        scaleX *
        0.5,
      fontSize: ITEM_REGISTERED_SUCCESS.itemRegisteredText.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: ITEM_REGISTERED_SUCCESS.itemRegisteredText.fontWeight as any,
      color: ITEM_REGISTERED_SUCCESS.itemRegisteredText.color,
      textAlign: 'center',
    },
    itemImageContainer: {
      marginTop:
        (ITEM_REGISTERED_SUCCESS.itemRegisteredText.top -
          (ITEM_REGISTERED_SUCCESS.successIcon.top +
            ITEM_REGISTERED_SUCCESS.successIcon.height)) *
        scaleX *
        0.3,
      marginBottom: 8 * scaleX,
      width: Math.min(
        ITEM_REGISTERED_SUCCESS.successIcon.width * scaleX,
        SCREEN_WIDTH - 40 * scaleX
      ),
      aspectRatio: 1.2,
      borderRadius: 16 * scaleX,
      overflow: 'hidden',
      backgroundColor: '#f3f4f6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemImageStyle: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    trackingNumberLabel: {
      marginTop: (ITEM_REGISTERED_SUCCESS.trackingNumberLabel.top - ITEM_REGISTERED_SUCCESS.itemRegisteredText.top) * scaleX * 0.5,
      fontSize: ITEM_REGISTERED_SUCCESS.trackingNumberLabel.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: ITEM_REGISTERED_SUCCESS.trackingNumberLabel.fontWeight as any,
      color: ITEM_REGISTERED_SUCCESS.trackingNumberLabel.color,
      textAlign: 'center',
    },
    trackingNumberValue: {
      marginTop: (ITEM_REGISTERED_SUCCESS.trackingNumberValue.top - ITEM_REGISTERED_SUCCESS.trackingNumberLabel.top) * scaleX * 0.5,
      fontSize: ITEM_REGISTERED_SUCCESS.trackingNumberValue.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: ITEM_REGISTERED_SUCCESS.trackingNumberValue.fontWeight as any,
      color: ITEM_REGISTERED_SUCCESS.trackingNumberValue.color,
      textAlign: 'center',
      width: '100%',
      paddingHorizontal: ITEM_REGISTERED_SUCCESS.trackingNumberValue.left * scaleX,
    },
    instructionsText: {
      marginTop: (ITEM_REGISTERED_SUCCESS.instructionsText.top - ITEM_REGISTERED_SUCCESS.trackingNumberValue.top) * scaleX * 0.6,
      width: Math.min(ITEM_REGISTERED_SUCCESS.instructionsText.width * scaleX, SCREEN_WIDTH - 40 * scaleX),
      fontSize: ITEM_REGISTERED_SUCCESS.instructionsText.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: ITEM_REGISTERED_SUCCESS.instructionsText.fontWeight as any,
      color: ITEM_REGISTERED_SUCCESS.instructionsText.color,
      textAlign: 'center',
      lineHeight: 20 * scaleX,
      paddingHorizontal: 20 * scaleX,
    },
    printButton: {
      marginTop: (ITEM_REGISTERED_SUCCESS.printButton.top - ITEM_REGISTERED_SUCCESS.instructionsText.top) * scaleX * 0.5,
      width: ITEM_REGISTERED_SUCCESS.printButton.width * scaleX,
      height: ITEM_REGISTERED_SUCCESS.printButton.height * scaleX,
      borderRadius: ITEM_REGISTERED_SUCCESS.printButton.borderRadius * scaleX,
      backgroundColor: ITEM_REGISTERED_SUCCESS.printButton.backgroundColor,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20 * scaleX,
    },
    printerIcon: {
      width: 24 * scaleX,
      height: 24 * scaleX,
      marginRight: 8 * scaleX,
      tintColor: '#ffffff',
    },
    printButtonText: {
      fontSize: ITEM_REGISTERED_SUCCESS.printButtonText.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: ITEM_REGISTERED_SUCCESS.printButtonText.fontWeight as any,
      color: ITEM_REGISTERED_SUCCESS.printButtonText.color,
    },
    closeLink: {
      marginTop: (ITEM_REGISTERED_SUCCESS.closeLink.top - ITEM_REGISTERED_SUCCESS.printButton.top - ITEM_REGISTERED_SUCCESS.printButton.height) * scaleX * 0.3,
      paddingVertical: 10 * scaleX,
      paddingHorizontal: 20 * scaleX,
    },
    closeLinkText: {
      fontSize: ITEM_REGISTERED_SUCCESS.closeLink.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: ITEM_REGISTERED_SUCCESS.closeLink.fontWeight as any,
      color: ITEM_REGISTERED_SUCCESS.closeLink.color,
      textAlign: 'center',
    },
  });

  return (
    <Modal
      transparent={false}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Icons */}
          <View style={styles.successIconsContainer}>
            {/* Checkmark Icon */}
            <Image
              source={require('../../../../assets/icons/tick-green.png')}
              style={styles.checkmarkIcon}
              resizeMode="contain"
            />
            {/* Box Icon */}
            <Image
              source={require('../../../../assets/icons/basket-green.png')}
              style={styles.boxIcon}
              resizeMode="contain"
            />
          </View>

          {/* Item Registered Text */}
          <Text style={styles.itemRegisteredText}>Item Registered</Text>

          {/* Tracking Number Label */}
          <Text style={styles.trackingNumberLabel}>Tracking Number</Text>

          {/* Tracking Number Value */}
          <Text style={styles.trackingNumberValue} numberOfLines={1} adjustsFontSizeToFit>
            {trackingNumber}
          </Text>

          {/* Instructions Text */}
          <Text style={styles.instructionsText}>
            Print tracking number and all related info and attach it to the item
          </Text>

          {/* Print Button */}
          <TouchableOpacity
            style={styles.printButton}
            onPress={handlePrint}
            activeOpacity={0.7}
          >
            <Image
              source={require('../../../../assets/icons/printer.png')}
              style={[styles.printerIcon, { tintColor: '#ffffff' }]}
              resizeMode="contain"
            />
            <Text style={styles.printButtonText}>Print</Text>
          </TouchableOpacity>

          {/* Close Link */}
          <TouchableOpacity
            style={styles.closeLink}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.closeLinkText}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}
