import * as NativeSplash from 'expo-splash-screen';

/**
 * Hiding the native splash, exactly once.
 *
 * Called from two independent places in the root layout — a frame callback and
 * an unconditional failsafe timer — so neither can leave the OS splash up.
 *
 * Never gate this on auth or permissions. Those calls go through a 120s
 * request timeout, and a stuck OS splash is indistinguishable from a hung app.
 * There is nothing to wait for anyway: the launch screen shares the native
 * splash's background, so revealing early is invisible.
 */
let hidden = false;

export function hideNativeSplash(): void {
  if (hidden) return;
  hidden = true;
  NativeSplash.hideAsync().catch(() => {});
}

/** Milliseconds after which the splash is hidden no matter what. */
export const NATIVE_SPLASH_FAILSAFE_MS = 4000;
