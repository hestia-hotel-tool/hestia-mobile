import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { View, Text, TextInput, Pressable, ScrollView } from '@/tw';
import { Icon } from '@/components/Icon';
import { colors } from '@/theme';
import { usePermissions, resolveLandingRoute } from '@/domain/rbac';
import { useTranslation } from '@/providers/I18nProvider';
import { LANGUAGES } from '@/i18n';
import LogoMark from '@assets/brand/logo-mark.svg';
import LogoWordmark from '@assets/brand/logo-wordmark.svg';
import SupportMark from '@assets/brand/support-mark.svg';
import { useAuth } from '../hooks/useAuth';

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
  const { t, language, setLanguage } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError(t('login.errors.missingCredentials'));
      return;
    }
    setError(null);
    setNotice(null);
    setIsSigningIn(true);
    try {
      const { error: signInError } = await signIn(email.trim(), password);
      if (signInError) {
        setError(signInError.message ?? t('login.errors.invalidCredentials'));
        return;
      }
      // Not hardcoded to Home: F&B and Kitchen staff have no Dashboard right,
      // so sending everyone there drops them on a screen the route guard then
      // bounces them off. Same resolution the splash uses.
      const landing = resolveLandingRoute(permissions);
      router.replace((landing ?? '/(tabs)/(home)') as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.errors.unexpected'));
    } finally {
      setIsSigningIn(false);
    }
  };

  /** Was a TODO that rendered a tappable no-op; useAuth already exposed this. */
  const handleRecoverPassword = async () => {
    if (!email.trim()) {
      setError(t('login.errors.emailRequiredForReset'));
      return;
    }
    setError(null);
    const { error: resetError } = await resetPassword(email.trim());
    if (resetError) {
      setError(resetError.message ?? t('login.errors.resetFailed'));
      return;
    }
    setNotice(t('login.resetSent', { email: email.trim() }));
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
            accessibilityLabel={`${t('common.language')} ${language}`}
          >
            <Text className="font-hestia-primary text-hestia-2xl font-light text-primary">
              {t('common.language')} <Text className="font-bold text-ink-pink">{language}</Text>
            </Text>
            <View style={{ transform: [{ rotate: languageOpen ? '90deg' : '-90deg' }] }}>
              <Icon name="action-chevron" size={17} color={colors.primary.light} />
            </View>
          </Pressable>
        </View>

        {languageOpen && (
          <View className="self-end rounded-sm border border-border-light bg-surface-primary" style={styles.gutter}>
            {LANGUAGES.map((code) => (
              <Pressable
                key={code}
                className="py-md"
                onPress={() => {
                  setLanguage(code);
                  setLanguageOpen(false);
                }}
                accessibilityRole="button"
              >
                <Text
                  className={`font-hestia-primary text-hestia-xl ${
                    code === language ? 'font-bold text-ink-pink' : 'text-ink-primary'
                  }`}
                >
                  {t(`languages.${code}`)} ({code})
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Full-bleed rule — node 266:62 spans the whole 440 frame. */}
        <View className="mt-2xl h-px w-full bg-border-light" />

        <View style={styles.gutter}>
          <Text className="mt-5xl font-hestia-primary text-hestia-8xl font-bold text-primary">
            {t('login.title')}
          </Text>

          <Text className="mt-[80px] font-hestia-primary text-hestia-2xl text-ink-primary">
            {t('login.emailLabel')}
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
            accessibilityLabel={t('login.emailLabel')}
          />

          <Text className="mt-lg font-hestia-primary text-hestia-2xl text-ink-primary">
            {t('login.passwordLabel')}
          </Text>
          {/* The field keeps the email input's box; the toggle sits inside it,
              so the two rows stay the same 70px height and square corners. */}
          <View className="mt-sm h-[70px] flex-row items-center bg-surface-primary">
            <TextInput
              className="h-full flex-1 px-md font-hestia-primary text-hestia-2xl font-light text-ink-primary"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
              textContentType="password"
              autoComplete="current-password"
              accessibilityLabel={t('login.passwordLabel')}
            />
            <Pressable
              onPress={() => setPasswordVisible((visible) => !visible)}
              hitSlop={12}
              className="h-full justify-center px-md"
              accessibilityRole="button"
              accessibilityState={{ selected: passwordVisible }}
              accessibilityLabel={
                passwordVisible ? t('login.hidePassword') : t('login.showPassword')
              }
            >
              <Icon
                name={passwordVisible ? 'action-eye-off' : 'action-eye'}
                size={18}
                color={colors.primary.main}
              />
            </Pressable>
          </View>

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
            accessibilityLabel={t('login.signIn')}
          >
            {isSigningIn ? (
              <ActivityIndicator color={colors.text.white} />
            ) : (
              <Text className="font-hestia-primary text-hestia-3xl text-ink-white">{t('login.signIn')}</Text>
            )}
          </Pressable>

          {/* Node 266:73 — same size, page background, hairline border. */}
          <Pressable
            className="mt-2xl h-[70px] flex-row items-center justify-center gap-md border border-border-light bg-surface-secondary"
            onPress={handleRecoverPassword}
            accessibilityRole="button"
            accessibilityLabel={t('login.recoverPassword')}
          >
            <Text className="font-hestia-primary text-hestia-3xl text-primary">{t('login.recoverPassword')}</Text>
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
              {t('login.supportTitle')}
            </Text>
            <Text className="font-hestia-primary text-hestia-lg font-light text-ink-primary">
              {t('login.supportSubtitle')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
