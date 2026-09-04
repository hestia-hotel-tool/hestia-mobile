import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { typography } from '@/theme';
import { scaleX, ASSIGNED_TO } from '../../constants/roomDetailStyles';

export type AssignedStaffInfo = {
  id: string;
  name: string;
  avatar?: any;
  initials?: string;
  avatarColor?: string;
  department?: string;
};

interface AssignedToSectionProps {
  /** When null/undefined, shows empty assignee row with Reassign (Arrival / ArrivalDeparture parity with Figma). */
  staff: AssignedStaffInfo | null | undefined;
  onReassignPress?: () => void;
  isLoading?: boolean;
}

export default function AssignedToSection({
  staff,
  onReassignPress,
  isLoading = false,
}: AssignedToSectionProps) {
  if (!staff) {
    return (
      <View style={styles.container}>
        <View style={styles.leftColumn}>
          <Text style={styles.unassignedLabel}>Not assigned</Text>
        </View>
        <TouchableOpacity
          style={styles.reassignButton}
          onPress={onReassignPress}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={ASSIGNED_TO.reassignButton.color ?? '#ffffff'} />
          ) : (
            <Text style={styles.reassignButtonText}>Reassign</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  const initial = staff.initials || (staff.name ? staff.name.charAt(0).toUpperCase() : '?');

  const getInitialColor = (name: string): string => {
    const colors = ['#ff4dd8', '#5a759d', '#607aa1', '#f0be1b'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <View style={styles.container}>
      {/* Left Column: Profile Picture, Name, Department */}
      <View style={styles.leftColumn}>
        {/* Staff Info - Avatar or Initials */}
        {staff.avatar ? (
          <Image
            key={staff.id} // Force re-render when staff changes
            source={staff.avatar}
            style={styles.profilePicture}
            resizeMode="cover"
          />
        ) : (
          <View 
            key={staff.id} // Force re-render when staff changes
            style={[styles.initialsCircle, { backgroundColor: staff.avatarColor || getInitialColor(staff.name) }]}
          >
            <Text style={styles.initialsText}>{initial}</Text>
          </View>
        )}
        {/* Name and Department Column */}
        <View style={styles.nameColumn}>
          <Text style={styles.staffName}>{staff.name}</Text>
          {/* Department/Role - show if available */}
          {staff.department && (
            <Text style={styles.department}>{staff.department}</Text>
          )}
        </View>
      </View>

      {/* Right Column: Reassign Button */}
      <TouchableOpacity
        style={styles.reassignButton}
        onPress={onReassignPress}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={ASSIGNED_TO.reassignButton.color ?? '#ffffff'} />
        ) : (
          <Text style={styles.reassignButtonText}>Reassign</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flex: 1,
    minWidth: 0,
    marginRight: 8 * scaleX,
  },
  profilePicture: {
    width: ASSIGNED_TO.profilePicture.width * scaleX,
    height: ASSIGNED_TO.profilePicture.height * scaleX,
    borderRadius: (ASSIGNED_TO.profilePicture.width / 2) * scaleX,
    marginRight: (ASSIGNED_TO.staffName.left - ASSIGNED_TO.profilePicture.left - ASSIGNED_TO.profilePicture.width) * scaleX,
  },
  staffName: {
    fontSize: ASSIGNED_TO.staffName.fontSize * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as any,
    color: ASSIGNED_TO.staffName.color,
  },
  department: {
    fontSize: ASSIGNED_TO.department.fontSize * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: typography.fontWeights.light as any,
    color: ASSIGNED_TO.department.color,
    marginTop: 2 * scaleX,
  },
  reassignButton: {
    flexShrink: 0,
    width: ASSIGNED_TO.reassignButton.width * scaleX,
    height: ASSIGNED_TO.reassignButton.height * scaleX,
    borderRadius: ASSIGNED_TO.reassignButton.borderRadius * scaleX,
    backgroundColor: ASSIGNED_TO.reassignButton.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reassignButtonText: {
    fontSize: ASSIGNED_TO.reassignButton.fontSize * scaleX,
    fontFamily: typography.fontFamily.regular,
    fontWeight: typography.fontWeights.regular as any,
    color: ASSIGNED_TO.reassignButton.color,
  },
  nameColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  unassignedLabel: {
    fontSize: ASSIGNED_TO.staffName.fontSize * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: typography.fontWeights.light as any,
    color: '#5a759d',
  },
  initialsCircle: {
    width: ASSIGNED_TO.profilePicture.width * scaleX,
    height: ASSIGNED_TO.profilePicture.height * scaleX,
    borderRadius: (ASSIGNED_TO.profilePicture.width / 2) * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: (ASSIGNED_TO.staffName.left - ASSIGNED_TO.profilePicture.left - ASSIGNED_TO.profilePicture.width) * scaleX,
  },
  initialsText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeights.bold as any,
    color: '#ffffff',
  },
});

