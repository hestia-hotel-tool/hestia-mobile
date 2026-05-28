import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useToast } from '@shared/contexts/ToastContext';
import { typography } from '@shared/theme';
import { getUsersByDepartmentId } from '@features/account';
import type { User } from '@shared/types';
import TicketStaffSelectorModal from './TicketStaffSelectorModal';
import { createTicket } from '../services/tickets';
import type { RootStackParamList } from '@app/navigation/types';
import { getDepartments } from '@shared/lib/departments';
import { DEPARTMENT_NAME_TO_ICON } from '@shared/lib/departments';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;
const TWO_COL_GAP = 12 * scaleX;

type Priority = 'high' | 'medium' | 'low';

const FREQUENT_CASES = [
  'Broken Shower',
  'Shower Drain Clogged',
  'Toilet Not Flushing Properly',
  'HVAC / Climate Control',
  'Furniture & Fixtures',
];

const FALLBACK_DEPARTMENTS = [
  { id: 'Engineering', name: 'Engineering', icon: require('../../../../assets/icons/engineering.png'), noTint: false },
  { id: 'HSK Portier', name: 'HSK Portier', icon: require('../../../../assets/icons/hsk-portier.png'), noTint: true },
  { id: 'In Room Dining', name: 'In Room Dining', icon: require('../../../../assets/icons/in-room-dining-icon.png'), noTint: true },
  { id: 'Laundry', name: 'Laundry', icon: require('../../../../assets/icons/laundry-icon.png'), noTint: false },
  { id: 'Concierge', name: 'Concierge', icon: require('../../../../assets/icons/concierge.png'), noTint: false },
  { id: 'Reception', name: 'Reception', icon: require('../../../../assets/icons/reception.png'), noTint: false },
  { id: 'IT', name: 'IT', icon: require('../../../../assets/icons/it.png'), noTint: false },
];

type DepartmentUiItem = {
  id: string;
  name: string;
  icon: any;
  noTint?: boolean;
};

interface TicketFormProps {
  roomNumber: string;
  roomId?: string;
  departmentName?: string;
  onSubmitSuccess?: () => void;
}

function GradientText({
  text,
  textStyle,
  gradientColors = ['#ff46a3', '#4a91fc'],
}: {
  text: string;
  textStyle: any;
  gradientColors?: [string, string];
}) {
  const [width, setWidth] = useState(0);
  const gradId = useMemo(() => `grad_${Math.random().toString(16).slice(2)}`, []);

  const fontSize =
    typeof textStyle?.fontSize === 'number' ? (textStyle.fontSize as number) : 16;
  const fontFamily = textStyle?.fontFamily;
  const fontWeight = textStyle?.fontWeight;

  return (
    <View
      style={{ alignItems: 'center' }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <>
          <Svg width={width} height={fontSize * 1.5}>
            <Defs>
              <SvgLinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={gradientColors[0]} />
                <Stop offset="1" stopColor={gradientColors[1]} />
              </SvgLinearGradient>
            </Defs>
            <SvgText
              x={width / 2}
              y={fontSize * 1.2}
              textAnchor="middle"
              fontSize={fontSize}
              fontFamily={fontFamily}
              fontWeight={fontWeight}
              fill={`url(#${gradId})`}
            >
              {text}
            </SvgText>
          </Svg>
        </>
      ) : (
        <Text style={textStyle}>{text}</Text>
      )}
    </View>
  );
}

export default function TicketForm({
  roomNumber,
  roomId,
  departmentName = 'Engineering',
  onSubmitSuccess,
}: TicketFormProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
  const [photoGridWidth, setPhotoGridWidth] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [departmentStaff, setDepartmentStaff] = useState<User[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const descriptionInputRef = useRef<TextInput>(null);

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
        const mapped: DepartmentUiItem[] = db
          .filter((d) => d && (d as any).id && (d as any).name)
          .map((d) => {
            const name = String((d as any).name ?? '').trim();
            const iconCfg = DEPARTMENT_NAME_TO_ICON[name] ?? DEPARTMENT_NAME_TO_ICON.Engineering;
            return { id: String((d as any).id), name, icon: iconCfg.icon, noTint: iconCfg.noTint };
          });
        setDepartments(mapped);

        const initial =
          mapped.find((m) => m.name.toLowerCase() === String(departmentName).trim().toLowerCase()) ??
          mapped[0] ??
          null;
        setSelectedDepartmentId(initial?.id ?? null);
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
  }, [departmentName]);

  const selectedDepartmentName = useMemo(() => {
    if (selectedDepartmentId) {
      const found = departments.find((d) => d.id === selectedDepartmentId)?.name;
      if (found) return found;
    }
    return departmentName;
  }, [departments, selectedDepartmentId, departmentName]);

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

  const photoItemSize = useMemo(() => {
    // Use measured width to guarantee 2 columns on iOS/Android even when the form
    // is rendered in a narrower container (e.g. inside Room Details).
    const available = photoGridWidth && photoGridWidth > 0 ? photoGridWidth : SCREEN_WIDTH - 48 * scaleX;
    return (available - TWO_COL_GAP) / 2;
  }, [photoGridWidth]);

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

      await createTicket({
        title: ticketName,
        description: combinedDescription,
        priority: priority === 'high' ? 'urgent' : priority === 'medium' ? 'medium' : 'notUrgent',
        departmentId: selectedDepartmentId,
        departmentName: selectedDepartmentName,
        assignedToId,
        taggedStaffIds: assignedStaff,
        roomId: roomId ?? null,
        locationType: 'room',
        pictures,
      });

      toast.show('Ticket created successfully', { type: 'success', title: 'Success' });
      
      // Reset form
      setTicketName('');
      setDescription('');
      setPictures([]);
      setAssignedStaff([]);
      setPriority('high');
      
      // Call success callback
      onSubmitSuccess?.();

      // Redirect to All tickets tab
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
    <View style={styles.formContainer}>
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
          {(departmentsLoading ? [] : (departments.length > 0 ? departments : FALLBACK_DEPARTMENTS)).map((dept) => {
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
                      !dept.noTint && { tintColor: isSelected ? '#F92424' : '#F92424' },
                      !isSelected && { opacity: 0.3 },
                    ]}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.departmentLabel, isSelected && styles.departmentLabelSelected]}>
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
                  source={require('../../../../assets/icons/dropdown-arrow.png')}
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
          <View style={styles.tagStaffFrame}>
            <View style={styles.tagStaffHeader}>
              <Text style={styles.sectionTitle}>Tag Staff</Text>
              <Text style={styles.sectionSubtitle}>Tag people to the ticket</Text>
            </View>
            <View style={styles.tagStaffDivider} />
            <View style={styles.tagStaffContainer}>
              <View style={styles.taggedStaffRow}>
                {assignedStaff.length > 0 ? (
                  <>
                    {departmentStaff
                      .filter((staff) => assignedStaff.includes(staff.id))
                      .map((staff, index) => (
                        <View
                          key={staff.id}
                          style={[styles.staffAvatarItem, { marginLeft: index > 0 ? 16 : 0 }]}
                        >
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
                  style={[
                    styles.addStaffButton,
                    { marginLeft: assignedStaff.length > 0 ? 16 * scaleX : 0 },
                  ]}
                  onPress={handleOpenStaffModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addStaffText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <Text style={styles.priorityTitle}>Priority</Text>
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
              source={require('../../../../assets/icons/dropdown-arrow.png')}
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
              <Image source={require('../../../../assets/icons/add-photos.png')} style={styles.addPhotoIcon} resizeMode="contain" />
              <GradientText text="Add Photo" textStyle={styles.addPhotoTitle} />
              <Text style={styles.addPhotoSubtitle}>Add photos of the item and our AI will do the rest</Text>
            </TouchableOpacity>
          ) : (
            <View
              style={styles.photosGridContainer}
              onLayout={(e) => setPhotoGridWidth(e.nativeEvent.layout.width)}
            >
              <FlatList
                data={[...pictures, '__ADD__'] as const}
                keyExtractor={(item, index) =>
                  item === '__ADD__' ? '__ADD__' : `${item}-${index}`
                }
                numColumns={2}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={styles.photosGridRow}
                renderItem={({ item, index }) => {
                  if (item === '__ADD__') {
                    return (
                      <TouchableOpacity
                        style={[styles.addPhotoGridItem, { width: photoItemSize, height: photoItemSize }]}
                        onPress={handleAddPicture}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('../../../../assets/icons/add-photos.png')}
                          style={styles.addPhotoGridIcon}
                          resizeMode="contain"
                        />
                        <GradientText text="Add Photo" textStyle={styles.addPhotoGridTitle} />
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <View style={[styles.photoItem, { width: photoItemSize, height: photoItemSize }]}>
                      <Image source={{ uri: item }} style={styles.photoImage} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => handleRemovePicture(index)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.removePhotoText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            </View>
          )}
        </View>

        {/* Description — Figma card + inner field + edit control */}
        <View style={styles.section}>
          <View style={styles.descriptionCard}>
            <View style={styles.descriptionHeaderRow}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <View style={styles.descriptionAIBadgeCircle}>
                <GradientText
                  text="AI"
                  textStyle={{
                    fontSize: 12 * scaleX,
                    fontFamily: typography.fontFamily.primary,
                    fontWeight: '700',
                  }}
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

      {/* Staff Selector Modal */}
      <TicketStaffSelectorModal
        visible={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        staff={departmentStaff}
        selectedStaffIds={assignedStaff}
        onSelect={(staffIds) => {
          setAssignedStaff(staffIds);
        }}
        departmentName={selectedDepartmentName || departmentName || 'Department'}
        loading={loadingStaff}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    paddingHorizontal: 24 * scaleX,
    paddingTop: 24 * scaleX,
    paddingBottom: 100 * scaleX,
    width: '100%',
  },
  heading: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#607aa1',
    marginBottom: 24 * scaleX,
  },
  selectDepartmentLabel: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#5a759d',
    marginBottom: 16 * scaleX,
  },
  departmentScrollView: {
    marginBottom: 24 * scaleX,
  },
  departmentIconsContainer: {
    flexDirection: 'row',
    paddingVertical: 8 * scaleX,
  },
  departmentItem: {
    alignItems: 'center',
    marginRight: 24 * scaleX,
  },
  departmentIconContainer: {
    width: 56 * scaleX,
    height: 56 * scaleX,
    borderRadius: 28 * scaleX,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e3e3e3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8 * scaleX,
  },
  departmentIconSelected: {
    borderColor: '#F92424',
    backgroundColor: '#FEE8EC',
  },
  departmentIcon: {
    width: 32 * scaleX,
    height: 32 * scaleX,
  },
  departmentLabel: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    textAlign: 'center',
    maxWidth: 80 * scaleX,
  },
  departmentLabelSelected: {
    fontWeight: '600',
    color: '#F92424',
  },
  section: {
    marginBottom: 24 * scaleX,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#607aa1',
    marginBottom: 8 * scaleX,
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
    paddingHorizontal: 16 * scaleX,
    paddingVertical: 12 * scaleX,
    backgroundColor: '#ffffff',
    width: '100%',
  },
  textInput: {
    flex: 1,
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: '#1e1e1e',
  },
  dropdownArrow: {
    width: 16 * scaleX,
    height: 16 * scaleX,
    tintColor: '#5a759d',
  },
  dropdownArrowOpen: {
    transform: [{ rotate: '180deg' }],
  },
  frequentCasesDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e3e3',
    borderRadius: 8 * scaleX,
    marginTop: 4 * scaleX,
    paddingVertical: 8 * scaleX,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  frequentCasesTitle: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
    paddingHorizontal: 16 * scaleX,
    paddingVertical: 8 * scaleX,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16 * scaleX,
    paddingVertical: 12 * scaleX,
  },
  dropdownItemText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    flex: 1,
  },
  dropdownCheckmark: {
    fontSize: 18 * scaleX,
    color: '#5a759d',
    fontWeight: '700',
  },
  tagStaffContainer: {
    paddingVertical: 12 * scaleX,
  },
  taggedStaffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  staffAvatarItem: {
    alignItems: 'center',
  },
  staffAvatarCircle: {
    width: 48 * scaleX,
    height: 48 * scaleX,
    borderRadius: 24 * scaleX,
    overflow: 'hidden',
    marginBottom: 4 * scaleX,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#5a759d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 16 * scaleX,
    fontWeight: '700',
    color: '#ffffff',
  },
  staffName: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#5a759d',
    textAlign: 'center',
  },
  addStaffButton: {
    width: 48 * scaleX,
    height: 48 * scaleX,
    borderRadius: 24 * scaleX,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#5a759d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagStaffFrame: {
    borderWidth: 1,
    borderColor: '#e3e3e3',
    backgroundColor: '#ffffff',
    borderRadius: 8 * scaleX,
    paddingHorizontal: 16 * scaleX,
    paddingTop: 14 * scaleX,
    paddingBottom: 8 * scaleX,
  },
  tagStaffHeader: {
    // Keep title/subtitle inside the frame (Figma shows header + divider)
  },
  tagStaffDivider: {
    height: 1 * scaleX,
    backgroundColor: '#e3e3e3',
    marginTop: 10 * scaleX,
    marginBottom: 10 * scaleX,
  },
  addStaffText: {
    fontSize: 24 * scaleX,
    color: '#5a759d',
    fontWeight: '300',
  },
  prioritySelectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ff4dd8',
    borderRadius: 8 * scaleX,
    paddingHorizontal: 16 * scaleX,
    paddingVertical: 12 * scaleX,
    backgroundColor: '#ffffff',
    width: '100%',
  },
  priorityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityIcon: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    marginRight: 12 * scaleX,
  },
  priorityIconHigh: {
    color: '#F92424',
  },
  priorityIconMedium: {
    color: '#ffc107',
  },
  priorityIconLow: {
    color: '#999999',
  },
  priorityLabel: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  priorityDropdown: {
    marginTop: 4 * scaleX,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e3e3',
    borderRadius: 8 * scaleX,
    paddingVertical: 8 * scaleX,
  },
  addPhotoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48 * scaleX,
    borderWidth: 2,
    borderColor: '#e3e3e3',
    borderRadius: 12 * scaleX,
    borderStyle: 'dashed',
    width: '100%',
  },
  addPhotoIcon: {
    width: 48 * scaleX,
    height: 48 * scaleX,
    marginBottom: 16 * scaleX,
  },
  addPhotoTitle: {
    fontSize: 19 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ff46a3',
    marginBottom: 8 * scaleX,
  },
  priorityTitle: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: '#5a759d',
    marginBottom: 8 * scaleX,
  },
  addPhotoSubtitle: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    textAlign: 'center',
    maxWidth: 280 * scaleX,
  },
  photosGridContainer: {
    width: '100%',
  },
  photosGridRow: {
    justifyContent: 'space-between',
    marginBottom: TWO_COL_GAP,
  },
  photoItem: {
    borderRadius: 8 * scaleX,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4 * scaleX,
    right: 4 * scaleX,
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
    fontWeight: '700',
  },
  addPhotoGridItem: {
    borderRadius: 8 * scaleX,
    borderWidth: 2,
    borderColor: '#e3e3e3',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoGridIcon: {
    width: 32 * scaleX,
    height: 32 * scaleX,
    marginBottom: 4 * scaleX,
  },
  addPhotoGridTitle: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ff46a3',
  },
  descriptionCard: {
    backgroundColor: '#f5f6f8',
    borderWidth: 1,
    borderColor: '#e8eaee',
    borderRadius: 14 * scaleX,
    padding: 16 * scaleX,
    width: '100%',
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
    backgroundColor: '#5a759d',
    paddingVertical: 16 * scaleX,
    borderRadius: 8 * scaleX,
    alignItems: 'center',
    marginTop: 16 * scaleX,
    width: '100%',
    alignSelf: 'stretch',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
  },
});
