import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '@/theme';
import { scaleX, STAFF_HEADER } from '../constants/staffStyles';

interface StaffHeaderProps {
  onBackPress?: () => void;
  /** Top-right action button (Figma shows a + button). */
  onAddPress?: () => void;
}

export default function StaffHeader({
  onBackPress,
  onAddPress,
}: StaffHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.background} />
      
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBackPress}
        activeOpacity={0.7}
      >
        <Image
          source={require('../../../../assets/icons/back-arrow.png')}
          style={styles.backArrow}
          resizeMode="contain"
          tintColor="#607aa1"
        />
      </TouchableOpacity>
      
      {/* Title */}
      <Text style={styles.title}>Staff</Text>
      
      {/* + Button */}
      {onAddPress && (
        <TouchableOpacity
          style={styles.addButtonWrap}
          onPress={onAddPress}
          activeOpacity={0.7}
        >
          <View style={styles.addButtonCircle}>
            <Ionicons name="add" size={28 * scaleX} color="#ffffff" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: STAFF_HEADER.height * scaleX,
    zIndex: 10,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: STAFF_HEADER.height * scaleX,
    backgroundColor: STAFF_HEADER.background.backgroundColor,
  },
  backButton: {
    position: 'absolute',
    left: STAFF_HEADER.backButton.left * scaleX,
    top: STAFF_HEADER.backButton.top * scaleX,
    width: STAFF_HEADER.backButton.width * scaleX,
    height: STAFF_HEADER.backButton.height * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    width: STAFF_HEADER.backButton.width * scaleX,
    height: STAFF_HEADER.backButton.height * scaleX,
  },
  title: {
    position: 'absolute',
    left: STAFF_HEADER.title.left * scaleX,
    top: STAFF_HEADER.title.top * scaleX,
    fontSize: STAFF_HEADER.title.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: STAFF_HEADER.title.color,
  },
  addButtonWrap: {
    position: 'absolute',
    right: 32 * scaleX,
    top: 50 * scaleX,
    width: 54 * scaleX,
    height: 54 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonCircle: {
    width: 54 * scaleX,
    height: 54 * scaleX,
    borderRadius: 999,
    backgroundColor: 'rgba(90,117,157,0.59)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


