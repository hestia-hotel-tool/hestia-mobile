/**
 * Rooms service (Supabase)
 * Fetches rooms with reservations and guests; updates room state.
 */

import { supabase } from '@shared/lib/supabase';
import { invalidateNotificationBadges } from '@shared/lib/inAppNotifications';
import { notifyServer } from '@shared/lib/notifications';
import { getMyHotelId } from '@shared/lib/tenant';
import type {
  AllRoomsScreenData,
  RoomCardData,
  GuestInfo,
  StaffInfo,
  FrontOfficeStatus,
  RoomStatus,
  ReservationStatus,
  PromisedTime,
  NoteMadeBy,
} from '../types/allRooms.types';

type RoomRow = {
  id: string;
  room_number: string;
  category: string | null;
  credit: number | null;
  linen_status: string | null;
  priority: string | null;
  flagged: boolean | null;
  special_instructions: string | null;
  house_keeping_status: string | null;
  return_later_at?: string | null;
  paused_at?: string | null;
  refuse_service_at?: string | null;
  refuse_service_reason?: string | null;
};

/** Aggregated note info per room (from room_notes table) */
type RoomNotesAggregate = {
  count: number;
  lastNoteBy: { name: string; avatar?: string } | null;
};

type ReservationRow = {
  id: string;
  room_id: string;
  arrival_date: string;
  departure_date: string;
  eta: string | null;
  adults: number | null;
  kids: number | null;
  reservation_status: string | null;
  front_office_status: string | null;
  promised_time?: string | null;
};

type GuestRow = {
  id: string;
  full_name: string;
  vip_code: string | null;
  image_url: string | null;
};

type ReservationGuestRow = {
  reservation_id: string;
  guest_id: string;
  guest_order?: number | null;
  reservations?: ReservationRow | null;
  guests?: GuestRow | null;
};

/** Shift row from Supabase */
type ShiftRow = { id: string; name: string; start_time: string; end_time: string };
/** Room assignment row with user info */
type RoomAssignmentRow = {
  room_id: string;
  user_id: string;
  shift_id: string;
  work_status: string | null;
  users: { full_name: string; avatar_url: string | null } | null;
};

const DEFAULT_STAFF: StaffInfo = {
  initials: 'N/A',
  name: 'Not Assigned',
  statusText: 'Not Started',
  statusColor: '#1e1e1e',
};

/** Map `room_assignments.work_status` + user row to `StaffInfo` (incl. paused). */
function staffInfoFromAssignment(row: {
  user_id?: string | null;
  work_status: string | null;
  users: { full_name: string; avatar_url: string | null } | null;
}): StaffInfo {
  const name = row.users?.full_name ?? 'Staff';
  const initials =
    name
      .split(/\s+/)
      .map((s) => s[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';
  const avatar = row.users?.avatar_url ?? undefined;
  const userId = row.user_id ?? undefined;
  const ws = (row.work_status ?? '').toLowerCase();
  if (ws === 'in_progress') {
    return {
      name,
      initials,
      avatar,
      userId,
      statusText: 'In Progress',
      statusColor: '#F0BE1B',
      assignmentWorkStatus: 'in_progress',
    };
  }
  if (ws === 'completed') {
    return {
      name,
      initials,
      avatar,
      userId,
      statusText: 'Finished',
      statusColor: '#41d541',
      assignmentWorkStatus: 'completed',
    };
  }
  if (ws === 'paused') {
    return {
      name,
      initials,
      avatar,
      userId,
      statusText: 'Paused',
      statusColor: '#F0BE1B',
      assignmentWorkStatus: 'paused',
    };
  }
  return {
    name,
    initials,
    avatar,
    userId,
    statusText: 'Not Started',
    statusColor: '#1e1e1e',
    assignmentWorkStatus: null,
  };
}

/**
 * Fetch shift id by name (e.g. 'AM', 'PM'). Returns first matching shift, or first shift in table as fallback, or null.
 */
async function getShiftIdByName(shiftName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('shifts')
    .select('id')
    .ilike('name', shiftName)
    .limit(1)
    .maybeSingle();
  if (!error && data) return (data as { id: string }).id;
  // Fallback: use first available shift so assignment can still be saved
  const { data: first } = await supabase.from('shifts').select('id').limit(1).maybeSingle();
  return first ? (first as { id: string }).id : null;
}

/**
 * Fetch room assignments for a shift and map room_id -> StaffInfo.
 * Returns a Map; rooms not in the map have no assignment (null).
 */
async function fetchRoomAssignmentsForShift(shift: 'AM' | 'PM'): Promise<Map<string, StaffInfo>> {
  const map = new Map<string, StaffInfo>();
  const shiftId = await getShiftIdByName(shift);
  if (!shiftId) return map;

  const { data, error } = await supabase
    .from('room_assignments')
    .select('room_id, user_id, work_status, users(full_name, avatar_url)')
    .eq('shift_id', shiftId);

  if (error) return map;

  const rows = (data ?? []) as RoomAssignmentRow[];
  for (const row of rows) {
    map.set(row.room_id, staffInfoFromAssignment(row));
  }
  return map;
}

function safeStatus<T extends string>(value: string | null | undefined, allowed: readonly T[]): T {
  if (value && allowed.includes(value as T)) return value as T;
  return allowed[0] as T;
}

/** Canonical house_keeping_status values for display (RoomStatus). */
const HOUSE_KEEPING_CANONICAL: Record<string, import('../types/allRooms.types').RoomStatus> = {
  dirty: 'Dirty',
  inprogress: 'InProgress',
  'in progress': 'InProgress',
  in_progress: 'InProgress',
  cleaned: 'Cleaned',
  inspected: 'Inspected',
};

/** Normalize DB house_keeping_status so room detail and cards display correctly (case-insensitive, snake_case). */
function normalizeHouseKeepingStatus(value: string | null | undefined): import('../types/allRooms.types').RoomStatus {
  const key = (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!key) return 'Dirty';
  return HOUSE_KEEPING_CANONICAL[key] ?? 'Dirty';
}

const FRONT_OFFICE_CANONICAL: Record<string, FrontOfficeStatus> = {
  'arrival/departure': 'Arrival/Departure',
  'arrival': 'Arrival',
  'departure': 'Departure',
  'stayover': 'Stayover',
  'turndown': 'Turndown',
  'no task': 'No Task',
  'refresh': 'Refresh',
};

/** Normalize DB front_office_status (trim, case-insensitive) so cards get correct layout. */
function normalizeFrontOfficeStatus(value: string | null | undefined): FrontOfficeStatus {
  const key = (value ?? '').trim().toLowerCase();
  if (key && FRONT_OFFICE_CANONICAL[key]) return FRONT_OFFICE_CANONICAL[key];
  return 'Stayover';
}

function mapToGuestInfo(
  res: ReservationRow,
  guest: GuestRow | null,
  index: number,
  roomId: string
): GuestInfo {
  const name = guest?.full_name ?? 'Guest';
  const from = res.arrival_date ?? '';
  const to = res.departure_date ?? '';
  // Some hotels encode "Arrival/Departure" as a single reservation with 2 guests:
  // guest[0] = arrival, guest[1] = departure. Ensure those render as distinct.
  const normalizedFrontOffice = normalizeFrontOfficeStatus(res.front_office_status);
  const isArrivalDeparture = normalizedFrontOffice === 'Arrival/Departure';
  const isArrival = normalizedFrontOffice === 'Arrival';
  const isDeparture = normalizedFrontOffice === 'Departure';
  const time =
    res.eta && String(res.eta).trim()
      ? String(res.eta).trim()
      : 'N/A';
  const timeLabel =
    isArrivalDeparture
      ? (index === 1 ? 'EDT' : 'ETA')
      : isDeparture
        ? 'EDT'
        : isArrival
          ? 'ETA'
          : (res.eta ? 'ETA' : (res.departure_date ? 'EDT' : 'N/A'));
  const isVacant = (res.reservation_status ?? '').toLowerCase() === 'vacant';
  return {
    name,
    datesOfStay: { from, to },
    time: time === 'N/A' || !time ? 'N/A' : time,
    timeLabel: timeLabel as 'ETA' | 'EDT' | 'N/A',
    guestCount: { adults: res.adults ?? 0, kids: res.kids ?? 0 },
    vipCode: guest?.vip_code != null ? parseInt(String(guest.vip_code), 10) : undefined,
    arrivalDate: res.arrival_date,
    // Ensure every guest has an image on cards (fallback to deterministic placeholder).
    imageUrl: guest?.image_url ?? `https://i.pravatar.cc/96?u=${guest?.id ?? `${roomId}-${index}`}`,
    isVacant: isVacant || undefined,
  };
}

function mapRoomToCard(
  room: RoomRow,
  reservations: Array<{ res: ReservationRow; guest: GuestRow | null }>,
  attendant: StaffInfo | null,
  notesAgg: RoomNotesAggregate | null
): RoomCardData {
  const firstRes = reservations[0]?.res;
  const rawFrontOffice = firstRes?.front_office_status ?? 'Stayover';
  const reservationStatus = firstRes?.reservation_status ?? 'Occupied';
  const promisedTime = firstRes?.promised_time ?? null;

  const guests: GuestInfo[] = reservations.map(({ res, guest }, i) =>
    mapToGuestInfo(res, guest, i, room.id)
  );
  if (guests.length === 0) {
    guests.push({
      name: 'Guest',
      datesOfStay: { from: '', to: '' },
      time: 'N/A',
      timeLabel: 'N/A',
      guestCount: { adults: 0, kids: 0 },
      imageUrl: `https://i.pravatar.cc/96?u=${room.id}-0`,
    });
  }

  // Normalize so DB values (e.g. "No task", "Stayover") get correct card layout
  let frontOfficeStatus = normalizeFrontOfficeStatus(rawFrontOffice);
  if (reservations.length >= 2) {
    frontOfficeStatus = 'Arrival/Departure';
  }
  const guestsForCard = (() => {
    if (frontOfficeStatus !== 'Arrival/Departure') return guests.slice(0, 1);
    const arrival = guests.find((g) => g.timeLabel === 'ETA') ?? guests[0];
    const departure =
      guests.find((g) => g.timeLabel === 'EDT' && g !== arrival) ??
      guests.find((g) => g !== arrival) ??
      guests[1] ??
      guests[0];
    const ordered = [arrival, departure].filter(Boolean) as GuestInfo[];
    // Ensure max 2 and avoid duplicates
    return Array.from(new Set(ordered)).slice(0, 2);
  })();

  const noteCount = notesAgg?.count ?? 0;
  return {
    id: room.id,
    roomNumber: String(room.room_number ?? ''),
    roomCategory: room.category ?? '',
    credit: room.credit ?? 0,
    frontOfficeStatus,
    withLinen: room.linen_status === 'with_linen',
    houseKeepingStatus: normalizeHouseKeepingStatus(room.house_keeping_status),
    reservationStatus: reservationStatus as ReservationStatus,
    promisedTime: (promisedTime === '12:00' || promisedTime === '13:00' ? promisedTime : null) as PromisedTime,
    returnLaterAt: (room.return_later_at ?? null) as string | null,
    pausedAt: (room.paused_at ?? null) as string | null,
    refuseServiceAt: (room.refuse_service_at ?? null) as string | null,
    refuseServiceReason: (room.refuse_service_reason ?? null) as string | null,
    guests: guestsForCard,
    roomAttendantAssigned: attendant,
    isPriority: room.priority === 'high',
    flagged: room.flagged ?? false,
    specialInstructions: room.special_instructions ?? null,
    roomNotes: noteCount > 0 ? undefined : null,
    noteMadeBy: notesAgg?.lastNoteBy ? ({ name: notesAgg.lastNoteBy.name, avatar: notesAgg.lastNoteBy.avatar } as NoteMadeBy) : null,
    notes: noteCount > 0 ? { count: noteCount, hasRushed: false } : undefined,
  };
}

/**
 * Fetch note count and last note author per room (for list/cards).
 * Defined before fetchAllRooms so it is always in scope when the module loads.
 */
const fetchRoomNotesAggregate = async (roomIds: string[]): Promise<Map<string, RoomNotesAggregate>> => {
  const map = new Map<string, RoomNotesAggregate>();
  if (roomIds.length === 0) return map;

  const { data, error } = await supabase
    .from('room_notes')
    .select('id, room_id, created_at, users(full_name, avatar_url)')
    .in('room_id', roomIds)
    .order('created_at', { ascending: false });

  if (error) return map;

  const rows = (data ?? []) as Array<{
    room_id: string;
    users: { full_name: string | null; avatar_url: string | null } | null;
  }>;
  for (const roomId of roomIds) {
    const roomRows = rows.filter((r) => r.room_id === roomId);
    const count = roomRows.length;
    const last = roomRows[0];
    map.set(roomId, {
      count,
      lastNoteBy:
        count && last?.users
          ? {
              name: last.users.full_name ?? 'Staff',
              avatar: last.users.avatar_url ?? undefined,
            }
          : null,
    });
  }
  return map;
};

/**
 * Fetch all rooms with reservations and guests (Supabase).
 */
export async function fetchAllRooms(shift: 'AM' | 'PM'): Promise<AllRoomsScreenData> {
  let data: unknown[] | null = null;
  let error: any = null;

  // `return_later_at` is added by a later migration; gracefully fallback when DB is behind.
  ({ data, error } = await supabase
    .from('rooms')
    .select(
      'id, room_number, category, credit, linen_status, priority, flagged, special_instructions, house_keeping_status, return_later_at, paused_at, refuse_service_at, refuse_service_reason'
    )
    .order('room_number', { ascending: true }));

  if (error && error.code === '42703') {
    ({ data, error } = await supabase
      .from('rooms')
      .select('id, room_number, category, credit, linen_status, priority, flagged, special_instructions, house_keeping_status')
      .order('room_number', { ascending: true }));
  }

  if (error) throw error;
  const rooms = (data ?? []) as RoomRow[];

  if (rooms.length === 0) {
    return { selectedShift: shift, rooms: [], roomsPM: [] };
  }

  const roomIds = rooms.map((r) => r.id);

  const notesByRoom = await fetchRoomNotesAggregate(roomIds);
  const assignmentByRoom = await fetchRoomAssignmentsForShift(shift);

  const { data: resData, error: resError } = await supabase
    .from('reservations')
    .select('id, room_id, arrival_date, departure_date, eta, adults, kids, reservation_status, front_office_status, promised_time')
    .in('room_id', roomIds)
    .order('arrival_date', { ascending: false });

  if (resError) throw resError;
  const reservations = (resData ?? []) as ReservationRow[];

  const resIds = reservations.map((r) => r.id);
  let reservationGuests: ReservationGuestRow[] = [];
  if (resIds.length > 0) {
    const { data: rgData, error: rgError } = await supabase
      .from('reservation_guests')
      .select(`
        reservation_id,
        guest_id,
        guest_order,
        reservations (id, room_id, arrival_date, departure_date, eta, adults, kids, reservation_status, front_office_status, promised_time),
        guests (id, full_name, vip_code, image_url)
      `)
      .in('reservation_id', resIds);
    // Cast to `unknown` first so typed Supabase schema mismatches (e.g. older generated types missing `guest_order`) don't break builds.
    if (!rgError) reservationGuests = (rgData ?? []) as unknown as ReservationGuestRow[];
  }
  // Ensure deterministic guest ordering per reservation (and stable grouping).
  // NOTE: When `guest_order` is NULL/duplicated, PostgREST can return rows in arbitrary order.
  // We stabilize the ordering so Arrival/Departure cards render Arrival first, Departure second.
  reservationGuests.sort((a, b) => {
    const ra = String(a.reservation_id ?? '');
    const rb = String(b.reservation_id ?? '');
    if (ra !== rb) return ra.localeCompare(rb);
    const ao = a.guest_order;
    const bo = b.guest_order;
    // Prefer non-null guest_order; NULLs last so explicit ordering wins.
    if (ao == null && bo != null) return 1;
    if (ao != null && bo == null) return -1;
    if ((ao ?? 0) !== (bo ?? 0)) return (ao ?? 0) - (bo ?? 0);
    // Final deterministic tie-breaker.
    const ag = String(a.guest_id ?? '');
    const bg = String(b.guest_id ?? '');
    return ag.localeCompare(bg);
  });

  // Focused debug logs: missing guest links + Arrival/Departure ordering.
  try {
    const roomsById = new Map<string, RoomRow>();
    for (const r of rooms) roomsById.set(r.id, r);

    const guestLinksByResId = new Map<string, ReservationGuestRow[]>();
    for (const rg of reservationGuests) {
      const list = guestLinksByResId.get(rg.reservation_id) ?? [];
      list.push(rg);
      guestLinksByResId.set(rg.reservation_id, list);
    }

    const missingGuestLinks: Array<{
      room_number: string;
      reservation_id: string;
      front_office_status: string | null;
      arrival_date: string;
      departure_date: string;
    }> = [];

    for (const res of reservations) {
      const links = guestLinksByResId.get(res.id) ?? [];
      if (!links.length) {
        const roomNumber = roomsById.get(res.room_id)?.room_number ?? res.room_id;
        missingGuestLinks.push({
          room_number: String(roomNumber),
          reservation_id: res.id,
          front_office_status: res.front_office_status ?? null,
          arrival_date: res.arrival_date,
          departure_date: res.departure_date,
        });
      }
    }

    if (missingGuestLinks.length) {
      console.log('[rooms] Missing reservation_guests for reservations:\n' + JSON.stringify(missingGuestLinks, null, 2));
    }

    // Log how Arrival/Departure cards will be ordered after mapping.
    // We only log a small sample to avoid noisy console output.
    const arrivalDepartureSamples: any[] = [];
    for (const room of rooms) {
      const list = reservationGuests.filter((rg) => (rg.reservations?.room_id ?? '') === room.id);
      if (!list.length) continue;
      const first = list[0]?.reservations;
      const status = (first?.front_office_status ?? '').toLowerCase();
      const isAD = status.includes('arrival') && status.includes('departure');
      const uniqueResIds = Array.from(new Set(list.map((x) => x.reservation_id)));
      if (isAD || uniqueResIds.length >= 2 || list.length >= 2) {
        arrivalDepartureSamples.push({
          room_number: String(room.room_number),
          reservation_ids: uniqueResIds,
          guests: list.map((rg) => ({
            guest_order: rg.guest_order ?? null,
            guest_id: rg.guest_id,
            full_name: rg.guests?.full_name ?? null,
          })),
        });
      }
      if (arrivalDepartureSamples.length >= 10) break;
    }
    if (arrivalDepartureSamples.length) {
      console.log('[rooms] Arrival/Departure ordering samples:\n' + JSON.stringify(arrivalDepartureSamples, null, 2));
    }
  } catch (e) {
    console.log('[rooms] debug logging failed', e);
  }

  const resByRoom = new Map<string, Array<{ res: ReservationRow; guest: GuestRow | null }>>();
  for (const rg of reservationGuests) {
    const res = rg.reservations ?? (reservations.find((r) => r.id === rg.reservation_id) ?? null);
    const guest = rg.guests ?? null;
    if (!res) continue;
    const list = resByRoom.get(res.room_id) ?? [];
    list.push({ res: res as ReservationRow, guest: guest as GuestRow | null });
    resByRoom.set(res.room_id, list);
  }
  for (const res of reservations) {
    if (!resByRoom.has(res.room_id)) {
      resByRoom.set(res.room_id, [{ res, guest: null }]);
    }
  }

  const cards: RoomCardData[] = rooms.map((room) => {
    const resList = resByRoom.get(room.id) ?? [];
    const notesAgg = notesByRoom.get(room.id) ?? null;
    const attendant = assignmentByRoom.get(room.id) ?? null;
    return mapRoomToCard(room, resList, attendant, notesAgg);
  });

  return {
    selectedShift: shift,
    rooms: cards,
    roomsPM: cards,
  };
}

/** Fields that can be updated on a room (Supabase rooms table). Notes are in room_notes table. */
export type RoomStateUpdate = {
  house_keeping_status?: RoomStatus;
  priority?: 'high' | 'normal';
  flagged?: boolean;
  special_instructions?: string | null;
  /** ISO timestamp (timestamptz) or null to clear. */
  return_later_at?: string | null;
  /** ISO timestamp (timestamptz) or null to clear. */
  paused_at?: string | null;
  /** ISO timestamp (timestamptz) or null to clear. */
  refuse_service_at?: string | null;
  /** Reason string or null to clear. */
  refuse_service_reason?: string | null;
};

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/** Room note row from Supabase with author info */
type RoomNoteRow = {
  id: string;
  room_id: string;
  text: string;
  created_at: string;
  created_by_id: string | null;
  users: { full_name: string | null; avatar_url: string | null } | null;
};

/** Note shape for room detail (matches roomDetail.types.Note) */
export interface RoomNote {
  id: string;
  text: string;
  staff: { name: string; avatar?: unknown };
  createdAt: string;
}

/**
 * Fetch all notes for a room (for room detail screen), with author info.
 */
export async function getRoomNotes(roomId: string): Promise<RoomNote[]> {
  if (!isValidUUID(roomId)) return [];

  const { data, error } = await supabase
    .from('room_notes')
    // Be explicit about the author FK to avoid incorrect/ambiguous joins.
    .select('id, text, created_at, users:users!room_notes_created_by_id_fkey(full_name, avatar_url)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });

  if (error) return [];

  const rows = (data ?? []) as RoomNoteRow[];
  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    staff: {
      name: row.users?.full_name ?? 'Staff',
      avatar: row.users?.avatar_url ?? undefined,
    },
    createdAt: row.created_at,
  }));
}

/**
 * Add a note to a room. Uses current authenticated user as author.
 * Returns the created note (with id, createdAt) or throws.
 */
export async function addRoomNote(roomId: string, text: string): Promise<RoomNote> {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id ?? null;

  // Tenant-scoped RLS requires room_notes.hotel_id = auth_hotel_id() (and it is NOT NULL in tenant migrations).
  // Derive hotel_id from the room so inserts succeed under RLS.
  let hotelId: string | null = null;
  try {
    const { data: roomRow } = await supabase
      .from('rooms')
      .select('hotel_id')
      .eq('id', roomId)
      .limit(1)
      .maybeSingle();
    hotelId = (roomRow as any)?.hotel_id ?? null;
  } catch {
    hotelId = null;
  }

  let inserted: any = null;
  let insertError: any = null;

  // Try insert with hotel_id (new schema).
  ({ data: inserted, error: insertError } = await supabase
    .from('room_notes')
    .insert({
      room_id: roomId,
      text: text.trim(),
      created_by_id: userId,
      ...(hotelId ? { hotel_id: hotelId } : {}),
    } as any)
    .select('id')
    .single());

  // Back-compat: if PostgREST schema cache doesn't include hotel_id yet, retry without it.
  if (insertError && (insertError.code === '42703' || insertError.code === 'PGRST204')) {
    ({ data: inserted, error: insertError } = await supabase
      .from('room_notes')
      .insert({
        room_id: roomId,
        text: text.trim(),
        created_by_id: userId,
      })
      .select('id')
      .single());
  }

  if (insertError) throw insertError;
  if (!inserted?.id) throw new Error('Failed to create note');

  const { data: full, error: fetchError } = await supabase
    .from('room_notes')
    // Be explicit about the author FK to avoid incorrect/ambiguous joins.
    .select('id, text, created_at, users:users!room_notes_created_by_id_fkey(full_name, avatar_url)')
    .eq('id', inserted.id)
    .single();

  if (fetchError || !full) throw fetchError ?? new Error('Failed to fetch created note');
  const row = full as RoomNoteRow;
  return {
    id: row.id,
    text: row.text,
    staff: {
      name: row.users?.full_name ?? 'Staff',
      avatar: row.users?.avatar_url ?? undefined,
    },
    createdAt: row.created_at,
  };
}

/**
 * Update room state in Supabase.
 * No-op if roomId is not a valid UUID (e.g. mock data). Throws on Supabase error.
 */
export async function updateRoom(roomId: string, updates: RoomStateUpdate): Promise<void> {
  if (!isValidUUID(roomId)) {
    return;
  }
  const payload: Record<string, unknown> = {};
  if (updates.house_keeping_status != null) payload.house_keeping_status = updates.house_keeping_status;
  if (updates.priority != null) payload.priority = updates.priority;
  if (updates.flagged != null) payload.flagged = updates.flagged;
  if (updates.special_instructions !== undefined) payload.special_instructions = updates.special_instructions;
  if (updates.return_later_at !== undefined) payload.return_later_at = updates.return_later_at;
  if (updates.paused_at !== undefined) payload.paused_at = updates.paused_at;
  if (updates.refuse_service_at !== undefined) payload.refuse_service_at = updates.refuse_service_at;
  if (updates.refuse_service_reason !== undefined) payload.refuse_service_reason = updates.refuse_service_reason;
  if (Object.keys(payload).length === 0) return;
  let result = await supabase.from('rooms').update(payload).eq('id', roomId);
  if (result.error && (result.error.code === '42703' || result.error.code === 'PGRST204')) {
    // Schema behind PostgREST cache / migration not applied yet: retry without any newer columns.
    const maybeNewCols = ['return_later_at', 'paused_at', 'refuse_service_at', 'refuse_service_reason'] as const;
    let changed = false;
    for (const key of maybeNewCols) {
      if (key in payload) {
        delete (payload as any)[key];
        changed = true;
      }
    }
    if (changed) {
      if (Object.keys(payload).length === 0) return;
      result = await supabase.from('rooms').update(payload).eq('id', roomId);
    }
  }
  if (result.error) throw result.error;

  // When a room moves to In Progress, stamp the assignment so the staff card's
  // credit countdown starts from this moment. start_time is set only once (so a
  // pause→resume keeps the original start); work_status reflects the transition.
  // Best-effort — never block the room status update on this.
  if (updates.house_keeping_status === 'InProgress') {
    try {
      const startedAt = new Date().toISOString();
      await supabase.from('room_assignments').update({ work_status: 'in_progress' }).eq('room_id', roomId);
      await supabase
        .from('room_assignments')
        .update({ start_time: startedAt })
        .eq('room_id', roomId)
        .is('start_time', null);
    } catch (e) {
      console.warn('[updateRoom] could not stamp room_assignments start_time', e);
    }
  }
}

/**
 * Count rooms the user is assigned to for the given shift (`room_assignments`, one row per room per shift).
 */
export async function countRoomAssignmentsForUser(userId: string, shift: 'AM' | 'PM'): Promise<number> {
  if (!isValidUUID(userId)) return 0;
  const shiftId = await getShiftIdByName(shift);
  if (!shiftId) return 0;
  const { count, error } = await supabase
    .from('room_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('shift_id', shiftId);
  if (error) {
    console.warn('[rooms] countRoomAssignmentsForUser', error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Distinct rooms assigned to this user across **all** shifts (tab badge).
 * Single-shift counts often read 0 when UI shift and stored `shift_id` don’t line up.
 */
export async function countDistinctRoomsAssignedToUser(userId: string): Promise<number> {
  if (!isValidUUID(userId)) return 0;
  const { data, error } = await supabase.from('room_assignments').select('room_id').eq('user_id', userId);
  if (error) {
    console.warn('[rooms] countDistinctRoomsAssignedToUser', error.message);
    return 0;
  }
  const ids = new Set<string>();
  for (const row of data ?? []) {
    const rid = (row as { room_id?: string }).room_id;
    if (rid) ids.add(rid);
  }
  return ids.size;
}

/**
 * Distinct rooms assigned to the user (any shift), ordered by latest `room_assignments.created_at` first.
 * Used when opening Rooms from the tab badge so assigned rooms appear at the top in recency order.
 */
export async function getDistinctAssignedRoomIdsOrderedByAssignmentCreatedAt(userId: string): Promise<string[]> {
  if (!isValidUUID(userId)) return [];
  const { data, error } = await supabase
    .from('room_assignments')
    .select('room_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[rooms] getDistinctAssignedRoomIdsOrderedByAssignmentCreatedAt', error.message);
    return [];
  }
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const row of data ?? []) {
    const rid = (row as { room_id?: string }).room_id;
    if (!rid || seen.has(rid)) continue;
    seen.add(rid);
    ordered.push(rid);
  }
  return ordered;
}

/**
 * Rooms assigned to the user for a specific shift (AM/PM), ordered by latest `room_assignments.created_at` first.
 * This is the authoritative source for "my assigned rooms" filtering on AllRooms.
 */
export async function getAssignedRoomIdsForUserAndShiftOrderedByAssignmentCreatedAt(
  userId: string,
  shift: 'AM' | 'PM'
): Promise<string[]> {
  if (!isValidUUID(userId)) return [];
  const shiftId = await getShiftIdByName(shift);
  if (!shiftId) return [];
  const { data, error } = await supabase
    .from('room_assignments')
    .select('room_id, created_at')
    .eq('user_id', userId)
    .eq('shift_id', shiftId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[rooms] getAssignedRoomIdsForUserAndShiftOrderedByAssignmentCreatedAt', error.message);
    return [];
  }
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const row of data ?? []) {
    const rid = (row as { room_id?: string }).room_id;
    if (!rid || seen.has(rid)) continue;
    seen.add(rid);
    ordered.push(rid);
  }
  return ordered;
}

/**
 * Assign a room to a staff member for the given shift.
 * Uses room_assignments table: upserts by (room_id, shift_id) so one assignee per room per shift.
 * Always returns StaffInfo for the user when both IDs are valid UUIDs (so the room card can update);
 * persists to DB only when shift_id exists.
 */
export async function assignRoomToStaff(
  roomId: string,
  userId: string,
  shift: 'AM' | 'PM'
): Promise<StaffInfo | null> {
  if (!isValidUUID(roomId) || !isValidUUID(userId)) return null;

  // Ensure tenant context is resolvable; without this, auth_hotel_id() returns NULL and RLS will reject inserts.
  const myHotelId = await getMyHotelId();
  if (!myHotelId) {
    throw new Error('Your account is not assigned to a hotel yet. Run ensure_current_user_profile / hotel assignment migration on Supabase.');
  }

  // Fetch user first so we can always return StaffInfo for the UI
  const { data: userData } = await supabase
    .from('users')
    .select('full_name, avatar_url')
    .eq('id', userId)
    .single();

  const name = (userData as { full_name: string; avatar_url: string | null } | null)?.full_name ?? 'Staff';
  const avatarUrl = (userData as { full_name: string; avatar_url: string | null } | null)?.avatar_url ?? null;
  const initials = name.split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase() || '?';
  const staffInfo: StaffInfo = {
    name,
    initials,
    avatar: avatarUrl ?? undefined,
    statusText: 'Not Started',
    statusColor: '#1e1e1e',
  };

  const shiftId = await getShiftIdByName(shift);
  if (!shiftId) {
    // No shift in DB – still return StaffInfo so the room card updates
    console.warn('[assignRoomToStaff] No shift found for', shift, '– assignment not persisted. Add shifts (e.g. AM, PM) in Supabase.');
    return staffInfo;
  }

  // Tenant-scoped RLS requires `room_assignments.hotel_id = auth_hotel_id()`.
  // Derive it from the room so inserts work regardless of client auth metadata.
  const { data: roomRow, error: roomHotelErr } = await supabase
    .from('rooms')
    .select('hotel_id')
    .eq('id', roomId)
    .limit(1)
    .maybeSingle();
  if (roomHotelErr) throw roomHotelErr;
  const hotelId = (roomRow as { hotel_id?: string | null } | null)?.hotel_id ?? null;
  if (!hotelId || !isValidUUID(hotelId)) {
    throw new Error('Missing hotel_id for room; cannot assign staff under tenant RLS.');
  }
  if (myHotelId !== hotelId) {
    throw new Error('Tenant mismatch: you cannot assign staff to a room from a different hotel.');
  }

  const { error } = await supabase
    .from('room_assignments')
    .upsert(
      { room_id: roomId, shift_id: shiftId, user_id: userId, hotel_id: hotelId },
      { onConflict: 'room_id,shift_id' }
    );

  if (error) {
    const isNoConflictConstraint =
      error.code === '42P10' || (error.message != null && /unique|on conflict/i.test(error.message));
    if (isNoConflictConstraint) {
      // Fallback when unique constraint doesn't exist yet (run migration 20250628000000_room_assignments_upsert_and_anon.sql)
      const { data: existing } = await supabase
        .from('room_assignments')
        .select('id')
        .eq('room_id', roomId)
        .eq('shift_id', shiftId)
        .maybeSingle();
      if (existing) {
        const updateResult = await supabase
          .from('room_assignments')
          .update({ user_id: userId })
          .eq('room_id', roomId)
          .eq('shift_id', shiftId);
        if (updateResult.error) throw updateResult.error;
      } else {
        const insertResult = await supabase.from('room_assignments').insert({
          room_id: roomId,
          shift_id: shiftId,
          user_id: userId,
          hotel_id: hotelId,
        });
        if (insertResult.error) throw insertResult.error;
      }
    } else {
      console.error('[assignRoomToStaff] Supabase error:', error.message, error.code);
      throw error;
    }
  }

  // Fire-and-forget push notification to assigned staff member.
  notifyServer({ type: 'room_assignment', roomId, shiftId, assignedUserId: userId }).catch(() => {});

  // Defer so tab bar listeners run after Supabase write is visible to the next read.
  queueMicrotask(() => invalidateNotificationBadges());

  return staffInfo;
}

// ---------------------------------------------------------------------------
// Full room details endpoint (guest info, reservations, notes, assigned staff, etc.)
// ---------------------------------------------------------------------------

export interface ReservationDetail {
  id: string;
  room_id: string;
  arrival_date: string;
  departure_date: string;
  eta: string | null;
  adults: number | null;
  kids: number | null;
  reservation_status: string | null;
  front_office_status: string | null;
  promised_time: string | null;
  guests: Array<{
    id: string;
    full_name: string;
    vip_code: string | null;
    image_url: string | null;
  }>;
}

export interface RoomNoteDetail {
  id: string;
  text: string;
  created_at: string;
  staff: { name: string; avatar_url: string | null };
}

export interface AssignedStaffDetail {
  user_id: string;
  shift_name: string;
  work_status: string | null;
  staff: {
    full_name: string;
    avatar_url: string | null;
    department_name?: string;
  };
}

export interface LostAndFoundItemDetail {
  id: string;
  tracking_number: string | null;
  item_name: string;
  description: string | null;
  status: string | null;
  found_at: string;
  found_by_id: string;
  registered_by_id: string | null;
  storage_location: string | null;
  image_url: string | null;
}

export interface TicketDetail {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  priority: string | null;
  status: string;
}

export interface FullRoomDetails {
  room: {
    id: string;
    room_number: string;
    category: string | null;
    credit: number | null;
    linen_status: string | null;
    priority: string | null;
    flagged: boolean | null;
    special_instructions: string | null;
    house_keeping_status: string | null;
    return_later_at?: string | null;
    paused_at?: string | null;
    refuse_service_at?: string | null;
    refuse_service_reason?: string | null;
  };
  reservations: ReservationDetail[];
  notes: RoomNoteDetail[];
  assignedStaff: AssignedStaffDetail[];
  lostAndFoundItems: LostAndFoundItemDetail[];
  tickets: TicketDetail[];
}

/** Map one reservation + guest from full details to GuestInfo (for room cards). */
function mapReservationDetailToGuestInfo(
  res: ReservationDetail,
  guest: { id: string; full_name: string; vip_code: string | null; image_url: string | null } | null,
  index: number,
  roomId: string
): GuestInfo {
  const name = guest?.full_name ?? 'Guest';
  const from = res.arrival_date ?? '';
  const to = res.departure_date ?? '';
  const normalizedFrontOffice = normalizeFrontOfficeStatus(res.front_office_status);
  const isArrivalDeparture = normalizedFrontOffice === 'Arrival/Departure';
  const isArrival = normalizedFrontOffice === 'Arrival';
  const isDeparture = normalizedFrontOffice === 'Departure';
  const time =
    res.eta && String(res.eta).trim()
      ? String(res.eta).trim()
      : 'N/A';
  const timeLabel =
    isArrivalDeparture
      ? (index === 1 ? 'EDT' : 'ETA')
      : isDeparture
        ? 'EDT'
        : isArrival
          ? 'ETA'
          : (res.eta ? 'ETA' : (res.departure_date ? 'EDT' : 'N/A'));
  const isVacant = (res.reservation_status ?? '').toLowerCase() === 'vacant';
  return {
    name,
    datesOfStay: { from, to },
    time: time === 'N/A' || !time ? 'N/A' : time,
    timeLabel: timeLabel as 'ETA' | 'EDT' | 'N/A',
    guestCount: { adults: res.adults ?? 0, kids: res.kids ?? 0 },
    vipCode: guest?.vip_code != null ? parseInt(String(guest.vip_code), 10) : undefined,
    arrivalDate: res.arrival_date,
    imageUrl: guest?.image_url ?? `https://i.pravatar.cc/96?u=${guest?.id ?? `${roomId}-${index}`}`,
    isVacant: isVacant || undefined,
  };
}

/**
 * Convert full room details to RoomCardData for list/cards. Uses first reservation for
 * front_office_status; builds guests from all reservations; picks assigned staff for the given shift.
 */
export function fullRoomDetailsToRoomCardData(
  full: FullRoomDetails,
  shift: 'AM' | 'PM'
): RoomCardData {
  const room = full.room;
  const firstRes = full.reservations[0];
  const rawFrontOffice = firstRes?.front_office_status ?? 'Stayover';
  const reservationStatus = firstRes?.reservation_status ?? 'Occupied';
  const promisedTime = firstRes?.promised_time ?? null;

  const guests: GuestInfo[] = [];
  for (const res of full.reservations) {
    if (res.guests.length) {
      res.guests.forEach((g, i) => {
        guests.push(mapReservationDetailToGuestInfo(res, g, i, room.id));
      });
    } else {
      guests.push(mapReservationDetailToGuestInfo(res, null, 0, room.id));
    }
  }
  if (guests.length === 0) {
    guests.push({
      name: 'Guest',
      datesOfStay: { from: '', to: '' },
      time: 'N/A',
      timeLabel: 'N/A',
      guestCount: { adults: 0, kids: 0 },
      imageUrl: `https://i.pravatar.cc/96?u=${room.id}-0`,
    });
  }

  // Normalize status so DB values (e.g. "No task", "Stayover") match card layout; use Arrival/Departure when 2+ reservations so height/layout are correct
  let frontOfficeStatus = normalizeFrontOfficeStatus(rawFrontOffice);
  if (full.reservations.length >= 2) {
    frontOfficeStatus = 'Arrival/Departure';
  }
  // For single-guest card types, only pass first guest so layout/height match (card expects one guest section)
  const guestsForCard = (() => {
    if (frontOfficeStatus !== 'Arrival/Departure') return guests.slice(0, 1);
    const arrival = guests.find((g) => g.timeLabel === 'ETA') ?? guests[0];
    const departure =
      guests.find((g) => g.timeLabel === 'EDT' && g !== arrival) ??
      guests.find((g) => g !== arrival) ??
      guests[1] ??
      guests[0];
    const ordered = [arrival, departure].filter(Boolean) as GuestInfo[];
    return Array.from(new Set(ordered)).slice(0, 2);
  })();

  const assignment = full.assignedStaff.find((a) => a.shift_name === shift);
  const attendant: StaffInfo | null = assignment
    ? staffInfoFromAssignment({
        user_id: assignment.user_id,
        work_status: assignment.work_status,
        users: {
          full_name: assignment.staff.full_name,
          avatar_url: assignment.staff.avatar_url,
        },
      })
    : null;

  const noteCount = full.notes.length;
  const lastNote = full.notes[0];
  const notesAgg: RoomNotesAggregate | null = noteCount
    ? { count: noteCount, lastNoteBy: lastNote ? { name: lastNote.staff.name, avatar: lastNote.staff.avatar_url ?? undefined } : null }
    : null;

  return {
    id: room.id,
    roomNumber: room.room_number,
    roomCategory: room.category ?? '',
    credit: room.credit ?? 0,
    frontOfficeStatus,
    withLinen: room.linen_status === 'with_linen',
    houseKeepingStatus: normalizeHouseKeepingStatus(room.house_keeping_status),
    reservationStatus: reservationStatus as ReservationStatus,
    promisedTime: (promisedTime === '12:00' || promisedTime === '13:00' ? promisedTime : null) as PromisedTime,
    returnLaterAt: (room.return_later_at ?? null) as string | null,
    pausedAt: ((room as any).paused_at ?? null) as string | null,
    refuseServiceAt: ((room as any).refuse_service_at ?? null) as string | null,
    refuseServiceReason: ((room as any).refuse_service_reason ?? null) as string | null,
    guests: guestsForCard,
    roomAttendantAssigned: attendant,
    isPriority: room.priority === 'high',
    flagged: room.flagged ?? false,
    specialInstructions: room.special_instructions ?? null,
    roomNotes: noteCount > 0 ? undefined : null,
    noteMadeBy: notesAgg?.lastNoteBy ? ({ name: notesAgg.lastNoteBy.name, avatar: notesAgg.lastNoteBy.avatar } as NoteMadeBy) : null,
    notes: noteCount > 0 ? { count: noteCount, hasRushed: false } : undefined,
  };
}

/**
 * Fetch all rooms for the All Rooms screen using full room details (one source of truth).
 * Returns data in RoomCardData form so RoomCard can render by front_office_status.
 */
export async function fetchAllRoomsFromFullDetails(shift: 'AM' | 'PM'): Promise<AllRoomsScreenData> {
  const fullList = await getFullRoomDetails();
  const rooms = fullList.map((full) => fullRoomDetailsToRoomCardData(full, shift));
  return {
    selectedShift: shift,
    rooms,
    roomsPM: rooms,
  };
}

/**
 * Fetch full details for one room or all rooms: guest info, reservations, room notes,
 * assigned staff, lost & found, tickets. Logs the result to the console and returns it.
 * @param roomId - Optional. If provided, returns details for that room only; otherwise all rooms.
 */
export async function getFullRoomDetails(roomId?: string): Promise<FullRoomDetails[]> {
  const roomsQueryWithReturnLater = supabase
    .from('rooms')
    .select(
      'id, room_number, category, credit, linen_status, priority, flagged, special_instructions, house_keeping_status, return_later_at, paused_at, refuse_service_at, refuse_service_reason'
    )
    .order('room_number', { ascending: true });
  const roomsQueryBase = supabase
    .from('rooms')
    .select('id, room_number, category, credit, linen_status, priority, flagged, special_instructions, house_keeping_status')
    .order('room_number', { ascending: true });

  let roomsData: any[] | null = null;
  let roomsError: any = null;

  if (roomId) {
    ({ data: roomsData, error: roomsError } = await roomsQueryWithReturnLater.eq('id', roomId));
    if (roomsError && roomsError.code === '42703') {
      ({ data: roomsData, error: roomsError } = await roomsQueryBase.eq('id', roomId));
    }
  } else {
    ({ data: roomsData, error: roomsError } = await roomsQueryWithReturnLater);
    if (roomsError && roomsError.code === '42703') {
      ({ data: roomsData, error: roomsError } = await roomsQueryBase);
    }
  }

  if (roomsError) throw roomsError;
  const rooms = (roomsData ?? []) as RoomRow[];
  if (rooms.length === 0) {
    console.log('[getFullRoomDetails] No rooms found.');
    return [];
  }

  const roomIds = rooms.map((r) => r.id);

  const [reservationsRes, notesRes, assignmentsRes, lfRes, ticketsRes] = await Promise.all([
    supabase
      .from('reservations')
      .select('id, room_id, arrival_date, departure_date, eta, adults, kids, reservation_status, front_office_status, promised_time')
      .in('room_id', roomIds)
      .order('arrival_date', { ascending: false }),
    supabase
      .from('room_notes')
      .select('id, room_id, text, created_at, users(full_name, avatar_url)')
      .in('room_id', roomIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('room_assignments')
      .select('room_id, user_id, work_status, users(full_name, avatar_url), shifts(name)')
      .in('room_id', roomIds),
    supabase
      .from('lost_and_found_items')
      .select('id, room_id, tracking_number, item_name, description, status, found_at, found_by_id, registered_by_id, storage_location, image_url')
      .in('room_id', roomIds)
      .order('found_at', { ascending: false }),
    supabase
      .from('tickets')
      .select('id, room_id, title, description, type, priority, status')
      .in('room_id', roomIds),
  ]);

  const reservations = (reservationsRes.data ?? []) as (ReservationRow & { promised_time?: string | null })[];
  const resIds = reservations.map((r) => r.id);

  let reservationGuests: ReservationGuestRow[] = [];
  if (resIds.length > 0) {
    const { data: rgData, error: rgError } = await supabase
      .from('reservation_guests')
      .select('reservation_id, guest_id, guest_order, guests(id, full_name, vip_code, image_url)')
      .in('reservation_id', resIds);
    // Cast to `unknown` first so typed Supabase schema mismatches (e.g. older generated types missing `guest_order`) don't break builds.
    if (!rgError) reservationGuests = (rgData ?? []) as unknown as ReservationGuestRow[];
  }
  // Ensure deterministic guest ordering per reservation (and stable grouping).
  reservationGuests.sort((a, b) => {
    const ra = String(a.reservation_id ?? '');
    const rb = String(b.reservation_id ?? '');
    if (ra !== rb) return ra.localeCompare(rb);
    return Number(a.guest_order ?? 0) - Number(b.guest_order ?? 0);
  });

  const resWithGuestsByRoom = new Map<string, ReservationDetail[]>();
  for (const rid of roomIds) {
    const roomReservations = reservations.filter((r) => r.room_id === rid);
    const list: ReservationDetail[] = roomReservations.map((res) => {
      const guests = reservationGuests
        .filter((rg) => rg.reservation_id === res.id && rg.guests)
        .sort((a, b) => (Number(a.guest_order ?? 0) - Number(b.guest_order ?? 0)))
        .map((rg) => rg.guests as GuestRow)
        .filter(Boolean);
      return {
        id: res.id,
        room_id: res.room_id,
        arrival_date: res.arrival_date,
        departure_date: res.departure_date,
        eta: res.eta ?? null,
        adults: res.adults ?? null,
        kids: res.kids ?? null,
        reservation_status: res.reservation_status ?? null,
        front_office_status: res.front_office_status ?? null,
        promised_time: res.promised_time ?? null,
        guests: guests.map((g) => ({
          id: g.id,
          full_name: g.full_name,
          vip_code: g.vip_code ?? null,
          image_url: g.image_url ?? null,
        })),
      };
    });
    resWithGuestsByRoom.set(rid, list);
  }

  type NoteRow = { id: string; room_id: string; text: string; created_at: string; users: { full_name: string | null; avatar_url: string | null } | null };
  const notesRows = (notesRes.data ?? []) as NoteRow[];
  const notesByRoom = new Map<string, RoomNoteDetail[]>();
  for (const rid of roomIds) {
    const roomNotes = notesRows
      .filter((n) => n.room_id === rid)
      .map((n) => ({
        id: n.id,
        text: n.text,
        created_at: n.created_at,
        staff: { name: n.users?.full_name ?? 'Staff', avatar_url: n.users?.avatar_url ?? null },
      }));
    notesByRoom.set(rid, roomNotes);
  }

  type AssignmentRow = {
    room_id: string;
    user_id: string;
    work_status: string | null;
    users: { full_name: string; avatar_url: string | null } | null;
    shifts: { name: string } | null;
  };
  const assignmentRows = (assignmentsRes.data ?? []) as AssignmentRow[];
  const assignmentsByRoom = new Map<string, AssignedStaffDetail[]>();
  for (const rid of roomIds) {
    const roomAssignments = assignmentRows
      .filter((a) => a.room_id === rid)
      .map((a) => ({
        user_id: a.user_id,
        shift_name: a.shifts?.name ?? 'Unknown',
        work_status: a.work_status,
        staff: {
          full_name: a.users?.full_name ?? 'Staff',
          avatar_url: a.users?.avatar_url ?? null,
          department_name: undefined,
        },
      }));
    assignmentsByRoom.set(rid, roomAssignments);
  }

  const lfRows = (lfRes.data ?? []) as {
    id: string;
    room_id: string;
    tracking_number: string | null;
    item_name: string;
    description: string | null;
    status: string | null;
    found_at: string;
    found_by_id: string;
    registered_by_id: string | null;
    storage_location: string | null;
    image_url: string | null;
  }[];
  const lfByRoom = new Map<string, LostAndFoundItemDetail[]>();
  for (const rid of roomIds) {
    const items = lfRows
      .filter((i) => i.room_id === rid)
      .map((i) => ({
        id: i.id,
        tracking_number: i.tracking_number,
        item_name: i.item_name,
        description: i.description,
        status: i.status,
        found_at: i.found_at,
        found_by_id: i.found_by_id,
        registered_by_id: i.registered_by_id,
        storage_location: i.storage_location,
        image_url: i.image_url,
      }));
    lfByRoom.set(rid, items);
  }

  const ticketRows = (ticketsRes.data ?? []) as { id: string; room_id: string; title: string; description: string | null; type: string | null; priority: string | null; status: string }[];
  const ticketsByRoom = new Map<string, TicketDetail[]>();
  for (const rid of roomIds) {
    const roomTickets = ticketRows
      .filter((t) => t.room_id === rid)
      .map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        type: t.type,
        priority: t.priority,
        status: t.status,
      }));
    ticketsByRoom.set(rid, roomTickets);
  }

  const result: FullRoomDetails[] = rooms.map((room) => ({
    room: {
      id: room.id,
      room_number: room.room_number,
      category: room.category,
      credit: room.credit,
      linen_status: room.linen_status,
      priority: room.priority,
      flagged: room.flagged,
      special_instructions: room.special_instructions,
      house_keeping_status: room.house_keeping_status,
      return_later_at: (room as any).return_later_at ?? null,
      paused_at: (room as any).paused_at ?? null,
      refuse_service_at: (room as any).refuse_service_at ?? null,
      refuse_service_reason: (room as any).refuse_service_reason ?? null,
    },
    reservations: resWithGuestsByRoom.get(room.id) ?? [],
    notes: notesByRoom.get(room.id) ?? [],
    assignedStaff: assignmentsByRoom.get(room.id) ?? [],
    lostAndFoundItems: lfByRoom.get(room.id) ?? [],
    tickets: ticketsByRoom.get(room.id) ?? [],
  }));

  // Avoid logging full payloads here: JSON.stringify on large room graphs can block the JS thread
  // and make the app appear frozen on device.
  return result;
}

/**
 * Convenience helper: get full room details for a single room by id.
 * This includes:
 * - core room fields (number, category, credit, linen/priority/flagged, housekeeping status, special instructions)
 * - all reservations + guests for that room
 * - all notes for that room (with staff names/avatars)
 * - all assigned staff for that room
 * - all lost & found items for that room
 * - all tickets for that room
 */
export async function getRoomDetailsById(roomId: string): Promise<FullRoomDetails | null> {
  if (!roomId) return null;

  const list = await getFullRoomDetails(roomId);
  if (!list.length) {
    return null;
  }
  return list[0];
}
