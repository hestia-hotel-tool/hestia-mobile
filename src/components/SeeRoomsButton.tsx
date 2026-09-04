import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Dimensions } from 'react-native';
import { typography } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

interface SeeRoomsButtonProps {
  onPress: () => void;
  resultCount: number;
  label?: string; // Optional label, defaults to "See Rooms"
}

export default function SeeRoomsButton({
  onPress,
  resultCount,
  label = 'See Rooms',
}: SeeRoomsButtonProps) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.buttonText}>{label}</Text>
      {/* Badge with result count */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{resultCount}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 231 * scaleX,
    height: 66.287 * scaleX,
    borderRadius: 40 * scaleX,
    backgroundColor: '#5A759D',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  buttonText: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as any,
    color: '#FFFFFF',
  },
  badge: {
    position: 'absolute',
    bottom: -8 * scaleX,
    right: -8 * scaleX,
    backgroundColor: '#FFFFFF',
    borderRadius: 12 * scaleX, // Half of width/height to make it circular
    width: 24 * scaleX,
    height: 24 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as any,
    color: '#5A759D',
  },
});
