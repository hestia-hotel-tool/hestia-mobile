import { isAuthApiError } from '@supabase/supabase-js';

/**
 * A stored session the server no longer honours — the refresh token expired,
 * was revoked (signed out elsewhere, password changed) or its user is gone.
 *
 * This is an expected end to a session, not a fault. supabase-js handles it
 * itself (it drops the session and emits SIGNED_OUT, which returns the app to
 * the login screen), but first logs the error with `console.error`, which in
 * development raises the red LogBox over the screen. Only these codes count:
 * every other auth error still logs as before.
 */
const EXPIRED_SESSION_CODES = new Set([
  'refresh_token_not_found',
  'refresh_token_already_used',
  'session_not_found',
  'session_expired',
]);

export function isExpiredSessionError(value: unknown): boolean {
  if (isAuthApiError(value)) {
    if (value.code && EXPIRED_SESSION_CODES.has(value.code)) return true;
    return /invalid refresh token|refresh token not found/i.test(value.message);
  }
  return false;
}

let sessionExpired = false;

/** Record that the session ended by expiring, so the login screen can say so. */
export function markSessionExpired(): void {
  sessionExpired = true;
}

/** Whether the last session expired; clears the flag. */
export function consumeSessionExpired(): boolean {
  const was = sessionExpired;
  sessionExpired = false;
  return was;
}

let installed = false;

/**
 * Keep supabase-js's expired-session error out of `console.error`. Install
 * before the client is created: the refresh runs as the client starts up.
 */
export function installExpiredSessionLogFilter(): void {
  if (installed) return;
  installed = true;
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (args.some(isExpiredSessionError)) {
      markSessionExpired();
      if (__DEV__) console.log('[Auth] Session expired — signing out.');
      return;
    }
    original(...args);
  };
}
