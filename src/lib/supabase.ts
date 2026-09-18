/**
 * Supabase client configuration
 * Uses AsyncStorage for session persistence in React Native.
 *
 * Credentials come from EXPO_PUBLIC_* env vars only — never hardcoded in source.
 * The values are inlined into the JS bundle at build time from:
 *   - local builds + manual Xcode archive: the gitignored .env.<APP_ENV> file
 *     (expo start -> development, release build/Archive -> production)
 *   - EAS cloud builds: EAS environment variables set per environment via
 *     `eas env:create` or the EAS dashboard (see the profiles in eas.json)
 *
 * IMPORTANT: these MUST be accessed as STATIC properties
 * (`process.env.EXPO_PUBLIC_*`). Metro/babel only inlines EXPO_PUBLIC_* vars on
 * static member access — a computed `process.env[key]` is NOT replaced and ends
 * up undefined in release bundles.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

export const ENV_KEYS = {
  SUPABASE_URL: 'EXPO_PUBLIC_SUPABASE_URL',
  SUPABASE_PUBLISHABLE_KEY: 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
} as const;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const isSupabaseConfigured = !!(supabaseUrl && supabasePublishableKey);

if (!isSupabaseConfigured) {
  console.warn(
    `Supabase not configured. Set ${ENV_KEYS.SUPABASE_URL} and ${ENV_KEYS.SUPABASE_PUBLISHABLE_KEY} in .env.<environment> (local) or as EAS environment variables (cloud builds).`
  );
}

/**
 * iOS drops pooled connections, and the drop is not a real failure.
 *
 * `NSURLErrorNetworkConnectionLost` (-1005) surfaces in RN as "The network
 * connection was lost." It is overwhelmingly a connection the server had
 * already closed being picked out of the pool and reused; the request never
 * reached anyone. Retrying once resolves it. Everything else — a genuine
 * offline, DNS, TLS or timeout — is left alone, because retrying those only
 * doubles the wait before the user is told.
 */
function isConnectionLost(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /network connection was lost/i.test(message);
}

/**
 * Whether replaying this request can do harm.
 *
 * GET/HEAD are safe by definition. PATCH and PUT are safe *here* because every
 * write in this app sets absolute values (`house_keeping_status = 'Dirty'`),
 * so applying one twice lands in the same place as applying it once. POST and
 * DELETE are never retried: a dropped connection cannot tell us whether the
 * server processed the request, and a replayed POST creates a second note,
 * ticket or assignment.
 */
function isReplaySafe(init?: RequestInit): boolean {
  const method = (init?.method ?? 'GET').toUpperCase();
  return method === 'GET' || method === 'HEAD' || method === 'PATCH' || method === 'PUT';
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

    const attempt = async () => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(input, { ...init, signal: controller.signal });
      } finally {
        clearTimeout(id);
      }
    };

    try {
      return await attempt();
    } catch (err) {
      if (isConnectionLost(err) && isReplaySafe(init)) {
        console.warn('[SupabaseFetch] connection lost, retrying once', { url });
        try {
          return await attempt();
        } catch (retryErr) {
          console.error('[SupabaseFetch] failed after retry', {
            url,
            message: retryErr instanceof Error ? retryErr.message : String(retryErr),
          });
          throw retryErr;
        }
      }
      console.error('[SupabaseFetch] failed', { url, message: err instanceof Error ? err.message : String(err) });
      throw err;
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
