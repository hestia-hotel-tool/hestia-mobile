/**
 * Lost & Found service (Supabase)
 * Data access for the lost_and_found_items table + its Storage bucket.
 * Screens/components must not call `supabase.*` directly — go through here.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { getMyHotelId } from '@/lib/tenant';
import { base64ToArrayBuffer } from '@/utils/encoding';
import type { LostAndFoundStatus } from '../types/lostAndFound.types';

export const LOST_AND_FOUND_BUCKET = 'lost-and-found';

const BASE_SELECT = `
  id,
  item_name,
  description,
  status,
  storage_location,
  found_at,
  room_id,
  found_location,
  created_at,
  found_by_id,
  registered_by_id,
  tracking_number,
  image_url,
  rooms (
    room_number,
    reservations (
      guests (
        id,
        full_name,
        vip_code,
        image_url
      ),
      arrival_date,
      departure_date,
      adults,
      kids,
      front_office_status
    )
  )
`;

// `shipped_location` is added by a later migration; older DBs 42703 on it.
const WITH_SHIPPED_SELECT = BASE_SELECT.replace(
  'storage_location,',
  'storage_location,\n  shipped_location,'
);

export interface LostAndFoundRowsResult {
  rows: any[];
  /** false when the DB doesn't yet expose `shipped_location`. */
  shippedLocationColumnAvailable: boolean;
}

/**
 * Fetch lost_and_found_items rows (with room + guest info), newest first.
 * Falls back to a select without `shipped_location` when the column is missing.
 */
export async function fetchLostAndFoundRows(): Promise<LostAndFoundRowsResult> {
  let data: any[] | null = null;
  let error: any = null;

  ({ data, error } = await supabase
    .from('lost_and_found_items')
    .select(WITH_SHIPPED_SELECT)
    .order('found_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false }));

  let shippedLocationColumnAvailable = !error;

  if (error && error.code === '42703') {
    shippedLocationColumnAvailable = false;
    ({ data, error } = await supabase
      .from('lost_and_found_items')
      .select(BASE_SELECT)
      .order('found_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }));
  }

  if (error || !data) {
    throw error ?? new Error('Failed to load lost & found items');
  }

  return { rows: data, shippedLocationColumnAvailable };
}

/** Resolve registered-by / found-by user ids to `{ full_name, avatar_url }`. */
export async function fetchRegisteredByUsers(
  ids: string[]
): Promise<Map<string, { full_name?: string | null; avatar_url?: string | null }>> {
  const out = new Map<string, { full_name?: string | null; avatar_url?: string | null }>();
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  if (unique.length === 0) return out;

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, avatar_url')
    .in('id', unique);

  if (error) {
    console.warn('[lostAndFound] Failed to load registered-by users', error);
    return out;
  }
  (data ?? []).forEach((user: any) => out.set(user.id, user));
  return out;
}

/** Public URL for a stored lost-and-found image path (no-op for http URLs). */
export function getLostAndFoundPublicUrl(pathOrUrl: string): string | undefined {
  const raw = String(pathOrUrl ?? '').trim();
  if (!raw) return undefined;
  if (raw.startsWith('http')) return raw;
  const { data } = supabase.storage.from(LOST_AND_FOUND_BUCKET).getPublicUrl(raw);
  return data.publicUrl || undefined;
}

export interface CreateLostAndFoundItemInput {
  /** Raw form payload from RegisterLostAndFoundModal. */
  itemData: any;
  /** First picked image URI (file:// / content:// / ph://), if any. */
  imageUri?: string;
}

export interface CreateLostAndFoundItemResult {
  id: string | null;
  trackingNumber: string | null;
}

async function uploadLostAndFoundImage(hotelId: string, imageUri: string): Promise<string | null> {
  let body: ArrayBuffer | Blob;
  let contentType = 'image/jpeg';
  const extMatch = imageUri.split('.').pop();
  const rawExt = (extMatch || 'jpg').split('?')[0].toLowerCase();
  const normalizedExt = rawExt === 'heic' ? 'jpg' : rawExt;

  if (imageUri.startsWith('file://')) {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    body = base64ToArrayBuffer(base64);
    contentType = normalizedExt === 'png' ? 'image/png' : 'image/jpeg';
  } else {
    // content:// or ph:// – copy to cache then read as base64
    const tempPath = `${FileSystem.cacheDirectory}lost_found_${Date.now()}.${normalizedExt}`;
    await FileSystem.copyAsync({ from: imageUri, to: tempPath });
    const base64 = await FileSystem.readAsStringAsync(tempPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    contentType = normalizedExt === 'png' ? 'image/png' : 'image/jpeg';
    body = base64ToArrayBuffer(base64);
  }

  const fileName = `${hotelId}/items/${Date.now()}-${Math.random().toString(36).slice(2)}.${normalizedExt}`;

  let uploadData: any = null;
  let uploadError: any = null;

  // 1) Signed upload first (often more reliable in RN).
  try {
    const { data: signedUpload, error: signedUrlError } = await supabase.storage
      .from(LOST_AND_FOUND_BUCKET)
      .createSignedUploadUrl(fileName, { upsert: false });

    if (!signedUrlError && signedUpload?.token) {
      const { data: signedUploadData, error: signedUploadError } = await supabase.storage
        .from(LOST_AND_FOUND_BUCKET)
        .uploadToSignedUrl(fileName, signedUpload.token, body, { contentType });
      uploadData = signedUploadData;
      uploadError = signedUploadError;
      if (signedUploadError) {
        console.warn('[lostAndFound] uploadToSignedUrl failed', {
          message: String(signedUploadError?.message ?? signedUploadError ?? ''),
        });
      }
    } else if (signedUrlError) {
      console.warn('[lostAndFound] createSignedUploadUrl failed', signedUrlError);
    }
  } catch (signedException) {
    console.warn('[lostAndFound] Signed upload exception', signedException);
  }

  // 2) Direct upload with retry on transient network failures.
  if (uploadError || !uploadData?.path) {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // eslint-disable-next-line no-await-in-loop
      const result = await supabase.storage
        .from(LOST_AND_FOUND_BUCKET)
        .upload(fileName, body, { contentType, upsert: false });
      uploadData = result.data;
      uploadError = result.error;
      if (!uploadError) break;

      const message = String(uploadError?.message ?? uploadError ?? '');
      const isTransientNetwork = message.includes('Network request failed');
      if (!isTransientNetwork || attempt === maxAttempts) break;
      console.warn('[lostAndFound] Upload attempt failed, retrying', { attempt, maxAttempts, message });
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, attempt * 800));
    }
  }

  if (!uploadError && uploadData?.path) {
    const { data: publicUrlData } = supabase.storage
      .from(LOST_AND_FOUND_BUCKET)
      .getPublicUrl(uploadData.path);
    return publicUrlData.publicUrl ?? null;
  }
  if (uploadError) {
    console.warn('[lostAndFound] Failed to upload lost-and-found image', uploadError);
  }
  return null;
}

/**
 * Create a lost & found item from the register-form payload:
 * uploads the image (if any) then inserts the row.
 */
export async function createLostAndFoundItem(
  input: CreateLostAndFoundItemInput
): Promise<CreateLostAndFoundItemResult> {
  const itemData = input.itemData ?? {};
  const title: string = itemData.title ?? '';
  const notes: string = itemData.notes ?? '';
  const status: string = itemData.status ?? 'stored';
  const storedLocation: string | null = itemData.storedLocation ?? null;
  const selectedLocation: 'room' | 'publicArea' = itemData.selectedLocation ?? 'room';
  const selectedRoom = itemData.selectedRoom as { id?: string; number?: string } | undefined;
  const selectedPublicArea = itemData.selectedPublicArea as string | null | undefined;
  const selectedDate: Date = itemData.selectedDate ?? new Date();
  const selectedHour: number = itemData.selectedHour ?? selectedDate.getHours();
  const selectedMinute: number = itemData.selectedMinute ?? selectedDate.getMinutes();
  const registeredByIdFromForm: string | null = itemData.registeredBy ?? null;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id ?? null;

  const hotelId = await getMyHotelId();
  if (!hotelId) throw new Error('No hotel assigned to this user.');

  const foundAt = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    selectedHour,
    selectedMinute,
    0,
    0
  ).toISOString();

  const foundLocation =
    selectedLocation === 'room' && selectedRoom?.number
      ? `Room ${selectedRoom.number}`
      : selectedPublicArea
        ? selectedPublicArea
        : 'Public Area';

  const itemName =
    title.trim() ||
    (notes || '')
      .split(/[.!]/)[0]
      .trim()
      .split(' ')
      .slice(0, 4)
      .join(' ') ||
    'Lost item';

  let imageUrl: string | null = null;
  if (input.imageUri) {
    try {
      imageUrl = await uploadLostAndFoundImage(hotelId, input.imageUri);
    } catch (uploadException) {
      console.warn('[lostAndFound] Unexpected error uploading image', uploadException);
    }
  }

  if (!userId) {
    console.warn('[lostAndFound] No authenticated user – item not persisted.');
    return { id: null, trackingNumber: null };
  }

  const { data: inserted, error } = await supabase
    .from('lost_and_found_items')
    .insert({
      item_name: itemName,
      description: notes.trim() || null,
      status,
      storage_location: storedLocation,
      found_at: foundAt,
      found_by_id: userId,
      registered_by_id: registeredByIdFromForm ?? userId,
      found_location: foundLocation,
      room_id: selectedLocation === 'room' && selectedRoom ? selectedRoom.id ?? null : null,
      image_url: imageUrl,
      hotel_id: hotelId,
    })
    .select('id, tracking_number, image_url')
    .single();

  if (error) {
    console.warn('[lostAndFound] Failed to persist lost & found item', error);
    return { id: null, trackingNumber: null };
  }

  return { id: inserted?.id ?? null, trackingNumber: inserted?.tracking_number ?? null };
}

/** Update an item's status (non-shipped transitions). Throws on failure. */
export async function updateLostAndFoundStatus(id: string, status: LostAndFoundStatus): Promise<void> {
  const { error } = await supabase.from('lost_and_found_items').update({ status }).eq('id', id);
  if (error) throw error;
}

/**
 * Mark an item shipped with a location. Handles PostgREST schema-cache lag:
 * when `shipped_location` isn't known yet, falls back to a status-only update.
 * Returns the (possibly updated) availability flag so the caller can cache it.
 */
export async function setLostAndFoundShipped(
  id: string,
  location: string,
  shippedLocationColumnAvailable: boolean | null
): Promise<{ shippedLocationColumnAvailable: boolean }> {
  const statusOnly = async () => {
    const { error } = await supabase
      .from('lost_and_found_items')
      .update({ status: 'shipped' })
      .eq('id', id);
    if (error) throw error;
  };

  if (shippedLocationColumnAvailable === false) {
    await statusOnly();
    return { shippedLocationColumnAvailable: false };
  }

  const { error } = await supabase
    .from('lost_and_found_items')
    .update({ status: 'shipped', shipped_location: location })
    .eq('id', id);

  if (error && (error as any).code === 'PGRST204') {
    await statusOnly();
    return { shippedLocationColumnAvailable: false };
  }
  if (error) throw error;
  return { shippedLocationColumnAvailable: true };
}
