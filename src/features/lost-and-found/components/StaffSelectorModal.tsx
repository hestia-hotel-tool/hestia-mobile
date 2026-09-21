import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
} from 'react-native';
import { typography } from '@/theme';
import { REGISTER_FORM, scaleX } from '../constants/lostAndFoundStyles';
import { StaffMember } from '@features/staff/types/staff.types';

interface StaffSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (staffId: string) => void;
  selectedStaffId?: string;
  title: string;
  staff?: StaffMember[];
  showMeOption?: boolean;
  currentUserId?: string;
  inputFieldPosition?: { x: number; y: number; width: number; height: number } | null;
}

const getStyles = (inputFieldPosition?: { x: number; y: number; width: number; height: number } | null) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: inputFieldPosition ? inputFieldPosition.y + inputFieldPosition.height + 10 * scaleX : 350 * scaleX,
  },
  modalWrapper: {
    position: 'relative',
    width: REGISTER_FORM.step2.staffSelector.modal.width * scaleX,
    alignItems: 'center',
    overflow: 'visible',
    marginTop: 10 * scaleX, // Small gap between triangle and input field bottom
  },
  trianglePointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12 * scaleX,
    borderRightWidth: 12 * scaleX,
    borderBottomWidth: 10 * scaleX, // Points upward (triangle at top of modal pointing to input)
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffffff',
    marginBottom: -1 * scaleX, // Overlap slightly to remove gap with modal
    alignSelf: 'flex-start',
    marginLeft: REGISTER_FORM.step2.staffSelector.modal.width * 0.1 * scaleX, // 10% from left
    shadowColor: 'rgba(100, 131, 176, 0.4)',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 5,
  },
  modalContainer: {
    width: '100%',
    maxHeight: REGISTER_FORM.step2.staffSelector.modal.maxHeight * scaleX,
    backgroundColor: REGISTER_FORM.step2.staffSelector.modal.backgroundColor,
    borderRadius: REGISTER_FORM.step2.staffSelector.modal.borderRadius * scaleX,
    shadowColor: REGISTER_FORM.step2.staffSelector.modal.shadowColor,
    shadowOffset: REGISTER_FORM.step2.staffSelector.modal.shadowOffset,
    shadowOpacity: REGISTER_FORM.step2.staffSelector.modal.shadowOpacity,
    shadowRadius: REGISTER_FORM.step2.staffSelector.modal.shadowRadius,
    elevation: REGISTER_FORM.step2.staffSelector.modal.elevation,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: REGISTER_FORM.step2.staffSelector.header.height * scaleX,
    paddingHorizontal: REGISTER_FORM.step2.staffSelector.header.paddingHorizontal * scaleX,
  },
  headerTitle: {
    fontSize: REGISTER_FORM.step2.staffSelector.header.title.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step2.staffSelector.header.title.fontWeight as any,
    color: REGISTER_FORM.step2.staffSelector.header.title.color,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12 * scaleX,
  },
  selectedCount: {
    fontSize: REGISTER_FORM.step2.staffSelector.header.selectedCount.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step2.staffSelector.header.selectedCount.fontWeight as any,
    color: REGISTER_FORM.step2.staffSelector.header.selectedCount.color,
  },
  closeButton: {
    width: 24 * scaleX,
    height: 24 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 24 * scaleX,
    color: '#000000',
    lineHeight: 24 * scaleX,
  },
  divider: {
    height: REGISTER_FORM.step2.staffSelector.divider.height,
    backgroundColor: REGISTER_FORM.step2.staffSelector.divider.backgroundColor,
  },
  searchContainer: {
    paddingHorizontal: REGISTER_FORM.step2.staffSelector.header.paddingHorizontal * scaleX,
    paddingVertical: 10 * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInput: {
    height: 42 * scaleX,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8 * scaleX,
    paddingHorizontal: 12 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  listContainer: {
    maxHeight: 200 * scaleX,
  },
  listContent: {
    paddingVertical: 8 * scaleX,
  },
  emptyState: {
    paddingHorizontal: 18 * scaleX,
    paddingVertical: 28 * scaleX,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300' as any,
    color: '#5a759d',
    textAlign: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: REGISTER_FORM.step2.staffSelector.listItem.height * scaleX,
    paddingHorizontal: REGISTER_FORM.step2.staffSelector.listItem.paddingHorizontal * scaleX,
    paddingVertical: REGISTER_FORM.step2.staffSelector.listItem.paddingVertical * scaleX,
  },
  avatarContainer: {
    width: REGISTER_FORM.step2.staffSelector.listItem.avatar.size * scaleX,
    height: REGISTER_FORM.step2.staffSelector.listItem.avatar.size * scaleX,
    borderRadius: (REGISTER_FORM.step2.staffSelector.listItem.avatar.size / 2) * scaleX,
    overflow: 'hidden',
    marginRight: 16 * scaleX,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  initialsCircle: {
    width: '100%',
    height: '100%',
    borderRadius: (REGISTER_FORM.step2.staffSelector.listItem.avatar.size / 2) * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'bold' as any,
    color: '#ffffff',
  },
  infoContainer: {
    flex: 1,
  },
  meLabel: {
    fontSize: REGISTER_FORM.step2.staffSelector.listItem.meLabel.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step2.staffSelector.listItem.meLabel.fontWeight as any,
    color: REGISTER_FORM.step2.staffSelector.listItem.meLabel.color,
    marginBottom: 2 * scaleX,
  },
  name: {
    fontSize: REGISTER_FORM.step2.staffSelector.listItem.name.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step2.staffSelector.listItem.name.fontWeight as any,
    color: REGISTER_FORM.step2.staffSelector.listItem.name.color,
  },
  department: {
    fontSize: REGISTER_FORM.step2.staffSelector.listItem.department.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step2.staffSelector.listItem.department.fontWeight as any,
    color: REGISTER_FORM.step2.staffSelector.listItem.department.color,
    marginTop: 2 * scaleX,
  },
  checkmark: {
    fontSize: REGISTER_FORM.step2.staffSelector.listItem.checkmark.fontSize * scaleX,
    color: REGISTER_FORM.step2.staffSelector.listItem.checkmark.color,
    fontWeight: 'bold' as any,
    marginLeft: 12 * scaleX,
  },
  footer: {
    paddingVertical: REGISTER_FORM.step2.staffSelector.footer.paddingVertical * scaleX,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  seeAll: {
    fontSize: REGISTER_FORM.step2.staffSelector.footer.seeAll.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step2.staffSelector.footer.seeAll.fontWeight as any,
    color: REGISTER_FORM.step2.staffSelector.footer.seeAll.color,
  },
});

export default function StaffSelectorModal({
  visible,
  onClose,
  onSelect,
  selectedStaffId,
  title,
  staff,
  showMeOption = false,
  currentUserId = '1', // Default to Etleva Hoxha
  inputFieldPosition,
}: StaffSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  /*
   * No mock fallback.
   *
   * An empty `staff` prop used to be swapped for a four-person fixture with
   * three bundled portraits — so a failed or still-loading fetch showed four
   * plausible colleagues who do not work here, and picking one wrote a mock id
   * into the item. There are 35 users in the database; an empty list means the
   * fetch failed or is in flight, and the sheet now says so instead of
   * inventing people.
   */
  const filteredStaff = useMemo(() => {
    let staffList = Array.isArray(staff) ? staff : [];
    
    // If "Me" option is shown, exclude the current user from the regular list
    if (showMeOption && currentUserId) {
      staffList = staffList.filter((s) => s.id !== currentUserId);
    }
    
    // Filter by search query
    if (!searchQuery.trim()) return staffList;
    const lowerQuery = searchQuery.toLowerCase();
    return staffList.filter(
      (s) =>
        s.name.toLowerCase().includes(lowerQuery) ||
        (s.department ?? '').toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery, showMeOption, currentUserId, staff]);

  // Get current user (Me option)
  const currentUser = useMemo(
    () => (Array.isArray(staff) ? staff : []).find((s) => s.id === currentUserId),
    [currentUserId, staff]
  );

  // Get first letter for initial if no avatar
  const getInitial = (name: string): string => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  // Generate color for initial circle based on name
  const getInitialColor = (name: string): string => {
    const colors = ['#ff4dd8', '#5a759d', '#607aa1', '#f0be1b'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const handleSelect = (staffId: string) => {
    // Update selection - this will automatically uncheck the previous selection
    // since only the selectedStaffId matching staff.id will show the checkmark
    onSelect(staffId);
    onClose();
  };

  if (!visible) return null;

  const dynamicStyles = getStyles(inputFieldPosition);

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={dynamicStyles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={dynamicStyles.modalWrapper}>
          {/* Triangle Pointer - positioned at top pointing up to input field */}
          <View style={dynamicStyles.trianglePointer} />
          
          <Pressable
            style={dynamicStyles.modalContainer}
            onPress={() => {}}
            onStartShouldSetResponder={() => true}
          >
            {/* Header */}
            <View style={dynamicStyles.header}>
            <Text style={dynamicStyles.headerTitle}>{title}</Text>
            <View style={dynamicStyles.headerRight}>
              {selectedStaffId && (
                <Text style={dynamicStyles.selectedCount}>1 Selected</Text>
              )}
              <TouchableOpacity
                style={dynamicStyles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={dynamicStyles.closeIcon}>×</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Divider */}
          <View style={dynamicStyles.divider} />

          {/* Search */}
          <View style={dynamicStyles.searchContainer}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search staff..."
              placeholderTextColor="#9ca3af"
              style={dynamicStyles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          {/* Staff List */}
          <ScrollView
            style={dynamicStyles.listContainer}
            contentContainerStyle={dynamicStyles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Me Option */}
            {showMeOption && currentUser && (
              <TouchableOpacity
                style={dynamicStyles.listItem}
                onPress={() => handleSelect(currentUser.id)}
                activeOpacity={0.7}
              >
                <View style={dynamicStyles.avatarContainer}>
                  {currentUser.avatar ? (
                    <Image
                      source={currentUser.avatar}
                      style={dynamicStyles.avatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        dynamicStyles.initialsCircle,
                        { backgroundColor: getInitialColor(currentUser.name) },
                      ]}
                    >
                      <Text style={dynamicStyles.initialsText}>
                        {getInitial(currentUser.name)}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={dynamicStyles.infoContainer}>
                  <Text style={dynamicStyles.meLabel}>Me</Text>
                  <Text style={dynamicStyles.name}>{currentUser.name}</Text>
                </View>
                {selectedStaffId === currentUser.id && (
                  <Text style={dynamicStyles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Staff List Items */}
            {filteredStaff.length === 0 ? (
              /*
                Says what is true instead of showing fixtures.
                `searchQuery` distinguishes "nothing matches what you typed"
                from "no staff arrived at all", which are different problems for
                the person holding the phone.
              */
              <View style={dynamicStyles.emptyState}>
                <Text style={dynamicStyles.emptyStateText}>
                  {searchQuery.trim()
                    ? `No staff match "${searchQuery.trim()}".`
                    : 'No staff available. Pull to refresh, or check your connection.'}
                </Text>
              </View>
            ) : null}
            {filteredStaff.map((staff) => (
              <TouchableOpacity
                key={staff.id}
                style={dynamicStyles.listItem}
                onPress={() => handleSelect(staff.id)}
                activeOpacity={0.7}
              >
                <View style={dynamicStyles.avatarContainer}>
                  {staff.avatar ? (
                    <Image
                      source={staff.avatar}
                      style={dynamicStyles.avatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        dynamicStyles.initialsCircle,
                        { backgroundColor: getInitialColor(staff.name) },
                      ]}
                    >
                      <Text style={dynamicStyles.initialsText}>
                        {getInitial(staff.name)}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={dynamicStyles.infoContainer}>
                  <Text style={dynamicStyles.name}>{staff.name}</Text>
                  <Text style={dynamicStyles.department}>{staff.department}</Text>
                </View>
                {selectedStaffId === staff.id && (
                  <Text style={dynamicStyles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Footer - See All */}
          <TouchableOpacity
            style={dynamicStyles.footer}
            onPress={() => {
              // Scroll to bottom or show all
            }}
            activeOpacity={0.7}
          >
            <Text style={dynamicStyles.seeAll}>see all</Text>
          </TouchableOpacity>
          </Pressable>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

