/**
 * Create Chat Group – name the group and select participants (Supabase).
 * Creates a group chat and navigates to ChatDetail.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { NativeStackNavigationProp } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '@/types/navigation';
import type { User } from '@/types';
import { getUsers } from '@features/account';
import { createGroupChat, getCurrentUserId } from '../services/chat';
import { useToast } from '@/contexts/ToastContext';
import { colors } from '@/theme';
import { scaleX } from '../constants/chatStyles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'create-chat-group/index'>;

export default function CreateChatGroupScreen() {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showNameError, setShowNameError] = useState(false);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [uid, res] = await Promise.all([getCurrentUserId(), getUsers({ limit: 50 })]);
      setCurrentUserId(uid);
      const list = uid ? res.data.filter((u) => u.id !== uid) : res.data;
      setUsers(list);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDepartment = (department: string) => {
    setExpandedDepartments((prev) => {
      const next = new Set(prev);
      if (next.has(department)) next.delete(department);
      else next.add(department);
      return next;
    });
  };

  const nameTrimmed = groupName.trim();
  const canCreate = nameTrimmed.length > 0 && selectedIds.size > 0 && !creating;

  const handleCreate = async () => {
    if (!nameTrimmed) {
      setShowNameError(true);
      return;
    }
    if (selectedIds.size === 0 || creating) return;
    setCreating(true);
    try {
      const chatId = await createGroupChat(Array.from(selectedIds), nameTrimmed);
      if (chatId) {
        navigation.replace('chat/[chatId]', {
          chatId,
          chat: {
            id: chatId,
            name: nameTrimmed,
            lastMessage: '',
            isGroup: true,
          },
        });
      } else {
        toast.show('Please try again. If it keeps failing, check your connection.', { type: 'error', title: 'Could not create group' });
      }
    } catch (e) {
      console.warn('Failed to create group', e);
      toast.show('Something went wrong. Please try again.', { type: 'error', title: 'Error' });
    } finally {
      setCreating(false);
    }
  };

  const departmentSections = users.reduce<Record<string, User[]>>((acc, user) => {
    const department = user.department?.trim() || 'Other';
    if (!acc[department]) acc[department] = [];
    acc[department].push(user);
    return acc;
  }, {});

  const sortedDepartmentNames = Object.keys(departmentSections).sort((a, b) => {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  const renderItem = ({ item }: { item: User }) => {
    const selected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.row, selected && styles.rowSelected]}
        onPress={() => toggleUser(item.id)}
        activeOpacity={0.7}
      >
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{(item.name || '?').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* WhatsApp-style header: back | title | Create (menu button) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New group</Text>
        <TouchableOpacity
          style={[styles.headerAction, !canCreate && styles.headerActionDisabled]}
          onPress={handleCreate}
          disabled={!canCreate}
          activeOpacity={0.7}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#5A759D" />
          ) : (
            <Text style={[styles.headerActionText, !canCreate && styles.headerActionTextDisabled]}>
              Create
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Group name</Text>
      <TextInput
        style={[styles.input, showNameError && !nameTrimmed && styles.inputError]}
        placeholder="Enter group name"
        placeholderTextColor="#999"
        value={groupName}
        onChangeText={(t) => {
          setGroupName(t);
          if (showNameError) setShowNameError(false);
        }}
        maxLength={64}
      />
      {showNameError && !nameTrimmed && (
        <Text style={styles.requiredHint}>Group name is required</Text>
      )}

      <Text style={[styles.label, { marginTop: 16 * scaleX }]}>Add members</Text>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary?.main ?? '#5A759D'} />
        </View>
      ) : (
        <FlatList
          data={sortedDepartmentNames}
          keyExtractor={(item) => item}
          renderItem={({ item: department }) => {
            const staff = departmentSections[department] ?? [];
            const isExpanded = expandedDepartments.has(department);
            const selectedCount = staff.filter((u) => selectedIds.has(u.id)).length;

            return (
              <View style={styles.departmentSection}>
                <TouchableOpacity
                  style={styles.departmentHeader}
                  onPress={() => toggleDepartment(department)}
                  activeOpacity={0.7}
                >
                  <View style={styles.departmentHeaderLeft}>
                    <Text style={styles.departmentTitle}>{department}</Text>
                    <Text style={styles.departmentMeta}>
                      {selectedCount}/{staff.length} selected
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18 * scaleX}
                    color="#5A759D"
                  />
                </TouchableOpacity>

                {isExpanded &&
                  staff.map((user) => (
                    <View key={user.id}>{renderItem({ item: user })}</View>
                  ))}
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No users to add</Text>}
          contentContainerStyle={sortedDepartmentNames.length === 0 ? styles.emptyList : styles.membersList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16 * scaleX,
    paddingTop: 56,
    paddingBottom: 16 * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backBtn: { marginRight: 12 },
  backText: { fontSize: 16, color: '#5A759D' },
  title: { fontSize: 18, fontWeight: '600', color: '#1E1E1E', flex: 1 },
  headerAction: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 64,
    alignItems: 'flex-end',
  },
  headerActionDisabled: {
    opacity: 0.4,
  },
  headerActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5A759D',
  },
  headerActionTextDisabled: {
    color: '#999',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E1E1E',
    marginHorizontal: 16 * scaleX,
    marginBottom: 6 * scaleX,
  },
  input: {
    height: 44 * scaleX,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8 * scaleX,
    paddingHorizontal: 12 * scaleX,
    marginHorizontal: 16 * scaleX,
    fontSize: 16,
    color: '#1E1E1E',
  },
  inputError: {
    borderColor: '#c62828',
  },
  requiredHint: {
    fontSize: 12,
    color: '#c62828',
    marginHorizontal: 16 * scaleX,
    marginTop: 4 * scaleX,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  membersList: {
    paddingBottom: 12 * scaleX,
  },
  departmentSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  departmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12 * scaleX,
    paddingHorizontal: 16 * scaleX,
    backgroundColor: '#F8FAFD',
  },
  departmentHeaderLeft: {
    flexDirection: 'column',
  },
  departmentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  departmentMeta: {
    marginTop: 2 * scaleX,
    fontSize: 12,
    color: '#5A759D',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12 * scaleX,
    paddingHorizontal: 20 * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rowSelected: {
    backgroundColor: '#F1F6FC',
  },
  avatar: {
    width: 44 * scaleX,
    height: 44 * scaleX,
    borderRadius: 22 * scaleX,
  },
  avatarPlaceholder: {
    width: 44 * scaleX,
    height: 44 * scaleX,
    borderRadius: 22 * scaleX,
    backgroundColor: '#E3ECF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5A759D',
  },
  name: {
    flex: 1,
    marginLeft: 12 * scaleX,
    fontSize: 16,
    color: '#1E1E1E',
  },
  checkbox: {
    width: 24 * scaleX,
    height: 24 * scaleX,
    borderRadius: 12 * scaleX,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#5A759D',
    borderColor: '#5A759D',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  empty: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    marginTop: 32,
  },
  emptyList: { flexGrow: 1 },
});
