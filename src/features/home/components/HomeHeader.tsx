import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { UserProfile, ShiftType } from '../types/home.types';
import { HOME_HEADER_HEIGHT_DESIGN_PX } from '../constants/homeLayout';
import { colors, typography } from '@shared/theme';
import { getInitialsFromFullName } from '@shared/utils/formatting';
import AMPMToggle from './AMPMToggle';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;
/** Space for AM/PM toggle (right inset + toggle width) + gap so role/name can wrap without overlapping. */
const HEADER_TOGGLE_RESERVE = (59.5 + 121 + 8) * scaleX;
/** Left offset: container inset + avatar + margin before name/role. */
const HEADER_PROFILE_LEFT = (22 + 51 + 12) * scaleX;
const PROFILE_INFO_MAX_WIDTH = Math.max(0, SCREEN_WIDTH - HEADER_PROFILE_LEFT - HEADER_TOGGLE_RESERVE);

interface HomeHeaderProps {
  user: UserProfile;
  selectedShift: ShiftType;
  date: string;
  onShiftToggle: (shift: ShiftType) => void;
  onBellPress: () => void;
  onProfilePress?: () => void;
}

export default function HomeHeader({
  user,
  selectedShift,
  date,
  onShiftToggle,
  onBellPress,
  onProfilePress,
}: HomeHeaderProps) {
  const ProfileWrapper = onProfilePress ? TouchableOpacity : View;
  const profileWrapperProps = onProfilePress ? { onPress: onProfilePress, activeOpacity: 0.8 } : {};

  return (
    <View style={[
      styles.container,
      selectedShift === 'PM' && styles.containerPM
    ]}>
      {/* Profile Section - tappable to open profile */}
      <ProfileWrapper style={styles.profileSection} {...profileWrapperProps}>
        <View style={styles.profileImageContainer}>
          {user.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.initialsCircle}>
              <Text style={[
                styles.initialsText,
                selectedShift === 'PM' ? styles.initialsTextPM : null
              ]}>
                {getInitialsFromFullName(typeof user.name === 'string' ? user.name : '')}
              </Text>
            </View>
          )}
          {user.hasFlag ? (
            <View style={styles.flagContainer}>
              <View style={styles.flagCircle}>
                <Image
                  source={require('../../../../assets/icons/flag-icon.png')}
                  style={styles.flagIcon}
                  resizeMode="contain"
                />
              </View>
            </View>
          ) : null}
        </View>
        <View style={[styles.profileInfo, { maxWidth: PROFILE_INFO_MAX_WIDTH }]}>
          <Text style={[
            styles.userName,
            selectedShift === 'PM' ? styles.userNamePM : null
          ]}>
            {typeof user.name === 'string' ? user.name : ''}
          </Text>
          <Text
            style={[
              styles.userRole,
              selectedShift === 'PM' ? styles.userRolePM : null,
            ]}
          >
            {typeof user.role === 'string' ? user.role : ''}
          </Text>
        </View>
      </ProfileWrapper>

      {/* AM/PM Toggle */}
      <View style={styles.toggleContainer}>
        <AMPMToggle selected={selectedShift} onToggle={onShiftToggle} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    height: HOME_HEADER_HEIGHT_DESIGN_PX * scaleX,
    shadowColor: 'rgba(100,131,176,0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 105.1 * scaleX / 3,
    elevation: 8,
    zIndex: 100,
  },
  containerPM: {
    backgroundColor: '#38414F', // Dark slate gray for PM mode
  },
  profileSection: {
    position: 'absolute',
    left: 22 * scaleX,
    top: 74 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    width: 51 * scaleX,
    height: 51 * scaleX,
  },
  profileImage: {
    width: 51 * scaleX,
    height: 51 * scaleX,
    borderRadius: 25.5 * scaleX,
  },
  initialsCircle: {
    width: 51 * scaleX,
    height: 51 * scaleX,
    borderRadius: 25.5 * scaleX,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 22 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.text.white,
  },
  initialsTextPM: {
    color: colors.text.white,
  },
  flagContainer: {
    position: 'absolute',
    right: -4 * scaleX,
    bottom: -2 * scaleX,
  },
  flagCircle: {
    width: 20 * scaleX,
    height: 20 * scaleX,
    borderRadius: 10 * scaleX,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagIcon: {
    width: 10 * scaleX,
    height: 10 * scaleX,
  },
  profileInfo: {
    marginLeft: 12 * scaleX,
    flexShrink: 1,
  },
  userName: {
    color: '#000',
    fontFamily: 'Helvetica',
    fontSize: 20 * scaleX,
    fontStyle: 'normal',
    fontWeight: '300',
    lineHeight: 24 * scaleX,
    marginBottom: 2 * scaleX,
  },
  userRole: {
    color: '#000',
    fontFamily: 'Inter',
    fontSize: 11 * scaleX,
    fontStyle: 'normal',
    fontWeight: '300',
  },
  toggleContainer: {
    position: 'absolute',
    right: 59.5 * scaleX,
    top: 82 * scaleX,
  },
  userNamePM: {
    color: colors.text.white,
  },
  userRolePM: {
    color: colors.text.white,
  },
});

