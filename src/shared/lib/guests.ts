/**
 * Guest service (Supabase)
 * Guest image upload to Storage and update guests.image_url.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { base64ToArrayBuffer } from '../utils/encoding';
import { getMyHotelId } from './tenant';

export const GUEST_IMAGES_BUCKET = 'guest-images';

export interface UploadGuestImageResult {
  imageUrl: string;
}

/**
 * Upload a guest portrait image to Supabase Storage and set guests.image_url.
 * Path: guest-images/{guestId}/avatar.{ext}
 *
 * @param guestId - Supabase guests.id (UUID)
 * @param imageBase64 - Base64-encoded image string (no data URL prefix, or with data:image/...;base64,)
 * @param fileExtension - e.g. 'jpg', 'png', 'webp'
 * @returns public image URL
 */
export async function uploadGuestImage(
  guestId: string,
  imageBase64: string,
  fileExtension: string
): Promise<UploadGuestImageResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Guest image upload requires Supabase to be configured.');
  }

  const hotelId = await getMyHotelId();
  if (!hotelId) throw new Error('No hotel assigned to this user.');
  const path = `${hotelId}/${guestId}/avatar.${fileExtension.replace(/^\./, '')}`;
  const arrayBuffer = base64ToArrayBuffer(imageBase64);
  const contentType = `image/${fileExtension.replace(/^\./, '')}`;

  const { error: uploadError } = await supabase.storage
    .from(GUEST_IMAGES_BUCKET)
    .upload(path, arrayBuffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(GUEST_IMAGES_BUCKET).getPublicUrl(path);
  const imageUrl = urlData.publicUrl;

  const { error: updateError } = await supabase
    .from('guests')
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq('id', guestId);

  if (updateError) throw updateError;

  return { imageUrl };
}
