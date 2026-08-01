import React from 'react';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
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
  );
}
