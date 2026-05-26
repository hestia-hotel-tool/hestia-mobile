/**
 * Panel that slides in from the right when a department is tapped on the Staff > Departments tab.
 * Shows staff in that department with a triangle pointing to the tapped row.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { scaleX, STAFF_DEPARTMENT_PANEL } from '../../constants/staffStyles';
import { getUsersByDepartment } from '@features/account';
import { DEPARTMENT_SLUG_TO_DB_NAME } from '../../constants/createTicketStyles';
import { typography } from '../../theme';
import type { User } from '../../types';
import type { StaffDepartmentId } from './StaffDepartmentList';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_WIDTH = STAFF_DEPARTMENT_PANEL.width * scaleX;

export interface DepartmentRowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  /** When set, triangle points at the department name (label below icon). */
  namePosition?: { x: number; y: number; width: number; height: number };
}

interface StaffDepartmentStaffPanelProps {
  visible: boolean;
  onClose: () => void;
  departmentId: StaffDepartmentId | null;
  departmentName: string;
  /** Position of the tapped department row in window coordinates (for triangle) */
  rowPosition: DepartmentRowPosition | null;
  /** Top offset (screen Y) so panel starts below the Departments tab. If not set, uses safe area top. */
  topOffset?: number;
}

function getInitial(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] || '?').toUpperCase();
}

function getInitialColor(name: string): string {
  const colors = ['#5a759d', '#cdd3dd', '#607aa1', '#8b9dc3'];
  const index = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

export default function StaffDepartmentStaffPanel({
  visible,
  onClose,
  departmentId,
  departmentName,
  rowPosition,
  topOffset,
}: StaffDepartmentStaffPanelProps) {
  const slideAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisible, setSearchVisible] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<TextInput>(null);

  const panelTop = topOffset ?? insets.top;

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setSearchVisible(false);
      setSelectedStaffIds(new Set());
    }
  }, [visible]);

  const departmentDbName = departmentId ? (DEPARTMENT_SLUG_TO_DB_NAME[departmentId] ?? departmentName) : departmentName;

  useEffect(() => {
    if (!visible || !departmentDbName) {
      setStaff([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getUsersByDepartment(departmentDbName, { limit: 50 })
      .then((res) => {
        if (!cancelled) {
          setStaff(res.data);
        }
      })
      .catch(() => {
        if (!cancelled) setStaff([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, departmentDbName]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PANEL_WIDTH],
  });

  const triangleHeight = (STAFF_DEPARTMENT_PANEL.triangle.borderTopWidth + STAFF_DEPARTMENT_PANEL.triangle.borderBottomWidth) * scaleX;
  const targetCenterY = rowPosition?.namePosition
    ? rowPosition.namePosition.y + rowPosition.namePosition.height / 2
    : rowPosition
      ? rowPosition.y + rowPosition.height / 2
      : SCREEN_HEIGHT / 2;
  const triangleTop = rowPosition
    ? targetCenterY - panelTop - triangleHeight / 2
    : SCREEN_HEIGHT / 2 - panelTop - triangleHeight / 2;

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((user) => user.name.toLowerCase().includes(q));
  }, [staff, searchQuery]);

  const handleToggleSearch = () => {
    setSearchVisible((v) => {
      const next = !v;
      if (next) setTimeout(() => searchInputRef.current?.focus(), 100);
      return next;
    });
  };

  const toggleStaffSelection = (userId: string) => {
    setSelectedStaffIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectedCount = selectedStaffIds.size;

  const t = STAFF_DEPARTMENT_PANEL.triangle;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.panelWrap,
          {
            width: PANEL_WIDTH,
            right: 0,
            top: panelTop,
            bottom: insets.bottom,
            transform: [{ translateX }],
          },
        ]}
      >
        {rowPosition != null && (
          <View
            style={[
              styles.triangle,
              {
                left: -t.borderRightWidth * scaleX,
                top: triangleTop,
                borderRightWidth: t.borderRightWidth * scaleX,
                borderTopWidth: t.borderTopWidth * scaleX,
                borderBottomWidth: t.borderBottomWidth * scaleX,
                borderRightColor: t.borderRightColor,
                shadowColor: t.shadowColor,
                shadowOffset: t.shadowOffset,
                shadowOpacity: t.shadowOpacity,
                shadowRadius: t.shadowRadius * scaleX,
              },
            ]}
          />
        )}
        <View style={styles.panel}>
          <View style={styles.header}>
            {searchVisible ? (
              <>
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInputInHeader}
                  placeholder="Search staff name"
                  placeholderTextColor={STAFF_DEPARTMENT_PANEL.header.closeIconColor}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                />
                <TouchableOpacity onPress={() => setSearchVisible(false)} style={styles.searchIconWrap} hitSlop={12}>
                  <Ionicons name="close" size={24 * scaleX} color={STAFF_DEPARTMENT_PANEL.header.closeIconColor} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.headerTitle} numberOfLines={1}>{departmentName} Staff</Text>
                <TouchableOpacity onPress={handleToggleSearch} style={styles.searchIconWrap} hitSlop={12}>
                  <Ionicons name="search" size={24 * scaleX} color={STAFF_DEPARTMENT_PANEL.header.closeIconColor} />
                </TouchableOpacity>
              </>
            )}
          </View>
          {selectedCount > 0 && (
            <View style={styles.selectedCountRow}>
              <Text style={styles.selectedCountText}>
                {selectedCount} staff selected
              </Text>
            </View>
          )}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={STAFF_DEPARTMENT_PANEL.header.closeIconColor} />
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {filteredStaff.length === 0 && !loading && (
                <Text style={styles.emptyText}>
                  {staff.length === 0 ? 'No staff in this department' : 'No matching staff'}
                </Text>
              )}
              {filteredStaff.map((user) => {
                const isSelected = selectedStaffIds.has(user.id);
                return (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() => toggleStaffSelection(user.id)}
                  >
                    {user.avatar ? (
                      <Image
                        source={{ uri: user.avatar }}
                        style={styles.avatar}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.avatarPlaceholder, { backgroundColor: getInitialColor(user.name) }]}>
                        <Text style={styles.initial}>{getInitial(user.name)}</Text>
                      </View>
                    )}
                    <View style={styles.nameBlock}>
                      <Text style={styles.staffName} numberOfLines={1}>{user.name}</Text>
                      {user.role ? <Text style={styles.staffRole} numberOfLines={1}>{user.role}</Text> : null}
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={22 * scaleX}
                        color={STAFF_DEPARTMENT_PANEL.header.closeIconColor}
                        style={styles.selectedTick}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  panelWrap: {
    position: 'absolute',
    overflow: 'visible',
  },
  triangle: {
    position: 'absolute',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
    shadowColor: 'rgba(100, 131, 176, 0.3)',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  panel: {
    flex: 1,
    backgroundColor: STAFF_DEPARTMENT_PANEL.backgroundColor,
    borderTopLeftRadius: STAFF_DEPARTMENT_PANEL.borderRadius * scaleX,
    borderBottomLeftRadius: STAFF_DEPARTMENT_PANEL.borderRadius * scaleX,
    shadowColor: STAFF_DEPARTMENT_PANEL.shadowColor,
    shadowOffset: STAFF_DEPARTMENT_PANEL.shadowOffset,
    shadowOpacity: STAFF_DEPARTMENT_PANEL.shadowOpacity,
    shadowRadius: STAFF_DEPARTMENT_PANEL.shadowRadius * scaleX,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: STAFF_DEPARTMENT_PANEL.header.paddingHorizontal * scaleX,
    paddingTop: STAFF_DEPARTMENT_PANEL.header.paddingTop * scaleX,
    paddingBottom: STAFF_DEPARTMENT_PANEL.header.paddingBottom * scaleX,
    borderBottomWidth: STAFF_DEPARTMENT_PANEL.header.borderBottomWidth,
    borderBottomColor: STAFF_DEPARTMENT_PANEL.header.borderBottomColor,
  },
  headerTitle: {
    fontSize: STAFF_DEPARTMENT_PANEL.header.titleFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: STAFF_DEPARTMENT_PANEL.header.titleColor,
    flex: 1,
  },
  searchIconWrap: {
    padding: 4,
  },
  searchInputInHeader: {
    flex: 1,
    fontSize: STAFF_DEPARTMENT_PANEL.header.titleFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: STAFF_DEPARTMENT_PANEL.header.titleColor,
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginRight: 8 * scaleX,
  },
  selectedCountRow: {
    paddingHorizontal: STAFF_DEPARTMENT_PANEL.selectedCount.paddingHorizontal * scaleX,
    paddingTop: STAFF_DEPARTMENT_PANEL.selectedCount.paddingTop * scaleX,
    paddingBottom: STAFF_DEPARTMENT_PANEL.selectedCount.paddingBottom * scaleX,
  },
  selectedCountText: {
    fontSize: STAFF_DEPARTMENT_PANEL.selectedCount.fontSize * scaleX,
    fontFamily: typography.fontFamily.secondary,
    fontWeight: STAFF_DEPARTMENT_PANEL.selectedCount.fontWeight as any,
    color: STAFF_DEPARTMENT_PANEL.selectedCount.color,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24 * scaleX,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: STAFF_DEPARTMENT_PANEL.listItem.itemMinHeight * scaleX,
    paddingVertical: STAFF_DEPARTMENT_PANEL.listItem.paddingVertical * scaleX,
    paddingLeft: STAFF_DEPARTMENT_PANEL.listItem.profilePictureLeft * scaleX,
    paddingRight: STAFF_DEPARTMENT_PANEL.listItem.paddingRight * scaleX,
  },
  avatar: {
    width: STAFF_DEPARTMENT_PANEL.listItem.profilePictureSize * scaleX,
    height: STAFF_DEPARTMENT_PANEL.listItem.profilePictureSize * scaleX,
    borderRadius: (STAFF_DEPARTMENT_PANEL.listItem.profilePictureSize / 2) * scaleX,
    marginRight: (STAFF_DEPARTMENT_PANEL.listItem.nameLeft - STAFF_DEPARTMENT_PANEL.listItem.profilePictureLeft - STAFF_DEPARTMENT_PANEL.listItem.profilePictureSize) * scaleX,
  },
  avatarPlaceholder: {
    width: STAFF_DEPARTMENT_PANEL.listItem.profilePictureSize * scaleX,
    height: STAFF_DEPARTMENT_PANEL.listItem.profilePictureSize * scaleX,
    borderRadius: (STAFF_DEPARTMENT_PANEL.listItem.profilePictureSize / 2) * scaleX,
    marginRight: (STAFF_DEPARTMENT_PANEL.listItem.nameLeft - STAFF_DEPARTMENT_PANEL.listItem.profilePictureLeft - STAFF_DEPARTMENT_PANEL.listItem.profilePictureSize) * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '600',
    color: '#ffffff',
  },
  nameBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  staffName: {
    fontSize: STAFF_DEPARTMENT_PANEL.listItem.nameFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: STAFF_DEPARTMENT_PANEL.listItem.nameColor,
  },
  staffRole: {
    fontSize: STAFF_DEPARTMENT_PANEL.listItem.departmentFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: STAFF_DEPARTMENT_PANEL.listItem.departmentColor,
    marginTop: 2 * scaleX,
  },
  selectedTick: {
    marginLeft: 8 * scaleX,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40 * scaleX,
  },
  loadingText: {
    marginTop: 12 * scaleX,
    fontSize: 14 * scaleX,
    color: STAFF_DEPARTMENT_PANEL.header.closeIconColor,
  },
  emptyText: {
    paddingHorizontal: 24 * scaleX,
    paddingTop: 24 * scaleX,
    fontSize: 14 * scaleX,
    color: STAFF_DEPARTMENT_PANEL.header.closeIconColor,
  },
});
