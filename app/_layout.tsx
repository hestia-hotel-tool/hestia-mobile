import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { Stack , router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AppProviders } from '@/providers/AppProviders';
import { useAuth } from '@features/auth';
import '../src/global.css';
import {
  incomingAlertDedupeKeyFromPushData,
  presentIncomingNotificationAlert,
  subscribeToIncomingNotificationRows,
} from '@/lib/notificationIncoming';
import { registerAndSyncPushToken, setupNotificationPresentation, syncAppIconBadge } from '@/lib/notifications';
import type { PushData } from '@/lib/notifications';
import {
  ROOM_TASK_NOTIFICATION_TYPES,
  getOpenChatId,
  invalidateNotificationBadges,
  markNotificationRead,
  subscribeNotificationBadgeInvalidate,
} from '@/lib/inAppNotifications';
import * as NativeSplash from 'expo-splash-screen';

// Keep the native splash up until the first screen has painted, so there is no
// white flash between the OS splash and the app's launch screen.
NativeSplash.preventAutoHideAsync().catch(() => {});

/**
 * Tapping a push opens what it is about: the chat, the room, the ticket or
 * the announcement. Opening it reads it, as opening it from Chat >
 * Notifications does.
 */
function navigateFromPushData(data: PushData & Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : null);
  const type = str(data.type);
  const notificationId = str(data.notificationId);
  const chatId = str(data.chatId);
  const roomId = str(data.roomId);
  const ticketId = str(data.ticketId);

  if (notificationId) {
    void markNotificationRead(notificationId).then((n) => n && invalidateNotificationBadges());
  }

  if (type === 'chat_message' && chatId) {
    router.push(`/chat/${chatId}`);
  } else if ((type === 'ticket_tag' || type === 'ticket_assigned') && ticketId) {
    router.push({ pathname: '/ticket/[id]', params: { id: ticketId } });
  } else if (type && (ROOM_TASK_NOTIFICATION_TYPES as readonly string[]).includes(type) && roomId) {
    router.push({ pathname: '/room/[roomId]', params: { roomId } });
  } else if (type === 'general' && notificationId) {
    router.push({ pathname: '/announcement/[id]', params: { id: notificationId } });
  } else if (notificationId) {
    router.push({ pathname: '/task/[id]', params: { id: notificationId } });
  }
}

function NotificationExperience() {
  const { session } = useAuth();

  useEffect(() => {
    void setupNotificationPresentation();
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const c = notification.request.content;
      const data = (c.data ?? {}) as PushData & Record<string, unknown>;
      // The conversation is on screen: it is being read, not announced.
      if (data.type === 'chat_message' && data.chatId && data.chatId === getOpenChatId()) return;
      const key =
        incomingAlertDedupeKeyFromPushData(data) ??
        `push:${String(c.title ?? '')}:${String(c.body ?? '')}:${Date.now()}`;
      presentIncomingNotificationAlert(key, c.title ?? 'Notification', c.body ?? '');
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    return subscribeToIncomingNotificationRows(uid);
  }, [session?.user?.id]);

  // iOS / Android can rotate the device token; register again when they do —
  // only when it actually changed. Fetching the push token emits this event
  // too, and reacting to every one of them looped forever.
  useEffect(() => {
    if (!session?.user?.id) return;
    let lastDeviceToken: string | null = null;
    const sub = Notifications.addPushTokenListener((event) => {
      const next = typeof event?.data === 'string' ? event.data : JSON.stringify(event?.data ?? null);
      if (lastDeviceToken === null) {
        lastDeviceToken = next;
        return;
      }
      if (next === lastDeviceToken) return;
      lastDeviceToken = next;
      void registerAndSyncPushToken().catch(() => {});
    });
    return () => sub.remove();
  }, [session?.user?.id]);

  // The app icon badge follows the unread count: on sign-in, whenever
  // notifications are read, and on every return to the app.
  useEffect(() => {
    if (!session?.user?.id) return;
    void syncAppIconBadge();
    const unsubscribe = subscribeNotificationBadgeInvalidate(() => void syncAppIconBadge());
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncAppIconBadge();
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, [session?.user?.id]);

  return null;
}

export default function RootLayout() {
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  const handledPushOpenId = useRef<string | null>(null);

  const openAppFromNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    const id = response.notification.request.identifier;
    if (handledPushOpenId.current === id) return;
    handledPushOpenId.current = id;
    const data = (response.notification.request.content.data ?? {}) as PushData & Record<string, unknown>;
    navigateFromPushData(data);
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(openAppFromNotificationResponse);
    return () => sub.remove();
  }, [openAppFromNotificationResponse]);

  // Reveal the app one frame after the first render — the launch screen shares
  // the native splash's background, so the handoff is seamless.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      NativeSplash.hideAsync().catch(() => {});
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!lastNotificationResponse) return;
    openAppFromNotificationResponse(lastNotificationResponse);
    void Notifications.clearLastNotificationResponseAsync();
  }, [lastNotificationResponse, openAppFromNotificationResponse]);

  useEffect(() => {
    const anyGlobal: any = (typeof window !== 'undefined' ? window : globalThis) as any;
    const ErrorUtils = anyGlobal?.ErrorUtils;
    if (!ErrorUtils?.getGlobalHandler || !ErrorUtils?.setGlobalHandler) return;
    const prev = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((err: any, isFatal: boolean) => {
      try {
        const msg = err?.message ?? String(err);
        const stack = err?.stack ?? '';
        console.error('[GlobalErrorHandler] isFatal=', String(isFatal));
        console.error('[GlobalErrorHandler] message=', msg);
        if (stack) console.error('[GlobalErrorHandler] stack=\n' + String(stack));
      } catch (_) {}
      prev(err, isFatal);
    });
    return () => {
      try { ErrorUtils.setGlobalHandler(prev); } catch (_) {}
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppProviders>
          <NotificationExperience />
          <StatusBar style="auto" />
          {/* freezeOnBlur: a screen covered by a pushed one (the tabs under Room
              Detail, say) stops rendering until it is shown again. */}
          <Stack screenOptions={{ headerShown: false, freezeOnBlur: true }}>
            <Stack.Screen name="index" options={{ animation: 'fade' }} />
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="room/[roomId]" />
            <Stack.Screen name="chat/[chatId]" />
            <Stack.Screen name="assign-rooms" />
            <Stack.Screen name="staff-rooms" />
            <Stack.Screen name="new-chat" />
            <Stack.Screen name="create-chat-group" />
            <Stack.Screen name="general-announcement" />
            <Stack.Screen name="announcement/[id]" />
            <Stack.Screen name="task/[id]" />
            {/* headerShown here, not only from the screen: switching it on from inside a
                modal remounts that modal (react-navigation), and the edit sheet then
                reloaded itself forever. */}
            <Stack.Screen name="lost-and-found/[id]" options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }} />
            {/* A sheet over the item: Cancel / Save, and a swipe-down that asks first when there are edits. */}
            <Stack.Screen name="lost-and-found/edit/[id]" options={{ presentation: 'modal', headerShown: true }} />
            {/* Ticket detail and its edit sheet — same arrangement as lost & found. */}
            <Stack.Screen name="ticket/[id]" options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }} />
            <Stack.Screen name="ticket/edit/[id]" options={{ presentation: 'modal', headerShown: true }} />
            {/* Native headers declared here (see lost-and-found): My Profile pushes,
                Change Password is a sheet. */}
            <Stack.Screen name="user-profile" options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }} />
            <Stack.Screen name="settings/change-password" options={{ presentation: 'modal', headerShown: true }} />
            <Stack.Screen name="settings/shifts/index" options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }} />
            <Stack.Screen name="settings/shifts/[id]" options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }} />
            <Stack.Screen name="settings/hotel" options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }} />
            <Stack.Screen name="settings/credits" options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }} />
            <Stack.Screen name="select-ticket-location" />
            <Stack.Screen name="create-ticket-form" />
          </Stack>
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
