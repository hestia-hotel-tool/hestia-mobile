import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, router, NativeStackNavigationProp } from 'expo-router';
import { colors } from '@/theme';
import BottomTabBar from '@/components/layout/BottomTabBar';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useUserStore } from '@features/account/store/useUserStore';
import { useMessageModal } from '@/contexts/MessageModalContext';
import type { MainTabsParamList, ReturnToTab } from '@/types/navigation';
import { useDesignScale } from '@/hooks/useDesignScale';

type SettingsScreenNavigationProp = NativeStackNavigationProp<MainTabsParamList, '(settings)/index'>;

export default function SettingsScreen() {
  const { scaleX } = useDesignScale();
  const styles = useMemo(() => buildSettingsStyles(scaleX), [scaleX]);
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const route = useRoute();
  const { signOut } = useAuth();
  const userProfile = useUserStore((s) => s.profile);

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
            /*
             * `router.replace`, not a navigator `reset`.
             *
             * This used to reset the parent navigator to a route named
             * `'Login'`, which is a leftover from the pre-expo-router
             * navigator: the root Stack's routes are `index`, `(auth)`,
             * `(tabs)` and the modals, so nothing answered to that name and
             * RESET fell through every navigator with a dev-only warning —
             * leaving the user signed out but still sitting on the tabs.
             *
             * `replace` rather than `push` so the signed-in stack is not left
             * behind a back gesture. Same call SplashScreen and RouteGuard
             * already make.
             */
            router.replace('/(auth)/login');
          },
        },
      ],
    });
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
      
      <BottomTabBar />
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

