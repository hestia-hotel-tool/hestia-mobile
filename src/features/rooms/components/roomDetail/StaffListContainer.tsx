import React from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { scaleX } from '../../constants/reassignModalStyles';
import { StaffMember, ReassignTab } from '@features/staff/types/staff.types';
import StaffListItem from './StaffListItem';
import { colors, typography } from '@/theme';

interface StaffListContainerProps {
  staff: StaffMember[];
  activeTab: ReassignTab;
  searchQuery?: string;
  selectedStaffId?: string;
  onStaffSelect: (staffId: string) => void;
  isLoading?: boolean;
}

export default function StaffListContainer({
  staff,
  activeTab,
  searchQuery = '',
  selectedStaffId,
  onStaffSelect,
  isLoading = false,
}: StaffListContainerProps) {
  // Filter staff based on active tab
  const filterStaffByTab = (staffList: StaffMember[], tab: ReassignTab): StaffMember[] => {
    switch (tab) {
      case 'OnShift':
        return staffList.filter((s) => s.onShift);
      case 'AM':
        return staffList.filter((s) => s.onShift && s.shift === 'AM');
      case 'PM':
        return staffList.filter((s) => s.onShift && s.shift === 'PM');
      default:
        return staffList;
    }
  };

  // Filter by search query (name, department, role)
  const filterBySearch = (staffList: StaffMember[], query: string): StaffMember[] => {
    if (!query.trim()) return staffList;
    const lowerQuery = query.toLowerCase();
    return staffList.filter(
      (s) =>
        (s.name ?? '').toLowerCase().includes(lowerQuery) ||
        (s.department ?? '').toLowerCase().includes(lowerQuery) ||
        (s.role ?? '').toLowerCase().includes(lowerQuery)
    );
  };

  // Apply filters
  const filteredStaff = filterBySearch(
    filterStaffByTab(staff, activeTab),
    searchQuery
  );

  // Sort by workload (lowest first) for better assignment suggestions
  const sortedStaff = [...filteredStaff].sort((a, b) => (a.workload ?? 0) - (b.workload ?? 0));

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  if (sortedStaff.length === 0) {
    // Only Housekeeping Room Attendants are listed; say so rather than show a blank sheet.
    const message = searchQuery.trim()
      ? `No room attendant matches “${searchQuery.trim()}”.`
      : staff.length === 0
        ? 'No Housekeeping Room Attendants yet.'
        : activeTab === 'OnShift'
          ? 'No room attendants are rostered on a shift.'
          : `No room attendants on the ${activeTab} shift.`;
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Text style={styles.emptyTitle}>Nobody to assign</Text>
        <Text style={styles.emptyText}>{message}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {sortedStaff.map((staffMember) => (
        <StaffListItem
          key={staffMember.id}
          staff={staffMember}
          isSelected={selectedStaffId === staffMember.id}
          onPress={() => onStaffSelect(staffMember.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 56 * scaleX,
    paddingHorizontal: 32 * scaleX,
  },
  emptyTitle: {
    fontSize: 17 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 8 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#6b7a90',
    textAlign: 'center',
  },
  contentContainer: {
    paddingBottom: 100 * scaleX,
    width: '100%',
  },
});

