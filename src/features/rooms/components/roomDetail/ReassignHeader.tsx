import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { typography } from '@/theme';
import { REASSIGN_MODAL, scaleX } from '../../constants/reassignModalStyles';

interface ReassignHeaderProps {
  onBackPress: () => void;
  onAutoAssignPress?: () => void;
  onSearchPress?: () => void;
}

export default function ReassignHeader({
  onBackPress,
  onAutoAssignPress,
  onSearchPress,
}: ReassignHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBackPress}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <View style={styles.backArrowContainer}>
          <Image
            source={require('../../../../../assets/icons/back-arrow.png')}
            style={[styles.backArrow, { tintColor: REASSIGN_MODAL.header.backButton.color }]}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* Auto Assign Button - only when provided */}
      {onAutoAssignPress != null && (
        <TouchableOpacity
          style={styles.autoAssignButton}
          onPress={onAutoAssignPress}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.autoAssignText}>Auto Assign</Text>
        </TouchableOpacity>
      )}

      {/* Search Icon */}
      {onSearchPress && (
        <TouchableOpacity
          style={styles.searchButton}
          onPress={onSearchPress}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image
            source={require('../../../../../assets/icons/search-icon.png')}
            style={styles.searchIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    height: REASSIGN_MODAL.header.height * scaleX,
    backgroundColor: REASSIGN_MODAL.header.backgroundColor,
  },
  backButton: {
    position: 'absolute',
    left: REASSIGN_MODAL.header.backButton.left * scaleX,
    top: REASSIGN_MODAL.header.backButton.top * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 * scaleX,
  },
  backArrowContainer: {
    width: 14 * scaleX,
    height: 28 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    width: 14 * scaleX,
    height: 28 * scaleX,
  },
  backText: {
    fontSize: REASSIGN_MODAL.header.backButton.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: REASSIGN_MODAL.header.backButton.color,
  },
  autoAssignButton: {
    position: 'absolute',
    right: (440 - REASSIGN_MODAL.header.autoAssignButton.right - REASSIGN_MODAL.header.autoAssignButton.width) * scaleX,
    top: REASSIGN_MODAL.header.autoAssignButton.top * scaleX,
    width: REASSIGN_MODAL.header.autoAssignButton.width * scaleX,
    height: REASSIGN_MODAL.header.autoAssignButton.height * scaleX,
    borderRadius: REASSIGN_MODAL.header.autoAssignButton.borderRadius * scaleX,
    backgroundColor: REASSIGN_MODAL.header.autoAssignButton.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoAssignText: {
    fontSize: REASSIGN_MODAL.header.autoAssignButton.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: REASSIGN_MODAL.header.autoAssignButton.color,
  },
  searchButton: {
    position: 'absolute',
    right: (440 - REASSIGN_MODAL.header.searchIcon.right) * scaleX,
    top: REASSIGN_MODAL.header.searchIcon.top * scaleX,
    width: REASSIGN_MODAL.header.searchIcon.size * scaleX,
    height: REASSIGN_MODAL.header.searchIcon.size * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    width: REASSIGN_MODAL.header.searchIcon.size * scaleX,
    height: REASSIGN_MODAL.header.searchIcon.size * scaleX,
  },
});

