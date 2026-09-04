import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography } from '@/theme';
import { useDesignScale } from '@/ui';
import { useAuth } from '@features/auth';

/**
 * Explains why the app cannot proceed, and offers the one action that helps.
 *
 * Shared by the launch screen and the route guard, which previously carried
 * verbatim copies of the same message, pill button and sign-out handler.
 *
 * Lives in `domain/rbac` because both consumers already depend on rbac —
 * `RouteGuard` and `Can` set the precedent for UI in this folder — so no new
 * dependency edge is created.
 */
export type NoAccessNoticeProps = {
  message: string;
  /** Hidden while a transient state (e.g. a slow connection) may still resolve. */
  showSignOut?: boolean;
};

export const NO_JOB_TITLE_MESSAGE =
  'This account has not been given a job title, so it has no permissions. Ask your manager to assign one.';

export function NoAccessNotice({ message, showSignOut = true }: NoAccessNoticeProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { s } = useDesignScale();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          fontSize: s(14),
          lineHeight: s(20),
          fontFamily: typography.fontFamily.regular,
          color: colors.primary.main,
          textAlign: 'center',
          opacity: 0.95,
        },
        button: {
          marginTop: s(16),
          paddingVertical: s(10),
          paddingHorizontal: s(24),
          borderRadius: 999,
          backgroundColor: colors.primary.main,
        },
        buttonText: {
          fontSize: s(15),
          fontFamily: typography.fontFamily.semibold,
          color: colors.text.white,
        },
      }),
    [s],
  );

  return (
    <>
      <Text style={styles.body}>{message}</Text>
      {showSignOut && (
        <Pressable
          style={styles.button}
          accessibilityRole="button"
          onPress={async () => {
            await signOut();
            router.replace('/(auth)/login');
          }}
        >
          <Text style={styles.buttonText}>Back to sign in</Text>
        </Pressable>
      )}
    </>
  );
}
