import React, { useRef, useEffect, useState } from 'react';
import { Modal, TouchableOpacity, StyleSheet, Dimensions, View, Text, Animated, Platform, Switch, Image, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RoomStatus, StatusChangeOption, STATUS_OPTIONS, STATUS_CONFIGS, RoomCardData } from '../../types/allRooms.types';
import { STATUS_BUTTON, CARD_DIMENSIONS, scaleX } from '../../constants/allRoomsStyles';
import { typography } from '@/theme';
import StatusOptionItem from './StatusOptionItem';

/** Option ids that map to a single room status; hide the one that matches currentStatus */
const STATUS_OPTION_IDS: StatusChangeOption[] = ['Dirty', 'InProgress', 'Cleaned', 'Inspected'];

/** Circular background color per option – matches Figma Change Status modal */
function getOptionBackgroundColor(optionId: StatusChangeOption): string {
  switch (optionId) {
    case 'Priority':
      return '#FFEBEB'; // Light pink / off-white with red tint (Figma)
    case 'Dirty':
      return '#f92424'; // Solid red (Figma)
    case 'InProgress':
      return '#F0BE1B'; // Gold / In Progress (Figma)
    case 'Cleaned':
      return '#B8D4F0'; // Light blue (Figma)
    case 'Inspected':
      return '#C8E6C9'; // Light green (Figma)
    case 'Pause':
    case 'ReturnLater':
    case 'RefuseService':
    case 'PromisedTime':
      return '#FCF1CF'; // Light yellow (Figma – second row)
    default:
      return '#e8e8e8';
  }
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DESIGN_WIDTH = 440;

interface StatusChangeModalProps {
  visible: boolean;
  onClose: () => void;
  onStatusSelect: (status: StatusChangeOption) => void;
  /** When provided and user selects Inspected, this is called instead of onStatusSelect. Use to show Inspection Checklist slide. */
  onInspectedSelect?: () => void;
  /** When provided and user selects Cleaned, this is called instead of onStatusSelect. Use to show Clean Checklist modal. */
  onCleanedSelect?: () => void;
  currentStatus: RoomStatus;
  room?: RoomCardData; // Room data
  buttonPosition?: { x: number; y: number; width: number; height: number } | null; // Status button position on screen
  showTriangle?: boolean; // Whether to show the triangle pointer (default: true)
  headerHeight?: number; // Header height in design pixels (default: 232, use 217 for AllRoomsScreen)
  /** When provided, shows the Flag room row and calls this when the user toggles it */
  onFlagToggle?: (flagged: boolean) => void;
}

export default function StatusChangeModal({
  visible,
  onClose,
  onStatusSelect,
  onInspectedSelect,
  onCleanedSelect,
  currentStatus,
  room,
  buttonPosition,
  showTriangle = true,
  headerHeight = 232, // Default to 232px
  onFlagToggle,
}: StatusChangeModalProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      // Slide up animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations when modal closes
      slideAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible, slideAnim, opacityAnim]);

  const handleStatusSelect = (option: StatusChangeOption) => {
    // Inspected requires Inspection Checklist - delegate to onInspectedSelect if provided
    if (option === 'Inspected' && onInspectedSelect) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        onInspectedSelect();
        onClose();
      });
      return;
    }

    // Cleaned requires Clean Checklist modal - delegate to onCleanedSelect if provided
    if (option === 'Cleaned' && onCleanedSelect) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        onCleanedSelect();
        onClose();
      });
      return;
    }

    // Animate out before closing
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onStatusSelect(option);
      onClose();
    });
  };

  const handleFlagToggle = (value: boolean) => {
    onFlagToggle?.(value);
    // Animate out before closing
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleClose = () => {
    // Animate out before closing
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!room) return null;

  // Modal width (scaled) - full card width
  const modalWidth = CARD_DIMENSIONS.width * scaleX; // 426px scaled (full card width)
  const modalHeight = 368 * scaleX; // Modal height: status options grid + Flag room row (Figma)
  
  let modalTopPosition: number;
  let modalLeft: number;
  let triangleLeft: number;
  const triangleTopOffset = -6 * scaleX; // Position triangle just above modal top to touch the button
  const triangleBottomOffset = modalHeight - 1 * scaleX; // Bottom pointer position (overlap slightly)
  let trianglePlacement: 'top' | 'bottom' = 'top';

  // Use provided headerHeight or default based on showTriangle
  // When showTriangle=true (AllRoomsScreen), header is 217px
  // When showTriangle=false, header is 232px
  const HEADER_HEIGHT_PX = headerHeight || (showTriangle ? 217 : 232);
  const HEADER_HEIGHT = HEADER_HEIGHT_PX * scaleX;

  if (showTriangle && buttonPosition) {
    // Calculate modal position: below the status button with margin
    // buttonPosition.y is the top of the button measured from window top (absolute position)
    // buttonPosition.height is the button height
    // So buttonPosition.y + buttonPosition.height gives us the bottom of the button
    // The modal is positioned relative to BlurView which starts at HEADER_HEIGHT from window top
    // So we need to subtract HEADER_HEIGHT to convert absolute position to BlurView-relative position
    // Desired gap between button and modal
    const spacing = 70 * scaleX;
    const buttonTopRelative = buttonPosition.y - HEADER_HEIGHT;
    const buttonBottomRelative = buttonTopRelative + buttonPosition.height;

    // Prefer opening below; if it would overflow, flip above.
    const desiredBelowTop = buttonBottomRelative + spacing;
    const desiredAboveTop = buttonTopRelative - spacing - modalHeight;

    const maxTop =
      Math.max(0, SCREEN_HEIGHT - HEADER_HEIGHT - modalHeight - insets.bottom - 12 * scaleX);

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
    
    // Status button center X position on screen (already in screen pixels, scaled)
    const buttonCenterX = buttonPosition.x + buttonPosition.width / 2;
    
    // Center modal with card - card has margin of 7px from screen edge
    const screenMargin = CARD_DIMENSIONS.marginHorizontal * scaleX; // 7px scaled (matches card margin)
    modalLeft = screenMargin; // Center modal with card by using same left margin as card
    
    // Triangle position relative to modal container
    // Triangle should be centered on the button center
    // triangleLeft (in design pixels, will be scaled in style) = (buttonCenterX - modalLeft - triangleHalfWidth) / scaleX
    const triangleHalfWidth = 12 * scaleX; // Half of triangle base
    triangleLeft = (buttonCenterX - modalLeft - triangleHalfWidth) / scaleX;
  } else {
    // Position modal directly at header bottom with 0px gap - modal starts exactly where header ends
    // Since BlurView now starts at HEADER_HEIGHT, modal position is relative to BlurView (0px from BlurView top = header bottom)
    const screenMargin = CARD_DIMENSIONS.marginHorizontal * scaleX; // 7px scaled (matches card margin)
    modalLeft = screenMargin; // Align with card margin
    modalTopPosition = 0; // Position modal at 0px from BlurView top (which is at header bottom)
    triangleLeft = 0; // Not used when triangle is hidden
  }

  // Safety clamp
  modalTopPosition = Math.max(0, modalTopPosition);
  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [modalHeight + 50, 0], // Start below screen, end at position
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      {/* Blurred Background Overlay - Start below header */}
      <Animated.View style={{ flex: 1, opacity: opacityAnim }}>
        {/* Header area - no blur */}
        <View style={[styles.headerArea, { height: HEADER_HEIGHT }]} />
        
        {/* Blurred area - below header */}
        <BlurView
          intensity={20}
          tint="light"
          style={[styles.blurOverlay, { top: HEADER_HEIGHT }]}
        >
          {/* Backdrop - transparent, just for closing modal */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={handleClose}
          />
          {/* Modal Container - positioned below the status button or centered */}
          <Animated.View 
            style={[
              styles.modalWrapper, 
              showTriangle 
                ? { top: modalTopPosition, left: modalLeft }
                : { top: modalTopPosition, left: modalLeft },
              {
                transform: [{ translateY }],
              }
            ]} 
            pointerEvents="box-none"
          >
          {/* Triangle Pointer - points to status button */}
          {showTriangle && (
            <View
              style={[
                styles.trianglePointer,
                { 
                  left: triangleLeft * scaleX, // triangleLeft is in design pixels, scale it
                  top: trianglePlacement === 'top' ? triangleTopOffset : triangleBottomOffset,
                  transform: [{ rotate: trianglePlacement === 'top' ? '0deg' : '180deg' }],
                },
              ]}
              pointerEvents="none"
            />
          )}
          
          <Pressable
            style={[
              styles.modalContainer,
              !showTriangle && styles.modalContainerNoGap
            ]}
            onPress={() => {}}
            onStartShouldSetResponder={() => true}
          >
            {/* Change Status Header Text */}
            <Text style={styles.headerText}>Change status</Text>
            
            <View style={styles.optionsGrid}>
              {STATUS_OPTIONS.filter((option) => {
                if (!STATUS_OPTION_IDS.includes(option.id)) return true;
                return option.id !== currentStatus;
              }).map((option) => {
                const isInProgress = option.id === 'InProgress';
                const isCleaned = option.id === 'Cleaned';
                const isInspected = option.id === 'Inspected';
                const isPause = option.id === 'Pause';
                const isReturnLater = option.id === 'ReturnLater';
                const isRefuseService = option.id === 'RefuseService';
                const isPromisedTime = option.id === 'PromisedTime';
                const isPriority = option.id === 'Priority';
                const isDirty = option.id === 'Dirty';
                const iconOnly =
                  isCleaned ||
                  isInspected ||
                  isPause ||
                  isReturnLater ||
                  isRefuseService ||
                  isPromisedTime ||
                  isPriority;

                return (
                  <StatusOptionItem
                    key={option.id}
                    icon={option.icon}
                    label={option.label}
                    onPress={() => handleStatusSelect(option.id)}
                    tintColor={isInProgress ? '#FFFFFF' : undefined}
                    // For iconOnly statuses: no circular background – show icon only
                    backgroundColor={iconOnly ? undefined : getOptionBackgroundColor(option.id)}
                    // Upscale iconOnly statuses so they visually match In Progress size
                    iconScale={isDirty ? 1.35 : iconOnly ? 2 : 1}
                  />
                );
              })}
            </View>

            <View style={styles.divider} />

            {/* Flag room row - matches Figma (red icon, "Flag room" label, toggle) */}
            <View style={styles.flagRoomContainer}>
              <View style={styles.flagIconCircle}>
                <Image
                  source={require('../../../../../assets/icons/flag.png')}
                  style={styles.flagIcon}
                  resizeMode="contain"
                  tintColor="#F92424"
                />
              </View>
              <Text style={styles.flagRoomText}>Flag room</Text>
              <Switch
                value={room.flagged}
                onValueChange={handleFlagToggle}
                trackColor={{ false: '#e3e3e3', true: '#F92424' }}
                thumbColor="#ffffff"
                style={styles.toggleSwitch}
                disabled={!onFlagToggle}
              />
            </View>

          </Pressable>
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
    // Height is set dynamically via inline style based on headerHeight prop
    backgroundColor: 'transparent',
    zIndex: 1001, // Above blur but below modal
  },
  blurOverlay: {
    position: 'absolute',
    // Top position is set dynamically via inline style based on headerHeight prop
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
    width: CARD_DIMENSIONS.width * scaleX, // Full card width (426px) - matches card width
    // Left position is set dynamically (with equal margins when centered)
    // Top position is set dynamically based on button position or header
    zIndex: 1000,
    overflow: 'visible', // Allow triangle to be visible outside container bounds
  },
  centeredModal: {
    top: '50%',
    left: '50%',
    marginLeft: -(CARD_DIMENSIONS.width * scaleX) / 2,
    marginTop: -200 * scaleX, // Approximate half of modal height
    marginHorizontal: 0,
  },
  trianglePointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12 * scaleX,
    borderRightWidth: 12 * scaleX,
    borderBottomWidth: 10 * scaleX, // Points upward (from modal to button above)
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffffff',
    marginBottom: -1, // Overlap slightly to remove any gap
    position: 'absolute',
    zIndex: 1001, // Ensure triangle is above modal container
    // Add shadow to match modal shadow
    shadowColor: 'rgba(100, 131, 176, 0.4)',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 5,
    // Left and top positions are set dynamically via inline style
  },
  modalContainer: {
    width: '100%', // Full width of modalWrapper
    backgroundColor: '#ffffff',
    borderRadius: 12 * scaleX,
    padding: 20 * scaleX,
    paddingBottom: 16 * scaleX,
    shadowColor: 'rgba(100, 131, 176, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 35 * scaleX,
    elevation: 10,
  },
  modalContainerNoGap: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: 0,
    paddingTop: 20 * scaleX,
  },
  headerText: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700' as any,
    color: '#607AA1',
    marginBottom: 16 * scaleX,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  divider: {
    height: 1 * scaleX,
    backgroundColor: '#e3e3e3',
    marginTop: 8 * scaleX,
    marginBottom: 16 * scaleX,
    width: '100%',
  },
  flagRoomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4 * scaleX,
  },
  flagIconCircle: {
    width: 51.007 * scaleX,
    height: 51.007 * scaleX,
    borderRadius: (51.007 / 2) * scaleX,
    backgroundColor: 'rgba(249, 36, 36, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12 * scaleX,
    padding: 8 * scaleX, // Add padding to ensure icon fits properly
  },
  flagIcon: {
    width: 24 * scaleX, // Reduced icon size to fit properly in circle
    height: 24 * scaleX,
  },
  flagRoomText: {
    flex: 1,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700' as any,
    color: '#F92424',
    textAlign: 'left',
  },
  toggleSwitch: {
    transform: [{ scaleX: scaleX }, { scaleY: scaleX }],
    // Ensure proper sizing to match Figma design
  },
});
