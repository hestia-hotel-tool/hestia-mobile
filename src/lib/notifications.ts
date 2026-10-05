import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * What a push carries (sent by the `notify` Edge Function): the notification
 * row's own `data` — chatId, messageId, roomId, ticketId… — plus its `type` and
 * `notificationId`.
 */
export type PushData = {
  type?: string;
  notificationId?: string;
  chatId?: string;
  messageId?: string;
  roomId?: string | null;
  shiftId?: string;
  ticketId?: string;
};

/**
 * How a push is shown while the app is open.
 *
 * Not as a system banner: the same notification arrives over Realtime and is
 * shown as the in-app toast (`presentIncomingNotificationAlert`), so a banner
 * on top would say everything twice. With the app in the background or closed,
 * the system shows the push as normal — banner, sound, lock screen.
 */
export function configureForegroundNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Hestia',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 120, 250],
    enableVibrate: true,
    showBadge: true,
  });
}

/** Call once at app startup so presentation is correct even before push registration runs. */
export async function setupNotificationPresentation(): Promise<void> {
  try {
    configureForegroundNotifications();
    await ensureAndroidChannel();
  } catch (e) {
    console.warn('[notifications] setupNotificationPresentation failed', e);
  }
}

/**
 * Registers for push notifications and persists the Expo push token to Supabase.
 * No-ops on simulators and when Supabase is not configured.
 */
/**
 * One registration at a time, and none at all when nothing changed.
 *
 * Fetching the Expo push token makes the OS emit its device token, and the
 * token listener in the root layout re-registered on every such event — so
 * each registration triggered the next: an endless loop of RPCs from every
 * signed-in device (over a million calls on dev). Calls now share the one in
 * flight, and a token already registered for this user is not sent again.
 */
let inFlight: Promise<{ token: string | null }> | null = null;
let registeredFor: { token: string; userId: string } | null = null;

export function registerAndSyncPushToken(): Promise<{ token: string | null }> {
  if (!inFlight) {
    inFlight = registerOnce().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function registerOnce(): Promise<{ token: string | null }> {
  if (!isSupabaseConfigured) return { token: null };
  await setupNotificationPresentation();

  if (!Device.isDevice) {
    // Expo push tokens aren't available on iOS simulators; devs should test on device.
    return { token: null };
  }

  const allowsPush = (status: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>) =>
    status.granted ||
    (Platform.OS === 'ios' &&
      status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL);

  let perm = await Notifications.getPermissionsAsync();
  if (!allowsPush(perm)) {
    perm = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
      // Required when passing a custom request: Android uses this branch (POST_NOTIFICATIONS on 13+).
      android: {},
    });
  }

  if (!allowsPush(perm)) return { token: null };

  const projectId =
    // EAS project id for Expo push tokens (SDK 49+).
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
    (Constants.easConfig?.projectId as string | undefined);

  const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const token = tokenResponse.data;
  if (!token) return { token: null };

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return { token: null };
  // Already registered for this user: nothing to tell the server.
  if (registeredFor?.token === token && registeredFor.userId === userId) return { token };

  // SECURITY DEFINER so a device can move between accounts (the last one to
  // sign in on it gets its pushes) without RLS blocking the takeover.
  const { error } = await supabase.rpc('register_expo_push_token' as never, {
    p_expo_push_token: token,
    p_device_os: Platform.OS,
    p_device_name: Device.deviceName ?? null,
  } as never);
  if (error) {
    console.warn('[push] register_expo_push_token', error.message, error.code);
    return { token: null };
  }
  registeredToken = token;
  registeredFor = { token, userId };
  return { token };
}

/** This device's token, once registered for the signed-in account. */
let registeredToken: string | null = null;

/**
 * Stop this device receiving the account's pushes. Call before signing out,
 * while the session still exists to authorise the delete.
 */
export async function unregisterPushToken(): Promise<void> {
  if (!isSupabaseConfigured || !registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  registeredFor = null;
  const { error } = await supabase.rpc('unregister_expo_push_token' as never, { p_expo_push_token: token } as never);
  if (error) console.warn('[push] unregister_expo_push_token', error.message);
  await Notifications.setBadgeCountAsync(0).catch(() => {});
}

/**
 * Set the app icon badge to the signed-in user's unread notifications. Each
 * push sets it on arrival; this brings it back down as they are read.
 */
export async function syncAppIconBadge(): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    if (!userId) return;
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);
    if (error) return;
    await Notifications.setBadgeCountAsync(count ?? 0);
  } catch {
    // The badge is a convenience; never let it throw.
  }
}
