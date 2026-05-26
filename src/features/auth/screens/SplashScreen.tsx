import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@app/navigation/types';
import { colors, typography } from '@shared/theme';
import { useAuth } from '../hooks/useAuth';

type SplashScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

const DESIGN_WIDTH = 440;
const DESIGN_HEIGHT = 956;
const MIN_SPLASH_DURATION_MS = 2000;

export default function SplashScreen() {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const { session, hotelId, error, isLoading } = useAuth();
  const { width, height } = useWindowDimensions();
  const scale = useMemo(
    () => Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT),
    [width, height],
  );
  const styles = useMemo(() => buildSplashStyles(scale), [scale]);

  useEffect(() => {
    if (isLoading) return;
    if (session && !hotelId && !error) return;

    const timer = setTimeout(() => {
      if (session) {
        navigation.replace('Main');
      } else {
        navigation.replace('Login');
      }
    }, MIN_SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, [isLoading, session, hotelId, error, navigation]);

  return (
    <View style={styles.container}>
      {/* Centered content block (positioned to match Figma). */}
      <View style={styles.logoTitleGroup}>
        <Image
          source={require('../../../../assets/logos/header-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Hestia</Text>
      </View>

      <Text style={styles.subtitle}>Build by Housekeepers</Text>
      <Text style={styles.tagline}>For Housekeeping</Text>
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.indicator} />
      {(isLoading || (session && !hotelId && !error)) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.text.white} />
        </View>
      )}
    </View>
  );
}

function buildSplashStyles(scale: number) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#EEF0F6',
    },
    logoTitleGroup: {
      position: 'absolute',
      top: 376 * scale,
      left: 0,
      right: 0,
      flexDirection: 'row',
      // Figma: logo sits ~10px above the wordmark baseline.
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    logo: {
      width: 53 * scale,
      height: 50 * scale,
    },
    title: {
      // Figma spacing: ~13px gap from icon to wordmark.
      marginLeft: 13 * scale,
      // Figma: wordmark top is ~10px below icon top.
      marginTop: 10 * scale,
      fontSize: 39 * scale,
      fontFamily: typography.fontFamily.primary,
      fontWeight: typography.fontWeights.regular as '400',
      color: '#5A759D',
      lineHeight: 39 * scale * 1.147,
      textAlign: 'center',
    },
    subtitle: {
      position: 'absolute',
      top: 534 * scale,
      left: 0,
      right: 0,
      fontSize: 22 * scale,
      fontFamily: typography.fontFamily.primary,
      fontWeight: typography.fontWeights.light as '300',
      color: '#5A759D',
      lineHeight: 22 * scale,
      textAlign: 'center',
    },
    tagline: {
      position: 'absolute',
      top: 565 * scale,
      left: 0,
      right: 0,
      fontSize: 21 * scale,
      fontFamily: typography.fontFamily.primary,
      fontWeight: typography.fontWeights.bold as '700',
      color: '#FF46A3',
      lineHeight: 24 * scale,
      textAlign: 'center',
    },
    errorText: {
      position: 'absolute',
      top: 610 * scale,
      left: 24 * scale,
      right: 24 * scale,
      paddingHorizontal: 18 * scale,
      fontSize: 14 * scale,
      fontFamily: typography.fontFamily.primary,
      color: '#5A759D',
      textAlign: 'center',
      opacity: 0.95,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(238, 240, 246, 0.7)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    indicator: {
      position: 'absolute',
      bottom: 47 * scale,
      left: '50%',
      width: 54 * scale,
      height: 8 * scale,
      backgroundColor: '#D9D9D9',
      borderRadius: 57 * scale,
      transform: [{ translateX: -(54 * scale) / 2 }],
    },
  });
}
