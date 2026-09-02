import React from 'react';
import { Tabs } from 'expo-router';
import { RouteGuard } from '@/domain/rbac';

export default function TabLayout() {
  return (
    // Registering a screen is not the same as permitting it: without this,
    // hiding a tab button still leaves the route reachable by deep link or by
    // the push-notification router.
    <RouteGuard>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="(home)" options={{ title: 'Home' }} />
        <Tabs.Screen name="(chats)" options={{ title: 'Chats' }} />
        <Tabs.Screen name="(rooms)" options={{ title: 'Rooms' }} />
        <Tabs.Screen name="(tickets)" options={{ title: 'Tickets' }} />
        <Tabs.Screen name="(lost_and_found)" options={{ title: 'Lost & Found' }} />
        <Tabs.Screen name="(staff)" options={{ title: 'Staff' }} />
        <Tabs.Screen name="(settings)" options={{ title: 'Settings' }} />
      </Tabs>
    </RouteGuard>
  );
}
