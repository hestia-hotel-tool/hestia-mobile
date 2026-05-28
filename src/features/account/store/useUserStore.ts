/**
 * Current user profile state (Zustand) – from Supabase.
 */

import { create } from 'zustand';
import { getProfile, userProfileFromSession, updateAvatar } from '../services/user';
import type { UserProfile } from '@features/home';

interface UserState {
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  setProfile: (profile: UserProfile | null) => void;
  fetchProfile: (userId: string, sessionFallback: UserProfile) => Promise<void>;
  updateAvatarUrl: (userId: string, imageBase64: string, fileExtension: string) => Promise<string>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,

  setProfile: (profile) => set({ profile }),

  fetchProfile: async (userId: string, sessionFallback: UserProfile) => {
    set({ loading: true, error: null });
    try {
      const profile = await getProfile(userId, sessionFallback);
      set({ profile, loading: false, error: null });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      set({ profile: sessionFallback, loading: false, error: err });
    }
  },

  updateAvatarUrl: async (userId: string, imageBase64: string, fileExtension: string) => {
    set({ error: null });
    const { profile } = get();
    try {
      const { avatarUrl } = await updateAvatar(userId, imageBase64, fileExtension);
      if (profile) set({ profile: { ...profile, avatar: avatarUrl } });
      return avatarUrl;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      set({ error: err });
      throw err;
    }
  },
}));
