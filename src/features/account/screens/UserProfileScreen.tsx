import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { SafeKeyboardAvoidingView as KeyboardAvoidingView } from '@/components/ui/SafeKeyboardAvoidingView';
import { useToast } from '@/contexts/ToastContext';
import { typography } from '@/theme';
import { formatMoment } from '@/utils/formatting';
import { SettingsRow, SettingsSection, SETTINGS_COLORS as C } from '../components/SettingsList';
import {
  fetchMyAccount,
  isValidPhone,
  removeMyAvatar,
  updateMyProfile,
  type MyAccount,
} from '../services/account';
import { useUserStore } from '../store/useUserStore';

type Form = { fullName: string; phone: string };

/**
 * My Profile — the signed-in person's own details.
 *
 * Photo (camera, library or remove), name and phone are theirs to change.
 * Email, job title, department, shift and hotel are shown but managed for
 * them; the database refuses those edits (migration 20260929000000). Leaving
 * with unsaved changes asks first.
 */
export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const navigation = useNavigation();
  const profile = useUserStore((s) => s.profile);
  const setProfile = useUserStore((s) => s.setProfile);
  const updateAvatarUrl = useUserStore((s) => s.updateAvatarUrl);

  const [account, setAccount] = useState<MyAccount | null>(null);
  const [original, setOriginal] = useState<Form | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const phoneRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    try {
      const next = await fetchMyAccount();
      if (!next) return;
      setAccount(next);
      // Keep edits in progress; only seed the form the first time.
      setOriginal((o) => o ?? { fullName: next.fullName, phone: next.phone ?? '' });
      setForm((f) => f ?? { fullName: next.fullName, phone: next.phone ?? '' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Could not load profile' });
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const dirty = useMemo(() => !!form && !!original && JSON.stringify(form) !== JSON.stringify(original), [form, original]);
  const nameError = form && form.fullName.trim().length === 0 ? 'Your name cannot be empty.' : null;
  const phoneError = form && !isValidPhone(form.phone) ? 'Use digits, spaces and + ( ) - only.' : null;
  const canSave = dirty && !nameError && !phoneError && !saving;

  // Leaving with unsaved edits asks first.
  const guardLeave = dirty && !saving;
  useEffect(() => {
    if (!guardLeave) return;
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      Alert.alert('Discard changes?', 'Your edits to your profile will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, guardLeave]);

  const save = async () => {
    if (!form || !canSave) return;
    setSaving(true);
    try {
      await updateMyProfile({ fullName: form.fullName, phone: form.phone });
      const saved = { fullName: form.fullName.trim(), phone: form.phone.trim() };
      setOriginal(saved);
      setForm(saved);
      setAccount((a) => (a ? { ...a, fullName: saved.fullName, phone: saved.phone || null } : a));
      if (profile) setProfile({ ...profile, name: saved.fullName });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show('Your profile is up to date.', { type: 'success', title: 'Saved' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Profile not saved' });
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (source: 'camera' | 'library') => {
    if (!account) return;
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      toast.show(
        source === 'camera' ? 'Allow camera access in Settings to take a photo.' : 'Allow photo access in Settings to choose a photo.',
        { type: 'error', title: 'Permission needed' }
      );
      return;
    }
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      // JPEG, not HEIC: the upload is stored and served as a JPEG.
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    };
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.[0]) return;

    setPhotoBusy(true);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split('?')[0].split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const url = await updateAvatarUrl(account.id, base64, ext);
      setAccount((a) => (a ? { ...a, avatarUrl: url } : a));
      toast.show('Your new photo is on your profile.', { type: 'success', title: 'Photo updated' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Photo not updated' });
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    try {
      await removeMyAvatar();
      setAccount((a) => (a ? { ...a, avatarUrl: null } : a));
      if (profile) setProfile({ ...profile, avatar: undefined });
      toast.show('Your initials show instead.', { type: 'success', title: 'Photo removed' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Photo not removed' });
    } finally {
      setPhotoBusy(false);
    }
  };

  const photoActions = () => {
    const hasPhoto = !!account?.avatarUrl;
    if (Platform.OS === 'ios') {
      const options = ['Take Photo', 'Choose from Library', ...(hasPhoto ? ['Remove Photo'] : []), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: hasPhoto ? options.length - 2 : undefined,
        },
        (i) => {
          if (options[i] === 'Take Photo') void uploadPhoto('camera');
          if (options[i] === 'Choose from Library') void uploadPhoto('library');
          if (options[i] === 'Remove Photo') void removePhoto();
        }
      );
    } else {
      Alert.alert('Profile photo', undefined, [
        { text: 'Take Photo', onPress: () => void uploadPhoto('camera') },
        { text: 'Choose from Library', onPress: () => void uploadPhoto('library') },
        ...(hasPhoto ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: () => void removePhoto() }] : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: 'My Profile',
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: C.title,
        headerStyle: { backgroundColor: C.header },
        headerTitleStyle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 18, color: C.title },
        headerShadowVisible: false,
        headerRight: () =>
          saving ? (
            <ActivityIndicator color={C.title} />
          ) : dirty ? (
            <Pressable onPress={save} disabled={!canSave} hitSlop={10} accessibilityRole="button">
              <Text style={[styles.headerSave, !canSave && styles.headerSaveDisabled]}>Save</Text>
            </Pressable>
          ) : null,
      }}
    />
  );

  if (!account || !form) {
    return (
      <View style={styles.center}>
        {header}
        <ActivityIndicator color={C.title} />
      </View>
    );
  }

  const shiftText = account.shift
    ? `${account.shift.name}${account.shift.start && account.shift.end ? ` · ${account.shift.start}–${account.shift.end}` : ''}`
    : 'Not assigned';

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <View style={styles.hero}>
          <Pressable
            onPress={photoActions}
            disabled={photoBusy}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Avatar uri={account.avatarUrl ?? undefined} name={account.fullName} size={104} />
            <View style={styles.cameraBadge}>
              {photoBusy ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="camera" size={16} color="#ffffff" />}
            </View>
          </Pressable>
          <Text style={styles.heroName} numberOfLines={2}>
            {account.fullName}
          </Text>
          {account.jobTitle ? <Text style={styles.heroSub}>{account.jobTitle}</Text> : null}
          <Pressable onPress={photoActions} disabled={photoBusy} hitSlop={8} accessibilityRole="button">
            <Text style={styles.heroLink}>{account.avatarUrl ? 'Change photo' : 'Add a photo'}</Text>
          </Pressable>
        </View>

        <SettingsSection title="Personal details">
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full name</Text>
            <TextInput
              value={form.fullName}
              onChangeText={(fullName) => setForm({ ...form, fullName })}
              placeholder="Your name"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              maxLength={80}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
            />
            {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              ref={phoneRef}
              value={form.phone}
              onChangeText={(phone) => setForm({ ...form, phone })}
              placeholder="+41 79 123 45 67"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              maxLength={32}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              returnKeyType="done"
              onSubmitEditing={save}
            />
            {phoneError ? <Text style={styles.error}>{phoneError}</Text> : null}
          </View>
          <SettingsRow icon="mail-outline" label="Email" detail={account.email ?? '—'} chevron={false} />
        </SettingsSection>

        <SettingsSection
          title="Work"
          footer="Your job title, department and shift are managed by your manager. Ask them if something here is wrong."
        >
          <SettingsRow icon="briefcase-outline" label="Job title" value={account.jobTitle ?? '—'} />
          <SettingsRow icon="people-outline" label="Department" value={account.department ?? '—'} />
          <SettingsRow icon="time-outline" label="Shift" value={shiftText} />
          {account.hotelName ? <SettingsRow icon="business-outline" label="Hotel" value={account.hotelName} /> : null}
          <SettingsRow
            icon="calendar-outline"
            label="Member since"
            value={account.memberSince ? formatMoment(account.memberSince).split(' · ')[0] : '—'}
          />
        </SettingsSection>

        {dirty ? (
          <Pressable
            onPress={save}
            disabled={!canSave}
            style={({ pressed }) => [styles.saveButton, (!canSave || pressed) && styles.saveButtonDim]}
            accessibilityRole="button"
          >
            {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveButtonText}>Save changes</Text>}
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.screen },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.screen },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  pressed: { opacity: 0.75 },
  headerSave: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 16, color: C.title },
  headerSaveDisabled: { opacity: 0.35 },
  hero: { alignItems: 'center', paddingTop: 16 },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.title,
    borderWidth: 3,
    borderColor: C.screen,
  },
  heroName: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    fontSize: 22,
    color: C.ink,
  },
  heroSub: { marginTop: 2, fontFamily: typography.fontFamily.primary, fontSize: 15, color: C.muted },
  heroLink: { marginTop: 8, fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 14, color: C.title },
  field: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12 },
  fieldLabel: {
    fontFamily: typography.fontFamily.primary,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: C.muted,
  },
  input: {
    marginTop: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(90,117,157,0.25)',
    backgroundColor: '#f9fafc',
    fontFamily: typography.fontFamily.primary,
    fontSize: 16,
    color: C.ink,
  },
  error: { marginTop: 6, fontFamily: typography.fontFamily.primary, fontSize: 12, color: C.danger },
  saveButton: {
    marginTop: 24,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.title,
  },
  saveButtonDim: { opacity: 0.6 },
  saveButtonText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 16, color: '#ffffff' },
});
