import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { typography } from '@/theme';
import { scaleX, STAFF_CARD } from '../constants/staffStyles';
import { StaffMember } from '../types/staff.types';
import StaffCardProgressBar from './StaffCardProgressBar';
import ElapsedTimer from './ElapsedTimer';

interface StaffTicketCardProps {
  staff: StaffMember;
  onViewPress?: (staff: StaffMember) => void;
}

function formatMins(mins?: number): string {
  if (mins == null || !Number.isFinite(mins)) return '—';
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Staff card for ticket-driven departments (Engineering, IT, ...). Mirrors the
 * housekeeping StaffCard layout: resolved/total ratio + progress bar, an
 * Open/Resolved/Avg stat row, and a "current" pill for the ticket in progress.
 */
export default function StaffTicketCard({ staff, onViewPress }: StaffTicketCardProps) {
  const resolved = staff.ticketStats?.resolved ?? 0;
  const open = staff.ticketStats?.open ?? 0;
  const total = staff.ticketStats?.total ?? 0;
  const avg = formatMins(staff.ticketStats?.avgResolutionMins);
  const current = staff.ticketStats?.currentTicket;
  const hasCurrent = !!current;
  const cardHeight = hasCurrent ? STAFF_CARD.height.standard : STAFF_CARD.height.compact;

  return (
    <View style={[styles.container, { height: cardHeight * scaleX }]}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {staff.avatar ? (
          <Image source={staff.avatar} style={styles.avatar} resizeMode="cover" />
        ) : staff.initials ? (
          <View style={[styles.initialsCircle, { backgroundColor: staff.avatarColor || '#5a759d' }]}>
            <Text style={styles.initialsText}>{staff.initials}</Text>
          </View>
        ) : null}
      </View>

      {/* Name */}
      <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
        {staff.name}
      </Text>

      {/* Resolved / total ratio */}
      <Text style={styles.progressRatio}>
        {resolved}/{total}
      </Text>

      {/* Progress bar (resolved of total) */}
      <View style={styles.progressBarContainer}>
        <StaffCardProgressBar completed={resolved} total={total} />
      </View>

      {/* Stat row */}
      <View style={styles.taskStatsContainer}>
        <Text style={styles.taskStat}>
          <Text style={styles.taskStatLabel}>Open. </Text>
          <Text style={styles.taskStatValue}>{open}</Text>
        </Text>
        <Text style={[styles.taskStat, styles.taskStatResolved]}>
          <Text style={styles.taskStatLabel}>Resolved. </Text>
          <Text style={styles.taskStatValue}>{resolved}</Text>
        </Text>
        <Text style={[styles.taskStat, styles.taskStatAvg]}>
          <Text style={styles.taskStatLabel}>Avg. </Text>
          <Text style={styles.taskStatValue}>{avg}</Text>
        </Text>
      </View>

      {/* Current ticket pill */}
      {hasCurrent && current && (
        <View style={styles.currentTaskContainer}>
          <View style={styles.currentTaskCircle}>
            <Image
              source={require('../../../../assets/icons/in-progress-icon.png')}
              style={styles.taskIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.currentTaskTextContainer}>
            <Text style={styles.ticketTitle} numberOfLines={1}>
              {current.title}
            </Text>
            <ElapsedTimer startTimeIso={current.startTimeIso} style={styles.timer} />
          </View>
          <Text style={styles.currentPillLabel}>Current</Text>
        </View>
      )}

      {/* View */}
      <TouchableOpacity
        style={styles.viewButton}
        onPress={onViewPress ? () => onViewPress(staff) : undefined}
        activeOpacity={onViewPress ? 0.85 : 1}
        disabled={!onViewPress}
      >
        <Text style={styles.viewText}>View</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: STAFF_CARD.width * scaleX,
    backgroundColor: STAFF_CARD.backgroundColor,
    borderWidth: STAFF_CARD.borderWidth * scaleX,
    borderColor: STAFF_CARD.borderColor,
    borderRadius: STAFF_CARD.borderRadius * scaleX,
    marginHorizontal: STAFF_CARD.marginHorizontal * scaleX,
    marginBottom: STAFF_CARD.marginBottom * scaleX,
    position: 'relative',
  },
  avatarContainer: {
    position: 'absolute',
    left: STAFF_CARD.avatar.left * scaleX,
    top: STAFF_CARD.avatar.top * scaleX,
    width: STAFF_CARD.avatar.width * scaleX,
    height: STAFF_CARD.avatar.height * scaleX,
  },
  avatar: {
    width: STAFF_CARD.avatar.width * scaleX,
    height: STAFF_CARD.avatar.height * scaleX,
    borderRadius: STAFF_CARD.avatar.borderRadius * scaleX,
  },
  initialsCircle: {
    width: STAFF_CARD.avatar.width * scaleX,
    height: STAFF_CARD.avatar.height * scaleX,
    borderRadius: STAFF_CARD.avatar.borderRadius * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#ffffff',
  },
  name: {
    position: 'absolute',
    left: STAFF_CARD.name.left * scaleX,
    top: STAFF_CARD.name.top * scaleX,
    fontSize: STAFF_CARD.name.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: STAFF_CARD.name.color,
    maxWidth: (STAFF_CARD.width - STAFF_CARD.name.left - STAFF_CARD.progressRatio.right - 20) * scaleX,
    zIndex: 1,
  },
  progressRatio: {
    position: 'absolute',
    right: STAFF_CARD.progressRatio.right * scaleX,
    top: STAFF_CARD.progressRatio.top * scaleX,
    fontSize: STAFF_CARD.progressRatio.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: STAFF_CARD.progressRatio.color,
  },
  progressBarContainer: {
    position: 'absolute',
    left: STAFF_CARD.progressBar.left * scaleX,
    top: STAFF_CARD.progressBar.top * scaleX,
  },
  taskStatsContainer: {
    position: 'absolute',
    left: 0,
    top: STAFF_CARD.taskStats.top * scaleX,
    width: '100%',
  },
  taskStat: {
    position: 'absolute',
    left: STAFF_CARD.taskStats.inProgress.left * scaleX,
    fontSize: STAFF_CARD.taskStats.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.light as any,
    color: STAFF_CARD.taskStats.color,
  },
  taskStatResolved: {
    left: STAFF_CARD.taskStats.cleaned.left * scaleX,
    color: '#2e9e5b',
  },
  taskStatAvg: {
    left: STAFF_CARD.taskStats.dirty.left * scaleX,
  },
  taskStatLabel: {
    fontWeight: typography.fontWeights.light as any,
  },
  taskStatValue: {
    fontWeight: typography.fontWeights.bold as any,
  },
  currentTaskContainer: {
    position: 'absolute',
    left: STAFF_CARD.currentTask.circle.left * scaleX,
    top: STAFF_CARD.currentTask.top * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf3da',
    borderRadius: 41 * scaleX,
    paddingRight: 14 * scaleX,
  },
  currentTaskCircle: {
    width: STAFF_CARD.currentTask.circle.width * scaleX,
    height: STAFF_CARD.currentTask.circle.height * scaleX,
    borderRadius: STAFF_CARD.currentTask.circle.borderRadius * scaleX,
    backgroundColor: STAFF_CARD.currentTask.circle.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskIcon: {
    width: STAFF_CARD.currentTask.bellIcon.width * scaleX,
    height: STAFF_CARD.currentTask.bellIcon.height * scaleX,
  },
  currentTaskTextContainer: {
    marginLeft: 10 * scaleX,
    justifyContent: 'center',
    maxWidth: 150 * scaleX,
  },
  ticketTitle: {
    fontSize: STAFF_CARD.currentTask.roomText.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: STAFF_CARD.currentTask.roomText.color,
    lineHeight: STAFF_CARD.currentTask.roomText.fontSize * scaleX * 1.2,
  },
  timer: {
    fontSize: STAFF_CARD.currentTask.timer.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: STAFF_CARD.currentTask.timer.inactiveColor,
    marginTop: 2 * scaleX,
    lineHeight: STAFF_CARD.currentTask.timer.fontSize * scaleX * 1.2,
  },
  currentPillLabel: {
    marginLeft: 12 * scaleX,
    fontSize: 9 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: '#000000',
    alignSelf: 'flex-start',
    marginTop: 4 * scaleX,
  },
  viewButton: {
    position: 'absolute',
    right: 17 * scaleX,
    bottom: 16 * scaleX,
    width: 119 * scaleX,
    height: 44 * scaleX,
    borderRadius: 41 * scaleX,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: '#5a759d',
    includeFontPadding: false,
  },
});
