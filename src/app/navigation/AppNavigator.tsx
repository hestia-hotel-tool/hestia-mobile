import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LoginScreen, SplashScreen } from '@features/auth';
import { AllRoomsScreen, RoomDetailScreen, ArrivalDepartureDetailScreen, AssignRoomsScreen } from '@features/rooms';
import { HomeScreen } from '@features/home';
import { LostAndFoundScreen } from '@features/lost-and-found';
import { StaffScreen } from '@features/staff';
import { TicketsScreen, CreateTicketScreen, SelectTicketLocationScreen, CreateTicketFormScreen } from '@features/tickets';
import { ChatScreen, ChatDetailScreen, NewChatScreen, CreateChatGroupScreen } from '@features/chat';
import { SettingsScreen, UserProfileScreen } from '@features/account';
import type { RootStackParamList, MainTabsParamList } from './types';
import { colors } from '@shared/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#5a759d',
        tabBarInactiveTintColor: '#5a759d',
        tabBarStyle: {
          display: 'none',
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Rooms" component={AllRoomsScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Tickets" component={TicketsScreen} />
      <Tab.Screen
        name="LostAndFound"
        component={LostAndFoundScreen}
        options={{ tabBarButton: () => null }}
      />
      <Tab.Screen name="Staff" component={StaffScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarButton: () => null }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 280,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: true,
        // Freezing can cause janky transitions on heavier screens.
        freezeOnBlur: false,
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="AllRooms" component={AllRoomsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="RoomDetail"
        component={RoomDetailScreen}
        options={{
          animation: 'slide_from_right',
          animationDuration: 400,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          fullScreenGestureEnabled: true,
          contentStyle: { backgroundColor: colors.background.primary },
        }}
      />
      <Stack.Screen
        name="ArrivalDepartureDetail"
        component={ArrivalDepartureDetailScreen}
        options={{
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="NewChat" component={NewChatScreen} />
      <Stack.Screen name="CreateChatGroup" component={CreateChatGroupScreen} />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="CreateTicket" component={CreateTicketScreen} />
      <Stack.Screen name="SelectTicketLocation" component={SelectTicketLocationScreen} />
      <Stack.Screen name="CreateTicketForm" component={CreateTicketFormScreen} />
      <Stack.Screen name="AssignRooms" component={AssignRoomsScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}
