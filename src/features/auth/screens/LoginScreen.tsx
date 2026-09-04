import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '@/theme';
import { useAuth } from '../hooks/useAuth';
import { useDesignScale } from '@/ui';

const LANGUAGES = [
  { code: 'EN', name: 'English' },
  { code: 'FR', name: 'French' },
  { code: 'DE', name: 'German' },
  { code: 'IT', name: 'Italian' },
];

export default function LoginScreen() {
  const { scaleX, height: windowHeight } = useDesignScale();
  const styles = useMemo(() => buildLoginStyles(scaleX, windowHeight), [scaleX, windowHeight]);
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('EN');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
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

  // Calculate safe top padding for Android
  const safeTop = Platform.OS === 'android' ? Math.max(insets.top, 20) : 0;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: safeTop }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header Section (Group 208) */}
      {/* Logo (Group 207) - x=35, y=85, 34.673×32.711px */}
      <Image 
        source={require('../../../../assets/logos/header-logo.png')} 
        style={styles.headerLogo}
        resizeMode="contain"
      />
      
      {/* Hestia Text - x=80.18, y=96.79, 69.816×18.812px */}
      <Text style={styles.hestiaText}>Hestia</Text>
      
      {/* Language Selector with Dropdown Arrow - centered */}
      <View style={styles.languageSelectorContainer}>
        <TouchableOpacity 
          style={styles.languageSelector}
          onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
          activeOpacity={0.7}
        >
        <Text style={styles.languageText}>
            Language <Text style={styles.languageValue}>{selectedLanguage}</Text>
        </Text>
      </TouchableOpacity>
      
        {/* Dropdown Arrow - vertically centered with text */}
        <TouchableOpacity 
          style={styles.dropdownArrowContainer}
          onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
      <Image 
            source={require('../../../../assets/icons/dropdown-arrow.png')} 
            style={[
              styles.dropdownArrow,
              showLanguageDropdown && styles.dropdownArrowOpen
            ]}
        resizeMode="contain"
      />
        </TouchableOpacity>
      </View>

      {/* Language Dropdown Menu */}
      {showLanguageDropdown && (
        <>
          {/* Backdrop to close dropdown when clicking outside */}
          <TouchableOpacity 
            style={styles.dropdownBackdrop}
            activeOpacity={1}
            onPress={() => setShowLanguageDropdown(false)}
          />
          <View style={styles.languageDropdownMenu}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={styles.languageDropdownItem}
                onPress={() => {
                  setSelectedLanguage(lang.code);
                  setShowLanguageDropdown(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.languageDropdownText,
                  selectedLanguage === lang.code && styles.languageDropdownTextSelected
                ]}>
                  {lang.name} ({lang.code})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Divider Line (Vector 41) - x=-1, y=144, 440×0px */}
      <View style={styles.divider} />

      {/* Log in Title - x=35, y=189, 109×39px */}
      <Text style={styles.title}>Log in</Text>

      {/* Company Email Section */}
      {/* Label - x=35, y=308 */}
      <Text style={styles.emailLabel}>Company email</Text>
      
      {/* Input Field (Rectangle 113) - x=35, y=338, 370×70px */}
      <View style={styles.emailInputContainer}>
        <TextInput
          style={styles.emailInput}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Password Section */}
      {/* Label - x=35, y=426 */}
      <Text style={styles.passwordLabel}>Password</Text>
      
      {/* Input Field (Rectangle 114) - x=36, y=456, 370×70px */}
      <View style={styles.passwordInputContainer}>
        <TextInput
          style={styles.passwordInput}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Sign In Button (Rectangle 115) - x=35, y=568, 370×70px */}
      <TouchableOpacity
        style={[styles.signInButton, isSigningIn && styles.signInButtonDisabled]}
        onPress={handleLogin}
        disabled={isSigningIn}
      >
        {isSigningIn ? (
          <ActivityIndicator color={colors.text.white} />
        ) : (
          <Text style={styles.signInText}>Sign In</Text>
        )}
      </TouchableOpacity>

      {/* Recover Password Section */}
      {/* Background (Rectangle 116) - x=36, y=665, 370×70px */}
      <TouchableOpacity 
        style={styles.recoverPasswordContainer}
        onPress={() => {/* TODO: Navigate to recover password */}}
        activeOpacity={0.7}
      >
        <View style={styles.recoverPasswordContent}>
          {/* Text - centered with arrow */}
        <Text style={styles.recoverPasswordText}>Recover Password</Text>
      
        {/* Recover Password Arrow - vertically and horizontally centered with text */}
      <Image 
          source={require('../../../../assets/icons/recover-arrow.png')} 
        style={styles.recoverArrow}
        resizeMode="contain"
      />
        </View>
      </TouchableOpacity>

      {/* Customer Service Section (Group 210) */}
      {/* Background (Rectangle 117) - x=62, y=839, 317×71px, borderRadius 81px */}
      <View style={styles.customerServiceContainer}>
        {/* Logo Icon (Group 207) - x=95, y=852, 42.07×39.689px */}
        <Image 
          source={require('../../../../assets/logos/customer-service-logo.png')} 
          style={styles.customerServiceLogo}
          resizeMode="contain"
        />
        
        {/* Phone Icon (Vector) - x=109.07, y=864.99, 20×20px */}
        <Image 
          source={require('../../../../assets/icons/phone-icon.png')} 
          style={styles.phoneIcon}
          resizeMode="contain"
        />
        
        {/* Customer Service Text - x=154, y=855, 128×17px */}
        <Text style={styles.customerServiceTitle}>Customer Service</Text>
        
        {/* Having issues text - x=154, y=875, 216×22px */}
        <Text style={styles.customerServiceSubtitle}>Having issues with the app?</Text>
      </View>
    </ScrollView>
  );
}

function buildLoginStyles(scaleX: number, windowHeight: number) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef0f6', // Exact color from Figma
  },
  contentContainer: {
    minHeight: windowHeight,
    paddingBottom: 40,
  },
  // Header Logo (Group 207) - x=35, y=85, 34.673×32.711px
  headerLogo: {
    position: 'absolute',
    left: 35 * scaleX,
    top: 85 * scaleX,
    width: 34.673 * scaleX,
    height: 32.711 * scaleX,
    zIndex: 1, // Ensure logo is visible
  },
  // Hestia Text - x=80.18, y=96.79, 69.816×18.812px
  hestiaText: {
    position: 'absolute',
    left: 80.18 * scaleX,
    top: 96.79 * scaleX,
    minWidth: 70 * scaleX, // Ensure full text visibility
    height: 18.812 * scaleX,
    fontSize: 19 * scaleX,
    fontFamily: typography.fontFamily.regular,
    fontWeight: typography.fontWeights.regular as any,
    color: '#5A759D', // Exact color from Figma
    includeFontPadding: Platform.OS === 'android' ? false : undefined,
  },
  // Language Selector Container - wraps text and arrow for vertical centering
  languageSelectorContainer: {
    position: 'absolute',
    right: 35 * scaleX, // Use right positioning for better fit
    top: 97 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1, // Ensure language selector is visible
  },
  languageSelector: {
    // No positioning needed - within flex container
  },
  languageText: {
    fontSize: 17 * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: typography.fontWeights.light as any,
    color: colors.text.tertiary, // Lighter grey (#a0a0a0) as per Figma
  },
  languageValue: {
    fontWeight: typography.fontWeights.bold as any,
    color: '#ff46a3', // Exact pink color from Figma
  },
  // Dropdown Arrow Container - vertically centered with text
  dropdownArrowContainer: {
    width: 20 * scaleX, // Larger container to prevent clipping
    height: 20 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8 * scaleX, // Small gap between text and arrow
  },
  dropdownArrow: {
    width: 18 * scaleX, // Actual image dimensions (18x9)
    height: 9 * scaleX,
    tintColor: colors.text.primary, // Dark grey (#1e1e1e) as per Figma
    // No rotation needed - arrow already points in correct direction
  },
  dropdownArrowOpen: {
    transform: [{ rotate: '180deg' }], // Flip when dropdown is open
  },
  // Dropdown backdrop (closes dropdown when clicking outside)
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  // Language Dropdown Menu
  languageDropdownMenu: {
    position: 'absolute',
    right: 35 * scaleX, // Match language selector container position
    top: 120 * scaleX,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  languageDropdownItem: {
    paddingHorizontal: 16 * scaleX,
    paddingVertical: 12 * scaleX,
    minWidth: 150 * scaleX,
  },
  languageDropdownText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.regular,
    fontWeight: typography.fontWeights.regular as any,
    color: colors.text.primary,
  },
  languageDropdownTextSelected: {
    fontWeight: typography.fontWeights.bold as any,
    color: '#ff46a3',
  },
  // Divider Line (Vector 41) - x=-1, y=144, 440×0px
  divider: {
    position: 'absolute',
    left: -1 * scaleX,
    top: 144 * scaleX,
    width: 440 * scaleX,
    height: 1, // Minimal height for visibility
    backgroundColor: colors.border.light,
  },
  // Log in Title - x=35, y=189, 109×39px
  title: {
    position: 'absolute',
    left: 35 * scaleX,
    top: 189 * scaleX,
    minWidth: 120 * scaleX, // Ensure enough width for "Log in" text
    height: 39 * scaleX,
    fontSize: 34 * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.primary.main,
    includeFontPadding: Platform.OS === 'android' ? false : undefined, // Fix Android text clipping
    textAlignVertical: 'center',
  },
  // Company Email Label - x=35, y=308
  emailLabel: {
    position: 'absolute',
    left: 35 * scaleX,
    top: 308 * scaleX,
    width: 121 * scaleX,
    height: 22 * scaleX,
    fontSize: 17 * scaleX,
    fontFamily: typography.fontFamily.regular,
    fontWeight: typography.fontWeights.regular as any,
    color: colors.text.primary,
  },
  // Email Input Container (Rectangle 113) - x=35, y=338, 370×70px
  emailInputContainer: {
    position: 'absolute',
    left: 35 * scaleX,
    top: 338 * scaleX,
    width: 370 * scaleX,
    height: 70 * scaleX,
    backgroundColor: colors.background.primary,
  },
  emailInput: {
    flex: 1,
    paddingHorizontal: 12 * scaleX, // x=47 - x=35 = 12px padding
    fontSize: 17 * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: typography.fontWeights.light as any,
    color: colors.text.primary,
  },
  // Password Label - x=35, y=426
  passwordLabel: {
    position: 'absolute',
    left: 35 * scaleX,
    top: 426 * scaleX,
    width: 121 * scaleX,
    height: 22 * scaleX,
    fontSize: 17 * scaleX,
    fontFamily: typography.fontFamily.regular,
    fontWeight: typography.fontWeights.regular as any,
    color: colors.text.primary,
  },
  // Password Input Container (Rectangle 114) - x=36, y=456, 370×70px
  passwordInputContainer: {
    position: 'absolute',
    left: 36 * scaleX,
    top: 456 * scaleX,
    width: 370 * scaleX,
    height: 70 * scaleX,
    backgroundColor: colors.background.primary,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 9 * scaleX, // x=45 - x=36 = 9px padding
    fontSize: 17 * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: typography.fontWeights.light as any,
    color: colors.text.primary,
  },
  // Sign In Button (Rectangle 115) - x=35, y=568, 370×70px
  signInButton: {
    position: 'absolute',
    left: 35 * scaleX,
    top: 568 * scaleX,
    width: 370 * scaleX,
    height: 70 * scaleX,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.regular,
    fontWeight: typography.fontWeights.regular as any,
    color: colors.text.white,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  errorContainer: {
    position: 'absolute',
    left: 35 * scaleX,
    top: 535 * scaleX,
    width: 370 * scaleX,
  },
  errorText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.regular,
    color: '#c53030',
  },
  // Recover Password Container (Rectangle 116) - x=36, y=665, 370×70px
  recoverPasswordContainer: {
    position: 'absolute',
    left: 36 * scaleX,
    top: 665 * scaleX,
    width: 370 * scaleX,
    height: 70 * scaleX,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Content wrapper for text and arrow
  recoverPasswordContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8 * scaleX, // Space between text and arrow
  },
  recoverPasswordText: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.regular,
    fontWeight: typography.fontWeights.regular as any,
    color: colors.primary.main,
  },
  // Recover Arrow - centered with text
  recoverArrow: {
    width: 8 * scaleX, // Original asset dimensions (8x17, pointing right)
    height: 17 * scaleX,
    // No rotation needed - arrow already points right as per Figma design
  },
  // Customer Service Container (Rectangle 117) - x=62, y=839, 317×71px
  customerServiceContainer: {
    position: 'absolute',
    left: 62 * scaleX,
    top: 839 * scaleX,
    width: 317 * scaleX,
    height: 71 * scaleX,
    backgroundColor: 'rgba(217,217,217,0.3)', // Exact color from Figma
    borderRadius: 81 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 33 * scaleX, // x=95 - x=62 = 33px padding
  },
  // Customer Service Logo (Group 207) - x=95, y=852, 42.07×39.689px (relative: x=33, y=13)
  customerServiceLogo: {
    position: 'absolute',
    left: 33 * scaleX,
    top: 13 * scaleX,
    width: 42.07 * scaleX,
    height: 39.689 * scaleX,
  },
  // Phone Icon (Vector) - x=109.07, y=864.99, 20×20px (relative: x=47.07, y=25.99)
  phoneIcon: {
    position: 'absolute',
    left: 47.07 * scaleX,
    top: 25.99 * scaleX,
    width: 20 * scaleX,
    height: 20 * scaleX,
  },
  // Customer Service Title - x=154, y=855, 128×17px (relative: x=92, y=16)
  customerServiceTitle: {
    position: 'absolute',
    left: 92 * scaleX,
    top: 16 * scaleX,
    width: 128 * scaleX,
    height: 17 * scaleX,
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.primary.main,
  },
  // Customer Service Subtitle - x=154, y=875, 216×22px (relative: x=92, y=36)
  customerServiceSubtitle: {
    position: 'absolute',
    left: 92 * scaleX,
    top: 36 * scaleX,
    width: 216 * scaleX,
    height: 22 * scaleX,
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: typography.fontWeights.light as any,
    color: colors.text.primary,
  },
});
}

