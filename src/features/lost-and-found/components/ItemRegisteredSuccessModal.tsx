import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  ActionSheetIOS,
  Alert,
  Platform,
} from 'react-native';
import { SafeModal as Modal } from '@/components/ui/SafeModal';
import LostFoundRegistered from '@assets/illustrations/lost-found-registered.svg';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { ITEM_REGISTERED_SUCCESS } from '../constants/lostAndFoundStyles';
import { printItemLabel, shareItemLabelPdf } from '../utils/itemLabelPdf';

const DESIGN_WIDTH = 440;

interface ItemRegisteredSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  trackingNumber: string;
  itemImage?: string; // URI of the first uploaded picture
  /** The saved item; Print needs it. Absent while the item is still being saved. */
  itemId?: string | null;
  /** Notes typed when registering; shown in place of the print instruction when present. */
  notes?: string | null;
  /** "Send Email to Guest": queued to an address, or why not. */
  email?: { queuedTo: string } | { error: string };
  onPrint?: () => void; // Optional print handler
}

export default function ItemRegisteredSuccessModal({
  visible,
  onClose,
  trackingNumber,
  itemImage,
  itemId,
  notes,
  email,
  onPrint,
}: ItemRegisteredSuccessModalProps) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

  const [printing, setPrinting] = useState(false);
  // The item is saved in the background after this sheet opens; Print waits for it.
  const canPrint = !!onPrint || !!itemId;

  /**
   * A one-page label PDF (tracking number, item, photo, where and when found,
   * guest, status, storage, people) to the share sheet: Save to Files, Print,
   * AirDrop, mail. Alert, not a toast: this sheet is a modal above the toasts.
   */
  const run = async (how: 'print' | 'pdf') => {
    if (!itemId || printing) return;
    setPrinting(true);
    try {
      if (how === 'print') await printItemLabel(itemId);
      else await shareItemLabelPdf(itemId);
    } catch (e) {
      Alert.alert(
        how === 'print' ? 'Could not print' : 'Could not create the PDF',
        e instanceof Error ? e.message : 'Please try again.'
      );
    } finally {
      setPrinting(false);
    }
  };

  /** Print straight to a printer, or save the label as a PDF (tester feedback). */
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    if (!itemId || printing) return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: 'Item label', options: ['Print', 'Save as PDF', 'Cancel'], cancelButtonIndex: 2 },
        (i) => {
          if (i === 0) void run('print');
          if (i === 1) void run('pdf');
        }
      );
      return;
    }
    Alert.alert('Item label', undefined, [
      { text: 'Print', onPress: () => void run('print') },
      { text: 'Save as PDF', onPress: () => void run('pdf') },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
    // Size comes from the width/height props, so it stays out of the style and
    // cannot disagree with them.
    checkmarkIcon: {
      position: 'absolute',
      top: 0,
      left: (ITEM_REGISTERED_SUCCESS.checkmarkIcon.left - ITEM_REGISTERED_SUCCESS.successIcon.left) * scaleX,
    },
    boxIcon: {
      position: 'absolute',
      top: (ITEM_REGISTERED_SUCCESS.successIcon.top - ITEM_REGISTERED_SUCCESS.checkmarkIcon.top) * scaleX,
      left: 0,
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
      marginRight: 8 * scaleX,
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
            {/*
              Checkmark. `width` and `height` both passed, not `size`: this box
              is absolutely positioned and the layout depends on it being
              exactly 51.194x39.818. `action-check`'s aspect is 1.1798, so the
              glyph letterboxes to 46.98 wide inside that box and centres —
              which is precisely what `resizeMode="contain"` did with the PNG.
            */}
            <Icon
              name="action-check"
              width={ITEM_REGISTERED_SUCCESS.checkmarkIcon.width * scaleX}
              height={ITEM_REGISTERED_SUCCESS.checkmarkIcon.height * scaleX}
              color="#39D47F"
              style={styles.checkmarkIcon}
            />
            {/*
              The basket. An illustration, not a registry icon — at 151x165 it
              is the "larger vector art for success screens" assets/README.md
              reserves `illustrations/` for, and it is imported directly rather
              than registered.

              It cannot reuse `nav-lost-found`, which is provably the same mark:
              that one is authored on a 37.4x41.3 viewBox at stroke-width 1, so
              drawn at this height it paints 4px strokes against the design's 2.
              "Differs only in colour, so reuse it" does not cover a doubled
              line weight.
            */}
            <LostFoundRegistered
              width={ITEM_REGISTERED_SUCCESS.successIcon.width * scaleX}
              height={ITEM_REGISTERED_SUCCESS.successIcon.height * scaleX}
              style={styles.boxIcon}
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

          {/* The notes, when some were added; otherwise the print instruction (client change). */}
          <Text style={styles.instructionsText}>
            {notes?.trim() || 'Print tracking number and all related info and attach it to the item'}
          </Text>

          {/* The guest email's outcome, when the box was ticked. */}
          {email ? (
            <Text
              style={[styles.instructionsText, { marginTop: 8 * scaleX, color: 'error' in email ? '#d32f2f' : '#3a9b5c' }]}
              accessibilityLiveRegion="polite"
            >
              {'error' in email ? `Email not sent: ${email.error}` : `Email to ${email.queuedTo} is on its way.`}
            </Text>
          ) : null}

          {/* Print Button */}
          <TouchableOpacity
            style={[styles.printButton, !canPrint && { opacity: 0.6 }]}
            onPress={handlePrint}
            activeOpacity={0.7}
            disabled={!canPrint || printing}
            accessibilityRole="button"
            accessibilityLabel="Print or save the item label as a PDF"
            accessibilityState={{ disabled: !canPrint, busy: printing }}
          >
            {/*
              Not tinted white. `printer.png` was given `tintColor: '#ffffff'`,
              which flattens every pixel — paper, tray and outline alike — into
              one white silhouette on a `rgba(100,131,176,0.4)` pill. Figma
              1102:3596 draws it as white paper inside `#5A759D` strokes.
              `action-print` keeps those three white fills as real knockouts and
              tints only its strokes, so the glyph reads as a printer again.
            */}
            {printing || !canPrint ? (
              <ActivityIndicator color="#5A759D" style={styles.printerIcon} />
            ) : (
              <Icon
                name="action-print"
                size={24 * scaleX}
                color="#5A759D"
                style={styles.printerIcon}
              />
            )}
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
