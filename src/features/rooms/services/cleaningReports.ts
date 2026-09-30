/**
 * Room reports: what was confirmed when a room was set Cleaned (the Clean
 * Checklist, Figma 1772-255) or Inspected (the Inspection Checklist, Figma
 * 2702-1025) — the ticks, optional photos and a note.
 *
 * One row per completed clean in `room_cleaning_reports` (migration
 * 20260929000700); photos in the `room-photos` bucket under <hotel>/<user>/,
 * the path its upload policy requires. The note is also added to the room's
 * notes, where the team already reads them.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { getMyHotelId } from '@/lib/tenant';
import { base64ToArrayBuffer } from '@/utils/encoding';
import { addRoomNote } from './rooms';

export const ROOM_PHOTOS_BUCKET = 'room-photos';
/** The table's limit on a note (a CHECK constraint). */
export const CLEANING_NOTE_MAX = 2000;

export type CleaningReport = {
  /** Which checklist filed it: the attendant's Clean or the supervisor's Inspection (20260930000200). */
  kind?: 'clean' | 'inspection';
  checklist: { id: string; label: string; checked: boolean }[];
  /** Trimmed; null when the attendant wrote nothing. */
  note: string | null;
  /** Photos as picked on the device, uploaded by `submitCleaningReport`. */
  photoUris: string[];
};

async function uploadRoomPhotos(hotelId: string, userId: string, localUris: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (const localUri of localUris) {
    // The picker can hand back a non-file URI; read a cached copy instead.
    let uri = localUri;
    if (!localUri.startsWith('file://')) {
      uri = `${FileSystem.cacheDirectory}room_photo_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: localUri, to: uri });
    }
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const path = `${hotelId}/${userId}/${Date.now()}_${Math.random().toString(16).slice(2)}.jpg`;
    const { error } = await supabase.storage
      .from(ROOM_PHOTOS_BUCKET)
      .upload(path, base64ToArrayBuffer(base64), { contentType: 'image/jpeg', upsert: false });
    if (error) throw new Error(error.message || 'A photo could not be uploaded.');
    const { data } = supabase.storage.from(ROOM_PHOTOS_BUCKET).getPublicUrl(path);
    if (data?.publicUrl) urls.push(data.publicUrl);
  }
  return urls;
}

/**
 * File the report for a room that has just been set Cleaned: upload the
 * photos, write the row, add the note to the room's notes.
 */
export async function submitCleaningReport(roomId: string, report: CleaningReport): Promise<void> {
  const [{ data: auth }, hotelId] = await Promise.all([supabase.auth.getSession(), getMyHotelId()]);
  const userId = auth?.session?.user?.id;
  if (!userId || !hotelId) throw new Error('You must be signed in to file a cleaning report.');

  const photoUrls = await uploadRoomPhotos(hotelId, userId, report.photoUris);
  const note = report.note?.trim().slice(0, CLEANING_NOTE_MAX) || null;

  const { error } = await supabase.from('room_cleaning_reports' as never).insert({
    hotel_id: hotelId,
    room_id: roomId,
    kind: report.kind ?? 'clean',
    user_id: userId,
    checklist: report.checklist,
    note,
    photo_urls: photoUrls,
  } as never);
  if (error) throw new Error(error.message || 'The cleaning report could not be saved.');

  if (note) await addRoomNote(roomId, note);
}
