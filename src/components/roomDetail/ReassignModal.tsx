import React, { useState, useRef } from 'react';
import { Modal, View, StyleSheet, TextInput, Keyboard } from 'react-native';
import { REASSIGN_MODAL, scaleX } from '../../constants/reassignModalStyles';
import { ReassignTab, StaffMember } from '@features/staff';
import ReassignHeader from './ReassignHeader';
import ReassignTabs from './ReassignTabs';
import StaffListContainer from './StaffListContainer';
import { fetchStaffFromSupabase } from '@features/staff';
import { typography } from '../../theme';

interface ReassignModalProps {
  visible: boolean;
  onClose: () => void;
  onStaffSelect: (staffId: string) => void;
  onAutoAssign: () => void;
  currentAssignedStaffId?: string;
  roomNumber?: string;
  /** When false, hides the Auto Assign button (e.g. for "Assign Staff" flow). Default true. */
  showAutoAssign?: boolean;
}

export default function ReassignModal({
  visible,
  onClose,
  onStaffSelect,
  onAutoAssign,
  currentAssignedStaffId,
  roomNumber,
  showAutoAssign = true,
}: ReassignModalProps) {
  const [activeTab, setActiveTab] = useState<ReassignTab>('OnShift');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(
    currentAssignedStaffId || null
  );
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  const focusSearch = () => {
    if (!showSearch) {
      setShowSearch(true);
      // Defer focus slightly so input is mounted
      setTimeout(() => searchInputRef.current?.focus(), 0);
      return;
    }
    searchInputRef.current?.focus();
  };

  // Load staff list from Supabase when modal is visible; fall back to mock data if empty/error.
  React.useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoadingStaff(true);
    (async () => {
      const supabaseStaff = await fetchStaffFromSupabase();
      if (cancelled) return;
      if (supabaseStaff.length > 0) {
        setStaff(supabaseStaff);
      }
      setLoadingStaff(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // Reset search state when modal is closed
  React.useEffect(() => {
    if (!visible) {
      setShowSearch(false);
      setSearchQuery('');
    }
  }, [visible]);

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaffId(staffId);
    onStaffSelect(staffId);
    onClose();
  };

  const handleAutoAssign = () => {
    // Find staff with lowest workload
    const filteredStaff = getFilteredStaff();
    if (filteredStaff.length > 0) {
      // Sort by workload and select the one with lowest workload
      const sortedStaff = [...filteredStaff].sort((a, b) => (a.workload ?? 0) - (b.workload ?? 0));
      handleStaffSelect(sortedStaff[0].id);
    } else {
      // Fallback: call the onAutoAssign callback
      onAutoAssign();
    }
  };

  const getFilteredStaff = (): StaffMember[] => {
    let filtered = staff;
    
    // Filter by tab
    switch (activeTab) {
      case 'OnShift':
        filtered = filtered.filter((s) => s.onShift);
        break;
      case 'AM':
        filtered = filtered.filter((s) => s.onShift && s.shift === 'AM');
        break;
      case 'PM':
        filtered = filtered.filter((s) => s.onShift && s.shift === 'PM');
        break;
    }
    
    // Filter by search (name, department, role)
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          (s.name ?? '').toLowerCase().includes(lowerQuery) ||
          (s.department ?? '').toLowerCase().includes(lowerQuery) ||
          (s.role ?? '').toLowerCase().includes(lowerQuery)
      );
    }
    
    return filtered;
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <ReassignHeader
          onBackPress={onClose}
          onAutoAssignPress={showAutoAssign ? handleAutoAssign : undefined}
        />

        {/* Tabs */}
        <ReassignTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSearchPress={focusSearch}
        />

        {/* Search bar – filters staff by name within the active tab */}
        {showSearch && (
          <View style={styles.searchBarContainer}>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search staff by name..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>
        )}

        {/* Staff List */}
        <StaffListContainer
          staff={staff}
          activeTab={activeTab}
          searchQuery={searchQuery}
          selectedStaffId={selectedStaffId || undefined}
          onStaffSelect={handleStaffSelect}
          isLoading={loadingStaff}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  searchBarContainer: {
    paddingHorizontal: 20 * scaleX,
    paddingVertical: 10 * scaleX,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e3e3e3',
  },
  searchInput: {
    height: 40 * scaleX,
    paddingHorizontal: 12 * scaleX,
    backgroundColor: '#f5f5f5',
    borderRadius: 10 * scaleX,
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#1e1e1e',
  },
});

