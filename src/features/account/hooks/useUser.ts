/**
 * useUser – current user profile from session + Supabase
 * No UI; use in screens that need profile (e.g. Home, UserProfile).
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@features/auth';
import { getProfile, userProfileFromSession } from '../services/user';
import type { UserProfile } from '@/types/home.types';

const DEFAULT_PROFILE: UserProfile = {
  name: 'User',
  role: 'Staff',
  department: undefined,
  avatar: undefined,
  hasFlag: false,
};

export interface UseUserResult {
  user: UserProfile;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useUser(hasFlag = false): UseUserResult {
  const { session } = useAuth();
  const [user, setUser] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!session?.user) {
      setUser(DEFAULT_PROFILE);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fromSession = userProfileFromSession(
        session.user.user_metadata,
        session.user.email,
        hasFlag
      );
      const profile = await getProfile(session.user.id, fromSession);
      setUser(profile);
    } catch (e) {
      const fromSession = userProfileFromSession(
        session.user.user_metadata,
        session.user.email,
        hasFlag
      );
      setUser(fromSession);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, session?.user?.user_metadata, session?.user?.email, hasFlag]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { user, loading, error, refetch: fetchProfile };
}
