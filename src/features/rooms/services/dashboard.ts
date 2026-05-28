/**
 * Dashboard / screen data (Supabase + mock fallback)
 * Aggregates data for home, rooms, chat, tickets. Rooms come from Supabase via rooms service.
 */

import type { HomeScreenData } from '@features/home';
import type { AllRoomsScreenData } from '../types/allRooms.types';
import type { TicketsScreenData } from '@features/tickets';
import type { ChatItemData } from '@features/chat';
import { isSupabaseConfigured, supabase } from '@shared/lib/supabase';
import { fetchAllRooms, updateRoom, assignRoomToStaff as roomsAssignRoomToStaff, type RoomStateUpdate } from './rooms';
import { getTicketsData as getTicketsDataFromSupabase } from '@features/tickets';
import type { StaffInfo } from '../types/allRooms.types';
import { getShiftFromTime } from '@shared/utils/shiftUtils';
import { getToast } from '@shared/utils/toast';

export type { RoomStateUpdate } from './rooms';

const dashboard = {
  async getHomeData(): Promise<HomeScreenData> {
    throw new Error('getHomeData is not supported without Supabase-backed endpoint');
  },

  async getAllRoomsData(shift?: 'AM' | 'PM'): Promise<AllRoomsScreenData> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
    const currentShift = shift ?? getShiftFromTime();
    return await fetchAllRooms(currentShift);
  },

  async updateRoomState(roomId: string, updates: RoomStateUpdate): Promise<void> {
    if (!isSupabaseConfigured) return;
    await updateRoom(roomId, updates);
  },

  /**
   * Assign a room to a staff member for the current shift.
   * When both roomId and userId are UUIDs and Supabase is configured, persists to room_assignments.
   * Always returns StaffInfo when we have a valid user selection so the room card can update (from API or by fetching user).
   */
  async assignRoomToStaff(roomId: string, userId: string, shift: 'AM' | 'PM'): Promise<StaffInfo | null> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Build StaffInfo from Supabase user when staff was selected from Supabase list (UUID)
    const buildStaffInfoFromSupabase = async (): Promise<StaffInfo | null> => {
      if (!isSupabaseConfigured || !uuidRegex.test(userId)) return null;
      const { data } = await supabase.from('users').select('full_name, avatar_url').eq('id', userId).single();
      const row = data as { full_name: string; avatar_url: string | null } | null;
      if (!row) return null;
      const name = row.full_name ?? 'Staff';
      const initials = name.split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase() || '?';
      return {
        name,
        initials,
        avatar: row.avatar_url ?? undefined,
        statusText: 'Not Started',
        statusColor: '#1e1e1e',
      };
    };

    if (isSupabaseConfigured && uuidRegex.test(roomId) && uuidRegex.test(userId)) {
      try {
        const info = await roomsAssignRoomToStaff(roomId, userId, shift);
        return info ?? (await buildStaffInfoFromSupabase());
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Assignment could not be saved';
        console.warn('Assign room failed:', message, e);
        getToast()?.show(message, { type: 'error', duration: 4000 });
        return await buildStaffInfoFromSupabase();
      }
    }

    // Room from mock data but staff from Supabase – still update card with selected user
    if (isSupabaseConfigured && uuidRegex.test(userId)) {
      const fromSupabase = await buildStaffInfoFromSupabase();
      if (fromSupabase) return fromSupabase;
    }

    return null;
  },

  async getChatData(): Promise<ChatItemData[]> {
    return Promise.resolve([]);
  },

  async getTicketsData(): Promise<TicketsScreenData> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
    return await getTicketsDataFromSupabase();
  },
};

export const dashboardService = dashboard;
