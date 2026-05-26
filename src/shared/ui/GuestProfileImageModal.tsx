import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';

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
    if (left + IMAGE_SIZE > screenWidth) left = screenWidth - IMAGE_SIZE;
    if (left < 0) left = 0;
    if (top < 0) top = 0;
    if (top + IMAGE_SIZE > screenHeight) top = screenHeight - IMAGE_SIZE;
  } else {
    left = (screenWidth - IMAGE_SIZE) / 2;
    top = (screenHeight - IMAGE_SIZE) / 2;
  }

  // Use high-res URL when provided so the image stays sharp at 296×296 (avoids blur from upscaling thumbnails)
  const imageUri = guest.highResImageUrl ?? guest.imageUrl;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <StatusBar hidden={visible} />
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.touchableOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View
            style={[
              styles.imageWrap,
              {
                position: 'absolute',
                left,
                top,
                width: IMAGE_SIZE,
                height: IMAGE_SIZE,
                borderRadius: IMAGE_RADIUS,
              },
            ]}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}}
              style={[styles.imageInner, { borderRadius: IMAGE_RADIUS }]}
            >
              <Image
                source={{ uri: imageUri }}
                style={[styles.enlargedImage, { borderRadius: IMAGE_RADIUS, width: IMAGE_SIZE, height: IMAGE_SIZE }]}
                resizeMode="cover"
                fadeDuration={0}
                {...(Platform.OS === 'android' && { resizeMethod: 'resize' as const })}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  touchableOverlay: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  imageWrap: {
    overflow: 'hidden',
  },
  imageInner: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  enlargedImage: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
});
