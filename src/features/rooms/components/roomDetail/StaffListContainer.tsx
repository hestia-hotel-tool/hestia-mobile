import React from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { REASSIGN_MODAL, scaleX } from '../../constants/reassignModalStyles';
import { StaffMember, ReassignTab } from '@features/staff';
import StaffListItem from './StaffListItem';
import { colors } from '@/theme';

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
  contentContainer: {
    paddingBottom: 100 * scaleX,
    width: '100%',
  },
});

