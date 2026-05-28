import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { typography } from '@shared/theme';
import { scaleX, STAFF_CARD } from '../constants/staffStyles';
import { StaffMember } from '../types/staff.types';

interface StaffTicketCardProps {
  staff: StaffMember;
}

function formatMins(mins?: number): string {
  if (mins == null || !Number.isFinite(mins)) return '—';
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Staff card variant for ticket-driven departments (Engineering, IT, etc.). */
export default function StaffTicketCard({ staff }: StaffTicketCardProps) {
  const resolved = staff.ticketStats?.resolved ?? 0;
  const open = staff.ticketStats?.open ?? 0;
  const avg = formatMins(staff.ticketStats?.avgResolutionMins);

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        {staff.avatar ? (
          <Image source={staff.avatar} style={styles.avatar} resizeMode="cover" />
        ) : staff.initials ? (
          <View style={[styles.initialsCircle, { backgroundColor: staff.avatarColor || '#5a759d' }]}>
            <Text style={styles.initialsText}>{staff.initials}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
        {staff.name}
      </Text>
      {staff.role ? (
        <Text style={styles.role} numberOfLines={1}>
          {staff.role}
        </Text>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{resolved}</Text>
          <Text style={[styles.statLabel, styles.resolvedLabel]}>Resolved</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{open}</Text>
          <Text style={[styles.statLabel, styles.openLabel]}>Open</Text>
        </View>
        <View style={styles.statBlock}>
          <Text style={styles.statValue}>{avg}</Text>
          <Text style={styles.statLabel}>Avg time</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: STAFF_CARD.width * scaleX,
    minHeight: STAFF_CARD.height.compact * scaleX,
    backgroundColor: STAFF_CARD.backgroundColor,
    borderWidth: STAFF_CARD.borderWidth * scaleX,
    borderColor: STAFF_CARD.borderColor,
    borderRadius: STAFF_CARD.borderRadius * scaleX,
    marginHorizontal: STAFF_CARD.marginHorizontal * scaleX,
    marginBottom: STAFF_CARD.marginBottom * scaleX,
    paddingBottom: 16 * scaleX,
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
    maxWidth: (STAFF_CARD.width - STAFF_CARD.name.left - 20) * scaleX,
  },
  role: {
    position: 'absolute',
    left: STAFF_CARD.name.left * scaleX,
    top: (STAFF_CARD.name.top + 20) * scaleX,
    fontSize: 11 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: '#8a8a8a',
    maxWidth: (STAFF_CARD.width - STAFF_CARD.name.left - 20) * scaleX,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: (STAFF_CARD.avatar.top + STAFF_CARD.avatar.height + 14) * scaleX,
    marginLeft: STAFF_CARD.name.left * scaleX,
  },
  statBlock: {
    marginRight: 28 * scaleX,
  },
  statValue: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#2b2b2b',
  },
  statLabel: {
    fontSize: 10 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: '#8a8a8a',
    marginTop: 2 * scaleX,
  },
  resolvedLabel: {
    color: '#2e9e5b',
  },
  openLabel: {
    color: '#c98a00',
  },
});
