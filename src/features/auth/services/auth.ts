/**
 * Authentication service using Supabase Auth
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Session, AuthError } from '@supabase/supabase-js';

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
}

export const authService = {
  /**
   * Sign in with email and password
   */
  async signIn({ email, password }: SignInCredentials): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[Auth] signIn error:', {
        message: error.message,
        status: error.status,
        name: error.name,
        full: JSON.stringify(error),
      });
    }
    return { error };
  },

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[Auth] signOut error:', {
        message: error.message,
        status: error.status,
        name: error.name,
      });
    }
    return { error };
  },

  /**
   * Get the current user's avatar image URL (e.g. from user_metadata.avatar_url).
   * Returns null if not available.
   */
  async getCurrentUserAvatarUrl(): Promise<string | null> {
    const session = await this.getSession();
    if (!session?.user) return null;
    const u = session.user;
    return (u.user_metadata?.avatar_url as string) || (u.user_metadata?.picture as string) || null;
  },

  /**
   * Get display name for the current user (e.g. "Stella Kitou at 09:00am").
   * Uses user_metadata.full_name, then email, then "Staff".
   */
  async getCurrentUserNoteLabel(): Promise<string> {
    const session = await this.getSession();
    if (!session?.user) return 'Staff';
    const u = session.user;
    const name =
      (u.user_metadata?.full_name as string) ||
      (u.user_metadata?.name as string) ||
      u.email?.split('@')[0] ||
      'Staff';
    const now = new Date();
    const hours = now.getHours();
    const mins = now.getMinutes();
    const am = hours < 12;
    const h = hours % 12 || 12;
    const m = mins.toString().padStart(2, '0');
    const ampm = am ? 'am' : 'pm';
    return `${name} at ${h}:${m}${ampm}`;
  },

  /**
   * Get the current session
   */
  async getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured) {
      return null;
    }
    try {
      // iOS can occasionally be slower to resolve network + keychain/session reads,
      // especially right after app start or when the device switches networks.
      const timeoutMs = 15000;
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('getSession timeout')), timeoutMs)
      );
      const {
        data: { session },
        error,
      } = await Promise.race([sessionPromise, timeoutPromise]);
      if (error) {
        const msg = error.message ?? '';
        const isInvalidRefreshToken =
          /refresh token not found|invalid refresh token/i.test(msg);
        if (isInvalidRefreshToken) {
          await supabase.auth.signOut();
        }
        if (!isInvalidRefreshToken) {
          console.error('[Auth] getSession error:', error.message);
        }
        return null;
      }
      return session;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isInvalidRefreshToken =
        /refresh token not found|invalid refresh token/i.test(message);
      if (isInvalidRefreshToken) {
        try {
          await supabase.auth.signOut();
        } catch (_) {}
      }
      if (!isInvalidRefreshToken) {
        console.error('[Auth] getSession error:', err);
      }
      return null;
    }
  },

  /**
   * Subscribe to auth state changes (e.g. session changes, token refresh)
   */
  onAuthStateChange(
    callback: (event: string, session: Session | null) => void
  ): { data: { subscription: { unsubscribe: () => void } } } {
    return supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] authStateChange:', event, session ? 'session' : 'null');
      callback(event, session);
    });
  },

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: undefined, // Configure redirect URL in Supabase dashboard for web
    });
    if (error) {
      console.error('[Auth] resetPassword error:', {
        message: error.message,
        status: error.status,
        name: error.name,
      });
    }
    return { error };
  },
};
