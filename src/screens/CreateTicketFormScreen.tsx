import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '../contexts/ToastContext';
import { typography } from '../theme';
import type { RootStackParamList } from '@app/navigation/types';
import { getUsersByDepartmentId } from '@features/account';
import type { User } from '../types';
import { DEPARTMENT_NAME_TO_ICON } from '../constants/createTicketStyles';
import TicketStaffSelectorModal from '../components/tickets/TicketStaffSelectorModal';
import { createTicket } from '../services/tickets';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getDepartments } from '../services/departments';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

function DescriptionAIGradientLabel({
  fontSize,
  fontFamily,
  fontWeight,
}: {
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
}) {
  const [width, setWidth] = useState(0);
  const gradId = useMemo(() => `desc_ai_grad_${Math.random().toString(16).slice(2)}`, []);
  const textStyle = { fontSize, fontFamily, fontWeight: fontWeight as '700' };

  return (
    <View style={descriptionAiBadgeStyles.measureWrap} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={fontSize * 1.45}>
          <Defs>
            <SvgLinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#ff46a3" />
              <Stop offset="1" stopColor="#4a91fc" />
            </SvgLinearGradient>
          </Defs>
          <SvgText
            x={width / 2}
            y={fontSize * 1.15}
            textAnchor="middle"
            fontSize={fontSize}
            fontFamily={fontFamily}
            fontWeight={fontWeight}
            fill={`url(#${gradId})`}
          >
            AI
          </SvgText>
        </Svg>
      ) : (
        <Text style={textStyle}>AI</Text>
      )}
    </View>
  );
}

const descriptionAiBadgeStyles = StyleSheet.create({
  measureWrap: { alignItems: 'center', justifyContent: 'center' },
});

type CreateTicketFormScreenRouteProp = RouteProp<RootStackParamList, 'CreateTicketForm'>;
type CreateTicketFormScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CreateTicketForm'
>;

type Priority = 'high' | 'medium' | 'low';

const FREQUENT_CASES = [
  'Broken Shower',
  'Shower Drain Clogged',
  'Toilet Not Flushing Properly',
  'HVAC / Climate Control',
  'Furniture & Fixtures',
];

type DepartmentUiItem = { id: string; name: string; icon: any; noTint?: boolean };

export default function CreateTicketFormScreen() {
  const navigation = useNavigation<CreateTicketFormScreenNavigationProp>();
  const route = useRoute<CreateTicketFormScreenRouteProp>();
  const paramDepartmentName = route.params?.departmentName ?? 'Engineering';
  const paramRoomId = route.params?.roomId;
  const paramRoomNumber = route.params?.roomNumber;
  const paramIsPublicArea = route.params?.isPublicArea;
  const paramPublicAreaName = route.params?.publicAreaName;
  const paramGuestName = route.params?.guestName;
  const paramCheckIn = route.params?.checkIn;
  const paramCheckOut = route.params?.checkOut;
  const paramGuestCount = route.params?.guestCount;
  const paramVipCode = route.params?.vipCode;
  const paramGuestImageUrl = route.params?.guestImageUrl;
  const toast = useToast();

  // Form state
  const [ticketName, setTicketName] = useState('');
  const [showFrequentCasesDropdown, setShowFrequentCasesDropdown] = useState(false);
  const [departments, setDepartments] = useState<DepartmentUiItem[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [assignedStaff, setAssignedStaff] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>('high');
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [pictures, setPictures] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [departmentStaff, setDepartmentStaff] = useState<User[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(paramRoomId ?? null);
  const [selectedRoomLabel, setSelectedRoomLabel] = useState<string>(
    paramRoomNumber
      ? `Room ${paramRoomNumber}`
      : paramIsPublicArea
        ? paramPublicAreaName || 'Public Area'
        : 'Select a room'
  );
  const [activeTab, setActiveTab] = useState<'Overview' | 'Tickets' | 'Checklist' | 'History'>('Tickets');
  const descriptionInputRef = useRef<TextInput>(null);

  // Keep local selection in sync with navigation params (e.g. coming back from SelectTicketLocation)
  useEffect(() => {
    setSelectedRoomId(paramRoomId ?? null);
    setSelectedRoomLabel(
      paramRoomNumber
        ? `Room ${paramRoomNumber}`
        : paramIsPublicArea
          ? paramPublicAreaName || 'Public Area'
          : 'Select a room'
    );
  }, [paramRoomId, paramRoomNumber, paramIsPublicArea, paramPublicAreaName]);

  const isPublicArea = !!paramIsPublicArea;

  const headerTitle = isPublicArea
    ? 'Public Area'
    : selectedRoomLabel;

  const headerSubtitle = isPublicArea
    ? (paramPublicAreaName ?? null)
    : null;

  const tabs = useMemo(() => {
    // Figma: Public Area screen only has Tickets + History tabs.
    return (isPublicArea ? (['Tickets', 'History'] as const) : (['Overview', 'Tickets', 'Checklist', 'History'] as const));
  }, [isPublicArea]);

  // If the department changes, previously tagged staff may no longer be valid.
  useEffect(() => {
    setAssignedStaff([]);
  }, [selectedDepartmentId]);

  // Load departments from DB (source of truth)
  useEffect(() => {
    let cancelled = false;
    setDepartmentsLoading(true);
    getDepartments()
      .then((res) => {
        if (cancelled) return;
        const db = res.data ?? [];
        const mappedUnsorted: DepartmentUiItem[] = db
          .filter((d) => d && (d as any).id && (d as any).name)
          .map((d) => {
            const name = String((d as any).name ?? '').trim();
            const iconCfg = DEPARTMENT_NAME_TO_ICON[name] ?? DEPARTMENT_NAME_TO_ICON.Engineering;
            return { id: String((d as any).id), name, icon: iconCfg.icon, noTint: iconCfg.noTint };
          });

        // Figma behavior: the selected department appears first in the list.
        const desired =
          mappedUnsorted.find(
            (m) => m.name.toLowerCase() === String(paramDepartmentName).trim().toLowerCase(),
          ) ?? mappedUnsorted[0] ?? null;

        const mapped: DepartmentUiItem[] = desired
          ? [desired, ...mappedUnsorted.filter((m) => m.id !== desired.id)]
          : mappedUnsorted;

        setDepartments(mapped);
        setSelectedDepartmentId(mapped[0]?.id ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setDepartments([]);
        setSelectedDepartmentId(null);
      })
      .finally(() => {
        if (!cancelled) setDepartmentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paramDepartmentName]);

  const selectedDepartmentName = useMemo(() => {
    if (selectedDepartmentId) {
      const found = departments.find((d) => d.id === selectedDepartmentId)?.name;
      if (found) return found;
    }
    return paramDepartmentName;
  }, [departments, selectedDepartmentId, paramDepartmentName]);

  const handleChangeLocation = () => {
    navigation.navigate('SelectTicketLocation', { departmentName: selectedDepartmentName || paramDepartmentName } as any);
  };

  // Load department staff
  useEffect(() => {
    if (!selectedDepartmentId) return;
    let cancelled = false;
    setLoadingStaff(true);
    getUsersByDepartmentId(selectedDepartmentId, { limit: 200 })
      .then((response) => {
        if (cancelled) return;
        setDepartmentStaff(response.data);
        setLoadingStaff(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn('Failed to load department staff', error);
        setDepartmentStaff([]);
        setLoadingStaff(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDepartmentId]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleFrequentCaseSelect = (caseItem: string) => {
    setTicketName(caseItem);
    setShowFrequentCasesDropdown(false);
  };

  const handleAddPicture = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.show('Permission to access camera roll is required.', { type: 'error' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: false,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPictures((prev) => [...prev, result.assets[0].uri]);
        toast.show('Photo added successfully', { type: 'success' });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      toast.show('Failed to add photo. Please try again.', { type: 'error' });
    }
  };

  const handleRemovePicture = (index: number) => {
    setPictures((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenStaffModal = () => {
    if (!selectedDepartmentId) {
      toast.show('Please select a department first.', { type: 'error' });
      return;
    }
    setShowStaffModal(true);
  };

  const handleSubmit = async () => {
    // Validation
    if (!ticketName.trim()) {
      toast.show('Please enter a ticket name', { type: 'error' });
      return;
    }

    if (!selectedDepartmentId) {
      toast.show('Please select a department', { type: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      const combinedDescription = description;
      const assignedToId = assignedStaff.length > 0 ? assignedStaff[0] : null;
      const locationType = paramIsPublicArea ? 'publicArea' : 'room';

      await createTicket({
        title: ticketName,
        description: combinedDescription,
        priority: priority === 'high' ? 'urgent' : priority === 'medium' ? 'medium' : 'notUrgent',
        departmentId: selectedDepartmentId,
        departmentName: selectedDepartmentName,
        assignedToId,
        taggedStaffIds: assignedStaff,
        roomId: paramIsPublicArea ? null : (selectedRoomId ?? null),
        locationType,
        publicAreaName: paramIsPublicArea ? (paramPublicAreaName ?? null) : null,
        pictures,
      });

      toast.show('Ticket created successfully', { type: 'success', title: 'Success' });
      navigation.navigate('Main', {
        screen: 'Tickets',
        params: { initialTab: 'all' },
      } as any);
    } catch (error) {
      console.warn('Failed to create ticket', error);
      toast.show('Failed to create ticket. Please try again.', { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with Room Info */}
      <View style={[styles.header, isPublicArea && styles.headerPublicArea]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress} activeOpacity={0.7}>
          <Image
            source={require('../../assets/icons/back-arrow.png')}
            style={[styles.backArrow, isPublicArea && styles.backArrowPublicArea]}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleChangeLocation} activeOpacity={0.7}>
            <Text style={[styles.roomNumber, isPublicArea && styles.roomNumberPublicArea]}>
              {headerTitle}
            </Text>
          </TouchableOpacity>
          {headerSubtitle ? (
            <Text style={styles.publicAreaSubtitle} numberOfLines={1} ellipsizeMode="tail">
              {headerSubtitle}
            </Text>
          ) : null}
          {!isPublicArea ? (
            <>
              <Text style={styles.ticketCode}>ST2K-1.4</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>✓ Cleaned</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tab}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.tabDivider} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Create a ticket heading */}
        <Text style={styles.heading}>Create a ticket</Text>
        <Text style={styles.selectDepartmentLabel}>Select Department</Text>

        {/* Department Icons Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.departmentScrollView}
          contentContainerStyle={styles.departmentIconsContainer}
        >
          {(departmentsLoading ? [] : departments).map((dept) => {
            const isSelected = dept.id === selectedDepartmentId;
            return (
              <TouchableOpacity
                key={dept.id}
                style={styles.departmentItem}
                onPress={() => setSelectedDepartmentId(dept.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.departmentIconContainer, isSelected && styles.departmentIconSelected]}>
                  <Image
                    source={dept.icon}
                    style={[
                      styles.departmentIcon,
                      !dept.noTint && { tintColor: isSelected ? '#ffffff' : '#F92424' },
                      isSelected ? { opacity: 1 } : { opacity: 0.3 },
                    ]}
                    resizeMode="contain"
                  />
                </View>
                <Text
                  style={[styles.departmentLabel, isSelected && styles.departmentLabelSelected]}
                >
                  {dept.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Ticket Name with Frequent Cases Dropdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ticket Name</Text>
          <View style={styles.inputWrapper}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Broken Shower"
                placeholderTextColor="#5a759d"
                value={ticketName}
                onChangeText={setTicketName}
              />
              <TouchableOpacity
                onPress={() => setShowFrequentCasesDropdown(!showFrequentCasesDropdown)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Image
                  source={require('../../assets/icons/dropdown-arrow.png')}
                  style={[styles.dropdownArrow, showFrequentCasesDropdown && styles.dropdownArrowOpen]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Frequent Cases Dropdown */}
            {showFrequentCasesDropdown && (
              <View style={styles.frequentCasesDropdown}>
                <Text style={styles.frequentCasesTitle}>Frequent Cases</Text>
                {FREQUENT_CASES.map((caseItem) => {
                  const isSelected = ticketName === caseItem;
                  return (
                    <TouchableOpacity
                      key={caseItem}
                      style={styles.dropdownItem}
                      onPress={() => handleFrequentCaseSelect(caseItem)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dropdownItemText}>{caseItem}</Text>
                      {isSelected && <Text style={styles.dropdownCheckmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Tag Staff */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tag Staff</Text>
          <Text style={styles.sectionSubtitle}>Tag people to the ticket</Text>
          <View style={styles.tagStaffContainer}>
            <View style={styles.taggedStaffRow}>
              {assignedStaff.length > 0 ? (
                <>
                  {departmentStaff
                    .filter((staff) => assignedStaff.includes(staff.id))
                    .map((staff, index) => (
                      <View key={staff.id} style={[styles.staffAvatarItem, { marginLeft: index > 0 ? 16 : 0 }]}>
                        <View style={styles.staffAvatarCircle}>
                          {staff.avatar ? (
                            <Image source={{ uri: staff.avatar }} style={styles.avatarImage} />
                          ) : (
                            <View style={styles.avatarPlaceholder}>
                              <Text style={styles.avatarInitials}>
                                {staff.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.staffName}>{staff.name}</Text>
                      </View>
                    ))}
                </>
              ) : null}
              <TouchableOpacity
                style={[styles.addStaffButton, assignedStaff.length === 0 && { marginLeft: 0 }]}
                onPress={handleOpenStaffModal}
                activeOpacity={0.7}
              >
                <Text style={styles.addStaffText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Priority</Text>
          <TouchableOpacity
            style={styles.prioritySelectContainer}
            onPress={() => setShowPriorityDropdown(!showPriorityDropdown)}
            activeOpacity={0.7}
          >
            <View style={styles.priorityContent}>
              <Text style={[
                styles.priorityIcon,
                priority === 'high' && styles.priorityIconHigh,
                priority === 'medium' && styles.priorityIconMedium,
                priority === 'low' && styles.priorityIconLow,
              ]}>
                {priority === 'high' ? 'PPP' : priority === 'medium' ? 'PP' : 'P'}
              </Text>
              <Text style={styles.priorityLabel}>
                {priority === 'high' ? 'High Priority' : priority === 'medium' ? 'Medium Priority' : 'Low Priority'}
              </Text>
            </View>
            <Image
              source={require('../../assets/icons/dropdown-arrow.png')}
              style={[styles.dropdownArrow, showPriorityDropdown && styles.dropdownArrowOpen]}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {showPriorityDropdown && (
            <View style={styles.priorityDropdown}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setPriority('high');
                  setShowPriorityDropdown(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.priorityContent}>
                  <Text style={[styles.priorityIcon, styles.priorityIconHigh]}>PPP</Text>
                  <Text style={styles.dropdownItemText}>High Priority</Text>
                </View>
                {priority === 'high' && <Text style={styles.dropdownCheckmark}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setPriority('medium');
                  setShowPriorityDropdown(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.priorityContent}>
                  <Text style={[styles.priorityIcon, styles.priorityIconMedium]}>PP</Text>
                  <Text style={styles.dropdownItemText}>Medium Priority</Text>
                </View>
                {priority === 'medium' && <Text style={styles.dropdownCheckmark}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setPriority('low');
                  setShowPriorityDropdown(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.priorityContent}>
                  <Text style={[styles.priorityIcon, styles.priorityIconLow]}>P</Text>
                  <Text style={styles.dropdownItemText}>Low Priority</Text>
                </View>
                {priority === 'low' && <Text style={styles.dropdownCheckmark}>✓</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Add Photo */}
        <View style={styles.section}>
          {pictures.length === 0 ? (
            <TouchableOpacity style={styles.addPhotoContainer} onPress={handleAddPicture} activeOpacity={0.7}>
              <Image source={require('../../assets/icons/add-photos.png')} style={styles.addPhotoIcon} resizeMode="contain" />
              <Text style={styles.addPhotoTitle}>Add Photo</Text>
              <Text style={styles.addPhotoSubtitle}>Add photos of the item and our AI will do the rest</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.photosGrid}>
              {pictures.map((uri, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePicture(index)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.removePhotoText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addPhotoGridItem} onPress={handleAddPicture} activeOpacity={0.7}>
                <Image source={require('../../assets/icons/add-photos.png')} style={styles.addPhotoGridIcon} resizeMode="contain" />
                <Text style={styles.addPhotoGridTitle}>Add Photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Description — Figma: nested card, gradient AI badge, inner white field + edit control */}
        <View style={styles.section}>
          <View style={styles.descriptionCard}>
            <View style={styles.descriptionHeaderRow}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <View style={styles.descriptionAIBadgeCircle}>
                <DescriptionAIGradientLabel
                  fontSize={12 * scaleX}
                  fontFamily={typography.fontFamily.primary}
                  fontWeight="700"
                />
              </View>
            </View>
            <View style={styles.descriptionInnerField}>
              <TextInput
                ref={descriptionInputRef}
                style={styles.descriptionInput}
                placeholder="Room 201 – Broken shower head reported. Guest unable to use shower normally."
                placeholderTextColor="#999999"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                underlineColorAndroid="transparent"
              />
              <TouchableOpacity
                style={styles.descriptionEditButton}
                onPress={() => descriptionInputRef.current?.focus()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Edit description"
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-outline" size={16 * scaleX} color="#5a759d" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.7}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Ticket</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Staff Selector Modal */}
      <TicketStaffSelectorModal
        visible={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        staff={departmentStaff}
        selectedStaffIds={assignedStaff}
        onSelect={(staffIds) => {
          setAssignedStaff(staffIds);
        }}
        departmentName={selectedDepartmentName || paramDepartmentName || 'Department'}
        loading={loadingStaff}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    height: 232 * scaleX,
    backgroundColor: '#4a91fc',
    paddingTop: 50 * scaleX,
    paddingHorizontal: 24 * scaleX,
  },
  headerPublicArea: {
    backgroundColor: '#e4eefe',
  },
  backButton: {
    width: 40 * scaleX,
    height: 40 * scaleX,
    justifyContent: 'center',
  },
  backArrow: {
    width: 28 * scaleX,
    height: 28 * scaleX,
    tintColor: '#ffffff',
  },
  backArrowPublicArea: {
    tintColor: '#5b769e',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 8 * scaleX,
  },
  publicAreaSubtitle: {
    fontSize: 17 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#1e1e1e',
    marginTop: 4 * scaleX,
    maxWidth: 320 * scaleX,
  },
  roomNumber: {
    fontSize: 24 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4 * scaleX,
  },
  roomNumberPublicArea: {
    color: '#5b769e',
  },
  ticketCode: {
    fontSize: 17 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#ffffff',
    marginBottom: 12 * scaleX,
  },
  statusBadge: {
    paddingHorizontal: 16 * scaleX,
    paddingVertical: 8 * scaleX,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20 * scaleX,
  },
  statusText: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20 * scaleX,
    height: 52 * scaleX,
    alignItems: 'center',
  },
  tab: {
    marginRight: 32 * scaleX,
    height: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#5a759d',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4 * scaleX,
    backgroundColor: '#5a759d',
  },
  tabDivider: {
    height: 1,
    backgroundColor: '#e3e3e3',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24 * scaleX,
    paddingBottom: 100 * scaleX,
  },
  heading: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#607aa1',
    marginTop: 24 * scaleX,
    marginBottom: 8 * scaleX,
  },
  selectDepartmentLabel: {
    fontSize: 14 * scaleX,
    fontFamily: 'Inter',
    fontWeight: '300',
    color: '#000000',
    marginBottom: 16 * scaleX,
  },
  departmentScrollView: {
    marginBottom: 32 * scaleX,
  },
  departmentIconsContainer: {
    flexDirection: 'row',
    paddingRight: 24 * scaleX,
  },
  departmentItem: {
    alignItems: 'center',
    marginRight: 24 * scaleX,
    width: 90 * scaleX, // fixed label width so wrapped lines stay centered under icon
  },
  departmentIconContainer: {
    width: 55.482 * scaleX,
    height: 55.482 * scaleX,
    borderRadius: 37 * scaleX,
    backgroundColor: '#ffebeb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8 * scaleX,
  },
  departmentIconSelected: {
    backgroundColor: '#F92424',
  },
  departmentIcon: {
    width: 24 * scaleX,
    height: 24 * scaleX,
  },
  departmentLabel: {
    fontSize: 14 * scaleX,
    fontFamily: 'Inter',
    fontWeight: '300',
    color: '#000000',
    textAlign: 'center',
    width: '100%',
    maxWidth: 90 * scaleX,
    alignSelf: 'center',
  },
  departmentLabelSelected: {
    fontWeight: '600',
    color: '#f92424',
  },
  section: {
    marginBottom: 32 * scaleX,
  },
  sectionTitle: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#607aa1',
    marginBottom: 12 * scaleX,
  },
  sectionSubtitle: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#494747',
    marginBottom: 12 * scaleX,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff4dd8',
    borderRadius: 8 * scaleX,
    height: 68 * scaleX,
    paddingHorizontal: 16 * scaleX,
  },
  textInput: {
    flex: 1,
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
  dropdownArrow: {
    width: 14 * scaleX,
    height: 11 * scaleX,
    tintColor: '#5a759d',
  },
  dropdownArrowOpen: {
    transform: [{ rotate: '180deg' }],
  },
  frequentCasesDropdown: {
    marginTop: 8 * scaleX,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8 * scaleX,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  frequentCasesTitle: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#607aa1',
    paddingHorizontal: 16 * scaleX,
    paddingTop: 12 * scaleX,
    paddingBottom: 8 * scaleX,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16 * scaleX,
    paddingVertical: 12 * scaleX,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  dropdownItemText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
  },
  dropdownCheckmark: {
    fontSize: 14 * scaleX,
    color: '#10b981',
    fontWeight: 'bold',
  },
  tagStaffContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8 * scaleX,
    padding: 16 * scaleX,
    minHeight: 100 * scaleX,
  },
  taggedStaffRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  staffAvatarItem: {
    alignItems: 'center',
    marginBottom: 8 * scaleX,
  },
  staffAvatarCircle: {
    width: 30 * scaleX,
    height: 30 * scaleX,
    borderRadius: 15 * scaleX,
    marginBottom: 4 * scaleX,
  },
  avatarImage: {
    width: 30 * scaleX,
    height: 30 * scaleX,
    borderRadius: 15 * scaleX,
  },
  avatarPlaceholder: {
    width: 30 * scaleX,
    height: 30 * scaleX,
    borderRadius: 15 * scaleX,
    backgroundColor: '#5a759d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '600',
    color: '#ffffff',
  },
  staffName: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#5a759d',
    textAlign: 'center',
    maxWidth: 80 * scaleX,
  },
  addStaffButton: {
    width: 53 * scaleX,
    height: 49 * scaleX,
    borderRadius: 41 * scaleX,
    backgroundColor: '#f1f6fc',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16 * scaleX,
  },
  addStaffText: {
    fontSize: 29 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
  prioritySelectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 68 * scaleX,
    borderWidth: 1,
    borderColor: '#ff4dd8',
    borderRadius: 8 * scaleX,
    paddingHorizontal: 16 * scaleX,
    backgroundColor: '#fff',
  },
  priorityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityIcon: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'bold',
    marginRight: 16 * scaleX,
  },
  priorityIconHigh: {
    color: '#F92424',
  },
  priorityIconMedium: {
    color: '#F0BE1B',
  },
  priorityIconLow: {
    color: '#D9D9D9',
  },
  priorityLabel: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#000000',
  },
  priorityDropdown: {
    marginTop: 8 * scaleX,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8 * scaleX,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  addPhotoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32 * scaleX,
    paddingHorizontal: 16 * scaleX,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8 * scaleX,
    borderStyle: 'dashed',
  },
  addPhotoIcon: {
    width: 60 * scaleX,
    height: 60 * scaleX,
    marginBottom: 12 * scaleX,
  },
  addPhotoTitle: {
    fontSize: 19 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    background: 'linear-gradient(to right, #ff46a3, #4a91fc)',
    backgroundClip: 'text',
    color: '#ff46a3',
    marginBottom: 8 * scaleX,
    textAlign: 'center',
  },
  addPhotoSubtitle: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    textAlign: 'center',
    maxWidth: 160 * scaleX,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12 * scaleX,
  },
  photoItem: {
    width: (SCREEN_WIDTH - 60 * scaleX) / 2,
    height: 120 * scaleX,
    borderRadius: 8 * scaleX,
    overflow: 'hidden',
    position: 'relative',
  },
  addPhotoGridItem: {
    width: (SCREEN_WIDTH - 60 * scaleX) / 2,
    height: 120 * scaleX,
    borderRadius: 8 * scaleX,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  addPhotoGridIcon: {
    width: 40 * scaleX,
    height: 40 * scaleX,
    marginBottom: 8 * scaleX,
  },
  addPhotoGridTitle: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ff46a3',
    textAlign: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8 * scaleX,
    right: 8 * scaleX,
    width: 24 * scaleX,
    height: 24 * scaleX,
    borderRadius: 12 * scaleX,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#ffffff',
    fontSize: 18 * scaleX,
    fontWeight: 'bold',
  },
  descriptionCard: {
    backgroundColor: '#f5f6f8',
    borderWidth: 1,
    borderColor: '#e8eaee',
    borderRadius: 14 * scaleX,
    padding: 16 * scaleX,
  },
  descriptionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12 * scaleX,
  },
  descriptionLabel: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  descriptionAIBadgeCircle: {
    width: 30 * scaleX,
    height: 30 * scaleX,
    borderRadius: 15 * scaleX,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f0d0e4',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  descriptionInnerField: {
    position: 'relative',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8 * scaleX,
    minHeight: 132 * scaleX,
  },
  descriptionInput: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#44474e',
    lineHeight: 20 * scaleX,
    paddingHorizontal: 14 * scaleX,
    paddingVertical: 12 * scaleX,
    paddingRight: 44 * scaleX,
    paddingBottom: 14 * scaleX,
    minHeight: 120 * scaleX,
  },
  descriptionEditButton: {
    position: 'absolute',
    right: 12 * scaleX,
    bottom: 12 * scaleX,
  },
  submitButton: {
    height: 70 * scaleX,
    backgroundColor: '#5a759d',
    borderRadius: 8 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32 * scaleX,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: '#ffffff',
  },
});
