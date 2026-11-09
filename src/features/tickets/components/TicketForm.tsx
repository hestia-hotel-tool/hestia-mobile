import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { KeyboardDoneBar, KEYBOARD_DONE_BAR_ID } from '@/components/ui/KeyboardDoneBar';
import { MAX_PHOTOS, choosePhotoSource, pickPhotos, type PhotoSource } from '@/components/media/photoPicker';
import { GradientText } from '@/components/ui/GradientText';
import { useToast } from '@/contexts/ToastContext';
import { typography } from '@/theme';
import type { User } from '@/types';
import TicketStaffSelectorModal from './TicketStaffSelectorModal';
import { createTicket } from '../services/tickets';
import {
  getDepartments,
  departmentIconName,
  departmentGlyphHeight,
  sortDepartmentsByDisplayOrder,
} from '@/lib/departments';
import { Icon, type IconName } from '@/components/Icon';
import { fetchAssignableTicketStaff } from '../services/ticketAccess';

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

type DepartmentUiItem = {
  id: string;
  name: string;
  /** `null` when the design has no mark for this department. */
  iconName: IconName | null;
};

interface TicketFormProps {
  roomNumber: string;
  roomId?: string;
  departmentName?: string;
  /** A public area instead of a room: the ticket is filed against it, with no room. */
  publicAreaName?: string | null;
  onSubmitSuccess?: () => void;
}

export default function TicketForm({
  roomNumber,
  roomId,
  departmentName = 'Engineering',
  publicAreaName,
  onSubmitSuccess,
}: TicketFormProps) {
  const isPublicArea = publicAreaName != null;
  const toast = useToast();

  // Form state
  const [ticketName, setTicketName] = useState('');
  const [showDepartmentList, setShowDepartmentList] = useState(false);
  const [departments, setDepartments] = useState<DepartmentUiItem[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [assignedStaff, setAssignedStaff] = useState<string[]>([]);
  const [priority, setPriority] = useState<Priority>('high');
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
        const mapped: DepartmentUiItem[] = sortDepartmentsByDisplayOrder(db)
          .filter((d) => d && (d as any).id && (d as any).name)
          .map((d) => {
            const name = String((d as any).name ?? '').trim();
            return { id: String((d as any).id), name, iconName: departmentIconName(name) };
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
    // On shift right now and signed in to the app (migration 20261026200000).
    fetchAssignableTicketStaff(selectedDepartmentId, { excludeSelf: true })
      .then((staff) => {
        if (cancelled) return;
        setDepartmentStaff(staff);
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

  const handleFrequentCaseSelect = (caseItem: string) => setTicketName(caseItem);

  // The camera, or several at once from the library — up to MAX_PHOTOS in all.
  const handleAddPicture = () => choosePhotoSource((source) => void addPictures(source));
  const addPictures = async (source: PhotoSource) => {
    const result = await pickPhotos(source, MAX_PHOTOS - pictures.length);
    if ('error' in result) {
      toast.show(result.error, { type: 'error' });
      return;
    }
    if (result.uris.length > 0) {
      setPictures((prev) => [...prev, ...result.uris].slice(0, MAX_PHOTOS));
      toast.show(result.uris.length === 1 ? 'Photo added' : `${result.uris.length} photos added`, { type: 'success' });
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
        roomId: isPublicArea ? null : (roomId ?? null),
        locationType: isPublicArea ? 'publicArea' : 'room',
        publicAreaName: isPublicArea ? publicAreaName : null,
        pictures,
      });

      toast.show('Ticket created successfully', { type: 'success', title: 'Success' });
      
      // Reset form
      setTicketName('');
      setDescription('');
      setPictures([]);
      setAssignedStaff([]);
      setPriority('high');
      
      /*
       * Stay on the room.
       *
       * This used to `router.replace('/(tabs)/(tickets)')`, which threw the
       * reader out of Room Detail the instant they submitted — so the form
       * reset above and the refetch below were both dead code, and the new
       * ticket appeared on a screen they had not asked for. The host refreshes
       * its own Current Ticket list instead, which is where the ticket they
       * just wrote belongs.
       */
      onSubmitSuccess?.();
    } catch (error) {
      console.warn('Failed to create ticket', error);
      toast.show('Failed to create ticket. Please try again.', { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDepartment = departments.find((d) => d.id === selectedDepartmentId) ?? null;
  const otherDepartments = departments.filter((d) => d.id !== selectedDepartmentId);
  const taggedStaff = departmentStaff.filter((staff) => assignedStaff.includes(staff.id));

  return (
    <View style={styles.formContainer}>
      {/* Department — a dropdown: the chosen one large in a pink frame, the
          rest listed under it while open (Figma 589:514, 4600:609). */}
      <Text style={styles.selectDepartmentLabel}>Select Department</Text>
      <TouchableOpacity
        style={styles.departmentBox}
        onPress={() => setShowDepartmentList((open) => !open)}
        activeOpacity={0.7}
        disabled={departmentsLoading || departments.length === 0}
        accessibilityRole="button"
        accessibilityLabel={`Department: ${selectedDepartment?.name ?? 'none'}`}
        accessibilityHint="Choose the department this ticket is for"
        accessibilityState={{ expanded: showDepartmentList }}
      >
        <View style={styles.departmentBoxGlyph}>
          {selectedDepartment?.iconName ? (
            <Icon
              name={selectedDepartment.iconName}
              size={Math.min(departmentGlyphHeight(selectedDepartment.iconName) * BOX_GLYPH_SCALE, BOX_GLYPH_MAX) * scaleX}
              color={INK}
            />
          ) : null}
        </View>
        {departmentsLoading ? (
          <ActivityIndicator color={INK} style={styles.departmentBoxName} />
        ) : (
          <Text style={styles.departmentBoxName} numberOfLines={1}>
            {selectedDepartment?.name ?? 'Select'}
          </Text>
        )}
        <View style={showDepartmentList ? styles.chevronOpen : undefined}>
          <Icon name="action-chevron-down-wide" width={30 * scaleX} height={14 * scaleX} color={INK} />
        </View>
      </TouchableOpacity>

      {showDepartmentList ? (
        <View style={styles.departmentList}>
          {otherDepartments.map((dept) => (
            <TouchableOpacity
              key={dept.id}
              style={styles.departmentRow}
              onPress={() => {
                setSelectedDepartmentId(dept.id);
                setShowDepartmentList(false);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={dept.name}
            >
              <View style={styles.departmentRowGlyph}>
                {dept.iconName ? (
                  <Icon name={dept.iconName} size={departmentGlyphHeight(dept.iconName) * scaleX} color={INK} />
                ) : null}
              </View>
              <Text style={styles.departmentRowLabel} numberOfLines={1}>
                {dept.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={[styles.fullBleedRule, showDepartmentList && styles.fullBleedRuleAfterList]} />

      {/* Name — "Name Engineering Ticket", the field, then the frequent cases. */}
      <Text style={styles.nameHeading}>Name {selectedDepartmentName} Ticket</Text>
      <View style={styles.pinkBox}>
        <TextInput
          style={styles.nameInput}
          placeholder="Broken Shower"
          placeholderTextColor={PLACEHOLDER}
          value={ticketName}
          onChangeText={setTicketName}
          accessibilityLabel="Ticket name"
        />
      </View>

      <Text style={styles.frequentCasesTitle}>Frequent Cases</Text>
      <View style={styles.frequentCases}>
        {FREQUENT_CASES.map((caseItem) => {
          const isSelected = ticketName === caseItem;
          return (
            <TouchableOpacity
              key={caseItem}
              style={styles.caseRow}
              onPress={() => handleFrequentCaseSelect(caseItem)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={caseItem}
              accessibilityState={{ selected: isSelected }}
            >
              <Icon name="action-flag-priority" width={FLAG.width} height={FLAG.height} color={CASE_FLAG} />
              <Text style={styles.caseLabel}>{caseItem}</Text>
              {isSelected ? <Icon name="action-check" width={CHECK.width} height={CHECK.height} color={INK} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Priority — the choice in a pink frame, the three options under it. */}
      <Text style={styles.priorityTitle}>Priority</Text>
      <View style={[styles.pinkBox, styles.priorityBox]}>
        <PriorityFlags priority={priority} />
        <Text style={styles.priorityBoxLabel}>{PRIORITY[priority].label}</Text>
      </View>
      <View style={styles.priorityOptions}>
        {PRIORITY_ORDER.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.priorityRow, { backgroundColor: PRIORITY[p].tint }]}
            onPress={() => setPriority(p)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityLabel={PRIORITY[p].label}
            accessibilityState={{ selected: priority === p }}
          >
            <PriorityFlags priority={p} />
            <Text style={styles.priorityRowLabel}>{PRIORITY[p].label}</Text>
            {priority === p ? (
              <Icon name="action-check" width={CHECK.width} height={CHECK.height} color={INK} />
            ) : null}
          </TouchableOpacity>
        ))}
      </View>

      {/* Add Photo */}
      <View style={styles.card}>
        {pictures.length === 0 ? (
          <TouchableOpacity
            style={styles.addPhotoEmpty}
            onPress={handleAddPicture}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Add photo"
          >
            <AddPhotoMark />
            <View style={styles.addPhotoTitle}>
              <GradientText text="Add Photo" textStyle={styles.addPhotoTitleText} direction="vertical" />
            </View>
            <Text style={styles.addPhotoSubtitle}>Add photos of the item and our AI will do the rest</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.photosGridContainer} onLayout={(e) => setPhotoGridWidth(e.nativeEvent.layout.width)}>
            <FlatList
              data={[...pictures, '__ADD__'] as const}
              keyExtractor={(item, index) => (item === '__ADD__' ? '__ADD__' : `${item}-${index}`)}
              numColumns={2}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={styles.photosGridRow}
              renderItem={({ item, index }) => {
                if (item === '__ADD__') {
                  if (pictures.length >= MAX_PHOTOS) return null;
                  return (
                    <TouchableOpacity
                      style={[styles.addPhotoGridItem, { width: photoItemSize, height: photoItemSize }]}
                      onPress={handleAddPicture}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Add another photo"
                    >
                      <Icon name="action-add-photo-frame" size={30 * scaleX} color="#000000" />
                      <GradientText text="Add Photo" textStyle={styles.addPhotoGridTitle} direction="vertical" />
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
                      accessibilityRole="button"
                      accessibilityLabel="Remove photo"
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

      {/* Tag Staff */}
      <View style={[styles.card, styles.tagStaffCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.tagStaffTitle}>Tag Staff</Text>
          <Text style={styles.tagStaffSubtitle}>Tag people to the ticket</Text>
        </View>
        <View style={styles.cardRule} />
        <View style={styles.taggedStaffRow}>
          <View style={styles.taggedStaffList}>
            {taggedStaff.map((staff) => (
              <View key={staff.id} style={styles.staffChip}>
                <View style={styles.staffAvatar}>
                  {staff.avatar ? (
                    <Image source={{ uri: staff.avatar }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarInitials}>{initials(staff.name)}</Text>
                  )}
                </View>
                <Text style={styles.staffName} numberOfLines={1}>
                  {shortName(staff.name)}
                </Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.addStaffButton}
            onPress={handleOpenStaffModal}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Tag staff"
          >
            <Text style={styles.addStaffText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Description — the whole text area is the field. */}
      <View style={[styles.card, styles.descriptionCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.descriptionLabel}>Description</Text>
        </View>
        <View style={styles.cardRule} />
        <View style={styles.descriptionBody}>
          <TextInput
            ref={descriptionInputRef}
            style={styles.descriptionInput}
            placeholder={`${roomNumber ? `Room ${roomNumber}` : (publicAreaName ?? 'Room')} – Broken shower head reported. Guest unable to use shower normally.`}
            placeholderTextColor={PLACEHOLDER}
            value={description}
            onChangeText={setDescription}
            multiline
            inputAccessoryViewID={KEYBOARD_DONE_BAR_ID}
            textAlignVertical="top"
            underlineColorAndroid="transparent"
            accessibilityLabel="Description"
          />
          <KeyboardDoneBar />
          <View style={styles.descriptionAIBadge}>
            <GradientText
              text="AI"
              textStyle={{ fontSize: 12 * scaleX, fontFamily: typography.fontFamily.primary, fontWeight: '700' }}
              direction="vertical"
            />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.submitButtonText}>Submit Ticket</Text>}
      </TouchableOpacity>

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
        assignableOnly
      />
    </View>
  );
}

/** One, two or three flags in the priority's colour, in a slot wide enough for three. */
function PriorityFlags({ priority }: { priority: Priority }) {
  const { flags, color } = PRIORITY[priority];
  return (
    <View style={styles.flagSlot}>
      {Array.from({ length: flags }, (_, i) => (
        <Icon key={i} name="action-flag-priority" width={FLAG.width} height={FLAG.height} color={color} />
      ))}
    </View>
  );
}

/** Figma 2186:2044: the photo frame, the gradient "+" on its top-right corner. */
function AddPhotoMark() {
  return (
    <View style={styles.addPhotoMark}>
      <Icon name="action-add-photo-frame" width={55.4 * scaleX} height={47 * scaleX} color="#000000" />
      <View style={styles.addPhotoPlus} pointerEvents="none">
        <GradientText text="+" textStyle={styles.addPhotoPlusText} direction="vertical" />
      </View>
    </View>
  );
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** "Dimotia Mavros" -> "Dimotia. M", as Figma 2385:996 labels a tagged person. */
function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? '';
  return `${parts[0]}. ${parts[parts.length - 1][0].toUpperCase()}`;
}

/** Figma 589:514 measures, in design px. */
const INK = '#5a759d';
const PINK = '#ff4dd8';
const PLACEHOLDER = 'rgba(90, 117, 157, 0.5)';
const CASE_FLAG = '#c9c9d0';
const FLAG = { width: 14 * scaleX, height: 19 * scaleX };
const CHECK = { width: 15.5 * scaleX, height: 13.1 * scaleX };
/** The chosen department's glyph is drawn larger than in the list: the wrench is 40 tall there, 31 in a chip. */
const BOX_GLYPH_SCALE = 40 / 31.07;
/** ...but never taller than that wrench: the tall marks (Laundry 37, Reception 37) would otherwise reach 48. */
const BOX_GLYPH_MAX = 40;
const GUTTER = 26;

const PRIORITY: Record<Priority, { label: string; flags: number; color: string; tint: string }> = {
  // The row tints are Figma's fills at its 20% layer opacity, flattened.
  high: { label: 'High Priority', flags: 3, color: '#f92424', tint: 'rgba(249, 36, 36, 0.056)' },
  medium: { label: 'Medium Priority', flags: 2, color: '#f0be1b', tint: 'rgba(240, 190, 27, 0.072)' },
  low: { label: 'Low Priority', flags: 1, color: '#9797a3', tint: 'rgba(217, 217, 217, 0.2)' },
};
const PRIORITY_ORDER: Priority[] = ['high', 'medium', 'low'];

const card = {
  backgroundColor: '#f9fafc',
  borderWidth: 1,
  borderColor: 'rgba(90, 117, 157, 0.23)',
  borderRadius: 12 * scaleX,
} as const;

const styles = StyleSheet.create({
  formContainer: {
    paddingHorizontal: GUTTER * scaleX,
    paddingTop: 28 * scaleX,
    paddingBottom: 100 * scaleX,
    width: '100%',
  },

  // Department
  selectDepartmentLabel: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '300',
    color: '#000000',
    marginBottom: 20 * scaleX,
  },
  departmentBox: {
    height: 118 * scaleX,
    borderWidth: 1,
    borderColor: PINK,
    borderRadius: 8 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 30 * scaleX,
    paddingRight: 33 * scaleX,
  },
  departmentBoxGlyph: {
    width: 42 * scaleX,
    alignItems: 'center',
  },
  departmentBoxName: {
    flex: 1,
    marginLeft: 28 * scaleX,
    fontSize: 23 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: INK,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
  departmentList: {
    marginTop: 4 * scaleX,
  },
  departmentRow: {
    height: 70 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
  },
  departmentRowGlyph: {
    width: 44 * scaleX,
    marginLeft: 18 * scaleX,
    alignItems: 'center',
  },
  departmentRowLabel: {
    marginLeft: 34 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '300',
    color: '#000000',
  },
  fullBleedRule: {
    height: 1,
    backgroundColor: '#e4e4e4',
    marginHorizontal: -GUTTER * scaleX,
    marginTop: 24 * scaleX,
  },
  fullBleedRuleAfterList: {
    marginTop: 14 * scaleX,
  },

  // Name
  nameHeading: {
    marginTop: 23 * scaleX,
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#607aa1',
  },
  pinkBox: {
    height: 68 * scaleX,
    marginTop: 16 * scaleX,
    borderWidth: 1,
    borderColor: PINK,
    borderRadius: 8 * scaleX,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  nameInput: {
    height: '100%',
    paddingHorizontal: 16 * scaleX,
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: INK,
  },
  frequentCasesTitle: {
    marginTop: 19 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  frequentCases: {
    marginTop: 7 * scaleX,
  },
  caseRow: {
    height: 46 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 40 * scaleX,
  },
  caseLabel: {
    flex: 1,
    marginLeft: 10 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
  },

  // Priority
  priorityTitle: {
    marginTop: 20 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: INK,
  },
  priorityBox: {
    marginTop: 9 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 15 * scaleX,
  },
  priorityBoxLabel: {
    marginLeft: 22 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  priorityOptions: {
    marginTop: 19 * scaleX,
    gap: 8 * scaleX,
  },
  priorityRow: {
    height: 46 * scaleX,
    borderRadius: 5 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14 * scaleX,
    paddingRight: 20 * scaleX,
  },
  priorityRowLabel: {
    flex: 1,
    marginLeft: 22 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
  },
  flagSlot: {
    width: 54 * scaleX,
    flexDirection: 'row',
    gap: 6 * scaleX,
  },

  // Cards
  card: {
    ...card,
    marginTop: 21 * scaleX,
    width: '100%',
  },
  cardHeader: {
    paddingHorizontal: 12 * scaleX,
  },
  cardRule: {
    height: 1,
    marginHorizontal: 2.75 * scaleX,
    backgroundColor: 'rgba(90, 117, 157, 0.09)',
  },

  // Add Photo
  addPhotoEmpty: {
    minHeight: 229 * scaleX,
    alignItems: 'center',
    paddingTop: 56 * scaleX,
    paddingBottom: 24 * scaleX,
  },
  addPhotoMark: {
    width: 55.4 * scaleX,
    height: 47 * scaleX,
  },
  // Figma 2186:2050: the "+" box starts 38 right of the frame and its
  // baseline lands ~6 below the frame's top; GradientText draws the baseline
  // at 1.2 x the font size (50.4) below its own top.
  addPhotoPlus: {
    position: 'absolute',
    left: 38 * scaleX,
    top: -44 * scaleX,
  },
  addPhotoPlusText: {
    fontSize: 42 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
  },
  addPhotoTitle: {
    marginTop: 10 * scaleX,
  },
  addPhotoTitleText: {
    fontSize: 19 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
  },
  addPhotoSubtitle: {
    marginTop: 2 * scaleX,
    width: 160 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    textAlign: 'center',
  },
  photosGridContainer: {
    padding: 16 * scaleX,
  },
  photosGridRow: {
    justifyContent: 'space-between',
    marginBottom: TWO_COL_GAP,
  },
  photoItem: {
    borderRadius: 8 * scaleX,
    overflow: 'hidden',
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
    borderWidth: 1,
    borderColor: 'rgba(90, 117, 157, 0.23)',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4 * scaleX,
  },
  addPhotoGridTitle: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
  },

  // Tag Staff (Figma 2385:987: 183 tall, rule at 65)
  tagStaffCard: {
    minHeight: 183 * scaleX,
    paddingTop: 13 * scaleX,
  },
  tagStaffTitle: {
    fontSize: 19 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  tagStaffSubtitle: {
    marginTop: 7 * scaleX,
    marginBottom: 10 * scaleX,
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#494747',
  },
  taggedStaffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14 * scaleX,
    paddingRight: 28 * scaleX,
    paddingTop: 22 * scaleX,
    paddingBottom: 24 * scaleX,
  },
  taggedStaffList: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 20 * scaleX,
    rowGap: 10 * scaleX,
  },
  staffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9 * scaleX,
    maxWidth: '100%',
  },
  staffAvatar: {
    width: 30 * scaleX,
    height: 30 * scaleX,
    borderRadius: 15 * scaleX,
    overflow: 'hidden',
    backgroundColor: INK,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 11 * scaleX,
    fontWeight: '700',
    color: '#ffffff',
  },
  staffName: {
    flexShrink: 1,
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: INK,
  },
  addStaffButton: {
    width: 53 * scaleX,
    height: 49 * scaleX,
    borderRadius: 41 * scaleX,
    backgroundColor: '#f1f6fc',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12 * scaleX,
  },
  addStaffText: {
    fontSize: 29 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: INK,
  },

  // Description (Figma 2373:524: 150 tall, rule at 54)
  descriptionCard: {
    marginTop: 26 * scaleX,
    minHeight: 150 * scaleX,
    paddingTop: 20 * scaleX,
  },
  descriptionLabel: {
    paddingLeft: 12 * scaleX,
    marginBottom: 17 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  descriptionBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 24 * scaleX,
    paddingRight: 17 * scaleX,
    paddingTop: 18 * scaleX,
    paddingBottom: 14 * scaleX,
  },
  descriptionInput: {
    flex: 1,
    minHeight: 60 * scaleX,
    maxWidth: 290 * scaleX,
    padding: 0,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    lineHeight: 18 * scaleX,
  },
  descriptionAIBadge: {
    width: 29 * scaleX,
    height: 30 * scaleX,
    borderRadius: 15 * scaleX,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f0d0e4',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginLeft: 'auto',
  },

  // Submit (Figma 2373:521: 386 x 70, square)
  submitButton: {
    height: 70 * scaleX,
    marginTop: 29 * scaleX,
    backgroundColor: INK,
    justifyContent: 'center',
    alignItems: 'center',
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
