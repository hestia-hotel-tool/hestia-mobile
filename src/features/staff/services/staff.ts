import { supabase, isSupabaseConfigured } from '@shared/lib/supabase';
import type { StaffMember } from '../types/staff.types';

async function getShiftIdByName(shiftName: 'AM' | 'PM'): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('shifts')
    .select('id')
    .ilike('name', shiftName)
    .limit(1)
    .maybeSingle();
  if (!error && data) return (data as { id: string }).id;
  return null;
}

/**
 * Fetch staff members from Supabase `users` table and map them to StaffMember.
 * When Supabase is not configured or the query fails, returns an empty array.
 */
export async function fetchStaffFromSupabase(): Promise<StaffMember[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, avatar_url, departments(name), roles(name)');

  if (error || !data) {
    console.warn('Failed to fetch staff from Supabase', error);
    return [];
  }

  type UserRow = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    departments: { name: string } | null;
    roles: { name: string } | null;
  };

  return (data as UserRow[]).map((row) => ({
    id: row.id,
    name: row.full_name ?? 'Staff',
    avatar: row.avatar_url ?? undefined,
    department: row.departments?.name ?? undefined,
    role: row.roles?.name ?? undefined,
    onShift: true,
    shift: 'AM',
  }));
}

export type StaffRoomStats = {
  total: number;
  completed: number;
  inProgress: number;
  cleaned: number;
  dirty: number;
  currentRoomNumber?: string;
  /** rooms.id of the current room — used to open RoomDetail from the card. */
  currentRoomId?: string;
  /** start_time of the room the attendant is currently on (drives the live timer). */
  currentRoomStartTimeIso?: string | null;
  /** rooms.credit (allotted clean minutes) for the current room — drives the countdown. */
  currentRoomCreditMins?: number;
  /** Current room's work_status is 'paused'. */
  isPaused?: boolean;
  /** pause_reason for the current room when paused. */
  pauseReason?: string | null;
};

/**
 * Fetch housekeeping room stats per user for a given shift.
 * Uses `room_assignments` filtered by shift, joined with `rooms` for status + room number.
 */
export async function fetchStaffRoomStatsForShift(
  userIds: string[],
  shift: 'AM' | 'PM'
): Promise<Map<string, StaffRoomStats>> {
  const map = new Map<string, StaffRoomStats>();
  if (!isSupabaseConfigured) return map;
  if (!Array.isArray(userIds) || userIds.length === 0) return map;

  const shiftId = await getShiftIdByName(shift);
  if (!shiftId) return map;

  const { data, error } = await supabase
    .from('room_assignments')
    .select('user_id, work_status, start_time, created_at, pause_reason, rooms:rooms(id, room_number, house_keeping_status, credit)')
    .eq('shift_id', shiftId)
    .in('user_id', userIds);

  if (error) {
    console.warn('[staff] fetchStaffRoomStatsForShift failed', error.message);
    return map;
  }

  type Row = {
    user_id: string;
    work_status: string | null;
    start_time: string | null;
    created_at: string | null;
    pause_reason: string | null;
    rooms: { id: string; room_number: string; house_keeping_status: string | null; credit: number | null } | null;
  };

  const rows = (data ?? []) as Row[];
  for (const r of rows) {
    const uid = String(r.user_id ?? '');
    if (!uid) continue;
    const statusRaw = String(r.rooms?.house_keeping_status ?? '').trim().toLowerCase();
    const hk =
      statusRaw === 'inprogress' || statusRaw === 'in progress' || statusRaw === 'in_progress'
        ? 'InProgress'
        : statusRaw === 'cleaned'
          ? 'Cleaned'
          : statusRaw === 'inspected'
            ? 'Inspected'
            : 'Dirty';

    const prev =
      map.get(uid) ?? { total: 0, completed: 0, inProgress: 0, cleaned: 0, dirty: 0 } satisfies StaffRoomStats;
    prev.total += 1;
    if (hk === 'InProgress') prev.inProgress += 1;
    else if (hk === 'Cleaned' || hk === 'Inspected') {
      prev.cleaned += 1;
      prev.completed += 1;
    } else {
      prev.dirty += 1;
    }

    // Choose a "current" room: the one the attendant is actively on. Prefer an
    // in-progress assignment; fall back to a paused one (so the card can show
    // "paused"). An in-progress room overrides a previously-picked paused room.
    const ws = String(r.work_status ?? '').toLowerCase();
    const isInProgress = ws === 'in_progress' || hk === 'InProgress';
    const isPausedRoom = ws === 'paused';
    if (isInProgress || isPausedRoom) {
      const rn = r.rooms?.room_number ? String(r.rooms.room_number) : undefined;
      if (rn && (!prev.currentRoomNumber || (isInProgress && prev.isPaused))) {
        prev.currentRoomNumber = rn;
        prev.currentRoomId = r.rooms?.id ? String(r.rooms.id) : undefined;
        // start_time is the cleaning-start; fall back to the assignment's
        // created_at so the timer still runs when start_time isn't recorded.
        prev.currentRoomStartTimeIso = r.start_time ?? r.created_at ?? null;
        prev.currentRoomCreditMins =
          typeof r.rooms?.credit === 'number' ? r.rooms.credit : undefined;
        prev.isPaused = isPausedRoom;
        prev.pauseReason = isPausedRoom ? (r.pause_reason ?? null) : null;
      }
    }

    map.set(uid, prev);
  }

  return map;
}

export type StaffTicketStats = {
  /** Tickets assigned to this user that are resolved/closed. */
  resolved: number;
  /** Tickets assigned to this user still open. */
  open: number;
  /** resolved + open. */
  total: number;
  /** Mean minutes from created_at to resolved_at across resolved tickets. */
  avgResolutionMins?: number;
  /** The most recent still-open ticket — drives the "current" pill + timer. */
  currentTicket?: { title: string; startTimeIso: string | null };
};

const RESOLVED_TICKET_STATUSES = new Set(['closed', 'resolved', 'done', 'completed']);

/**
 * Ticket throughput per user (for non-housekeeping departments such as
 * Engineering/IT). A ticket counts as resolved if it has a resolved_at
 * timestamp or a terminal status.
 */
export async function fetchStaffTicketStats(
  userIds: string[]
): Promise<Map<string, StaffTicketStats>> {
  const map = new Map<string, StaffTicketStats>();
  if (!isSupabaseConfigured) return map;
  if (!Array.isArray(userIds) || userIds.length === 0) return map;

  const { data, error } = await supabase
    .from('tickets')
    .select('assigned_to_id, title, status, created_at, resolved_at')
    .in('assigned_to_id', userIds);

  if (error) {
    console.warn('[staff] fetchStaffTicketStats failed', error.message);
    return map;
  }

  type Row = {
    assigned_to_id: string | null;
    title: string | null;
    status: string | null;
    created_at: string | null;
    resolved_at: string | null;
  };

  type Agg = {
    resolved: number;
    open: number;
    totalMins: number;
    timed: number;
    current?: { title: string; startTimeIso: string | null; createdMs: number };
  };

  const agg = new Map<string, Agg>();
  for (const r of (data ?? []) as Row[]) {
    const uid = String(r.assigned_to_id ?? '');
    if (!uid) continue;
    const a = agg.get(uid) ?? { resolved: 0, open: 0, totalMins: 0, timed: 0 };
    const isResolved =
      !!r.resolved_at || RESOLVED_TICKET_STATUSES.has(String(r.status ?? '').trim().toLowerCase());
    if (isResolved) {
      a.resolved += 1;
      if (r.resolved_at && r.created_at) {
        const mins = (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / 60000;
        if (Number.isFinite(mins) && mins >= 0) {
          a.totalMins += mins;
          a.timed += 1;
        }
      }
    } else {
      a.open += 1;
      // "Current" = the most recently created still-open ticket.
      const createdMs = r.created_at ? new Date(r.created_at).getTime() : 0;
      if (!a.current || createdMs > a.current.createdMs) {
        a.current = {
          title: r.title?.trim() || 'Untitled ticket',
          startTimeIso: r.created_at ?? null,
          createdMs,
        };
      }
    }
    agg.set(uid, a);
  }

  for (const [uid, a] of agg) {
    map.set(uid, {
      resolved: a.resolved,
      open: a.open,
      total: a.resolved + a.open,
      avgResolutionMins: a.timed > 0 ? Math.round(a.totalMins / a.timed) : undefined,
      currentTicket: a.current ? { title: a.current.title, startTimeIso: a.current.startTimeIso } : undefined,
    });
  }

  return map;
}

