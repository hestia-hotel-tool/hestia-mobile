/**
 * Rooms state (Zustand) – list and updates from Supabase.
 */

import { create } from 'zustand';
import { invalidateNotificationBadges } from '@/lib/inAppNotifications';
import { dashboardService, type RoomStateUpdate } from '../services/dashboard';
import type { AllRoomsScreenData, RoomCardData, StaffInfo } from '../types/allRooms.types';
import type { ShiftType } from '@/types/shift.types';
import { getShiftFromTime } from '@/utils/shiftUtils';

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
  fetchRooms: (shift?: ShiftType, options?: { force?: boolean }) => Promise<void>;
  updateRoom: (roomId: string, updates: RoomStateUpdate) => Promise<void>;
  /** Set assigned staff for a room (optimistic update after assign from modal). */
  setRoomAttendant: (roomId: string, staff: StaffInfo | null) => void;
  setData: (data: AllRoomsScreenData | null) => void;
  setSelectedShift: (shift: ShiftType) => void;
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
    queueMicrotask(() => invalidateNotificationBadges());
  },

  fetchRooms: async (shift?: ShiftType, options?: { force?: boolean }) => {
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
    set({
      loading: isInitial,
      refreshing: !isInitial,
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
        queueMicrotask(() => invalidateNotificationBadges());
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

  updateRoom: async (roomId: string, updates: RoomStateUpdate) => {
    set({ updatingRoomId: roomId });
    try {
      await dashboardService.updateRoomState(roomId, updates);
      const { data } = get();
      if (!data) return;
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
          ...(updates.paused_at !== undefined && { pausedAt: updates.paused_at }),
          ...(updates.refuse_service_at !== undefined && { refuseServiceAt: updates.refuse_service_at }),
          ...(updates.refuse_service_reason !== undefined && { refuseServiceReason: updates.refuse_service_reason }),
        };
      };
      set({
        data: {
          ...data,
          rooms: data.rooms.map(updateInList),
          roomsPM: data.roomsPM?.map(updateInList) ?? data.roomsPM,
        },
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      set({ error: err });
      throw err;
    } finally {
      set({ updatingRoomId: null });
    }
  },
}));
