import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
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
import { setupNotificationPresentation } from '@/lib/notifications';
import type { PushData } from '@/lib/notifications';
import { router } from 'expo-router';
import * as NativeSplash from 'expo-splash-screen';

// Keep the native splash up until the first screen has painted, so there is no
// white flash between the OS splash and the app's launch screen.
NativeSplash.preventAutoHideAsync().catch(() => {});

function navigateFromPushData(data: Partial<PushData> & Record<string, unknown>) {
  if (data.type === 'chat_message' && typeof data.chatId === 'string') {
    router.push(`/chat/${data.chatId}`);
    return;
  }
  if (data.type === 'room_assignment' && typeof data.roomId === 'string') {
    router.push(`/room/${data.roomId}?initialTab=Overview`);
    return;
  }
  if (data.type === 'ticket_tag') {
    router.push('/(tabs)/(home)');
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
      const data = (c.data ?? {}) as Partial<PushData> & Record<string, unknown>;
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

  return null;
}

export default function RootLayout() {
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  const handledPushOpenId = useRef<string | null>(null);

  const openAppFromNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    const id = response.notification.request.identifier;
    if (handledPushOpenId.current === id) return;
    handledPushOpenId.current = id;
    const data = (response.notification.request.content.data ?? {}) as Partial<PushData> & Record<string, unknown>;
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
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ animation: 'fade' }} />
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="room/[roomId]" />
            <Stack.Screen name="chat/[chatId]" />
            <Stack.Screen name="assign-rooms" />
            <Stack.Screen name="new-chat" />
            <Stack.Screen name="create-chat-group" />
            <Stack.Screen name="user-profile" />
            <Stack.Screen name="create-ticket" />
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
