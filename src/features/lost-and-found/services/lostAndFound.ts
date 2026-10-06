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

/**
 * The five areas the app hardcoded before `public_areas` existed.
 *
 * **A transitional shim, not a default.** `fetchPublicAreas` returns these only
 * when the table is absent — PostgREST `42P01` — which is true of any database
 * that has not yet run `20260921000000_public_areas.sql`. Without it, a
 * housekeeper on an un-migrated database could not register a public-area item
 * at all, and the repo's history says migrations here do get forgotten: the
 * `return_later_reason` column has been pending since 20260917.
 *
 * Delete this, and the `42P01` branch below, once the migration is applied
 * everywhere. It is greppable for exactly that reason.
 */
const PUBLIC_AREAS_PRE_MIGRATION_FALLBACK = [
  'Brasserie',
  'Gym',
  'Toilet',
  'Reception',
  'Elevator',
] as const;

/**
 * The hotel's public areas, in the order the picker should show them.
 *
 * Reads `public_areas` scoped to the caller's hotel and filtered to the active
 * rows. Inactive areas stay in the table so items already found there keep
 * resolving, but they stop being offered.
 */
export async function fetchPublicAreas(): Promise<string[]> {
  const hotelId = await getMyHotelId();

  const query = supabase
    .from('public_areas' as never)
    .select('name, sort_order')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  // Tenant scoping is enforced by RLS where it is configured; filtering here
  // too means a permissive policy cannot leak another hotel's areas.
  const { data, error } = hotelId
    ? await query.eq('hotel_id', hotelId)
    : await query;

  if (error) {
    /*
     * Two codes, because two layers can answer.
     *
     * `42P01` is Postgres's undefined_table, but PostgREST usually never gets
     * that far: it answers `PGRST205` ("could not find the table in the schema
     * cache") from its own cache first. Checking only the Postgres code looks
     * right and silently never fires — which is exactly what happened here
     * until the response body was actually read. The existing
     * `shipped_location` handling pairs `42703` with `PGRST204` for the same
     * reason.
     */
    const code = (error as { code?: string }).code;
    if (code === 'PGRST205' || code === '42P01') {
      if (__DEV__) {
        console.warn(
          '[lostAndFound] public_areas table is missing — using the pre-migration ' +
            'list. Apply supabase/migrations/20260921000000_public_areas.sql.'
        );
      }
      return [...PUBLIC_AREAS_PRE_MIGRATION_FALLBACK];
    }
    throw error;
  }

  return ((data ?? []) as { name: string }[])
    .map((row) => String(row.name ?? '').trim())
    .filter(Boolean);
}

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
  photo_urls,
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
  /**
   * Why the row was not saved, when it was not. The screen shows its success
   * sheet before the insert settles, so without this a rejected insert looked
   * exactly like a saved one — the item simply never appeared in the list.
   */
  error?: string;
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
  // `||`, not `??`: the form's blank value is '', which is not a user id.
  const registeredByIdFromForm: string | null = itemData.registeredBy || null;

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

  // Every picked photo, not just the first (the form always allowed several).
  const pickedUris: string[] = Array.isArray(itemData.pictures) && itemData.pictures.length > 0
    ? itemData.pictures.filter((u: unknown): u is string => typeof u === 'string' && !!u)
    : input.imageUri
      ? [input.imageUri]
      : [];
  const photoUrls = await uploadPhotos(hotelId, pickedUris);
  const imageUrl: string | null = photoUrls[0] ?? null;

  if (!userId) {
    console.warn('[lostAndFound] No authenticated user – item not persisted.');
    return { id: null, trackingNumber: null, error: 'You are not signed in.' };
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
      photo_urls: photoUrls,
      hotel_id: hotelId,
    })
    .select('id, tracking_number, image_url')
    .single();

  if (error) {
    console.warn('[lostAndFound] Failed to persist lost & found item', {
      selectedLocation,
      foundLocation,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { id: null, trackingNumber: null, error: error.message || 'The item could not be saved.' };
  }

  return { id: inserted?.id ?? null, trackingNumber: inserted?.tracking_number ?? null };
}

/**
 * Update an item's status (non-shipped transitions). Throws on failure.
 * Returns the room it was found in, if any, so that room's card can update.
 */
export async function updateLostAndFoundStatus(id: string, status: LostAndFoundStatus): Promise<string | null> {
  const { data, error } = await supabase
    .from('lost_and_found_items')
    .update({ status })
    .eq('id', id)
    .select('room_id')
    .maybeSingle();
  if (error) throw error;
  return data?.room_id ?? null;
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
): Promise<{ shippedLocationColumnAvailable: boolean; roomId: string | null }> {
  const statusOnly = async () => {
    const { data, error } = await supabase
      .from('lost_and_found_items')
      .update({ status: 'shipped' })
      .eq('id', id)
      .select('room_id')
      .maybeSingle();
    if (error) throw error;
    return data?.room_id ?? null;
  };

  if (shippedLocationColumnAvailable === false) {
    return { shippedLocationColumnAvailable: false, roomId: await statusOnly() };
  }

  const { data, error } = await supabase
    .from('lost_and_found_items')
    .update({ status: 'shipped', shipped_location: location })
    .eq('id', id)
    .select('room_id')
    .maybeSingle();

  if (error && (error as any).code === 'PGRST204') {
    return { shippedLocationColumnAvailable: false, roomId: await statusOnly() };
  }
  if (error) throw error;
  return { shippedLocationColumnAvailable: true, roomId: data?.room_id ?? null };
}


/** Upload photos in parallel; the ones that fail are left out, order kept. */
async function uploadPhotos(hotelId: string, uris: string[]): Promise<string[]> {
  const results = await Promise.all(
    uris.map((uri) =>
      uploadLostAndFoundImage(hotelId, uri).catch((e) => {
        console.warn('[lostAndFound] Unexpected error uploading image', e);
        return null;
      })
    )
  );
  return results.filter((u): u is string => !!u);
}

/** Upload freshly picked photos (file:// / ph:// URIs) for an existing item. */
export async function uploadLostAndFoundPhotos(uris: string[]): Promise<string[]> {
  if (uris.length === 0) return [];
  const hotelId = await getMyHotelId();
  if (!hotelId) throw new Error('No hotel assigned to this user.');
  const urls = await uploadPhotos(hotelId, uris);
  if (urls.length < uris.length) {
    throw new Error(
      urls.length === 0 ? 'The photos could not be uploaded.' : 'Some photos could not be uploaded.'
    );
  }
  return urls;
}

type PersonRef = { id: string; name: string; avatarUrl?: string };

/** One item, everything the detail screen shows. */
export type LostAndFoundItemDetail = {
  id: string;
  trackingNumber: string | null;
  itemName: string;
  description: string | null;
  status: LostAndFoundStatus;
  storageLocation: string | null;
  shippedLocation: string | null;
  foundAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  /** "Room 201", a public area's name, or "Public Area". */
  foundLocation: string;
  room: { id: string; number: string } | null;
  guest: { name: string; vipCode: string | null; imageUrl?: string; dates?: string } | null;
  /** Every photo, cover first. */
  photos: string[];
  foundBy: PersonRef | null;
  registeredBy: PersonRef | null;
};

const DETAIL_SELECT = `
  id, item_name, description, status, storage_location, shipped_location, found_at,
  created_at, updated_at, found_location, found_by_id, registered_by_id, tracking_number,
  image_url, photo_urls,
  rooms ( id, room_number, reservations ( arrival_date, departure_date, front_office_status,
    guests ( full_name, vip_code, image_url ) ) )
`;

/** One lost & found item by id, with its room, guest and people. Null if gone. */
export async function fetchLostAndFoundItemDetail(id: string): Promise<LostAndFoundItemDetail | null> {
  const { data, error } = await supabase.from('lost_and_found_items').select(DETAIL_SELECT).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message || 'Could not load the item.');
  if (!data) return null;
  const row = data as any;

  const people = await fetchRegisteredByUsers([row.found_by_id, row.registered_by_id].filter(Boolean));
  const person = (uid: string | null): PersonRef | null => {
    if (!uid) return null;
    const u = people.get(uid);
    return { id: uid, name: u?.full_name ?? 'Staff', avatarUrl: u?.avatar_url ?? undefined };
  };

  const room = row.rooms ?? null;
  const reservation = room?.reservations?.[0];
  const guestsRaw = reservation?.guests;
  const guests = Array.isArray(guestsRaw) ? guestsRaw : guestsRaw ? [guestsRaw] : [];
  const g = guests[0];
  const ddmm = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');

  const photos: string[] = (Array.isArray(row.photo_urls) && row.photo_urls.length > 0
    ? row.photo_urls
    : row.image_url
      ? [row.image_url]
      : []
  )
    .map((u: string) => getLostAndFoundPublicUrl(u))
    .filter((u: string | undefined): u is string => !!u);

  return {
    id: row.id,
    trackingNumber: row.tracking_number ?? null,
    itemName: row.item_name,
    description: row.description ?? null,
    status: (row.status as LostAndFoundStatus) ?? 'stored',
    storageLocation: row.storage_location ?? null,
    shippedLocation: row.shipped_location ?? null,
    foundAt: row.found_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    foundLocation: row.found_location ?? (room?.room_number ? `Room ${room.room_number}` : 'Public Area'),
    room: room ? { id: room.id, number: String(room.room_number) } : null,
    guest: g
      ? {
          name: g.full_name,
          vipCode: g.vip_code ?? null,
          imageUrl: g.image_url ?? undefined,
          dates: reservation ? `${ddmm(reservation.arrival_date)}-${ddmm(reservation.departure_date)}` : undefined,
        }
      : null,
    photos,
    foundBy: person(row.found_by_id),
    registeredBy: person(row.registered_by_id ?? row.found_by_id),
  };
}

export type LostAndFoundItemPatch = {
  itemName?: string;
  description?: string | null;
  storageLocation?: string | null;
  /** The full photo list, in order (cover first). */
  photoUrls?: string[];
};

/**
 * Edit an item. Needs `lost_and_found.manage` — the database refuses the
 * change otherwise (migration 20260928000100), and that message is thrown.
 */
export async function updateLostAndFoundItem(id: string, patch: LostAndFoundItemPatch): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.itemName !== undefined) payload.item_name = patch.itemName.trim();
  if (patch.description !== undefined) payload.description = patch.description?.trim() || null;
  if (patch.storageLocation !== undefined) payload.storage_location = patch.storageLocation?.trim() || null;
  if (patch.photoUrls !== undefined) payload.photo_urls = patch.photoUrls;
  if (Object.keys(payload).length === 0) return;
  const { error } = await supabase.from('lost_and_found_items').update(payload).eq('id', id);
  if (error) throw new Error(error.message || 'The item could not be saved.');
}

/** "…/object/public/lost-and-found/<path>" → "<path>", for Storage removal. */
function storagePath(url: string): string | null {
  const marker = `/object/public/${LOST_AND_FOUND_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at >= 0) return decodeURIComponent(url.slice(at + marker.length).split('?')[0]);
  return url.startsWith('http') ? null : url;
}

/** Remove photos from Storage. Best effort: a stray file is not worth failing a save. */
export async function removeLostAndFoundPhotos(urls: string[]): Promise<void> {
  const paths = urls.map(storagePath).filter((p): p is string => !!p);
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(LOST_AND_FOUND_BUCKET).remove(paths);
  if (error) console.warn('[lostAndFound] Could not remove photos from storage', error.message);
}

/**
 * Delete an item and its photos, permanently. Needs `lost_and_found.manage`:
 * without it the database deletes nothing, which is reported as an error
 * rather than passed off as success.
 */
export async function deleteLostAndFoundItem(id: string, photoUrls: string[]): Promise<void> {
  const { data, error } = await supabase.from('lost_and_found_items').delete().eq('id', id).select('id');
  if (error) throw new Error(error.message || 'The item could not be deleted.');
  if (!data || data.length === 0) throw new Error('Only a manager can delete a lost & found item.');
  await removeLostAndFoundPhotos(photoUrls);
}
