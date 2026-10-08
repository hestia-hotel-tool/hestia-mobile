/**
 * Rooms state (Zustand) – list and updates from Supabase.
 */

import { create } from 'zustand';
import { dashboardService, type RoomClock, type RoomStateUpdate } from '../services/dashboard';
import { fetchRoomBadgeCounts } from '../services/rooms';
import { runRoomAction as runRoomActionRpc, type RoomActionResult } from '../services/roomActions';
import { workStatusAfter, type RoomAction } from '../utils/roomStatusMachine';
import type { AllRoomsScreenData, RoomCardData, StaffInfo } from '../types/allRooms.types';
import type { ShiftType } from '@/types/shift.types';
import { getShiftFromTime } from '@/utils/shiftUtils';
import { ensureHotelShifts } from '@/lib/hotelShifts';

/**
 * How long a fetched list is served without going back to the network.
 *
 * Long enough that a tab switch, or a round trip through room detail, costs
 * nothing; short enough that a list left open across a shift handover is not
 * trusted. Pull-to-refresh and any explicit `{ force: true }` ignore it.
 */
const STALE_AFTER_MS = 60_000;

/**
 * The fetch currently in flight, if any, keyed by the shift it is fetching.
 *
 * Without this two overlapping callers — and there are several, a focus effect
 * and a shift change and a badge tap can all land in the same tick — each hit
 * the network and then raced to `set({ data })`, so the list could end up
 * showing whichever response happened to be slower.
 */
let inflight: { shift: ShiftType; token: object; promise: Promise<void> } | null = null;

/**
 * Bumped whenever the tenant-scoped caches are cleared.
 *
 * A fetch that was already in flight when the user signed out would otherwise
 * write the previous tenant's rooms into the fresh store. Each fetch captures
 * the generation it started in and drops its result if it no longer matches.
 */
let generation = 0;

/** Called from `resetTenantScopedStores` — see the note there. */
export function clearRoomsFetchCache() {
  generation += 1;
  inflight = null;
}

interface RoomsState {
  data: AllRoomsScreenData | null;
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  updatingRoomId: string | null;
  /** When `data` was last fetched, for the staleness check. */
  lastFetchedAt: number | null;
  /** The shift `data` was fetched for, so a shift change always refetches. */
  lastFetchedShift: ShiftType | null;
  fetchRooms: (shift?: ShiftType, options?: { force?: boolean; silent?: boolean }) => Promise<void>;
  /**
   * A room row as realtime delivered it (another device changed it): applied
   * to that card in place, no refetch. Returns false when the room is not in
   * the list.
   */
  applyRoomRow: (row: Record<string, unknown>) => boolean;
  /** Resolves with the room's cleaning clock as the database left it. */
  updateRoom: (roomId: string, updates: RoomStateUpdate) => Promise<RoomClock | null>;
  /**
   * A housekeeping status or service-state change, through `room_action()` —
   * the only path for those. Applies the room as the server left it.
   */
  runRoomAction: (
    roomId: string,
    action: RoomAction,
    options?: { reason?: string | null; until?: string | null }
  ) => Promise<RoomActionResult>;
  /** Set assigned staff for a room (optimistic update after assign from modal). */
  setRoomAttendant: (roomId: string, staff: StaffInfo | null) => void;
  /**
   * Re-read one room's note and lost & found counts and patch its card, so
   * the bell and lost-and-found tiles appear (or go) as soon as a note is
   * added or an item is registered, returned, shipped or discarded — without
   * waiting for the list's next refetch. No-op when the list is not loaded.
   */
  refreshRoomBadges: (roomId: string | null | undefined) => Promise<void>;
  setData: (data: AllRoomsScreenData | null) => void;
  setSelectedShift: (shift: ShiftType) => void;
}

/** A write's read-back, as card fields. */
export function roomStateFromClock(clock: RoomClock): Partial<RoomCardData> {
  return {
    promiseTimeAt: clock.promiseTimeAt,
    cleaningStartedAt: clock.cleaningStartedAt,
    cleaningElapsedSeconds: clock.cleaningElapsedSeconds,
    ...(clock.houseKeepingStatus && {
      houseKeepingStatus: clock.houseKeepingStatus as RoomCardData['houseKeepingStatus'],
    }),
    pausedAt: clock.pausedAt,
    returnLaterAt: clock.returnLaterAt,
    returnLaterReason: clock.returnLaterReason,
    refuseServiceAt: clock.refuseServiceAt,
    refuseServiceReason: clock.refuseServiceReason,
    dndAt: clock.dndAt,
    dndCheckedAt: clock.dndCheckedAt,
    dndCheckCount: clock.dndCheckCount,
    dndNextCheckAt: clock.dndNextCheckAt,
    ...(clock.inProgressStartedAt !== undefined && { inProgressStartedAt: clock.inProgressStartedAt }),
  };
}

/** Card fields from a raw `rooms` row (realtime payload), only those present. */
export function roomPatchFromRow(row: Record<string, unknown>): Partial<RoomCardData> {
  const has = (k: string) => Object.prototype.hasOwnProperty.call(row, k);
  const str = (k: string) => (row[k] as string | null) ?? null;
  const out: Partial<RoomCardData> = {};
  if (has('house_keeping_status') && row.house_keeping_status) {
    out.houseKeepingStatus = row.house_keeping_status as RoomCardData['houseKeepingStatus'];
  }
  if (has('priority')) out.isPriority = row.priority === 'high';
  if (has('flagged')) out.flagged = !!row.flagged;
  if (has('flag_reason')) out.flagReason = str('flag_reason');
  if (has('paused_at')) out.pausedAt = str('paused_at');
  if (has('return_later_at')) out.returnLaterAt = str('return_later_at');
  if (has('return_later_reason')) out.returnLaterReason = str('return_later_reason');
  if (has('refuse_service_at')) out.refuseServiceAt = str('refuse_service_at');
  if (has('refuse_service_reason')) out.refuseServiceReason = str('refuse_service_reason');
  if (has('promise_time_at')) out.promiseTimeAt = str('promise_time_at');
  if (has('dnd_at')) out.dndAt = str('dnd_at');
  if (has('dnd_checked_at')) out.dndCheckedAt = str('dnd_checked_at');
  if (has('dnd_check_count')) out.dndCheckCount = (row.dnd_check_count as number | null) ?? 0;
  if (has('dnd_next_check_at')) out.dndNextCheckAt = str('dnd_next_check_at');
  if (has('cleaning_started_at')) out.cleaningStartedAt = str('cleaning_started_at');
  if (has('cleaning_elapsed_seconds')) out.cleaningElapsedSeconds = (row.cleaning_elapsed_seconds as number | null) ?? 0;
  if (has('in_progress_started_at')) out.inProgressStartedAt = str('in_progress_started_at');
  if (has('special_instructions')) out.specialInstructions = str('special_instructions');
  return out;
}

export const useRoomsStore = create<RoomsState>((set, get) => ({
  data: null,
  loading: false,
  refreshing: false,
  error: null,
  updatingRoomId: null,
  lastFetchedAt: null,
  lastFetchedShift: null,

  setData: (data) => set({ data }),
  setSelectedShift: (shift) => {
    const { data } = get();
    if (data) set({ data: { ...data, selectedShift: shift } });
  },
  setRoomAttendant: (roomId, staff: StaffInfo | null) => {
    const { data } = get();
    if (!data) return;
    const update = (room: RoomCardData): RoomCardData =>
      room.id === roomId ? { ...room, roomAttendantAssigned: staff } : room;
    set({
      data: {
        ...data,
        rooms: data.rooms.map(update),
        roomsPM: data.roomsPM?.map(update) ?? data.roomsPM,
      },
    });
  },

  refreshRoomBadges: async (roomId) => {
    if (!roomId || !get().data) return;
    let counts: Awaited<ReturnType<typeof fetchRoomBadgeCounts>>;
    try {
      counts = await fetchRoomBadgeCounts(roomId);
    } catch (e) {
      console.warn('[useRoomsStore] refreshRoomBadges', e);
      return;
    }
    // Read again: the list may have been refetched or cleared meanwhile.
    const { data } = get();
    if (!data) return;
    const patch = (room: RoomCardData): RoomCardData =>
      room.id !== roomId
        ? room
        : {
            ...room,
            notes: counts.noteCount > 0 ? { count: counts.noteCount, hasRushed: room.notes?.hasRushed ?? false } : undefined,
            roomNotes: counts.noteCount > 0 ? undefined : null,
            noteMadeBy: counts.lastNoteBy ?? null,
            lostAndFoundCount: counts.lostAndFoundCount,
          };
    set({
      data: {
        ...data,
        rooms: data.rooms.map(patch),
        roomsPM: data.roomsPM?.map(patch) ?? data.roomsPM,
      },
    });
  },

  fetchRooms: async (shift?: ShiftType, options?: { force?: boolean; silent?: boolean }) => {
    // The hotel's shift times decide "now" — load them before the first guess.
    if (!shift) await ensureHotelShifts();
    const currentShift = shift ?? getShiftFromTime();
    const { data, lastFetchedAt, lastFetchedShift } = get();

    /*
     * Serve what we have.
     *
     * Every tab screen refetches on focus, so returning to Rooms used to mean
     * a full waterfall for a list that had not changed. Inside the window the
     * painted data stands and this is a no-op — the screen appears on the
     * first frame with no spinner, which is the point.
     */
    if (
      !options?.force &&
      data &&
      lastFetchedShift === currentShift &&
      lastFetchedAt !== null &&
      Date.now() - lastFetchedAt < STALE_AFTER_MS
    ) {
      return;
    }

    // Join the request already running rather than starting a second one.
    if (inflight && inflight.shift === currentShift) return inflight.promise;

    const startedGeneration = generation;
    const isInitial = !data;
    // A silent refetch (a live update) keeps the list on screen, no overlay.
    set({
      loading: isInitial,
      refreshing: !isInitial && !options?.silent,
      error: null,
    });

    const startedAt = __DEV__ ? Date.now() : 0;
    // Identity for the `finally` below — it must only clear `inflight` if it is
    // still its own entry, and it cannot reference the promise it is part of.
    const token = {};
    const request = (async () => {
      try {
        const result = await dashboardService.getAllRoomsData(currentShift);
        // Dropped if the tenant changed while this was in flight.
        if (startedGeneration !== generation) return;
        if (__DEV__) console.log(`[perf] fetchAllRooms ${Date.now() - startedAt}ms`);
        set({
          data: { ...result, selectedShift: currentShift },
          loading: false,
          refreshing: false,
          error: null,
          lastFetchedAt: Date.now(),
          lastFetchedShift: currentShift,
        });
          } catch (e) {
        if (startedGeneration !== generation) return;
        const err = e instanceof Error ? e : new Error(String(e));
        set({
          loading: false,
          refreshing: false,
          error: err,
        });
      } finally {
        if (inflight?.token === token) inflight = null;
      }
    })();

    inflight = { shift: currentShift, token, promise: request };
    return request;
  },

  applyRoomRow: (row) => {
    const { data } = get();
    const id = typeof row.id === 'string' ? row.id : null;
    if (!data || !id) return false;
    const inList = data.rooms.some((r) => r.id === id) || (data.roomsPM ?? []).some((r) => r.id === id);
    if (!inList) return false;
    const patch = roomPatchFromRow(row);
    const apply = (room: RoomCardData): RoomCardData => (room.id === id ? { ...room, ...patch } : room);
    set({ data: { ...data, rooms: data.rooms.map(apply), roomsPM: data.roomsPM?.map(apply) ?? data.roomsPM } });
    return true;
  },

  runRoomAction: async (roomId, action, options) => {
    set({ updatingRoomId: roomId });
    try {
      const result = await runRoomActionRpc(roomId, action, options);
      const { data } = get();
      if (data) {
        const nextWork = workStatusAfter(action);
        const apply = (room: RoomCardData): RoomCardData => {
          if (room.id !== roomId) return room;
          const next = { ...room, ...roomStateFromClock(result) };
          // The assignment's progress moved with the room (isRoomPaused reads it).
          if (nextWork !== undefined && next.roomAttendantAssigned) {
            next.roomAttendantAssigned = { ...next.roomAttendantAssigned, assignmentWorkStatus: nextWork };
          }
          return next;
        };
        set({
          data: { ...data, rooms: data.rooms.map(apply), roomsPM: data.roomsPM?.map(apply) ?? data.roomsPM },
        });
      }
      return result;
    } finally {
      set({ updatingRoomId: null });
    }
  },

  updateRoom: async (roomId: string, updates: RoomStateUpdate) => {
    set({ updatingRoomId: roomId });
    try {
      const clock = await dashboardService.updateRoomState(roomId, updates);
      const { data } = get();
      if (!data) return clock;
      const updateInList = (room: RoomCardData): RoomCardData => {
        if (room.id !== roomId) return room;
        return {
          ...room,
          ...(updates.house_keeping_status != null && { houseKeepingStatus: updates.house_keeping_status as RoomCardData['houseKeepingStatus'] }),
          ...(updates.priority != null && { isPriority: updates.priority === 'high' }),
          ...(updates.flagged != null && { flagged: updates.flagged }),
          ...(updates.flag_reason !== undefined && { flagReason: updates.flag_reason }),
          ...(updates.special_instructions !== undefined && { specialInstructions: updates.special_instructions }),
          ...(updates.return_later_at !== undefined && { returnLaterAt: updates.return_later_at }),
          ...(updates.return_later_reason !== undefined && { returnLaterReason: updates.return_later_reason }),
          ...(updates.paused_at !== undefined && { pausedAt: updates.paused_at }),
          ...(updates.refuse_service_at !== undefined && { refuseServiceAt: updates.refuse_service_at }),
          ...(updates.refuse_service_reason !== undefined && { refuseServiceReason: updates.refuse_service_reason }),
          ...(updates.promise_time_at !== undefined && { promiseTimeAt: updates.promise_time_at }),
          ...(updates.dnd_at !== undefined && { dndAt: updates.dnd_at }),
          // The database's word on the room after its triggers ran: the clock,
          // the status (a DND or refusal drops In Progress to Dirty) and every
          // service state. What was sent is only what was asked for.
          ...(clock && roomStateFromClock(clock)),
        };
      };
      set({
        data: {
          ...data,
          rooms: data.rooms.map(updateInList),
          roomsPM: data.roomsPM?.map(updateInList) ?? data.roomsPM,
        },
      });
      return clock;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      set({ error: err });
      throw err;
    } finally {
      set({ updatingRoomId: null });
    }
  },
}));
