import React, { useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeKeyboardAvoidingView as KeyboardAvoidingView } from '@/components/ui/SafeKeyboardAvoidingView';
import { useToast } from '@/contexts/ToastContext';
import { typography } from '@/theme';
import { SETTINGS_COLORS as C } from '../components/SettingsList';
import { changeMyPassword, MIN_PASSWORD_LENGTH } from '../services/account';

/**
 * Change Password — a sheet from Settings. The current password is checked
 * before the new one is set; the new one needs MIN_PASSWORD_LENGTH characters
 * and must be typed twice. The session stays signed in.
 */
export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const longEnough = next.length >= MIN_PASSWORD_LENGTH;
  const matches = next.length > 0 && next === confirm;
  const canSave = current.length > 0 && longEnough && matches && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await changeMyPassword(current, next);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.show('Use your new password next time you sign in.', { type: 'success', title: 'Password changed' });
      router.back();
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : 'Your password could not be changed.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Change Password',
          headerTintColor: C.title,
          headerStyle: { backgroundColor: '#ffffff' },
          headerTitleStyle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 17, color: C.ink },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button">
              <Text style={styles.headerCancel}>Cancel</Text>
            </Pressable>
          ),
          headerRight: () =>
            saving ? (
              <ActivityIndicator color={C.title} />
            ) : (
              <Pressable onPress={save} disabled={!canSave} hitSlop={10} accessibilityRole="button">
                <Text style={[styles.headerSave, !canSave && styles.headerSaveDisabled]}>Save</Text>
              </Pressable>
            ),
        }}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <PasswordField
          label="Current password"
          value={current}
          onChange={(v) => {
            setCurrent(v);
            setError(null);
          }}
          visible={visible}
          autoComplete="current-password"
          autoFocus
          onSubmit={() => nextRef.current?.focus()}
          submitsForm={false}
        />
        <PasswordField
          label="New password"
          value={next}
          onChange={(v) => {
            setNext(v);
            setError(null);
          }}
          visible={visible}
          inputRef={nextRef}
          autoComplete="new-password"
          onSubmit={() => confirmRef.current?.focus()}
          submitsForm={false}
        />
        <PasswordField
          label="Confirm new password"
          value={confirm}
          onChange={(v) => {
            setConfirm(v);
            setError(null);
          }}
          visible={visible}
          inputRef={confirmRef}
          autoComplete="new-password"
          onSubmit={save}
          submitsForm
        />

        <View style={styles.rules}>
          <Rule ok={longEnough} text={`At least ${MIN_PASSWORD_LENGTH} characters`} />
          <Rule ok={matches} text="Both new passwords match" />
        </View>

        <Pressable
          onPress={() => setVisible((v) => !v)}
          style={styles.toggle}
          accessibilityRole="switch"
          accessibilityState={{ checked: visible }}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.title} />
          <Text style={styles.toggleText}>{visible ? 'Hide passwords' : 'Show passwords'}</Text>
        </Pressable>

        {error ? (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={18} color={C.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  inputRef,
  autoComplete,
  autoFocus,
  onSubmit,
  submitsForm,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  inputRef?: React.RefObject<TextInput | null>;
  autoComplete: 'current-password' | 'new-password';
  autoFocus?: boolean;
  onSubmit: () => void;
  /** The last field: Return saves instead of moving on. */
  submitsForm: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={autoComplete}
        textContentType={autoComplete === 'current-password' ? 'password' : 'newPassword'}
        autoFocus={autoFocus}
        returnKeyType={submitsForm ? 'done' : 'next'}
        onSubmitEditing={onSubmit}
        style={styles.input}
      />
    </View>
  );
}

function Rule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={styles.rule}>
      <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={ok ? '#39b36b' : '#b4bfd0'} />
      <Text style={[styles.ruleText, ok && styles.ruleTextOk]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 20 },
  headerCancel: { fontFamily: typography.fontFamily.primary, fontSize: 16, color: C.title },
  headerSave: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 16, color: C.title },
  headerSaveDisabled: { opacity: 0.35 },
  field: { marginBottom: 18 },
  label: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 14, color: C.ink },
  input: {
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(90,117,157,0.25)',
    backgroundColor: '#f9fafc',
    fontFamily: typography.fontFamily.primary,
    fontSize: 16,
    color: C.ink,
  },
  rules: { gap: 8, marginTop: 2 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { fontFamily: typography.fontFamily.primary, fontSize: 14, color: C.muted },
  ruleTextOk: { color: C.ink },
  toggle: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  toggleText: { fontFamily: typography.fontFamily.primary, fontWeight: '600', fontSize: 14, color: C.title },
  errorBox: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.3)',
  },
  errorText: { flex: 1, fontFamily: typography.fontFamily.primary, fontSize: 14, color: C.danger },
});
