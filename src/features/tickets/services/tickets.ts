import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { TicketsScreenData, TicketData, TicketStatus } from '../types/tickets.types';
import { DEPARTMENT_NAME_TO_ICON } from '@/lib/departments';
import { getDepartmentIdByName } from '@features/account';
import * as FileSystem from 'expo-file-system/legacy';
import { base64ToArrayBuffer } from '@/utils/encoding';
import { notifyServer } from '@/lib/notifications';
import { getMyHotelId } from '@/lib/tenant';
import { buildFriendlyRoomHistoryMessage } from '@features/rooms';

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

type RoomHistoryRow = {
  event_id: string | null;
  attachments: unknown;
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

function extractImageUrlsFromAttachments(raw: unknown): string[] {
  if (!raw) return [];
  const pushUrl = (out: string[], v: unknown) => {
    if (typeof v === 'string' && v.trim()) out.push(v.trim());
  };

  const out: string[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === 'string') {
        pushUrl(out, item);
      } else if (item && typeof item === 'object') {
        const anyObj = item as any;
        pushUrl(out, anyObj.url);
        pushUrl(out, anyObj.uri);
        pushUrl(out, anyObj.publicUrl);
        pushUrl(out, anyObj.path);
      }
    }
  } else if (raw && typeof raw === 'object') {
    const anyObj = raw as any;
    if (Array.isArray(anyObj.images)) {
      for (const img of anyObj.images) pushUrl(out, img);
    }
    if (Array.isArray(anyObj.urls)) {
      for (const u of anyObj.urls) pushUrl(out, u);
    }
    pushUrl(out, anyObj.url);
  } else if (typeof raw === 'string') {
    pushUrl(out, raw);
  }

  // Keep likely image URLs only.
  return out.filter((u) => /^https?:\/\//i.test(u));
}

function mapRowToTicketData(
  row: TicketsRow,
  guestByRoomId: Map<string, { name: string; stayRange?: string; imageUrl?: string }>,
  imagesByTicketId: Map<string, string[]>,
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
  const iconConfig = departmentName ? DEPARTMENT_NAME_TO_ICON[departmentName] : undefined;
  const createdAtMs = new Date(row.created_at).getTime();
  const guest = row.room_id ? guestByRoomId.get(row.room_id) : undefined;
  const images = imagesByTicketId.get(row.id);
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
    images: images && images.length ? images : undefined,
    guest,
    category: departmentName,
    categoryIcon: iconConfig?.icon,
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
      [
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
        'departments(name)',
        'rooms (room_number)',
        'created_by:users!tickets_created_by_id_fkey (full_name, avatar_url, departments(name))',
        'assigned_to:users!tickets_assigned_to_id_fkey (full_name, avatar_url, departments(name))',
      ].join(', ')
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

  // Ticket attachments (images) stored in room_history.attachments for ticket events (when present).
  const ticketIds = rows.map((r) => r.id).filter(Boolean);
  const imagesByTicketId = new Map<string, string[]>();
  if (ticketIds.length > 0) {
    const { data: histData, error: histError } = await supabase
      .from('room_history')
      .select('event_id, attachments')
      .eq('event_type', 'ticket')
      .in('event_id', ticketIds);

    if (!histError && histData) {
      const histRows = histData as unknown as RoomHistoryRow[];
      for (const hr of histRows) {
        const id = hr?.event_id;
        if (!id) continue;
        const urls = extractImageUrlsFromAttachments(hr?.attachments);
        if (!urls.length) continue;
        imagesByTicketId.set(id, urls);
      }
    }
  }

  // Resolve guest info by room id (same approach as rooms service, but simplified to 1 guest).
  const roomIds = Array.from(
    new Set(rows.map((r) => r.room_id).filter((id): id is string => typeof id === 'string' && id.length > 0))
  );

  const guestByRoomId = new Map<string, { name: string; stayRange?: string; imageUrl?: string }>();
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

  const tickets: TicketData[] = rows.map((row) =>
    mapRowToTicketData(row, guestByRoomId, imagesByTicketId, nowMs, taggedTicketIds)
  );

  return {
    selectedTab: 'myTickets',
    tickets,
  };
}

export async function getLatestTicketForRoom(roomId: string): Promise<TicketData | null> {
  if (!isSupabaseConfigured || !roomId) return null;

  const { data, error } = await supabase
    .from('tickets')
    .select(
      [
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
        'departments(name)',
        'rooms (room_number)',
        'created_by:users!tickets_created_by_id_fkey (full_name, avatar_url, departments(name))',
        'assigned_to:users!tickets_assigned_to_id_fkey (full_name, avatar_url, departments(name))',
      ].join(', ')
    )
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  // For the single-room call, we can skip guest hydration for now.
  return mapRowToTicketData(data as unknown as TicketsRow, new Map(), new Map(), Date.now(), new Set());
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
  const taggedOtherUsers = taggedIds.filter((id) => id !== userId);
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
    } else if (taggedOtherUsers.length > 0) {
      notifyServer({ type: 'ticket_tag', ticketId, taggedUserIds: taggedOtherUsers }).catch(() => {});
    }
  }

  const pictures = (input.pictures ?? []).filter(Boolean);

  // Upload pictures first (if any), then log a *single* room_history event for this ticket creation.
  // Ticket creation + adding photos is one user action.
  let attachmentUrls: string[] = [];
  if (ticketId && roomId && pictures.length > 0) {
    try {
      attachmentUrls = await uploadTicketImages(userId, pictures);
    } catch (e) {
      // Ticket row is already saved; do not fail the whole flow if Storage/network aborts.
      console.warn('[tickets.createTicket] Image upload failed (ticket still created)', e);
    }
  }

  if (ticketId && roomId) {
    // Keep writing to room_history for ticket attachments hydration in Tickets UI.
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

