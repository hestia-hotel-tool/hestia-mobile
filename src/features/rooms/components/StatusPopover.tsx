import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurBackdrop } from '@/components/ui/BlurBackdrop';
import { Icon } from '@/components/Icon';
import { scaleX } from '../constants/allRoomsStyles';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Figma 2365:49 — the card is 416 wide, inset 11px from the screen edge (the
 * room card itself is 426 at x=7). The checklist in 2584:1276 uses the same
 * box, 416 at x=12.
 *
 * Exported because AllRoomsScreen needs the same numbers to decide how far to
 * scroll so the card isn't clipped; it used to keep its own copies, which drifted.
 */
export const STATUS_MODAL_WIDTH = 416;
export const STATUS_MODAL_LEFT = 11;
/** Gap between the status button and the card when it opens below it. */
export const STATUS_MODAL_SPACING = 70;

/** Figma 866:224 — the speech-bubble tail, a wide rounded triangle. */
const TAIL_WIDTH = 51.619;
const TAIL_HEIGHT = 19.984;

export type PopoverAnchor = { x: number; y: number; width: number; height: number } | null;

export type StatusPopoverProps = {
  visible: boolean;
  onClose: () => void;
  /** The measured status button, in window coordinates. Anchors card and tail. */
  buttonPosition?: PopoverAnchor;
  /** Screen header height in design px — the strip left unblurred above the card. */
  headerHeight?: number;
  showTriangle?: boolean;
  /**
   * Card height in design px. Only drives placement — whether the card opens
   * below the button or flips above it — so an estimate is fine.
   */
  contentHeight: number;
  /**
   * Cap the card at the space available and let its content scroll inside.
   *
   * Off by default: the status list is a fixed grid with nothing to scroll, and
   * capping it would clip an option rather than shrink the card. Turn it on for
   * content that can grow, like a checklist.
   */
  clampHeight?: boolean;
  /**
   * The card's contents.
   *
   * Called with `dismiss`, which plays the close animation and *then* runs its
   * callback. Anything acting on a choice made in here should go through it,
   * so the card slides away instead of vanishing mid-gesture.
   */
  children: (dismiss: (after?: () => void) => void) => React.ReactNode;
};

/**
 * The anchored popover the room status flows open in — Figma 2365:49.
 *
 * Owns everything around the content: the modal, the blur that starts below the
 * screen header, tap-outside-to-close, the tail pointing back at the status
 * button, the slide-and-fade, and the decision to open below the button or flip
 * above it when there is no room.
 *
 * Extracted so a flow can swap what the card *says* without restating any of
 * that. The status list and the clean checklist are two contents of one
 * popover, not two modals that hand off to each other.
 */
export default function StatusPopover({
  visible,
  onClose,
  buttonPosition,
  headerHeight = 232,
  showTriangle = true,
  contentHeight,
  clampHeight = false,
  children,
}: StatusPopoverProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible, slideAnim, opacityAnim]);

  const dismiss = (after?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      // Act first, then close — a handler that reads the screen's "room being
      // changed" state runs before the close clears it.
      after?.();
      onClose();
    });
  };

  const HEADER_HEIGHT = headerHeight * scaleX;
  const modalHeight = contentHeight * scaleX;
  /** The tallest the card may be here, so a long checklist scrolls instead of clipping. */
  const maxCardHeight = SCREEN_HEIGHT - HEADER_HEIGHT - insets.bottom - 24 * scaleX;

  let modalTopPosition: number;
  let modalLeft: number;
  let triangleLeft: number;
  const triangleTopOffset = -(TAIL_HEIGHT - 1) * scaleX; // Tail sits just above the card, overlapping 1px
  const triangleBottomOffset = modalHeight - 1 * scaleX;
  let trianglePlacement: 'top' | 'bottom' = 'top';

  if (showTriangle && buttonPosition) {
    // buttonPosition.y is the top of the button from the window top. The card is
    // positioned inside the backdrop, which starts HEADER_HEIGHT down, so the
    // button has to be converted into backdrop-relative coordinates first.
    const spacing = STATUS_MODAL_SPACING * scaleX;
    const buttonTopRelative = buttonPosition.y - HEADER_HEIGHT;
    const buttonBottomRelative = buttonTopRelative + buttonPosition.height;

    // Prefer opening below; if it would overflow, flip above.
    const desiredBelowTop = buttonBottomRelative + spacing;
    const desiredAboveTop = buttonTopRelative - spacing - modalHeight;
    const maxTop = Math.max(
      0,
      SCREEN_HEIGHT - HEADER_HEIGHT - modalHeight - insets.bottom - 12 * scaleX
    );

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

    modalLeft = STATUS_MODAL_LEFT * scaleX;

    // Tail centred on the button, in design px here and scaled again in the style.
    const buttonCenterX = buttonPosition.x + buttonPosition.width / 2;
    const tailHalfWidth = (TAIL_WIDTH / 2) * scaleX;
    triangleLeft = (buttonCenterX - modalLeft - tailHalfWidth) / scaleX;
  } else {
    // Flush against the bottom of the header.
    modalLeft = STATUS_MODAL_LEFT * scaleX;
    modalTopPosition = 0;
    triangleLeft = 0;
  }

  modalTopPosition = Math.max(0, modalTopPosition);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [modalHeight + 50, 0],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={() => dismiss()}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <Animated.View style={{ flex: 1, opacity: opacityAnim }}>
        {/* Header area — left unblurred */}
        <View style={[styles.headerArea, { height: HEADER_HEIGHT }]} />

        {/* Lighter than the app's usual wash — the card is a menu over content
            the user is still reading, not a lightbox. */}
        <BlurBackdrop
          top={HEADER_HEIGHT}
          intensity={20}
          onPress={() => dismiss()}
          accessibilityLabel="Close status options"
        >
          <Animated.View
            style={[
              styles.modalWrapper,
              { top: modalTopPosition, left: modalLeft, transform: [{ translateY }] },
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
              >
                <Icon name="action-tooltip-tail" size={TAIL_HEIGHT * scaleX} color="#ffffff" />
              </View>
            )}

            <Pressable
              style={[
                styles.modalContainer,
                clampHeight && { maxHeight: maxCardHeight },
                !showTriangle && styles.modalContainerNoGap,
              ]}
              onPress={() => {}}
              onStartShouldSetResponder={() => true}
            >
              {children(dismiss)}
            </Pressable>
          </Animated.View>
        </BlurBackdrop>
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
    // Height is set inline from the headerHeight prop.
    backgroundColor: 'transparent',
    zIndex: 1001,
  },
  modalWrapper: {
    position: 'absolute',
    width: STATUS_MODAL_WIDTH * scaleX,
    zIndex: 1000,
    overflow: 'visible', // the tail sits outside the card
  },
  trianglePointer: {
    position: 'absolute',
    zIndex: 1001,
  },
  modalContainer: {
    width: '100%',
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
});
