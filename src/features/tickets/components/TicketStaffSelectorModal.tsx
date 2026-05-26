import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { typography } from '@shared/theme';
import type { User } from '@/types';

interface TicketStaffSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (staffIds: string[]) => void;
  staff: User[];
  /** Already tagged staff IDs (show checkmark in list). */
  selectedStaffIds?: string[];
  departmentName: string;
  loading?: boolean;
}

function getInitial(name: string): string {
  return name ? name.charAt(0).toUpperCase() : '?';
}

export default function TicketStaffSelectorModal({
  visible,
  onClose,
  onSelect,
  staff,
  selectedStaffIds = [],
  departmentName,
  loading = false,
}: TicketStaffSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedStaffIds);

  React.useEffect(() => {
    if (visible) {
      setLocalSelectedIds(selectedStaffIds);
    }
  }, [visible, selectedStaffIds]);

  const filteredStaff = React.useMemo(() => {
    if (!staff || !Array.isArray(staff)) return [];
    if (!searchQuery.trim()) return staff;
    return staff.filter((u) =>
      u.name?.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
  }, [staff, searchQuery]);

  const handleToggleStaff = (userId: string) => {
    setLocalSelectedIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleDone = () => {
    onSelect(localSelectedIds);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalWrapper}>
          <Pressable style={styles.modal} onPress={() => {}} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <Text style={styles.title}>Tag staff from {departmentName}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={12}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>Staff in this department will appear below.</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name..."
              placeholderTextColor="#5a759d"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#607aa1" />
              </View>
            ) : filteredStaff.length === 0 ? (
              <Text style={styles.emptyText}>
                {staff.length === 0 ? `No staff in ${departmentName}.` : 'No matching staff.'}
              </Text>
            ) : (
              <>
                <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                  {filteredStaff.map((user) => {
                    const isSelected = localSelectedIds.includes(user.id);
                    return (
                      <TouchableOpacity
                        key={user.id}
                        style={[styles.row, isSelected && styles.rowSelected]}
                        onPress={() => handleToggleStaff(user.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.avatarWrap}>
                          {user.avatar ? (
                            <Image source={{ uri: user.avatar }} style={styles.avatar} />
                          ) : (
                            <View style={styles.initialsCircle}>
                              <Text style={styles.initials}>{getInitial(user.name)}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
                        {isSelected && <Text style={styles.check}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.8}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalWrapper: {
    width: '100%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  modal: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '600',
    color: '#607aa1',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 22,
    color: '#333',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 12,
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 24,
  },
  list: {
    maxHeight: 320,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowSelected: {
    backgroundColor: '#f0f4ff',
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  initialsCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#607aa1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontFamily: typography.fontFamily.primary,
    color: '#333',
  },
  check: {
    fontSize: 18,
    color: '#607aa1',
    fontWeight: 'bold',
  },
  doneButton: {
    backgroundColor: '#607aa1',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '600',
    color: '#fff',
  },
});
