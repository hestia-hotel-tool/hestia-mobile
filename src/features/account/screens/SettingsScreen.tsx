import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from 'expo-router';
import { NativeStackNavigationProp } from 'expo-router';
import { BlurView } from 'expo-blur';
import { colors, typography } from '@/theme';
import BottomTabBar from '@/components/BottomTabBar';
import { useAuth } from '@features/auth';
import { useUserStore } from '@features/account/store/useUserStore';
import { useAIChatOverlay } from '@features/ai-agent';
import { useMessageModal } from '@/contexts/MessageModalContext';
import type { MainTabsParamList, ReturnToTab } from '@/types/navigation';
import { useDesignScale } from '@/hooks/useDesignScale';

type SettingsScreenNavigationProp = NativeStackNavigationProp<MainTabsParamList, '(settings)/index'>;

export default function SettingsScreen() {
  const { scaleX } = useDesignScale();
  const styles = useMemo(() => buildSettingsStyles(scaleX), [scaleX]);
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const route = useRoute();
  const { open: openAIChatOverlay } = useAIChatOverlay();
  const { signOut } = useAuth();
  const userProfile = useUserStore((s) => s.profile);
  const [activeTab, setActiveTab] = useState('Settings');

  const messageModal = useMessageModal();
  const handleSignOut = () => {
    messageModal.show({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            const rootNav = navigation.getParent();
            rootNav?.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ],
    });
  };

  // Sync activeTab with current route
  useFocusEffect(
    React.useCallback(() => {
      const routeName = route.name as string;
      if (routeName === 'Home' || routeName === 'Rooms' || routeName === 'Chat' || routeName === 'Tickets') {
        setActiveTab(routeName);
      }
    }, [route.name])
  );

  const handleTabPress = (tab: string, _options?: { fromRoomsAssignmentBadge?: boolean }) => {
    if (tab === 'AIHome') {
      openAIChatOverlay();
      return;
    }
    setActiveTab(tab); // Update immediately
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      const returnToTab = (route.params as { returnToTab?: ReturnToTab } | undefined)?.returnToTab ?? '(home)/index';
      navigation.navigate(returnToTab as keyof MainTabsParamList);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Coming Soon</Text>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
      </View>
      
      <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} role={userProfile?.role} />
    </View>
  );
}

function buildSettingsStyles(scaleX: number) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 152 * scaleX,
  },
  contentBlurOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  blurOverlayDarkener: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(200, 200, 200, 0.6)',
  },
  title: {
    fontSize: 28 * scaleX,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 10 * scaleX,
  },
  subtitle: {
    fontSize: 18 * scaleX,
    color: colors.text.secondary,
    marginBottom: 30 * scaleX,
  },
  signOutButton: {
    backgroundColor: '#c53030',
    paddingHorizontal: 30 * scaleX,
    paddingVertical: 12 * scaleX,
    borderRadius: 8 * scaleX,
    marginBottom: 16 * scaleX,
  },
  signOutButtonText: {
    color: '#ffffff',
    fontSize: 16 * scaleX,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 30 * scaleX,
    paddingVertical: 12 * scaleX,
    borderRadius: 8 * scaleX,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16 * scaleX,
    fontWeight: '600',
  },
});
}

