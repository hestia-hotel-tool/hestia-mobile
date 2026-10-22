import { ActionSheetIOS, Alert, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';

/**
 * Most photos one record (a lost & found item, a ticket) may have — enough to
 * show it from every side.
 */
export const MAX_PHOTOS = 8;

export type PickResult = { uris: string[] } | { error: string };

const COMMON: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  allowsEditing: false,
  quality: 0.8,
  /*
   * iOS otherwise hands back the original HEIC, which the upload stores under
   * a .jpg name and an image/jpeg type — the bytes then fail to render, and
   * Android cannot decode HEIC at all. `Compatible` transcodes to JPEG.
   */
  preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

export type PhotoSource = 'camera' | 'library';

/**
 * Whether this device can take a photo. The iOS simulator has no camera, and
 * asking UIImagePickerController for one there throws an Objective-C
 * exception that JavaScript cannot catch — the app dies (crash report
 * 2026-10-21, `-[UIImagePickerController setSourceType:]`). Android
 * emulators have a virtual camera, so only iOS is gated.
 */
export function cameraAvailable(): boolean {
  return Platform.OS !== 'ios' || Device.isDevice;
}

/** Shown when someone asks for the camera where there is none. */
export const NO_CAMERA_MESSAGE = 'There is no camera on this device. Choose a photo from the library instead.';

/**
 * Ask where the photos come from — Take Photo or Choose from Library — the
 * one chooser every photo field in the app uses, so staff can always shoot
 * the item in front of them rather than only pick an existing picture.
 * An action sheet on iOS, an alert on Android; Cancel calls nothing.
 */
export function choosePhotoSource(onPick: (source: PhotoSource) => void, title = 'Add photos'): void {
  // No camera (the iOS simulator): the library is the only choice, so skip the question.
  if (!cameraAvailable()) {
    onPick('library');
    return;
  }
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: ['Take Photo', 'Choose from Library', 'Cancel'], cancelButtonIndex: 2 },
      (i) => {
        if (i === 0) onPick('camera');
        if (i === 1) onPick('library');
      }
    );
    return;
  }
  Alert.alert(title, undefined, [
    { text: 'Take Photo', onPress: () => onPick('camera') },
    { text: 'Choose from Library', onPress: () => onPick('library') },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

/**
 * Photos from the library (several at once) or the camera. `remaining` caps
 * the selection so a record never passes MAX_PHOTOS. Cancelling returns no
 * URIs, not an error.
 */
export async function pickPhotos(source: 'library' | 'camera', remaining: number): Promise<PickResult> {
  if (remaining <= 0) return { error: `You can add up to ${MAX_PHOTOS} photos.` };
  try {
    if (source === 'camera') {
      if (!cameraAvailable()) return { error: NO_CAMERA_MESSAGE };
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return { error: 'Allow camera access in Settings to take a photo.' };
      const result = await ImagePicker.launchCameraAsync(COMMON);
      return { uris: result.canceled ? [] : result.assets.map((a) => a.uri).slice(0, 1) };
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return { error: 'Allow photo library access in Settings to add pictures.' };
    const result = await ImagePicker.launchImageLibraryAsync({
      ...COMMON,
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
      orderedSelection: true,
    });
    return { uris: result.canceled ? [] : result.assets.map((a) => a.uri).slice(0, remaining) };
  } catch (e) {
    console.warn('[pickPhotos]', e);
    return { error: source === 'camera' ? 'Could not open the camera.' : 'Could not open your photos.' };
  }
}
