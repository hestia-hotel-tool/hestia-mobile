import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, typography } from '@/theme';
import { RoomStatus, StaffInfo } from '../../types/allRooms.types';
import type { ShiftType } from '@features/home';
import { scaleX, STAFF_SECTION } from '../../constants/allRoomsStyles';

interface StaffSectionProps {
  staff: StaffInfo | null; // When null, show "Assign Staff" button
  roomId: string;
  roomStatus: RoomStatus;
  isPriority?: boolean;
  frontOfficeStatus?: string;
  selectedShift?: ShiftType;
  onAssignPress?: () => void; // When staff is null and user taps Assign Staff
  /** When staff is assigned, tap on forward arrow opens staff list to change assignee */
  onStaffSectionPress?: () => void;
  isLoading?: boolean;
}

function seededMinutes(roomId: string, modulo: number): number {
  // Simple stable hash (deterministic, no flicker across renders)
  let h = 0;
  for (let i = 0; i < roomId.length; i++) h = (h * 31 + roomId.charCodeAt(i)) >>> 0;
  return (h % modulo) + 1; // 1..modulo
}

function formatHHMM(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function StaffSection({ staff, roomId, roomStatus, isPriority = false, frontOfficeStatus = '', selectedShift, onAssignPress, onStaffSectionPress, isLoading = false }: StaffSectionProps) {
  const isDeparture = frontOfficeStatus === 'Departure';

  // No staff assigned: show "Assign Staff" button
  if (!staff) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[
            styles.assignButton,
            {
              left: (STAFF_SECTION.nameStandard?.left ?? STAFF_SECTION.name.left) * scaleX,
              top: (STAFF_SECTION.nameStandard?.top ?? STAFF_SECTION.name.top) * scaleX,
            },
          ]}
          onPress={onAssignPress}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#5a759d" />
          ) : (
            <Text style={styles.assignButtonText}>Not assigned</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  const hasPromiseTime = !!staff.promiseTime;
  const derivedStatusText = useMemo(() => {
    // Rules requested:
    // - Dirty + staff assigned -> "Not Started"
    // - InProgress + staff assigned -> "Started"
    // - Cleaned + staff assigned -> "Cleaned at: [time]" (random < now)
    // - Inspected + staff assigned -> "Inspected at: [time]" (random < now)
    if (roomStatus === 'Dirty') return 'Not Started';
    if (roomStatus === 'InProgress') return 'Started';
    if (roomStatus === 'Cleaned') {
      const minsAgo = seededMinutes(roomId, 59);
      const t = new Date(Date.now() - minsAgo * 60_000);
      return `Cleaned At: ${formatHHMM(t)}`;
    }
    if (roomStatus === 'Inspected') {
      const minsAgo = seededMinutes(roomId, 59);
      const t = new Date(Date.now() - minsAgo * 60_000);
      return `Inspected At: ${formatHHMM(t)}`;
    }
    return 'Not Started';
  }, [roomId, roomStatus, staff.statusText]);

  // Departure cards have different positioning due to promiseTime
  const avatarLeft = isPriority ? STAFF_SECTION.avatar.left : (STAFF_SECTION.avatarStandard?.left ?? STAFF_SECTION.avatar.left);
  const avatarTop = isPriority ? STAFF_SECTION.avatar.top : (STAFF_SECTION.avatarStandard?.top ?? STAFF_SECTION.avatar.top);
  const nameLeft = isPriority 
    ? STAFF_SECTION.name.left 
    : (isDeparture && hasPromiseTime && STAFF_SECTION.nameStandardDeparture
      ? STAFF_SECTION.nameStandardDeparture.left
      : (STAFF_SECTION.nameStandard?.left ?? STAFF_SECTION.name.left));
  const nameTop = isPriority 
    ? STAFF_SECTION.name.top 
    : (isDeparture && hasPromiseTime && STAFF_SECTION.nameStandardDeparture
      ? STAFF_SECTION.nameStandardDeparture.top
      : (STAFF_SECTION.nameStandard?.top ?? STAFF_SECTION.name.top));
  const statusLeft = isPriority ? STAFF_SECTION.status.left : (STAFF_SECTION.statusStandard?.left ?? STAFF_SECTION.status.left);
  const statusTop = isPriority 
    ? STAFF_SECTION.status.top 
    : (isDeparture && hasPromiseTime && STAFF_SECTION.statusStandardDeparture
      ? STAFF_SECTION.statusStandardDeparture.top
      : (STAFF_SECTION.statusStandard?.top ?? STAFF_SECTION.status.top));

  return (
    <View style={styles.container}>
      {/* Staff Avatar or Initials */}
      <View style={[styles.avatarContainer, { left: avatarLeft * scaleX, top: avatarTop * scaleX }]}>
        {staff.avatar ? (
          <Image
            source={typeof staff.avatar === 'string' ? { uri: staff.avatar } : (staff.avatar as any)}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : staff.initials ? (
          <View style={styles.initialsCircle}>
            <Text style={styles.initialsText}>{String(staff.initials)}</Text>
          </View>
        ) : null}
      </View>

      {/* Staff Name */}
      <Text
        style={[
          styles.staffName,
          { left: nameLeft * scaleX, top: nameTop * scaleX },
          selectedShift === 'PM' && styles.staffNamePM
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {staff.name}
      </Text>

      {/* Status Text */}
      <Text 
        style={[
          styles.statusText,
          !isPriority && styles.statusTextStandard,
          isDeparture && hasPromiseTime && styles.statusTextDeparture,
          { 
            color: staff.statusColor,
            left: statusLeft * scaleX,
            top: statusTop * scaleX,
          }
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {derivedStatusText}
      </Text>

      {/* Promise Time (if applicable) */}
      {staff.promiseTime && (
        <Text style={[styles.promiseTime, {
          left: STAFF_SECTION.promiseTime.left * scaleX,
          top: STAFF_SECTION.promiseTime.top * scaleX,
        }]}>
          {staff.promiseTime}
        </Text>
      )}

      {/* Forward Arrow Icon – tappable to open staff list when assigned */}
      {onStaffSectionPress ? (
        <TouchableOpacity
          style={[
            styles.forwardArrowContainer,
            {
              left: isPriority
                ? STAFF_SECTION.forwardArrow.left * scaleX
                : (STAFF_SECTION.forwardArrowStandard?.left ?? STAFF_SECTION.forwardArrow.left) * scaleX,
              top: STAFF_SECTION.forwardArrow.top * scaleX,
            },
          ]}
          onPress={onStaffSectionPress}
          activeOpacity={0.7}
        >
          <Image
            source={require('../../../../../assets/icons/forward-arrow-icon.png')}
            style={[
              styles.forwardArrowIcon,
              selectedShift === 'PM' && styles.forwardArrowIconPM
            ]}
            resizeMode="contain"
          />
        </TouchableOpacity>
      ) : (
        <View style={[
          styles.forwardArrowContainer,
          {
            left: isPriority
              ? STAFF_SECTION.forwardArrow.left * scaleX
              : (STAFF_SECTION.forwardArrowStandard?.left ?? STAFF_SECTION.forwardArrow.left) * scaleX,
            top: STAFF_SECTION.forwardArrow.top * scaleX,
          }
        ]}>
          <Image
            source={require('../../../../../assets/icons/forward-arrow-icon.png')}
            style={[
              styles.forwardArrowIcon,
              selectedShift === 'PM' && styles.forwardArrowIconPM
            ]}
            resizeMode="contain"
          />
        </View>
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
    bottom: 0,
  },
  avatarContainer: {
    position: 'absolute',
    width: STAFF_SECTION.avatar.width * scaleX,
    height: STAFF_SECTION.avatar.height * scaleX,
  },
  avatar: {
    width: STAFF_SECTION.avatar.width * scaleX,
    height: STAFF_SECTION.avatar.height * scaleX,
    borderRadius: STAFF_SECTION.avatar.borderRadius * scaleX,
  },
  initialsCircle: {
    width: STAFF_SECTION.avatar.width * scaleX,
    height: STAFF_SECTION.avatar.height * scaleX,
    borderRadius: STAFF_SECTION.avatar.borderRadius * scaleX,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 17 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: colors.text.white,
    lineHeight: 20 * scaleX,
  },
  staffName: {
    position: 'absolute',
    fontSize: STAFF_SECTION.name.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: STAFF_SECTION.name.color,
    width: STAFF_SECTION.name.width * scaleX,
    lineHeight: STAFF_SECTION.name.lineHeight * scaleX,
  },
  staffNamePM: {
    color: '#ffffff',
  },
  statusText: {
    position: 'absolute',
    fontSize: STAFF_SECTION.status.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    lineHeight: STAFF_SECTION.status.lineHeight * scaleX,
    width: STAFF_SECTION.status.width * scaleX,
    flexShrink: 0, // Prevent text from shrinking
  },
  statusTextStandard: {
    width: STAFF_SECTION.statusStandard.width * scaleX,
    flexShrink: 0, // Prevent text from shrinking
  },
  statusTextDeparture: {
    width: (STAFF_SECTION.statusStandardDeparture?.width ?? STAFF_SECTION.statusStandard.width) * scaleX,
  },
  promiseTime: {
    position: 'absolute',
    fontSize: STAFF_SECTION.promiseTime.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: STAFF_SECTION.promiseTime.color,
    lineHeight: STAFF_SECTION.promiseTime.lineHeight * scaleX,
    width: STAFF_SECTION.promiseTime.width * scaleX,
  },
  forwardArrowContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  forwardArrowIcon: {
    width: STAFF_SECTION.forwardArrow.width * scaleX,
    height: STAFF_SECTION.forwardArrow.height * scaleX,
    tintColor: '#1e1e1e', // Light black as in Figma for better visibility
  },
  forwardArrowIconPM: {
    tintColor: '#ffffff',
  },
  assignButton: {
    position: 'absolute',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#e4eefe',
    borderWidth: 1,
    borderColor: '#5a759d',
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignButtonText: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#5a759d',
  },
});

