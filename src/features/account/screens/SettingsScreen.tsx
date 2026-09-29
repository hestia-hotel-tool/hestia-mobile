import React, { useCallback, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomTabBar from '@/components/layout/BottomTabBar';
import { Avatar } from '@/components/ui/Avatar';
import { useMessageModal } from '@/contexts/MessageModalContext';
import { usePermissions } from '@/domain/rbac/usePermissions';
import { PERMISSIONS } from '@/domain/rbac/permissions';
import { useNow } from '@/hooks/useNow';
import { useTranslation } from '@/providers/I18nProvider';
import { LANGUAGES, type LanguageCode } from '@/i18n';
import { typography } from '@/theme';
import { useAuth } from '@features/auth/hooks/useAuth';
import { SettingsRow, SettingsSection, SETTINGS_COLORS as C } from '../components/SettingsList';
import { fetchMyAccount, type MyAccount } from '../services/account';
import { MyShiftCard } from '../components/MyShiftCard';

/** Each language in its own words, so anyone can find theirs. */
const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  EN: 'English',
  FR: 'Français',
  DE: 'Deutsch',
  IT: 'Italiano',
};

type PushStatus = 'on' | 'off' | 'ask';

/**
 * Settings — the signed-in person's own account and the app.
 *
 * A profile card (tap for My Profile), then Account (profile, password,
 * language), Notifications (whether this phone may alert you, and a way to
 * change it), About, and Sign Out. Every row does something: nothing here is a
 * placeholder.
 */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const messageModal = useMessageModal();
  const { language, setLanguage } = useTranslation();
  const { can } = usePermissions();
  const canManageStaff = can(PERMISSIONS.STAFF_MANAGE);
  const canManageHotel = can(PERMISSIONS.SETTINGS_MANAGE);
  const canManageCredits = can(PERMISSIONS.ROOMS_CREDITS_MANAGE);
  const now = useNow();

  const [account, setAccount] = useState<MyAccount | null>(null);
  const [push, setPush] = useState<PushStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setAccount(await fetchMyAccount());
    } catch {
      // Keep what is on screen; the card falls back to a placeholder.
    }
    try {
      const perm = await Notifications.getPermissionsAsync();
      const provisional = perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
      setPush(perm.granted || provisional ? 'on' : perm.canAskAgain ? 'ask' : 'off');
    } catch {
      setPush(null);
    }
    setRefreshing(false);
  }, []);

  // On open, on return from My Profile, and on return from the phone's Settings.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openNotifications = async () => {
    if (push === 'ask') {
      await Notifications.requestPermissionsAsync().catch(() => null);
      void load();
      return;
    }
    void Linking.openSettings();
  };

  const chooseLanguage = () => {
    const options = LANGUAGES.map((code) => LANGUAGE_NAMES[code]);
    const pick = (i: number) => {
      const code = LANGUAGES[i];
      if (code) setLanguage(code);
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: 'Language', options: [...options, 'Cancel'], cancelButtonIndex: options.length },
        (i) => {
          if (i < options.length) pick(i);
        }
      );
    } else {
      Alert.alert('Language', undefined, [
        ...options.map((label, i) => ({ text: label, onPress: () => pick(i) })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const confirmSignOut = () => {
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
            // `replace`, so the signed-in stack cannot be swiped back into.
            router.replace('/(auth)/login');
          },
        },
      ],
    });
  };

  const version = Constants.expoConfig?.version ?? '—';
  const appEnv = (Constants.expoConfig?.extra as { appEnv?: string } | undefined)?.appEnv;
  const subtitle = [account?.jobTitle, account?.department].filter(Boolean).join(' · ');

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        <Pressable
          onPress={() => router.push('/user-profile')}
          style={({ pressed }) => [styles.profileCard, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`${account?.fullName ?? 'Your profile'}. Open My Profile.`}
        >
          <Avatar uri={account?.avatarUrl ?? undefined} name={account?.fullName} size={64} />
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={1}>
              {account?.fullName ?? ' '}
            </Text>
            {subtitle ? (
              <Text style={styles.profileSub} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#b4bfd0" />
        </Pressable>

        {account?.shift?.start && account.shift.end ? (
          <MyShiftCard
            shift={{ id: account.shift.id, name: account.shift.name, start: account.shift.start, end: account.shift.end }}
            now={now}
          />
        ) : null}

        {canManageStaff || canManageHotel || canManageCredits ? (
          <SettingsSection title="Management">
            {canManageStaff ? (
              <SettingsRow
                icon="calendar-outline"
                label="Shifts & breaks"
                detail="Shift hours, breaks and who works each shift"
                onPress={() => router.push('/settings/shifts')}
              />
            ) : null}
            {canManageCredits ? (
              <SettingsRow
                icon="timer-outline"
                label="Cleaning credits"
                detail="How long each room type takes to clean"
                onPress={() => router.push('/settings/credits')}
              />
            ) : null}
            {canManageHotel ? (
              <SettingsRow
                icon="business-outline"
                label="Hotel"
                detail="Hotel name and time zone"
                onPress={() => router.push('/settings/hotel')}
              />
            ) : null}
          </SettingsSection>
        ) : null}

        <SettingsSection title="Account">
          <SettingsRow icon="person-outline" label="My Profile" onPress={() => router.push('/user-profile')} />
          <SettingsRow
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => router.push('/settings/change-password')}
          />
          <SettingsRow icon="language-outline" label="Language" value={LANGUAGE_NAMES[language]} onPress={chooseLanguage} />
        </SettingsSection>

        <SettingsSection
          title="Notifications"
          footer={
            push === 'off'
              ? 'Notifications are off for Hestia. Turn them on in your phone’s Settings to hear about new rooms, messages and tickets.'
              : 'Room assignments, messages, tickets and announcements. They also appear in Chat › Notifications.'
          }
        >
          <SettingsRow
            icon="notifications-outline"
            tint={push === 'off' ? C.danger : C.title}
            label="Push Notifications"
            value={push === 'on' ? 'On' : push === 'off' ? 'Off' : push === 'ask' ? 'Not set up' : undefined}
            onPress={openNotifications}
            accessibilityHint={push === 'ask' ? 'Asks to allow notifications' : 'Opens your phone’s settings for Hestia'}
          />
        </SettingsSection>

        <SettingsSection title="About">
          <SettingsRow
            icon="information-circle-outline"
            label="Version"
            value={appEnv && appEnv !== 'production' ? `${version} (${appEnv})` : version}
          />
          {account?.hotelName ? <SettingsRow icon="business-outline" label="Hotel" value={account.hotelName} /> : null}
        </SettingsSection>

        <SettingsSection>
          <SettingsRow icon="log-out-outline" label="Sign Out" destructive chevron={false} onPress={confirmSignOut} />
        </SettingsSection>
      </ScrollView>

      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.screen },
  header: { backgroundColor: C.header, paddingHorizontal: 20, paddingBottom: 14 },
  headerTitle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 28, color: C.title },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  pressed: { opacity: 0.75 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: C.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.divider,
  },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 19, color: C.ink },
  profileSub: { marginTop: 2, fontFamily: typography.fontFamily.primary, fontSize: 14, color: C.muted },
});
