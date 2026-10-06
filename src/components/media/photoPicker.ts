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

/**
 * Photos from the library (several at once) or the camera. `remaining` caps
 * the selection so a record never passes MAX_PHOTOS. Cancelling returns no
 * URIs, not an error.
 */
export async function pickPhotos(source: 'library' | 'camera', remaining: number): Promise<PickResult> {
  if (remaining <= 0) return { error: `You can add up to ${MAX_PHOTOS} photos.` };
  try {
    if (source === 'camera') {
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
