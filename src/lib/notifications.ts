import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';

export type PushData =
  | { type: 'chat_message'; chatId: string; messageId?: string }
  | { type: 'ticket_tag'; ticketId: string; roomId?: string | null }
  | { type: 'room_assignment'; roomId: string; shiftId?: string };

/**
 * Foreground / presentation behavior for remote notifications.
 * - Android: shouldPlaySound: false suppresses the heads-up banner entirely (Expo maps sound to alert visibility).
 * - iOS: maps to UNNotificationPresentationOptions (banner, list, sound). Prefer banner over legacy alert.
 */
export function configureForegroundNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      ...(Platform.OS === 'android'
        ? { priority: Notifications.AndroidNotificationPriority.HIGH }
        : {}),
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
export async function registerAndSyncPushToken(): Promise<{ token: string | null }> {
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
  const userId = sessionData?.session?.user?.id ?? null;
  if (!userId) return { token: null };

  const device_os = Platform.OS;
  const device_name = Device.deviceName ?? null;

  // Prefer SECURITY DEFINER RPC so the same Expo token can move between accounts without RLS blocking the merge.
  const rpcResult = await (supabase as any).rpc('register_expo_push_token', {
    p_expo_push_token: token,
    p_device_os: device_os,
    p_device_name: device_name,
  });

  if (!rpcResult.error) {
    return { token };
  }

  const rpcMsg = rpcResult.error.message ?? '';
  const rpcMissing =
    rpcResult.error.code === 'PGRST202' ||
    /Could not find the function|does not exist|schema cache/i.test(rpcMsg);

  if (!rpcMissing) {
    console.warn('[push] register_expo_push_token', rpcResult.error.message, rpcResult.error.code);
    return { token };
  }

  // Fallback when migration `20260406140000_register_expo_push_token_rpc.sql` is not applied yet.
  const upsert = await supabase.from('user_push_tokens').upsert(
    {
      user_id: userId,
      expo_push_token: token,
      device_os,
      device_name,
    },
    { onConflict: 'expo_push_token' },
  );
  if (upsert.error) {
    console.warn('[push] Failed to persist push token', upsert.error.message, upsert.error.code);
  }

  return { token };
}

export async function notifyServer(payload: { type: 'chat_message'; messageId: string } | { type: 'ticket_tag'; ticketId: string; taggedUserIds: string[] } | { type: 'room_assignment'; roomId: string; shiftId: string; assignedUserId: string }) {
  if (!isSupabaseConfigured) return;
  try {
    // If the function is configured with `verify_jwt = false`, it can accept
    // requests without a session; still pass the JWT when available.
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token ?? null;

    const res = await supabase.functions.invoke('notify', {
      body: payload,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
    if (res.error) {
      const ctx = (res.error as any)?.context as any;
      let responseBody: string | undefined;
      try {
        const r = ctx?.response;
        if (r && typeof r.text === 'function') {
          responseBody = await r.text();
        } else if (r && r._bodyInit && typeof r._bodyInit === 'string') {
          responseBody = r._bodyInit;
        }
      } catch {
        // ignore
      }
      console.warn(
        '[notifyServer] error',
        res.error.message,
        res.error.name,
        ctx?.status ?? (ctx?.response?.status as number | undefined),
        responseBody
      );
    }
  } catch (e) {
    console.warn('[notifyServer] failed', e);
  }
}

