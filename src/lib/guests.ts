/**
 * Guest service (Supabase)
 * Guest image upload to Storage and update guests.image_url.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { base64ToArrayBuffer } from '../utils/encoding';
import { getMyHotelId } from './tenant';

export const GUEST_IMAGES_BUCKET = 'guest-images';

/** Signed-URL lifetime for guest images shown on a picker/list screen. */
const GUEST_IMAGE_URL_TTL_SECONDS = 60 * 60;

export function isHttpUrl(raw?: string | null): boolean {
  return /^https?:\/\//i.test(String(raw ?? '').trim());
}

export function fallbackGuestAvatarUrl(seed: string): string {
  return `https://i.pravatar.cc/96?u=${encodeURIComponent(seed)}`;
}

/**
 * Resolve a single guest image value to a displayable URL.
 * Accepts an http(s) URL (returned as-is), a Storage path (signed URL, then
 * public URL), or empty (deterministic placeholder from `seed`).
 */
export async function resolveGuestImageUrl(
  rawUrl: string | null | undefined,
  seed: string
): Promise<string> {
  const v = String(rawUrl ?? '').trim();
  if (!v) return fallbackGuestAvatarUrl(seed);
  if (isHttpUrl(v)) return v;
  try {
    const { data: signed } = await supabase.storage
      .from(GUEST_IMAGES_BUCKET)
      .createSignedUrl(v, GUEST_IMAGE_URL_TTL_SECONDS);
    if (signed?.signedUrl) return signed.signedUrl;
  } catch {
    // fall through to public URL
  }
  try {
    const { data: pub } = supabase.storage.from(GUEST_IMAGES_BUCKET).getPublicUrl(v);
    if (pub?.publicUrl) return pub.publicUrl;
  } catch {
    // fall through to placeholder
  }
  return fallbackGuestAvatarUrl(seed);
}

/**
 * Batch-resolve guest-image Storage paths to displayable URLs.
 * http(s) URLs and blanks are skipped; returns a `path -> url` map.
 */
export async function resolveGuestImageUrls(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const rawPaths = Array.from(
    new Set(paths.filter((p): p is string => typeof p === 'string' && p.trim().length > 0 && !isHttpUrl(p)))
  );
  if (rawPaths.length === 0) return out;

  try {
    const { data: signedList, error } = await supabase.storage
      .from(GUEST_IMAGES_BUCKET)
      .createSignedUrls(rawPaths, GUEST_IMAGE_URL_TTL_SECONDS);
    if (error) throw error;
    (signedList ?? []).forEach((item) => {
      if (item?.path && item?.signedUrl) out.set(String(item.path), String(item.signedUrl));
    });
  } catch {
    // Fallback: public URL, else per-path signed URL.
    for (const p of rawPaths) {
      try {
        const { data: pub } = supabase.storage.from(GUEST_IMAGES_BUCKET).getPublicUrl(p);
        if (pub?.publicUrl) {
          out.set(p, pub.publicUrl);
          continue;
        }
        const { data: signedOne } = await supabase.storage
          .from(GUEST_IMAGES_BUCKET)
          .createSignedUrl(p, GUEST_IMAGE_URL_TTL_SECONDS);
        if (signedOne?.signedUrl) out.set(p, signedOne.signedUrl);
      } catch {
        // ignore this path
      }
    }
  }
  return out;
}

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
