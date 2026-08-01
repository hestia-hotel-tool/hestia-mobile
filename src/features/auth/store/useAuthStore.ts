/**
 * Auth state (Zustand) – single source of truth for session and auth actions.
 * Synced with Supabase; AuthContext can subscribe to this store for useAuth().
 */

import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { authService } from '../services/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { registerAndSyncPushToken } from '@/lib/notifications';
import { clearCachedHotelId, getMyHotelId } from '@/lib/tenant';
import { resetTenantScopedStores } from '@/store/resetTenantScopedStores';

interface AuthState {
  session: Session | null;
  hotelId: string | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  setSession: (session: Session | null) => void;
  setHotelId: (hotelId: string | null) => void;
  setLoading: (loading: boolean) => void;
  init: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  hotelId: null,
  isLoading: true,
  error: null,

  setSession: (session) => set({ session }),
  setHotelId: (hotelId) => {
    const prev = get().hotelId;
    if (prev && hotelId && prev !== hotelId) {
      // Switching tenants: clear any cached room/chat/user state.
      resetTenantScopedStores();
    }
    set({ hotelId });
  },
  setLoading: (isLoading) => set({ isLoading }),

  signIn: async (email: string, password: string) => {
    set({ error: null });
    try {
      const { error } = await authService.signIn({ email, password });
      if (error) {
        set({ error: error.message });
        return { error: error as Error };
      }
      return { error: null };
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      set({ error: e.message });
      return { error: e };
    }
  },

  signOut: async () => {
    set({ error: null });
    try {
      const { error } = await authService.signOut();
      if (error) {
        set({ error: error.message });
        return { error: error as Error };
      }
      clearCachedHotelId();
      resetTenantScopedStores();
      set({ session: null, hotelId: null });
      return { error: null };
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return { error: e };
    }
  },

  resetPassword: async (email: string) => {
    set({ error: null });
    try {
      const { error } = await authService.resetPassword(email);
      if (error) {
        set({ error: error.message });
        return { error: error as Error };
      }
      return { error: null };
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return { error: e };
    }
  },

  init: () => {
    authService.getSession().then((session) => {
      const prevUserId = get().session?.user?.id ?? null;
      const nextUserId = session?.user?.id ?? null;
      if (prevUserId && nextUserId && prevUserId !== nextUserId) {
        resetTenantScopedStores();
      }
      set({ session, isLoading: false, hotelId: null });
      if (session) {
        registerAndSyncPushToken().catch(() => {});
        getMyHotelId()
          .then((hotelId) => {
            if (!hotelId) set({ error: 'This account is not assigned to a hotel.' });
            set({ hotelId: hotelId ?? null });
          })
          .catch(() => {
            set({ error: 'Could not load hotel assignment.' });
          });
      }
    }).catch(() => {
      clearCachedHotelId();
      resetTenantScopedStores();
      set({ session: null, hotelId: null, isLoading: false });
    });

    if (!isSupabaseConfigured) return () => {};

    const { data: { subscription } } = authService.onAuthStateChange((_event, session) => {
      const prevUserId = get().session?.user?.id ?? null;
      const nextUserId = session?.user?.id ?? null;
      if (prevUserId !== nextUserId) {
        resetTenantScopedStores();
      }
      if (!session) {
        clearCachedHotelId();
        set({ session: null, hotelId: null });
        return;
      }

      set({ session, hotelId: null });
      if (session) {
        registerAndSyncPushToken().catch(() => {});
      }
      getMyHotelId()
        .then((hotelId) => {
          if (!hotelId) set({ error: 'This account is not assigned to a hotel.' });
          set({ hotelId: hotelId ?? null });
        })
        .catch(() => {
          set({ error: 'Could not load hotel assignment.' });
        });
    });
    return () => subscription.unsubscribe();
  },
}));
