/**
 * InspectedStatusSlideModal
 * Shown when user selects "Inspected" from Change status modal.
 * Positioned close to the status button with triangle pointing to it (like StatusChangeModal).
 * Requires all Inspection Checklist items to be checked before validation via "Slide to complete".
 * Based on Figma: https://www.figma.com/design/q59hfVJCVzzUixq1HFRGEh/HESTIA-APP-AND-DASHBOARD?node-id=2584-1276
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  View,
  Text,
  Animated,
  Platform,
  PanResponder,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { CARD_DIMENSIONS, scaleX } from '../../constants/allRoomsStyles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const INSPECTION_CHECKLIST_ITEMS = [
  { id: 'dust', icon: 'tv-outline' as const, label: 'No visible dust on surfaces, lamps, TV, or frames.' },
  { id: 'bed', icon: 'bed-outline' as const, label: 'Bed made to hotel standard.' },
  { id: 'curtains', icon: 'sunny-outline' as const, label: 'Curtains/blinds properly arranged.' },
  { id: 'minibar', icon: 'wine-outline' as const, label: 'Items in the mini bar checked and replaced.' },
] as const;

interface InspectedStatusSlideModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  buttonPosition?: { x: number; y: number; width: number; height: number } | null;
  headerHeight?: number;
  showTriangle?: boolean;
}

export default function InspectedStatusSlideModal({
  visible,
  onClose,
  onComplete,
  buttonPosition = null,
  headerHeight = 217,
  showTriangle = true,
}: InspectedStatusSlideModalProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const thumbPosition = useRef(new Animated.Value(0)).current;
  const isCompletingRef = useRef(false);
  const insets = useSafeAreaInsets();

  const modalWidth = CARD_DIMENSIONS.width * scaleX;
  const maxModalHeight = SCREEN_HEIGHT - (headerHeight * scaleX) - insets.bottom - 24 * scaleX;
  const modalHeight = Math.min(420 * scaleX, Math.max(320 * scaleX, maxModalHeight));
  const SLIDE_TRACK_WIDTH = modalWidth - 48 * scaleX - 50; // modal padding (24*2) minus thumb (44) and track padding (6)
  const COMPLETE_THRESHOLD = 0.85;

  const allChecked = INSPECTION_CHECKLIST_ITEMS.every((item) => checkedItems[item.id]);

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => allChecked,
        onMoveShouldSetPanResponder: () => allChecked,
        onPanResponderGrant: () => {},
        onPanResponderMove: (_, gestureState) => {
          if (!allChecked) return;
          const maxX = SLIDE_TRACK_WIDTH;
          const x = Math.max(0, Math.min(gestureState.dx, maxX));
          thumbPosition.setValue(x);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!allChecked) return;
          const maxX = SLIDE_TRACK_WIDTH;
          const x = Math.max(0, Math.min(gestureState.dx, maxX));
          if (x >= maxX * COMPLETE_THRESHOLD) {
            if (isCompletingRef.current) return;
            isCompletingRef.current = true;
            Animated.timing(thumbPosition, {
              toValue: maxX,
              duration: 150,
              useNativeDriver: true,
            }).start(() => closeModal(onComplete));
          } else {
            Animated.spring(thumbPosition, {
              toValue: 0,
              useNativeDriver: true,
              tension: 80,
              friction: 10,
            }).start();
          }
        },
      }),
    [allChecked, onComplete]
  );

  // Position modal close to status button with triangle (same logic as StatusChangeModal)
  const HEADER_HEIGHT = headerHeight * scaleX;
  let modalTopPosition: number;
  let modalLeft: number;
  let triangleLeft: number;
  const triangleTopOffset = -6 * scaleX;
  const triangleBottomOffset = modalHeight - 1 * scaleX;
  let trianglePlacement: 'top' | 'bottom' = 'top';

  if (showTriangle && buttonPosition) {
    const spacing = 70 * scaleX; // Same as StatusChangeModal - margin from status button
    const buttonTopRelative = buttonPosition.y - HEADER_HEIGHT;
    const buttonBottomRelative = buttonTopRelative + buttonPosition.height;
    const desiredBelowTop = buttonBottomRelative + spacing;
    const desiredAboveTop = buttonTopRelative - spacing - modalHeight;
    const maxTop = Math.max(0, SCREEN_HEIGHT - HEADER_HEIGHT - modalHeight - insets.bottom - 12 * scaleX);

    if (desiredBelowTop <= maxTop) {
      modalTopPosition = desiredBelowTop;
      trianglePlacement = 'top';
    } else if (desiredAboveTop >= 0) {
      modalTopPosition = desiredAboveTop;
      trianglePlacement = 'bottom';
    } else {
      modalTopPosition = Math.min(Math.max(0, desiredBelowTop), maxTop);
      trianglePlacement = 'top';
    }

    const buttonCenterX = buttonPosition.x + buttonPosition.width / 2;
    const screenMargin = CARD_DIMENSIONS.marginHorizontal * scaleX;
    modalLeft = screenMargin;
    const triangleHalfWidth = 12 * scaleX;
    triangleLeft = (buttonCenterX - modalLeft - triangleHalfWidth) / scaleX;
  } else {
    const screenMargin = CARD_DIMENSIONS.marginHorizontal * scaleX;
    modalLeft = screenMargin;
    modalTopPosition = 0;
    triangleLeft = 0;
  }

  modalTopPosition = Math.max(0, modalTopPosition);


  useEffect(() => {
    if (visible) {
      isCompletingRef.current = false;
      setCheckedItems({});
      thumbPosition.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible, slideAnim, opacityAnim]);

  const closeModal = (afterClose?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      onClose();
      afterClose?.();
    });
  };
  const handleClose = () => closeModal();

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [modalHeight + 50, 0],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <Animated.View style={{ flex: 1, opacity: opacityAnim }}>
        <View style={[styles.headerArea, { height: HEADER_HEIGHT }]} />
        <BlurView intensity={20} tint="light" style={[styles.blurOverlay, { top: HEADER_HEIGHT }]}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
          <Animated.View
            style={[
              styles.modalWrapper,
              { top: modalTopPosition, left: modalLeft, width: modalWidth },
              { transform: [{ translateY }] },
            ]}
            pointerEvents="box-none"
          >
            {showTriangle && (
              <View
                style={[
                  styles.trianglePointer,
                  {
                    left: triangleLeft * scaleX,
                    top: trianglePlacement === 'top' ? triangleTopOffset : triangleBottomOffset,
                    transform: [{ rotate: trianglePlacement === 'top' ? '0deg' : '180deg' }],
                  },
                ]}
                pointerEvents="none"
              />
            )}
            <View style={[styles.modalContainer, { maxHeight: modalHeight }]}>
              <View style={styles.titleRow}>
                <Text style={styles.checklistTitle}>Inspection Checklist</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close inspection checklist"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={22 * scaleX} color="#607AA1" />
                </TouchableOpacity>
              </View>
              <View style={styles.dividerAfterTitle} />
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {INSPECTION_CHECKLIST_ITEMS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.checklistItem}
                    onPress={() => toggleCheck(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons name={item.icon} size={24 * scaleX} color="#334866" />
                    </View>
                    <Text style={styles.checklistLabel}>{item.label}</Text>
                    <View style={[styles.checkbox, checkedItems[item.id] && styles.checkboxChecked]}>
                      {checkedItems[item.id] && (
                        <Svg width={18 * scaleX} height={18 * scaleX} viewBox="0 0 24 24" fill="none" stroke="#41D541" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M5 12l5 5L20 7" />
                        </Svg>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
                <View style={styles.dividerBeforeOptional} />
                <Text style={styles.optionalTitle}>Optional</Text>
                <TouchableOpacity style={styles.optionalItem} activeOpacity={0.7}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="image-outline" size={24 * scaleX} color="#334866" />
                  </View>
                  <Text style={styles.optionalLabel}>Add Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionalItem} activeOpacity={0.7}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="create-outline" size={24 * scaleX} color="#334866" />
                  </View>
                  <Text style={styles.optionalLabel}>Add Notes</Text>
                </TouchableOpacity>
              </ScrollView>
                <View style={styles.slideSection}>
                  <View
                    style={[styles.slideTrack, !allChecked && styles.slideTrackDisabled]}
                    {...panResponder.panHandlers}
                  >
                    <Animated.View style={[styles.slideThumb, { transform: [{ translateX: thumbPosition }] }]}>
                      <Ionicons name="checkmark-circle" size={28 * scaleX} color="#41d541" />
                    </Animated.View>
                    <Text style={[styles.slideLabel, !allChecked && styles.slideLabelDisabled]}>Slide to complete</Text>
                  </View>
                </View>
            </View>
          </Animated.View>
        </BlurView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 1001,
  },
  blurOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  modalWrapper: {
    position: 'absolute',
    zIndex: 1000,
    overflow: 'visible',
  },
  trianglePointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12 * scaleX,
    borderRightWidth: 12 * scaleX,
    borderBottomWidth: 10 * scaleX,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffffff',
    marginBottom: -1,
    position: 'absolute',
    zIndex: 1001,
    shadowColor: 'rgba(100, 131, 176, 0.4)',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 5,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12 * scaleX,
    padding: 24 * scaleX,
    paddingBottom: 24 * scaleX,
    shadowColor: 'rgba(100, 131, 176, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 35 * scaleX,
    elevation: 10,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 12 * scaleX,
  },
  dividerAfterTitle: {
    height: 1,
    backgroundColor: '#e3e3e3',
    marginTop: 16 * scaleX,
    marginBottom: 16 * scaleX,
    width: '100%',
  },
  dividerBeforeOptional: {
    height: 1,
    backgroundColor: '#e3e3e3',
    marginTop: 20 * scaleX,
    marginBottom: 16 * scaleX,
    width: '100%',
  },
  checklistTitle: {
    fontSize: 20 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#41d541',
    marginBottom: 0,
    textAlign: 'left',
    flex: 1,
    flexShrink: 1,
    marginRight: 8 * scaleX,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: Math.max(32, 28 * scaleX),
    height: Math.max(32, 28 * scaleX),
    borderRadius: Math.max(16, 14 * scaleX),
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16 * scaleX,
  },
  iconCircle: {
    width: 42 * scaleX,
    height: 42 * scaleX,
    borderRadius: 21 * scaleX,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16 * scaleX,
  },
  checklistLabel: {
    flex: 1,
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    lineHeight: 20 * scaleX,
    color: '#334866',
  },
  checkbox: {
    width: 28 * scaleX,
    height: 28 * scaleX,
    borderRadius: 4 * scaleX,
    borderWidth: 3,
    borderColor: '#5A759D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: 'transparent',
    borderColor: '#41D541',
  },
  optionalTitle: {
    fontSize: 10 * scaleX,
    fontFamily: 'Helvetica',
    fontStyle: 'normal',
    fontWeight: '400',
    color: '#575353',
    marginTop: 0,
    marginBottom: 12 * scaleX,
  },
  optionalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12 * scaleX,
  },
  optionalLabel: {
    fontSize: 18 * scaleX,
    fontFamily: 'Helvetica',
    fontStyle: 'normal',
    fontWeight: '700',
    color: '#1E1E1E',
  },
  slideSection: {
    marginTop: 24 * scaleX,
  },
  slideTrack: {
    height: 56 * scaleX,
    backgroundColor: '#e3e3e3',
    borderRadius: 28 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6 * scaleX,
    overflow: 'hidden',
  },
  slideTrackDisabled: {
    opacity: 0.6,
  },
  slideThumb: {
    width: 44 * scaleX,
    height: 44 * scaleX,
    borderRadius: 22 * scaleX,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  slideLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 16 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '600',
    color: '#334866',
  },
  slideLabelDisabled: {
    color: '#9ca3af',
  },
});
