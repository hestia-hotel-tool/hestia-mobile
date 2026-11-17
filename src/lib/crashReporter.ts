import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * JavaScript errors: recorded, survived where that is safe, and sent home.
 *
 * TestFlight showed five crashes on 1.2.3 (4), every one `RCTFatal` — a
 * JavaScript error nothing caught, which React Native turns into an abort in
 * a release build. iOS does not put the JS message in the crash log, and the
 * old global handler only `console.error`ed it, which release builds drop. So
 * the crashes said *that* the app died, never *why*.
 *
 * Now every error is queued on the device (AsyncStorage) before anything
 * else happens, and uploaded to `client_errors` on the next launch with a
 * session (migration 20261021120000). And once the app is up, a stray error
 * from a tap or a timer shows an alert instead of killing the app; errors
 * while it is still starting keep the default behaviour, because a half-started
 * app has nothing safe to fall back to. Render errors are caught by the
 * screen-level error boundary (AppErrorBoundary), not here.
 */

const QUEUE_KEY = 'hestia.clientErrors.v1';
const MAX_QUEUED = 20;
/** Past this, the app has painted and settled; an error is no longer a start-up failure. */
const STARTUP_MS = 8000;

export type ClientErrorSource = 'global' | 'render';

type QueuedError = {
  message: string;
  stack: string | null;
  fatal: boolean;
  source: ClientErrorSource;
  route: string | null;
  appVersion: string;
  platform: string;
  occurredAt: string;
};

let currentRoute: string | null = null;
let installedAt = 0;
let installed = false;
let alertShowing = false;

/** The screen on show, for the report. Set by the root layout. */
export function setCrashRoute(route: string | null): void {
  currentRoute = route;
}

function appVersion(): string {
  const version = Constants.expoConfig?.version ?? '?';
  const build =
    Platform.OS === 'ios' ? Constants.expoConfig?.ios?.buildNumber : Constants.expoConfig?.android?.versionCode;
  return build != null ? `${version} (${build})` : version;
}

function describe(error: unknown): { message: string; stack: string | null } {
  if (error instanceof Error) return { message: error.message || error.name, stack: error.stack ?? null };
  try {
    return { message: typeof error === 'string' ? error : JSON.stringify(error), stack: null };
  } catch {
    return { message: String(error), stack: null };
  }
}

async function readQueue(): Promise<QueuedError[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Queue an error on the device. Never throws. */
export async function recordClientError(error: unknown, opts: { fatal: boolean; source: ClientErrorSource }): Promise<void> {
  try {
    const { message, stack } = describe(error);
    const entry: QueuedError = {
      message: message.slice(0, 2000),
      stack: stack ? stack.slice(0, 8000) : null,
      fatal: opts.fatal,
      source: opts.source,
      route: currentRoute,
      appVersion: appVersion(),
      platform: `${Platform.OS} ${String(Platform.Version)}`,
      occurredAt: new Date().toISOString(),
    };
    const queue = await readQueue();
    queue.push(entry);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUED)));
  } catch {
    // Reporting must never be the thing that fails.
  }
}

/** Upload what is queued. Needs a session (RLS); keeps the queue when it cannot. */
export async function flushClientErrors(): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const queue = await readQueue();
    if (queue.length === 0) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    // `as any`: client_errors postdates the generated types (see activityLogs.ts).
    const { error } = await (supabase as any).from('client_errors').insert(
      queue.map((e) => ({
        message: e.message,
        stack: e.stack,
        fatal: e.fatal,
        source: e.source,
        route: e.route,
        app_version: e.appVersion,
        platform: e.platform,
        occurred_at: e.occurredAt,
      }))
    );
    if (!error) await AsyncStorage.removeItem(QUEUE_KEY);
  } catch {
    // Try again next launch.
  }
}

/** With a timeout: a stuck write must not keep a fatal error from surfacing. */
function recordQuickly(error: unknown, fatal: boolean): Promise<void> {
  return Promise.race([
    recordClientError(error, { fatal, source: 'global' }),
    new Promise<void>((resolve) => setTimeout(resolve, 600)),
  ]);
}

/**
 * Install once, at module load of the root layout — before the first render,
 * so a crash during start-up is recorded too.
 */
export function installCrashReporter(): void {
  if (installed) return;
  const ErrorUtils = (globalThis as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, f?: boolean) => void; setGlobalHandler: (h: (e: unknown, f?: boolean) => void) => void } }).ErrorUtils;
  if (!ErrorUtils?.getGlobalHandler || !ErrorUtils?.setGlobalHandler) return;
  installed = true;
  installedAt = Date.now();
  const defaultHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    const fatal = !!isFatal;
    if (__DEV__) {
      // The red box in development is the right tool; record and hand over.
      void recordClientError(error, { fatal, source: 'global' });
      defaultHandler(error, isFatal);
      return;
    }
    const settled = Date.now() - installedAt > STARTUP_MS;
    if (fatal && settled) {
      // Survive it: the error came from a tap, a timer or a callback, and the
      // screens are still mounted. Say so once rather than vanishing.
      void recordQuickly(error, true);
      if (!alertShowing) {
        alertShowing = true;
        Alert.alert('Something went wrong', 'That did not work. Please try again.', [
          { text: 'OK', onPress: () => (alertShowing = false) },
        ]);
      }
      return;
    }
    // Start-up failures (and non-fatal reports) keep the default path,
    // recorded first so the next launch can send it.
    void recordQuickly(error, fatal).finally(() => defaultHandler(error, isFatal));
  });
}
