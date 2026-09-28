import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { TicketsScreenData, TicketData, TicketStatus } from '../types/tickets.types';
import { getDepartmentIdByName } from '@features/account/services/user';
import * as FileSystem from 'expo-file-system/legacy';
import { base64ToArrayBuffer } from '@/utils/encoding';
import { getMyHotelId } from '@/lib/tenant';
import { buildFriendlyRoomHistoryMessage } from '@features/rooms/services/roomHistory';

type TicketsRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  room_id: string | null;
  type: string | null;
  assigned_to_id: string | null;
  created_by_id: string;
  created_at: string;
  due_at?: string | null;
  photo_urls?: string[] | null;
  rooms?: {
    room_number: string;
  } | null;
  created_by?: {
    full_name: string | null;
    avatar_url: string | null;
    departments?: { name: string | null } | null;
  } | null;
  assigned_to?: {
    full_name: string | null;
    avatar_url: string | null;
    departments?: { name: string | null } | null;
  } | null;
  departments?: {
    name: string | null;
  } | null;
};

/** The columns every ticket list reads. */
const TICKET_SELECT = [
  'id',
  'title',
  'description',
  'status',
  'priority',
  'room_id',
  'type',
  'assigned_to_id',
  'created_by_id',
  'created_at',
  'due_at',
  'photo_urls',
  'departments(name)',
  'rooms (room_number)',
  'created_by:users!tickets_created_by_id_fkey (full_name, avatar_url, departments(name))',
  'assigned_to:users!tickets_assigned_to_id_fkey (full_name, avatar_url, departments(name))',
].join(', ');

type ReservationRow = {
  id: string;
  room_id: string;
  arrival_date: string;
  departure_date: string;
};

type ReservationGuestRow = {
  reservation_id: string;
  guests: { full_name: string | null; image_url: string | null } | null;
} | null;

function formatStayRange(arrivalDate: string, departureDate: string): string | undefined {
  const from = new Date(arrivalDate);
  const to = new Date(departureDate);
  // dates from Supabase are YYYY-MM-DD; Date parsing may shift in TZ, so parse manually when possible
  const parseIsoDate = (iso: string) => {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  };
  const fromIso = parseIsoDate(arrivalDate);
  const toIso = parseIsoDate(departureDate);
  const pad2 = (n: number) => String(n).padStart(2, '0');

  if (fromIso && toIso) {
    return `${pad2(fromIso.d)}/${pad2(fromIso.m)}-${pad2(toIso.d)}/${pad2(toIso.m)}`;
  }
  if (Number.isFinite(from.getTime()) && Number.isFinite(to.getTime())) {
    return `${pad2(from.getDate())}/${pad2(from.getMonth() + 1)}-${pad2(to.getDate())}/${pad2(to.getMonth() + 1)}`;
  }
  return undefined;
}

type TicketGuest = { name: string; stayRange?: string; imageUrl?: string };

/**
 * The guest of each room's latest reservation (same approach as the rooms
 * service, simplified to one guest per room).
 */
async function fetchGuestsByRoomId(roomIdsIn: string[]): Promise<Map<string, TicketGuest>> {
  const roomIds = Array.from(new Set(roomIdsIn));

  const guestByRoomId = new Map<string, TicketGuest>();
  if (roomIds.length > 0) {
    const { data: resData, error: resError } = await supabase
      .from('reservations')
      .select('id, room_id, arrival_date, departure_date')
      .in('room_id', roomIds)
      .order('arrival_date', { ascending: false });

    if (!resError && resData) {
      const reservations = resData as unknown as ReservationRow[];

      // Pick latest reservation per room.
      const latestResByRoom = new Map<string, ReservationRow>();
      for (const res of reservations) {
        if (!latestResByRoom.has(res.room_id)) latestResByRoom.set(res.room_id, res);
      }

      const reservationIds = Array.from(new Set(Array.from(latestResByRoom.values()).map((r) => r.id)));
      let guestsByReservationId = new Map<string, { name: string; imageUrl?: string }>();

      if (reservationIds.length > 0) {
        const { data: rgData, error: rgError } = await supabase
          .from('reservation_guests')
          .select('reservation_id, guests(full_name, image_url)')
          .in('reservation_id', reservationIds);

        if (!rgError && rgData) {
          const rows = rgData as unknown as ReservationGuestRow[];
          for (const rg of rows) {
            if (!rg) continue;
            if (guestsByReservationId.has(rg.reservation_id)) continue; // first guest wins
            const name = rg.guests?.full_name ?? null;
            if (!name) continue;
            guestsByReservationId.set(rg.reservation_id, {
              name,
              imageUrl: rg.guests?.image_url ?? undefined,
            });
          }
        }
      }

      for (const [roomId, res] of latestResByRoom.entries()) {
        const g = guestsByReservationId.get(res.id);
        if (!g) continue;
        guestByRoomId.set(roomId, {
          name: g.name,
          imageUrl: g.imageUrl,
          stayRange: formatStayRange(res.arrival_date, res.departure_date),
        });
      }
    }
  }
  return guestByRoomId;
}

function mapRowToTicketData(
  row: TicketsRow,
  guestByRoomId: Map<string, { name: string; stayRange?: string; imageUrl?: string }>,
  nowMs = Date.now(),
  taggedTicketIds: Set<string> = new Set()
): TicketData {
  const formatElapsed = (elapsedMinutes: number) => {
    if (!Number.isFinite(elapsedMinutes)) return undefined;
    const totalMins = Math.max(0, Math.floor(elapsedMinutes));
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours <= 0) return mins === 1 ? '1 min' : `${mins} mins`;
    return `${hours} hrs ${mins} mins`;
  };

  const status = mapStatus(row.status);
  const departmentName = row.departments?.name ?? row.type ?? undefined;
  const createdAtMs = new Date(row.created_at).getTime();
  const guest = row.room_id ? guestByRoomId.get(row.room_id) : undefined;
  const images = row.photo_urls ?? [];
  const dueAtIso = row.due_at ?? null;
  const priority = row.priority as 'urgent' | 'medium' | 'notUrgent' | null | undefined;

  /** Relative “mins” line is superseded by calendar due line on the card when `due_at` is set. */
  const dueTimeDisplay =
    (status === 'unsolved' || status === 'ofo') && !dueAtIso && Number.isFinite(createdAtMs)
      ? formatElapsed((nowMs - createdAtMs) / 60000)
      : undefined;

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    roomNumber: row.room_id ? (row.rooms?.room_number ?? '—') : '',
    images: images.length ? images : undefined,
    guest,
    category: departmentName,
    status,
    createdAt: row.created_at,
    dueAt: dueAtIso,
    locationText: row.room_id ? `Room ${row.rooms?.room_number ?? '—'}` : (row.type ?? 'Public Area'),
    dueTime: dueTimeDisplay,
    createdBy: {
      name: row.created_by?.full_name ?? 'Staff',
      avatar: row.created_by?.avatar_url ?? undefined,
      departmentName: row.created_by?.departments?.name ?? undefined,
    },
    assignedTo:
      row.assigned_to?.full_name
        ? {
            name: row.assigned_to.full_name,
            avatar: row.assigned_to.avatar_url ?? undefined,
            departmentName: row.assigned_to.departments?.name ?? undefined,
          }
        : undefined,
    assignedToId: row.assigned_to_id,
    createdById: row.created_by_id,
    viewerIsTagged: taggedTicketIds.has(row.id),
    priority: priority ?? undefined,
  };
}

function mapStatus(raw: string | null | undefined): TicketStatus {
  const value = (raw ?? '').toLowerCase();
  if (value === 'done' || value === 'closed' || value === 'resolved') {
    return 'done';
  }
  if (value === 'ofo' || value === 'out_of_order' || value === 'oof' || value === 'oft') {
    return 'ofo';
  }
  return 'unsolved';
}

export async function getTicketsData(): Promise<TicketsScreenData> {
  if (!isSupabaseConfigured) {
    return { selectedTab: 'myTickets', tickets: [] };
  }

  const { data, error } = await supabase
    .from('tickets')
    .select(
      TICKET_SELECT
    )
    .order('created_at', { ascending: false });

  if (error || !data) {
    // On failure, surface an empty, non-crashing state
    console.warn('[tickets.getTicketsData] Failed to fetch tickets from Supabase:', error);
    return { selectedTab: 'myTickets', tickets: [] };
  }

  const rows = data as unknown as TicketsRow[];
  const nowMs = Date.now();

  const { data: sessionData } = await supabase.auth.getSession();
  const viewerId = sessionData?.session?.user?.id ?? null;
  const taggedTicketIds = new Set<string>();
  if (viewerId) {
    const { data: tagRows, error: tagErr } = await supabase
      .from('ticket_tags')
      .select('ticket_id')
      .eq('tagged_user_id', viewerId);
    if (!tagErr && tagRows) {
      for (const tr of tagRows as { ticket_id?: string }[]) {
        if (tr.ticket_id) taggedTicketIds.add(tr.ticket_id);
      }
    }
  }

  const guestByRoomId = await fetchGuestsByRoomId(
    rows.map((r) => r.room_id).filter((id): id is string => typeof id === 'string' && id.length > 0)
  );

  const tickets: TicketData[] = rows.map((row) =>
    mapRowToTicketData(row, guestByRoomId, nowMs, taggedTicketIds)
  );

  return {
    selectedTab: 'myTickets',
    tickets,
  };
}

/**
 * The room's unresolved tickets, newest first.
 *
 * "Unresolved" is everything `mapStatus` does not fold into `'done'`, so an
 * Out-of-Order ticket counts: it is an open problem, not a closed one. The
 * filter is on the raw column rather than the mapped status because the
 * mapping happens client-side — `done`, `closed` and `resolved` all mean
 * resolved, and only `done` is currently written by this app.
 *
 * Replaced `getLatestTicketForRoom`, which returned a single row of *any*
 * status: a room whose last action was closing a ticket showed that closed
 * ticket as its "current" one, and a room with three open tickets showed one.
 */
export async function getOpenTicketsForRoom(roomId: string): Promise<TicketData[]> {
  if (!isSupabaseConfigured || !roomId) return [];

  const { data, error } = await supabase
    .from('tickets')
    .select(
      TICKET_SELECT
    )
    .eq('room_id', roomId)
    .not('status', 'in', '("done","closed","resolved")')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const now = Date.now();
  // Guest hydration is skipped here, as it was for the single-room call: the
  // card in this slot shows the ticket, not the guest.
  return (data as unknown as TicketsRow[]).map((row) =>
    mapRowToTicketData(row, new Map(), now, new Set())
  );
}

export type CreateTicketInput = {
  title: string;
  description?: string | null;
  roomId?: string | null;
  locationType?: 'room' | 'publicArea';
  publicAreaName?: string | null;
  /** Preferred: DB department UUID (public.departments.id). */
  departmentId?: string | null;
  departmentName?: string | null;
  priority?: string | null;
  assignedToId?: string | null;
  /** Users tagged on this ticket (multi-select). */
  taggedStaffIds?: string[];
  pictures?: string[]; // local file:// URIs
};

export const TICKET_ATTACHMENTS_BUCKET = 'ticket-attachments';

async function uploadTicketImages(
  userId: string,
  localUris: string[]
): Promise<string[]> {
  const urls: string[] = [];
  const hotelId = await getMyHotelId();
  if (!hotelId) throw new Error('No hotel assigned to this user.');
  for (const localUri of localUris) {
    if (!localUri) continue;
    // Ensure we can read the file (copy to cache if needed)
    let uriToRead = localUri;
    if (!localUri.startsWith('file://')) {
      const tempPath = `${FileSystem.cacheDirectory}ticket_upload_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: localUri, to: tempPath });
      uriToRead = tempPath;
    }

    const base64 = await FileSystem.readAsStringAsync(uriToRead, { encoding: FileSystem.EncodingType.Base64 });
    const arrayBuffer = base64ToArrayBuffer(base64);
    const path = `${hotelId}/${userId}/${Date.now()}_${Math.random().toString(16).slice(2)}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(TICKET_ATTACHMENTS_BUCKET)
      .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from(TICKET_ATTACHMENTS_BUCKET).getPublicUrl(path);
    if (urlData?.publicUrl) urls.push(urlData.publicUrl);
  }
  return urls;
}

export async function createTicket(input: CreateTicketInput): Promise<void> {
  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    throw new Error('Ticket title is required');
  }

  if (!isSupabaseConfigured) {
    console.warn('[tickets.createTicket] Supabase is not configured – skipping ticket creation.');
    return;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }
  const userId = sessionData?.session?.user?.id;
  if (!userId) {
    throw new Error('You must be signed in to create a ticket');
  }

  const payload = {
    title: trimmedTitle,
    description: input.description?.trim() || null,
    status: 'unsolved',
    priority: input.priority ?? null,
    room_id: input.locationType === 'publicArea' ? null : (input.roomId ?? null),
    created_by_id: userId,
    assigned_to_id: input.assignedToId ?? null,
    type:
      input.locationType === 'publicArea'
        ? (input.publicAreaName ?? null)
        : null,
    department_id: input.departmentId
      ? input.departmentId
      : (input.departmentName ? await getDepartmentIdByName(input.departmentName) : null),
  };

  const hotelId = await getMyHotelId();
  if (!hotelId) throw new Error('Missing hotel context');

  const { data: inserted, error } = await supabase
    .from('tickets')
    .insert({ ...payload, hotel_id: hotelId })
    .select('id, room_id')
    .single();
  if (error) throw error;

  const ticketId = (inserted as any)?.id as string | undefined;
  const roomId = (inserted as any)?.room_id as string | null | undefined;

  // Persist ticket tags (multi-tag staff) and notify tagged staff.
  const taggedIds = Array.from(new Set((input.taggedStaffIds ?? []).filter(Boolean)));
  if (ticketId && taggedIds.length > 0) {
    const { error: tagErr } = await supabase.from('ticket_tags').insert(
      taggedIds.map((tagged_user_id) => ({
        ticket_id: ticketId,
        tagged_user_id,
        tagged_by_id: userId,
        hotel_id: hotelId,
      }))
    );
    if (tagErr) {
      // Non-blocking: ticket is created; tags can fail if migration not applied yet.
      console.warn('[tickets.createTicket] Failed to save ticket tags', tagErr.message, tagErr.code);
    }
    // Tagged staff are notified by a database trigger on ticket_tags
    // (20260925000100_task_notifications.sql).
  }

  const pictures = (input.pictures ?? []).filter(Boolean);

  // Photos go on the ticket itself, for room and public-area tickets alike.
  // The ticket row is already saved, so a failed upload does not fail the flow.
  let attachmentUrls: string[] = [];
  if (ticketId && pictures.length > 0) {
    try {
      attachmentUrls = await uploadTicketImages(userId, pictures);
      if (attachmentUrls.length > 0) {
        const { error: photoErr } = await supabase
          .from('tickets')
          .update({ photo_urls: attachmentUrls } as never)
          .eq('id', ticketId);
        if (photoErr) console.warn('[tickets.createTicket] Could not save photos', photoErr.message);
      }
    } catch (e) {
      console.warn('[tickets.createTicket] Image upload failed (ticket still created)', e);
    }
  }

  if (ticketId && roomId) {
    // The room's history entry for the ticket (photos included, for the record).
    // The user-facing Room Detail history comes from activity_logs via DB triggers.
    const { error: histError } = await supabase.from('room_history').insert({
      room_id: roomId,
      user_id: userId,
      event_type: 'ticket',
      event_id: ticketId,
      description: buildFriendlyRoomHistoryMessage({ type: 'ticket', ticketTitle: trimmedTitle }),
      attachments: attachmentUrls.length > 0 ? attachmentUrls : [],
      hotel_id: hotelId,
    });
    if (histError) {
      console.warn('[tickets.createTicket] Failed to persist room_history', histError.message, histError.code);
    }
  }
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('tickets')
    .update({ status })
    .eq('id', ticketId);

  if (error) {
    throw error;
  }
}

export async function updateTicketPriority(ticketId: string, priority: 'urgent' | 'medium' | 'notUrgent'): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('tickets').update({ priority }).eq('id', ticketId);
  if (error) throw error;
}

export async function updateTicketAssignee(ticketId: string, assignedToId: string | null): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('tickets').update({ assigned_to_id: assignedToId }).eq('id', ticketId);
  if (error) throw error;
}

/** Persist due time from Change Status modal (nullable clears). */
export async function updateTicketDueAt(ticketId: string, dueAtIso: string | null): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('tickets').update({ due_at: dueAtIso } as any).eq('id', ticketId);
  if (error) throw error;
}


// ---------------------------------------------------------------------------
// Ticket detail, edit and delete
// ---------------------------------------------------------------------------

export type TicketPerson = { id: string; name: string; avatarUrl?: string; departmentName?: string };

/** Everything the ticket detail screen shows. */
export type TicketDetail = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: 'urgent' | 'medium' | 'notUrgent' | null;
  photos: string[];
  room: { id: string; number: string } | null;
  /** "Room 203", or the public area's name. */
  locationText: string;
  departmentName: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  resolvedAt: string | null;
  createdBy: TicketPerson | null;
  assignedTo: TicketPerson | null;
  tagged: TicketPerson[];
  guest?: TicketGuest;
};

type TicketDetailRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  type: string | null;
  room_id: string | null;
  photo_urls: string[] | null;
  due_at: string | null;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
  created_by_id: string;
  assigned_to_id: string | null;
  departments: { name: string | null } | null;
  rooms: { room_number: string } | null;
  created_by: { full_name: string | null; avatar_url: string | null; departments?: { name: string | null } | null } | null;
  assigned_to: { full_name: string | null; avatar_url: string | null; departments?: { name: string | null } | null } | null;
};

function person(
  id: string | null,
  row: { full_name: string | null; avatar_url: string | null; departments?: { name: string | null } | null } | null
): TicketPerson | null {
  if (!id || !row?.full_name) return null;
  return {
    id,
    name: row.full_name,
    avatarUrl: row.avatar_url ?? undefined,
    departmentName: row.departments?.name ?? undefined,
  };
}

/** One ticket, or null when it no longer exists (deleted, or not this hotel's). */
export async function fetchTicketDetail(id: string): Promise<TicketDetail | null> {
  if (!isSupabaseConfigured || !id) return null;
  const { data, error } = await supabase
    .from('tickets')
    .select(
      [
        'id',
        'title',
        'description',
        'status',
        'priority',
        'type',
        'room_id',
        'photo_urls',
        'due_at',
        'created_at',
        'updated_at',
        'resolved_at',
        'created_by_id',
        'assigned_to_id',
        'departments(name)',
        'rooms (room_number)',
        'created_by:users!tickets_created_by_id_fkey (full_name, avatar_url, departments(name))',
        'assigned_to:users!tickets_assigned_to_id_fkey (full_name, avatar_url, departments(name))',
      ].join(', ')
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message || 'The ticket could not be loaded.');
  if (!data) return null;
  const row = data as unknown as TicketDetailRow;

  // Tagged staff: ticket_tags points at auth.users, so the names are a second read.
  const tagged: TicketPerson[] = [];
  const { data: tagRows } = await supabase.from('ticket_tags').select('tagged_user_id').eq('ticket_id', id);
  const taggedIds = ((tagRows ?? []) as { tagged_user_id: string }[]).map((t) => t.tagged_user_id).filter(Boolean);
  if (taggedIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, avatar_url, departments(name)')
      .in('id', taggedIds);
    for (const u of (users ?? []) as unknown as ({ id: string } & NonNullable<TicketDetailRow['created_by']>)[]) {
      const p = person(u.id, u);
      if (p) tagged.push(p);
    }
  }

  const guests = row.room_id ? await fetchGuestsByRoomId([row.room_id]) : new Map<string, TicketGuest>();
  const roomNumber = row.rooms?.room_number ?? '—';

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    status: mapStatus(row.status),
    priority: (row.priority as TicketDetail['priority']) ?? null,
    photos: row.photo_urls ?? [],
    room: row.room_id ? { id: row.room_id, number: roomNumber } : null,
    locationText: row.room_id ? `Room ${roomNumber}` : (row.type ?? 'Public Area'),
    departmentName: row.departments?.name ?? null,
    dueAt: row.due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    createdBy: person(row.created_by_id, row.created_by),
    assignedTo: person(row.assigned_to_id, row.assigned_to),
    tagged,
    guest: row.room_id ? guests.get(row.room_id) : undefined,
  };
}

/** Upload photos picked on the device; returns their public URLs, in order. */
export async function uploadTicketPhotos(localUris: string[]): Promise<string[]> {
  if (localUris.length === 0) return [];
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) throw new Error('You must be signed in to add photos.');
  return uploadTicketImages(userId, localUris);
}

export type TicketDetailsPatch = {
  title?: string;
  description?: string | null;
  priority?: 'urgent' | 'medium' | 'notUrgent' | null;
  photoUrls?: string[];
};

/**
 * Save a ticket's details. Title, description and photos need the ticket's
 * author or `tickets.manage` — the database refuses anyone else.
 */
export async function updateTicketDetails(id: string, patch: TicketDetailsPatch): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title.trim();
  if (patch.description !== undefined) payload.description = patch.description?.trim() || null;
  if (patch.priority !== undefined) payload.priority = patch.priority;
  if (patch.photoUrls !== undefined) payload.photo_urls = patch.photoUrls;
  if (Object.keys(payload).length === 0) return;
  const { error } = await supabase.from('tickets').update(payload as never).eq('id', id);
  if (error) throw new Error(error.message || 'The ticket could not be saved.');
}

/** "…/object/public/ticket-attachments/<path>" → "<path>", for Storage removal. */
function ticketStoragePath(url: string): string | null {
  const marker = `/object/public/${TICKET_ATTACHMENTS_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at >= 0) return decodeURIComponent(url.slice(at + marker.length).split('?')[0]);
  return null;
}

/** Remove photos from Storage. Best effort: a stray file is not worth failing a save. */
export async function removeTicketPhotos(urls: string[]): Promise<void> {
  const paths = urls.map(ticketStoragePath).filter((p): p is string => !!p);
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(TICKET_ATTACHMENTS_BUCKET).remove(paths);
  if (error) console.warn('[tickets] Could not remove photos from storage', error.message);
}

/**
 * Delete a ticket and its photos, permanently. Needs `tickets.manage`: without
 * it the database deletes nothing, which is reported rather than passed off
 * as success.
 */
export async function deleteTicket(id: string, photoUrls: string[]): Promise<void> {
  const { data, error } = await supabase.from('tickets').delete().eq('id', id).select('id');
  if (error) throw new Error(error.message || 'The ticket could not be deleted.');
  if (!data || data.length === 0) throw new Error('Only a manager can delete a ticket.');
  await removeTicketPhotos(photoUrls);
}
