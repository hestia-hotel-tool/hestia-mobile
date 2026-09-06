import React from 'react';
import {
  Image,
  StyleSheet,
  Modal,
  Pressable,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurBackdrop } from '@/components/ui/BlurBackdrop';

export interface GuestProfileModalGuest {
  /** Image URL for the modal. Prefer a high-resolution URL so the 296×296 display stays sharp. */
  imageUrl: string;
  /** Optional higher-resolution URL; used for the modal when provided to avoid blur from upscaling. */
  highResImageUrl?: string;
  name?: string;
}

/** Layout of the guest image in window coords (from measureInWindow). Used to position enlarged image to the right. */
export interface GuestImageAnchorLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GuestProfileImageModalProps {
  visible: boolean;
  onClose: () => void;
  guest: GuestProfileModalGuest | null;
  /** When set, the enlarged image is positioned to the right of this rect. Otherwise centered. */
  anchorLayout?: GuestImageAnchorLayout | null;
}

const IMAGE_SIZE = 296;
const IMAGE_RADIUS = 5;
const GAP_RIGHT_OF_ANCHOR = 8;
/** Keep the box off the screen edge when it has to be clamped. */
const SCREEN_MARGIN = 8;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function GuestProfileImageModal({
  visible,
  onClose,
  guest,
  anchorLayout,
}: GuestProfileImageModalProps) {
  if (!guest?.imageUrl) return null;

  // Position to the right of guest image when anchorLayout is provided
  let left: number;
  let top: number;
  if (anchorLayout) {
    left = anchorLayout.x + anchorLayout.width + GAP_RIGHT_OF_ANCHOR;
    top = anchorLayout.y + anchorLayout.height / 2 - IMAGE_SIZE / 2;
    // Clamp so the 296×296 box stays on screen
    if (left + IMAGE_SIZE > screenWidth - SCREEN_MARGIN) {
      left = screenWidth - IMAGE_SIZE - SCREEN_MARGIN;
    }
    if (left < SCREEN_MARGIN) left = SCREEN_MARGIN;
    if (top < SCREEN_MARGIN) top = SCREEN_MARGIN;
    if (top + IMAGE_SIZE > screenHeight - SCREEN_MARGIN) {
      top = screenHeight - IMAGE_SIZE - SCREEN_MARGIN;
    }
  } else {
    left = (screenWidth - IMAGE_SIZE) / 2;
    top = (screenHeight - IMAGE_SIZE) / 2;
  }

  // Use high-res URL when provided so the image stays sharp at 296×296 (avoids blur from upscaling thumbnails)
  const imageUri = guest.highResImageUrl ?? guest.imageUrl;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <StatusBar hidden={visible} />
      {/*
        The screen behind is blurred, not dimmed — Figma node 2582:735. It used
        to be a flat 40% black scrim, which read as a lightbox rather than the
        app's own overlay treatment.

        The photo is a child of the backdrop, so it stays sharp: a BlurView
        blurs what is behind it, never what it contains.
      */}
      <BlurBackdrop
        onPress={onClose}
        accessibilityLabel={guest.name ? `Close photo of ${guest.name}` : 'Close photo'}
      >
        <Pressable
          // Swallows taps so pressing the photo itself does not dismiss it.
          onPress={() => {}}
          accessibilityRole="image"
          accessibilityLabel={guest.name ? `Photo of ${guest.name}` : 'Guest photo'}
          style={[
            styles.imageWrap,
            { left, top, width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: IMAGE_RADIUS },
          ]}
        >
          <Image
            source={{ uri: imageUri }}
            style={[styles.enlargedImage, { borderRadius: IMAGE_RADIUS }]}
            resizeMode="cover"
            fadeDuration={0}
            {...(Platform.OS === 'android' && { resizeMethod: 'resize' as const })}
          />
        </Pressable>
      </BlurBackdrop>
    </Modal>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    position: 'absolute',
    overflow: 'hidden',
  },
  enlargedImage: {
    width: '100%',
    height: '100%',
  },
});
