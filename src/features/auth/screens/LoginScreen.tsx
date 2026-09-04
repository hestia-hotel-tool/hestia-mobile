import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '@/theme';
import { Button, TextField, useDesignScale } from '@/ui';
import { Screen } from '@/components/layout/Screen';
import { BrandLockup } from '@/components/brand/BrandLockup';
import { LanguageSelector } from '../components/LanguageSelector';
import { CustomerServiceCard } from '../components/CustomerServiceCard';
import { useAuth } from '../hooks/useAuth';

/**
 * Sign-in. Figma 263:40.
 *
 * Laid out with flex against the comp's vertical rhythm rather than absolute
 * design-frame offsets, so it survives a keyboard, a small phone and a tablet.
 * The measured gaps are noted inline where they are applied.
 */
export default function LoginScreen() {
  const { s } = useDesignScale();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState('EN');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setIsSigningIn(true);
    try {
      const { error: signInError } = await signIn(email.trim(), password);
      if (signInError) {
        console.error('[Login] signIn error:', signInError);
        setError(signInError.message ?? 'Invalid email or password.');
        return;
      }
      router.replace('/(tabs)/(home)');
    } catch (err) {
      console.error('[Login] signIn unexpected error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { flexGrow: 1 },
        // The comp puts the header at y=85; sit it below the notch instead.
        header: {
          paddingTop: insets.top + s(23),
          paddingHorizontal: s(35),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        },
        // Header bottom 117.7 -> divider 144. Full-bleed, so it sits outside
        // the horizontal padding.
        divider: {
          marginTop: s(26.3),
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border.light,
        },
        body: { paddingHorizontal: s(35) },
        title: {
          marginTop: s(45), // divider 144 -> "Log in" 189
          fontSize: s(34),
          lineHeight: s(39),
          fontFamily: typography.fontFamily.bold,
          color: colors.primary.main,
        },
        emailField: { marginTop: s(80) }, // title box bottom 228 -> email label 308
        passwordField: { marginTop: s(18) }, // email input bottom 408 -> label 426
        error: {
          marginTop: s(12),
          fontSize: s(14),
          lineHeight: s(19),
          fontFamily: typography.fontFamily.regular,
          color: colors.status.dirty,
        },
        signIn: { marginTop: s(42) }, // password input bottom 526 -> button 568
        recover: { marginTop: s(27) }, // sign-in bottom 638 -> recover 665
        // Recover bottom 735 -> support block 852. `auto` keeps it at the foot
        // on a tall screen and lets it scroll on a short one.
        support: {
          marginTop: 'auto',
          paddingTop: s(117),
          paddingBottom: insets.bottom + s(59),
          alignItems: 'center',
        },
      }),
    [s, insets.top, insets.bottom],
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <BrandLockup markHeight={32.711} />
          <LanguageSelector value={language} onChange={setLanguage} />
        </View>
        <View style={styles.divider} />

        <View style={styles.body}>
          <Text style={styles.title} maxFontSizeMultiplier={1.3}>
            Log in
          </Text>

          <View style={styles.emailField}>
            <TextField
              label="Company email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="username"
            />
          </View>

          <View style={styles.passwordField}>
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />
          </View>

          {error && (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          )}

          <View style={styles.signIn}>
            <Button label="Sign In" onPress={handleLogin} loading={isSigningIn} />
          </View>

          <View style={styles.recover}>
            <Button
              label="Recover Password"
              variant="secondary"
              trailingIcon="nav-chevron-right"
              onPress={() => {
                /* TODO: recover-password flow */
              }}
            />
          </View>
        </View>

        <View style={styles.support}>
          <CustomerServiceCard />
        </View>
      </ScrollView>
    </Screen>
  );
}
