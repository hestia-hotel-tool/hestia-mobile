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
/**
 * Gap between the status button and the card when it opens below it.
 *
 * The tail occupies the 13.54px directly above the sheet, so the clear space
 * between the pill and the tail's tip is this minus TAIL_HEIGHT — about 22px
 * here.
 *
 * A deliberate step away from the frame, at the user's request: Figma 406-1783
 * puts the pill's bottom at y=437 and the tail's tip at y=447.76, only ~10.8px
 * apart, which reads as the tail touching the button on a real device.
 */
export const STATUS_MODAL_SPACING = 36;

/**
 * Figma 406-1783 — the speech-bubble tail, a wide rounded triangle.
 *
 * Measured from the `Union` shape's own path (bases at x=404.573 and x=442.391,
 * apex at y=70.04 against a sheet top of y=83.57) rather than the layer's
 * bounding box, which is inflated by the drop-shadow filter. The old 51.619 x
 * 19.984 came from that bbox.
 */
const TAIL_WIDTH = 37.82;
const TAIL_HEIGHT = 13.54;

export type PopoverAnchor = { x: number; y: number; width: number; height: number } | null;

export type StatusPopoverProps = {
  visible: boolean;
  onClose: () => void;
  /** The measured status button, in window coordinates. Anchors card and tail. */
  buttonPosition?: PopoverAnchor;
  /** Screen header height in design px — the popover never opens above this. */
  headerHeight?: number;
  /**
   * Window y, in real px, where the blur starts. Everything above it stays
   * sharp.
   *
   * The design keeps the tapped card crisp and blurs only from its bottom edge
   * down (Figma 406-1783), so callers pass the card's measured bottom. Omitted,
   * the blur falls back to starting below the screen header.
   */
  blurTop?: number | null;
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
  blurTop,
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

  /**
   * Where the blur begins. The popover is *not* positioned relative to this.
   *
   * It used to be: the card was a child of the backdrop, so every offset was
   * backdrop-relative and the blur's origin and the card's origin were the same
   * number. That cannot express the design, where the sheet's top (y=461) sits
   * *above* the card's bottom (y=545) where the blur starts — the popover
   * deliberately overlaps the card it belongs to. So the two are now
   * independent: the blur is a sibling with its own `top`, and everything below
   * is in plain window coordinates.
   */
  const blurRegionTop = blurTop != null && blurTop > 0 ? blurTop : HEADER_HEIGHT;

  let modalTopPosition: number;
  let modalLeft: number;
  let triangleLeft: number;
  const triangleTopOffset = -(TAIL_HEIGHT - 1) * scaleX; // Tail sits just above the card, overlapping 1px
  const triangleBottomOffset = modalHeight - 1 * scaleX;
  let trianglePlacement: 'top' | 'bottom' = 'top';

  /** Opening *below* the pill keeps the screen header clear. */
  const minTop = HEADER_HEIGHT;
  /**
   * Opening *above* it does not have to.
   *
   * The popover is a `Modal` — its own window, drawn over the whole screen — so
   * nothing stops it covering the header, and a flipped card that has to clear
   * the header usually cannot fit at all. Requiring that was why capped cards
   * misbehaved: an In Progress card carries a 73px status cap, which pushes its
   * pill ~73px further down, so the sheet no longer fits below it, and the
   * flip above was rejected for want of header clearance. Neither branch
   * qualified, placement fell through to the bottom clamp, and the tail was
   * left pointing at a pill the sheet had already covered.
   */
  const minTopAbove = insets.top + 8 * scaleX;
  let placementFloor = minTop;

  if (showTriangle && buttonPosition) {
    const spacing = STATUS_MODAL_SPACING * scaleX;
    const buttonBottom = buttonPosition.y + buttonPosition.height;

    // Prefer opening below; if it would overflow, flip above.
    const desiredBelowTop = buttonBottom + spacing;
    const desiredAboveTop = buttonPosition.y - spacing - modalHeight;
    const maxTop = Math.max(minTop, SCREEN_HEIGHT - modalHeight - insets.bottom - 12 * scaleX);

    if (desiredBelowTop <= maxTop) {
      modalTopPosition = desiredBelowTop;
      trianglePlacement = 'top';
    } else if (desiredAboveTop >= minTopAbove) {
      modalTopPosition = desiredAboveTop;
      trianglePlacement = 'bottom';
      placementFloor = minTopAbove;
    } else {
      modalTopPosition = Math.min(Math.max(minTop, desiredBelowTop), maxTop);
      trianglePlacement = 'top';
    }

    modalLeft = STATUS_MODAL_LEFT * scaleX;

    // Tail centred on the button. One real-px value now — it used to be divided
    // by scaleX here and multiplied again in the style, a round trip that was
    // only ever correct by accident.
    const buttonCenterX = buttonPosition.x + buttonPosition.width / 2;
    const rawTailLeft = buttonCenterX - modalLeft - (TAIL_WIDTH / 2) * scaleX;
    // Keep it on the card: the card is horizontally fixed, so a pill near
    // either screen edge would otherwise push the tail off the corner radius.
    const tailInset = 12 * scaleX;
    const maxTailLeft = (STATUS_MODAL_WIDTH - TAIL_WIDTH) * scaleX - tailInset;
    triangleLeft = Math.min(Math.max(tailInset, rawTailLeft), Math.max(tailInset, maxTailLeft));
  } else {
    // Flush against the bottom of the header.
    modalLeft = STATUS_MODAL_LEFT * scaleX;
    modalTopPosition = minTop;
    triangleLeft = 0;
  }

  modalTopPosition = Math.max(placementFloor, modalTopPosition);

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
        {/* The sharp region: the screen header, the list above the tapped card,
            and the card itself. Nothing is drawn over it — it only has to stay
            crisp and still dismiss on tap, the way FilterModalOverlay's own
            strip above `blurTop` does. */}
        <Pressable
          style={[styles.sharpRegion, { height: blurRegionTop }]}
          onPress={() => dismiss()}
          accessibilityRole="button"
          accessibilityLabel="Close status options"
        />

        {/* Lighter than the app's usual wash — the card is a menu over content
            the user is still reading, not a lightbox. */}
        <BlurBackdrop
          top={blurRegionTop}
          intensity={20}
          onPress={() => dismiss()}
          accessibilityLabel="Close status options"
        />

        {/* A sibling of the blur, not a child: see `blurRegionTop` above. */}
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
                  left: triangleLeft,
                  top: trianglePlacement === 'top' ? triangleTopOffset : triangleBottomOffset,
                  transform: [{ rotate: trianglePlacement === 'top' ? '0deg' : '180deg' }],
                },
              ]}
              pointerEvents="none"
            >
              {/* Both dimensions pinned. The registered glyph's own aspect is
                  2.583 against the design tail's 2.793, so deriving the width
                  from the height would draw it ~3px narrow. */}
              <Icon
                name="action-tooltip-tail"
                width={TAIL_WIDTH * scaleX}
                height={TAIL_HEIGHT * scaleX}
                color="#ffffff"
              />
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
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sharpRegion: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Height is set inline — the card's measured bottom, or the header height.
    backgroundColor: 'transparent',
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
    // 9, not 12: the sheet path's corner arcs run exactly 9px
    // (x 477.1 -> 486.1 against y 83.57 -> 92.57).
    borderRadius: 9 * scaleX,
    // 24: the title's box starts at x=35 against a sheet left edge of x=11.
    padding: 24 * scaleX,
    paddingBottom: 24 * scaleX,
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
    paddingTop: 24 * scaleX,
  },
});
