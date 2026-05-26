/**
 * Supabase client configuration
 * Uses AsyncStorage for session persistence in React Native
 * Fallbacks to hardcoded config for EAS builds where env vars may not be embedded
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import { SUPABASE_URL as CONFIG_URL, SUPABASE_PUBLISHABLE_KEY as CONFIG_KEY } from '../config/supabase.config';

export const ENV_KEYS = {
  SUPABASE_URL: 'EXPO_PUBLIC_SUPABASE_URL',
  SUPABASE_PUBLISHABLE_KEY: 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
} as const;

const supabaseUrl = process.env[ENV_KEYS.SUPABASE_URL] ?? CONFIG_URL;
const supabasePublishableKey = process.env[ENV_KEYS.SUPABASE_PUBLISHABLE_KEY] ?? CONFIG_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabasePublishableKey);

if (!isSupabaseConfigured) {
  console.warn(
    `Supabase not configured. Update src/config/supabase.config.ts with your project URL and key.`
  );
}

function createTimeoutFetch(defaultTimeoutMs: number) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    // iOS/RN: default 20s is too short for Storage uploads and heavy PostgREST nested selects.
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : 'request';
    // Storage: POST /storage/v1/object/{bucket}/{path}
    const isStorageObjectRequest = url.includes('/storage/v1/object/');
    // PostgREST: nested selects (e.g. rooms → reservations → guests) can exceed 20s on slow networks.
    const isRestQuery = url.includes('/rest/v1/');
    const timeoutMs =
      isStorageObjectRequest || isRestQuery ? 120000 : defaultTimeoutMs;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (err) {
      console.error('[SupabaseFetch] failed', { url, message: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      clearTimeout(id);
    }
  };
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey || 'placeholder-key',
  {
    global: {
      // Helps iOS devices on slow networks avoid hanging requests.
      fetch: createTimeoutFetch(20000),
    },
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
