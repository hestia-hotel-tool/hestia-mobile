/**
 * The Staff screen's roster, assembled.
 *
 * One entry point that returns a finished `StaffRoster` — people already sorted
 * into the frame's three groups, with their workload and the guest they are
 * standing in front of. The screen renders it; it does not compose it.
 *
 * What this replaces: four raw effects and six pieces of state in
 * `StaffScreen`, one of which re-fired on every department switch because it
 * depended on an array identity, and a `useFocusEffect` that fetched a second
 * time on first mount.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getUsersByDepartmentId } from '@features/account/services/user';
import { loadRoomPickerRoomsByIds } from '@features/rooms/services/roomPicker';
import { fetchStaffTicketStats } from './staff';
import { deriveStaffShiftState, pickCurrentShift, toShiftWindow } from '../utils/shiftState';
import type { RoomStatusKey } from '@/components/ui/StatusCircle';
import type {
  ShiftWindow,
  StaffAssignedRoom,
  StaffAssignmentFacts,
  StaffCurrentAssignment,
  StaffRoster,
  StaffRosterPerson,
  StaffRosterSection,
  StaffShiftState,
  StaffWorkload,
} from '../types/staffRoster.types';

export interface StaffRosterQuery {
  departmentId: string;
  departmentName: string;
  statKind: 'cleaning' | 'tickets';
  /** `'current'` derives from the clock (Shifts tab); `'AM'`/`'PM'` pin a shift. */
  shift: 'current' | 'AM' | 'PM';
}

/* ------------------------------------------------------------------ shifts */

/**
 * The hotel's shifts, fetched once per session.
 *
 * `services/staff.ts` resolves a shift id with its own `ilike` round trip
 * *before* every stats query, serially. There are two shifts and they do not
 * change during a session.
 */
let shiftCache: Promise<ShiftWindow[]> | null = null;

export function clearStaffRosterCache(): void {
  shiftCache = null;
}

async function listShiftWindows(): Promise<ShiftWindow[]> {
  if (shiftCache) return shiftCache;
  shiftCache = (async () => {
    const { data, error } = await supabase.from('shifts').select('id, name, start_time, end_time');
    if (error || !data) {
      if (__DEV__) console.warn('[staffRoster] Could not load shifts', error);
      return [];
    }
    return (data as any[]).map(toShiftWindow);
  })();
  return shiftCache;
}

/* ------------------------------------------------------------------ roster */

/**
 * Who is rostered on which shift — `users.shift_id`.
 *
 * Before this column existed, "who works AM?" could only be answered by
 * looking at who held a room on the AM shift, so **26 of 35 staff belonged to
 * no shift at all** and the tabs could only ever list the nine with
 * assignments. Membership is now a property of the person; assignments still
 * supply the workload.
 *
 * Its own small query rather than widening `getUsersByDepartmentId`: that
 * returns the shared `User` type, and putting a shift on it would push a Staff
 * concern onto every other consumer.
 */
async function fetchShiftIdsByUser(userIds: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (userIds.length === 0) return map;
  const { data, error } = await supabase
    .from('users')
    .select('id, shift_id')
    .in('id', userIds);
  if (error || !data) {
    if (__DEV__) console.warn('[staffRoster] Could not load shift ids', error);
    return map;
  }
  /*
   * `as unknown as` because `src/types/supabase.ts` predates this column —
   * the same generated-types drift that already forces a cast for
   * `job_title_id` in `services/staff.ts` and for `hotel_id` elsewhere.
   * Regenerating is a known separate job: it currently breaks typecheck on
   * inserts that omit `hotel_id`.
   */
  for (const row of data as unknown as { id: string; shift_id: string | null }[]) {
    map.set(String(row.id), row.shift_id ?? null);
  }
  return map;
}

/* -------------------------------------------------------------- assignments */

interface AssignmentBucket {
  facts: StaffAssignmentFacts;
  work: StaffWorkload;
  current?: StaffCurrentAssignment;
  /**
   * Every room this person holds, not just the one being worked.
   *
   * These rows were already being read to total the workload and then thrown
   * away — an attendant with seven assigned rooms and none started kept no
   * room numbers at all, because only an in-progress or paused row could
   * become `current`. The expanded card needs all of them, and needs no extra
   * query to get them.
   */
  rooms: StaffAssignedRoom[];
}

/** `'In Progress'`, `'in_progress'`, `'inprogress'` → `inprogress`. */
function normalise(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/[\s_]+/g, '');
}

/**
 * `rooms.house_keeping_status` → the key `ROOM_STATUS` is indexed by.
 *
 * Free text in the column, and `rooms.ts` defaults anything unrecognised to
 * Dirty; this agrees with it rather than inventing a fifth state.
 */
function toRoomStatusKey(value: unknown): RoomStatusKey {
  switch (normalise(value)) {
    case 'inprogress':
      return 'inProgress';
    case 'cleaned':
      return 'cleaned';
    case 'inspected':
      return 'inspected';
    default:
      return 'dirty';
  }
}

/**
 * Every assignment for these people across **both** shifts, in one query.
 *
 * One request rather than one per tab: the AM and PM tabs then cost nothing to
 * switch between, and the Shifts tab reads the same rows. The previous code
 * refetched on every tab press and threw the other shift's rows away.
 */
async function fetchAssignments(
  userIds: string[],
  shiftIds: string[],
): Promise<Map<string, Map<string, AssignmentBucket>>> {
  const byShift = new Map<string, Map<string, AssignmentBucket>>();
  if (userIds.length === 0 || shiftIds.length === 0) return byShift;

  const { data, error } = await supabase
    .from('room_assignments')
    .select(
      // `rooms.paused_at` is the real pause signal — see StaffAssignmentFacts.
      'user_id, shift_id, work_status, start_time, created_at, pause_reason, ' +
        'rooms:rooms(id, room_number, house_keeping_status, credit, paused_at)',
    )
    .in('shift_id', shiftIds)
    .in('user_id', userIds);

  if (error || !data) {
    if (__DEV__) console.warn('[staffRoster] Could not load assignments', error);
    return byShift;
  }

  for (const row of data as any[]) {
    const shiftId = String(row.shift_id ?? '');
    const userId = String(row.user_id ?? '');
    if (!shiftId || !userId) continue;

    let forShift = byShift.get(shiftId);
    if (!forShift) {
      forShift = new Map();
      byShift.set(shiftId, forShift);
    }
    let bucket = forShift.get(userId);
    if (!bucket) {
      bucket = {
        facts: { total: 0, notStarted: 0, inProgress: 0, completed: 0, paused: 0 },
        work: { total: 0, completed: 0, inProgress: 0, cleaned: 0, dirty: 0 },
        rooms: [],
      };
      forShift.set(userId, bucket);
    }

    const room = Array.isArray(row.rooms) ? row.rooms[0] : row.rooms;
    const status = normalise(row.work_status);
    const isPaused = room?.paused_at != null || status === 'paused';

    bucket.facts.total += 1;
    if (isPaused) bucket.facts.paused += 1;
    else if (status === 'inprogress') bucket.facts.inProgress += 1;
    else if (status === 'completed') bucket.facts.completed += 1;
    else bucket.facts.notStarted += 1;

    // The stats row counts *rooms* by housekeeping status, which is a different
    // question from what the assignment's work_status says about the person.
    const hk = normalise(room?.house_keeping_status);
    bucket.work.total += 1;
    if (hk === 'inprogress') bucket.work.inProgress += 1;
    else if (hk === 'cleaned' || hk === 'inspected') bucket.work.cleaned += 1;
    else bucket.work.dirty += 1;
    if (status === 'completed') bucket.work.completed += 1;

    if (room?.room_number) {
      bucket.rooms.push({
        roomId: room.id ? String(room.id) : undefined,
        roomNumber: String(room.room_number),
        status: toRoomStatusKey(room.house_keeping_status),
        isPaused,
      });
    }

    /*
     * "Current" prefers the room being worked over a paused one — someone who
     * paused 204 and started 205 is in 205. Without the preference the card
     * would show whichever row the database happened to return first.
     */
    const isCandidate = status === 'inprogress' || isPaused;
    const beatsExisting = !bucket.current || (bucket.current.isPaused && !isPaused);
    if (isCandidate && beatsExisting && room?.room_number) {
      bucket.current = {
        roomId: room.id ? String(room.id) : undefined,
        roomNumber: String(room.room_number),
        startTimeIso: row.start_time ?? row.created_at ?? null,
        creditMins: typeof room.credit === 'number' ? room.credit : undefined,
        isPaused,
        pauseReason: row.pause_reason ?? null,
      };
    }
  }

  return byShift;
}

/* ------------------------------------------------------------------ roster */

const SECTION_ORDER: readonly {
  state: StaffShiftState;
  title: StaffRosterSection['title'];
}[] = [
  { state: 'on_shift', title: 'On Shift' },
  { state: 'on_break', title: 'On Break' },
  { state: 'shift_end', title: 'Shift End' },
];

function emptyRoster(shift: ShiftWindow | null): StaffRoster {
  return {
    sections: SECTION_ORDER.map((s) => ({ ...s, people: [] })) as unknown as StaffRoster['sections'],
    shift,
    totalCount: 0,
  };
}

export async function loadStaffRoster(
  query: StaffRosterQuery,
  now: Date = new Date(),
): Promise<StaffRoster> {
  if (!isSupabaseConfigured || !query.departmentId) return emptyRoster(null);

  // Independent, so they overlap rather than queue.
  const [usersResult, windows] = await Promise.all([
    getUsersByDepartmentId(query.departmentId, { limit: 100 }),
    listShiftWindows(),
  ]);

  const users = usersResult?.data ?? [];
  const shift =
    query.shift === 'current'
      ? pickCurrentShift(windows, now)
      : (windows.find((w) => w.name.toLowerCase() === query.shift.toLowerCase()) ?? null);

  if (users.length === 0) return emptyRoster(shift);
  const allUserIds = users.map((u) => u.id);

  /*
   * The tab is a roster, so it lists the people rostered on that shift — not
   * everyone in the department. Someone unrostered (`shift_id` null) appears
   * on neither tab rather than on both, which is the honest answer: nobody
   * has said when they work.
   */
  const shiftIdByUser = await fetchShiftIdsByUser(allUserIds);
  const rostered = shift
    ? users.filter((u) => shiftIdByUser.get(u.id) === shift.id)
    : users;

  if (rostered.length === 0) return emptyRoster(shift);
  const userIds = rostered.map((u) => u.id);

  const [assignmentsByShift, ticketStats] = await Promise.all([
    query.statKind === 'cleaning'
      ? fetchAssignments(userIds, windows.map((w) => w.id))
      : Promise.resolve(new Map<string, Map<string, AssignmentBucket>>()),
    query.statKind === 'tickets'
      ? fetchStaffTicketStats(userIds)
      : Promise.resolve(new Map<string, any>()),
  ]);

  const forShift = shift ? (assignmentsByShift.get(shift.id) ?? new Map()) : new Map();

  /*
   * Guests, only for the rooms somebody is actually standing in — usually
   * fewer than ten, and skipped entirely when nobody is mid-room.
   */
  const currentRoomIds = Array.from(forShift.values())
    .map((b: AssignmentBucket) => b.current?.roomId)
    .filter((id): id is string => !!id);
  const roomsById = await loadRoomPickerRoomsByIds(currentRoomIds);

  const people: StaffRosterPerson[] = rostered.map((user) => {
    const bucket = forShift.get(user.id) as AssignmentBucket | undefined;
    const facts = bucket?.facts ?? {
      total: 0,
      notStarted: 0,
      inProgress: 0,
      completed: 0,
      paused: 0,
    };

    const current = bucket?.current
      ? {
          ...bucket.current,
          guest: bucket.current.roomId
            ? roomsById.get(bucket.current.roomId)?.primaryGuest
            : undefined,
        }
      : undefined;

    return {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatar || undefined,
      departmentName: user.department ?? query.departmentName,
      jobTitle: user.jobTitle ?? user.role,
      state: deriveStaffShiftState({ facts, window: shift, now }),
      shiftName: shift?.name ?? '',
      statKind: query.statKind,
      work: query.statKind === 'cleaning' ? (bucket?.work ?? {
        total: 0,
        completed: 0,
        inProgress: 0,
        cleaned: 0,
        dirty: 0,
      }) : undefined,
      current,
      tickets: query.statKind === 'tickets' ? ticketStats.get(user.id)?.summary : undefined,
      /*
       * Sorted by room number so the expanded list reads like a floor plan
       * rather than the order PostgREST happened to return.
       */
      rooms: [...(bucket?.rooms ?? [])].sort((a, b) =>
        a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }),
      ),
      ticketList:
        query.statKind === 'tickets' ? (ticketStats.get(user.id)?.tickets ?? []) : [],
    };
  });

  const sections = SECTION_ORDER.map(({ state, title }) => ({
    state,
    title,
    people: people.filter((p) => p.state === state),
  })) as unknown as StaffRoster['sections'];

  return { sections, shift, totalCount: people.length };
}
