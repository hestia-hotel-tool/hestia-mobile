import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ErrorBoundaryProps } from 'expo-router';
import { typography } from '@/theme';
import { recordClientError } from '@/lib/crashReporter';

/**
 * Shown in place of a screen that threw while rendering — expo-router's
 * `ErrorBoundary` export (app/_layout.tsx). Without one, a render error is
 * fatal in a release build and the app closes (the 1.2.3 (4) crashes). The
 * error is recorded for upload (src/lib/crashReporter.ts); "Try again"
 * re-renders the screen.
 */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    void recordClientError(error, { fatal: false, source: 'render' });
  }, [error]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#f4f7fc',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
      accessibilityRole="alert"
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: '#e4eefe',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
        }}
      >
        <Ionicons name="alert-circle-outline" size={36} color="#5a759d" />
      </View>
      <Text
        style={{ fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 19, color: '#334866', textAlign: 'center' }}
      >
        Something went wrong
      </Text>
      <Text
        style={{
          fontFamily: typography.fontFamily.primary,
          fontSize: 15,
          lineHeight: 22,
          color: '#607aa1',
          textAlign: 'center',
          marginTop: 8,
        }}
      >
        This screen could not be shown. It has been reported, and trying again usually works.
      </Text>
      <Pressable
        onPress={() => void retry()}
        accessibilityRole="button"
        style={({ pressed }) => ({
          marginTop: 24,
          paddingHorizontal: 28,
          paddingVertical: 12,
          borderRadius: 24,
          backgroundColor: pressed ? '#4a6487' : '#5a759d',
        })}
      >
        <Text style={{ fontFamily: typography.fontFamily.primary, fontWeight: '600', fontSize: 16, color: '#ffffff' }}>
          Try again
        </Text>
      </Pressable>
    </View>
  );
}

export default AppErrorBoundary;
