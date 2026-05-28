import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { typography, colors } from '@shared/theme';
import { REASSIGN_MODAL, scaleX } from '../../constants/reassignModalStyles';
import WorkloadProgressBar from '@shared/ui/WorkloadProgressBar';

interface StaffListItemProps {
  staff: {
    id: string;
    name: string;
    department?: string;
    role?: string;
    avatar?: any;
    initials?: string;
    workload?: number;
    maxWorkload?: number;
    onShift?: boolean;
  };
  isSelected: boolean;
  onPress: () => void;
}

export default function StaffListItem({
  staff,
  isSelected,
  onPress,
}: StaffListItemProps) {
  // Get first letter for initial if no avatar
  const initial = staff.initials || (staff.name ? staff.name.charAt(0).toUpperCase() : '?');
  // Remote URLs need { uri }; local require() is a number. Empty string = no image.
  const avatarSource =
    typeof staff.avatar === 'string'
      ? staff.avatar.trim()
        ? { uri: staff.avatar.trim() }
        : null
      : staff.avatar || null;

  // Generate color for initial circle based on name
  const getInitialColor = (name: string): string => {
    const colors = ['#ff4dd8', '#5a759d', '#607aa1', '#f0be1b'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.containerSelected]}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {/* Profile Picture or Initial */}
      <View style={styles.avatarContainer}>
        {avatarSource ? (
          <Image
            source={avatarSource}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.initialsCircle, { backgroundColor: getInitialColor(staff.name) }]}>
            <Text style={styles.initialsText}>{initial}</Text>
          </View>
        )}
      </View>

      {/* Name and Role */}
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{staff.name}</Text>
        <Text style={styles.department}>
          {staff.role ?? ''}
        </Text>
      </View>

      {/* Workload Progress Bar - Always show for all staff */}
      <View style={styles.progressContainer} collapsable={false}>
        <WorkloadProgressBar
          current={staff.workload || 0}
          max={staff.maxWorkload || 200}
          showNumber={true}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20 * scaleX,
    paddingLeft: REASSIGN_MODAL.staffList.profilePicture.left * scaleX,
    paddingRight: 20 * scaleX, // Add right padding to prevent cutoff
    minHeight: REASSIGN_MODAL.staffList.itemHeight * scaleX,
  },
  containerSelected: {
    backgroundColor: '#f5f5f5',
  },
  avatarContainer: {
    width: REASSIGN_MODAL.staffList.profilePicture.size * scaleX,
    height: REASSIGN_MODAL.staffList.profilePicture.size * scaleX,
    marginRight: (REASSIGN_MODAL.staffList.name.left - REASSIGN_MODAL.staffList.profilePicture.left - REASSIGN_MODAL.staffList.profilePicture.size) * scaleX,
  },
  avatar: {
    width: REASSIGN_MODAL.staffList.profilePicture.size * scaleX,
    height: REASSIGN_MODAL.staffList.profilePicture.size * scaleX,
    borderRadius: (REASSIGN_MODAL.staffList.profilePicture.size / 2) * scaleX,
  },
  initialsCircle: {
    width: REASSIGN_MODAL.staffList.profilePicture.size * scaleX,
    height: REASSIGN_MODAL.staffList.profilePicture.size * scaleX,
    borderRadius: (REASSIGN_MODAL.staffList.profilePicture.size / 2) * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#ffffff',
  },
  infoContainer: {
    flex: 1,
    marginRight: 12 * scaleX,
    flexShrink: 1,
    minWidth: 0, // Allow text to shrink if needed
    maxWidth: '100%',
  },
  name: {
    fontSize: REASSIGN_MODAL.staffList.name.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#1e1e1e',
    marginBottom: 2 * scaleX,
  },
  department: {
    fontSize: (REASSIGN_MODAL.staffList.department.fontSize - 1) * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.light as any,
    color: '#555555',
  },
  progressContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 180 * scaleX, // Minimum width for progress bar
    maxWidth: 210 * scaleX, // Maximum width
    flexShrink: 0,
    flexGrow: 0,
  },
});

