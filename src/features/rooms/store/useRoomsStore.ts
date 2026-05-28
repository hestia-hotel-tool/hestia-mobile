/**
 * Rooms state (Zustand) – list and updates from Supabase.
 */

import { create } from 'zustand';
import { invalidateNotificationBadges } from '@/services/inAppNotifications';
import { dashboardService, type RoomStateUpdate } from '../services/dashboard';
import type { AllRoomsScreenData, RoomCardData, StaffInfo } from '../types/allRooms.types';
import type { ShiftType } from '@/types/home.types';
import { getShiftFromTime } from '@shared/utils/shiftUtils';

interface RoomsState {
  data: AllRoomsScreenData | null;
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  updatingRoomId: string | null;
  fetchRooms: (shift?: ShiftType) => Promise<void>;
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

  fetchRooms: async (shift?: ShiftType) => {
    const currentShift = shift ?? getShiftFromTime();
    const { data } = get();
    const isInitial = !data;
    set({
      loading: isInitial,
      refreshing: !isInitial,
      error: null,
    });
    try {
      const result = await dashboardService.getAllRoomsData(currentShift);
      set({
        data: { ...result, selectedShift: currentShift },
        loading: false,
        refreshing: false,
        error: null,
      });
      queueMicrotask(() => invalidateNotificationBadges());
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      set({
        loading: false,
        refreshing: false,
        error: err,
      });
    }
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
