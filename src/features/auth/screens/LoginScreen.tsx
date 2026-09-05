import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { View, Text, TextInput, Pressable, ScrollView } from '@/tw';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme';
import { usePermissions, resolveLandingRoute } from '@/domain/rbac';
import LogoMark from '@assets/brand/logo-mark.svg';
import LogoWordmark from '@assets/brand/logo-wordmark.svg';
import SupportMark from '@assets/brand/support-mark.svg';
import { useAuth } from '../hooks/useAuth';

const LANGUAGES = [
  { code: 'EN', name: 'English' },
  { code: 'FR', name: 'French' },
  { code: 'DE', name: 'German' },
  { code: 'IT', name: 'Italian' },
] as const;

/** Figma node 263:40 — 370 of a 440 frame, so 35 either side. */
const GUTTER = 35;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background.secondary },
  gutter: { paddingHorizontal: GUTTER },
});

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, resetPassword } = useAuth();
  const { permissions } = usePermissions();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState<string>('EN');
  const [languageOpen, setLanguageOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setNotice(null);
    setIsSigningIn(true);
    try {
      const { error: signInError } = await signIn(email.trim(), password);
      if (signInError) {
        setError(signInError.message ?? 'Invalid email or password.');
        return;
      }
      // Not hardcoded to Home: F&B and Kitchen staff have no Dashboard right,
      // so sending everyone there drops them on a screen the route guard then
      // bounces them off. Same resolution the splash uses.
      const landing = resolveLandingRoute(permissions);
      router.replace((landing ?? '/(tabs)/(home)') as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSigningIn(false);
    }
  };

  /** Was a TODO that rendered a tappable no-op; useAuth already exposed this. */
  const handleRecoverPassword = async () => {
    if (!email.trim()) {
      setError('Enter your company email first, then tap Recover Password.');
      return;
    }
    setError(null);
    const { error: resetError } = await resetPassword(email.trim());
    if (resetError) {
      setError(resetError.message ?? 'Could not send the reset email.');
      return;
    }
    setNotice(`Password reset link sent to ${email.trim()}.`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerClassName="grow pb-3xl"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header — logo left, language right. Figma node 266:60. */}
        <View
          className="flex-row items-start justify-between"
          style={[styles.gutter, { paddingTop: insets.top + 26 }]}
        >
          <View className="flex-row items-start">
            <LogoMark width={34.673} height={32.711} />
            <LogoWordmark width={69.816} height={18.812} style={{ marginLeft: 10.5, marginTop: 11.79 }} />
          </View>

          <Pressable
            className="flex-row items-center gap-md pt-md"
            onPress={() => setLanguageOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={`Language ${language}`}
          >
            <Text className="font-hestia-primary text-hestia-2xl font-light text-primary">
              Language <Text className="font-bold text-ink-pink">{language}</Text>
            </Text>
            <View style={{ transform: [{ rotate: languageOpen ? '90deg' : '-90deg' }] }}>
              <Icon name="action-chevron" size={17} color={colors.primary.light} />
            </View>
          </Pressable>
        </View>

        {languageOpen && (
          <View className="self-end rounded-sm border border-border-light bg-surface-primary" style={styles.gutter}>
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang.code}
                className="py-md"
                onPress={() => {
                  setLanguage(lang.code);
                  setLanguageOpen(false);
                }}
                accessibilityRole="button"
              >
                <Text
                  className={`font-hestia-primary text-hestia-xl ${
                    lang.code === language ? 'font-bold text-ink-pink' : 'text-ink-primary'
                  }`}
                >
                  {lang.name} ({lang.code})
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Full-bleed rule — node 266:62 spans the whole 440 frame. */}
        <View className="mt-2xl h-px w-full bg-border-light" />

        <View style={styles.gutter}>
          <Text className="mt-5xl font-hestia-primary text-hestia-8xl font-bold text-primary">
            Log in
          </Text>

          <Text className="mt-[80px] font-hestia-primary text-hestia-2xl text-ink-primary">
            Company email
          </Text>
          <TextInput
            className="mt-sm h-[70px] bg-surface-primary px-md font-hestia-primary text-hestia-2xl font-light text-ink-primary"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            autoComplete="email"
            accessibilityLabel="Company email"
          />

          <Text className="mt-lg font-hestia-primary text-hestia-2xl text-ink-primary">
            Password
          </Text>
          <TextInput
            className="mt-sm h-[70px] bg-surface-primary px-md font-hestia-primary text-hestia-2xl font-light text-ink-primary"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            autoComplete="current-password"
            accessibilityLabel="Password"
          />

          {!!error && (
            <Text className="mt-md font-hestia-primary text-hestia-md text-status-dirty">{error}</Text>
          )}
          {!!notice && (
            <Text className="mt-md font-hestia-primary text-hestia-md text-primary">{notice}</Text>
          )}

          {/* Node 266:71 — 370x70, square corners. */}
          <Pressable
            className={`mt-4xl h-[70px] items-center justify-center bg-primary ${
              isSigningIn ? 'opacity-70' : ''
            }`}
            onPress={handleLogin}
            disabled={isSigningIn}
            accessibilityRole="button"
            accessibilityLabel="Sign In"
          >
            {isSigningIn ? (
              <ActivityIndicator color={colors.text.white} />
            ) : (
              <Text className="font-hestia-primary text-hestia-3xl text-ink-white">Sign In</Text>
            )}
          </Pressable>

          {/* Node 266:73 — same size, page background, hairline border. */}
          <Pressable
            className="mt-2xl h-[70px] flex-row items-center justify-center gap-md border border-border-light bg-surface-secondary"
            onPress={handleRecoverPassword}
            accessibilityRole="button"
            accessibilityLabel="Recover Password"
          >
            <Text className="font-hestia-primary text-hestia-3xl text-primary">Recover Password</Text>
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <Icon name="action-chevron" size={17} color={colors.primary.main} />
            </View>
          </Pressable>
        </View>

        {/* Pushes the support block to the bottom, as the design has it. */}
        <View className="grow" />

        {/* Node 266:102. No pill behind it — the old rgba(217,217,217,0.3)
            rounded background is not in the design. */}
        <View className="mt-4xl flex-row items-center justify-center gap-lg" style={styles.gutter}>
          <View className="items-center justify-center">
            <SupportMark width={42.07} height={39.689} />
            <View className="absolute">
              <Icon name="action-phone" size={20} color={colors.text.pink} />
            </View>
          </View>

          <View>
            <Text className="font-hestia-primary text-hestia-lg font-bold text-primary">
              Customer Service
            </Text>
            <Text className="font-hestia-primary text-hestia-lg font-light text-ink-primary">
              Having issues with the app?
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
