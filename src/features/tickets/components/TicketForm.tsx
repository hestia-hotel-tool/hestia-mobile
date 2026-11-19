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
import UrgencyPicker, { urgencyToTicketPriority, type TicketUrgency } from './UrgencyPicker';
import { createTicket } from '../services/tickets';
import {
  getDepartments,
  departmentIconName,
  departmentGlyphHeight,
  sortDepartmentsByDisplayOrder,
} from '@/lib/departments';
import { Icon, type IconName } from '@/components/Icon';
import { fetchAssignableTicketStaff } from '../services/ticketAccess';
import { useAuth } from '@features/auth/hooks/useAuth';
import { useTicketDrafts, newDraftId, draftHasContent, type TicketDraft } from '../store/ticketDrafts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;
const TWO_COL_GAP = 12 * scaleX;

type Priority = TicketUrgency;

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
  /**
   * Space under Submit, inside the grey panel, so the panel runs to the end of
   * the scroll instead of leaving a white strip (keyboard room on Room Detail).
   */
  bottomInset?: number;
  /** Reopened from Tickets → Drafts: the form starts from it and keeps saving into it. */
  draft?: TicketDraft | null;
}

export default function TicketForm({
  roomNumber,
  roomId,
  departmentName = 'Engineering',
  publicAreaName,
  onSubmitSuccess,
  bottomInset = 100,
  draft = null,
}: TicketFormProps) {
  const isPublicArea = publicAreaName != null;
  const toast = useToast();

  // Drafts (Gmail-style): this user's, kept on this device.
  const { session } = useAuth();
  const loadDrafts = useTicketDrafts((st) => st.load);
  const saveDraft = useTicketDrafts((st) => st.save);
  const removeDraft = useTicketDrafts((st) => st.remove);
  const [draftId] = useState(() => draft?.id ?? newDraftId());
  /** Set once submitted, so the autosave never brings the ticket back as a draft. */
  const submittedRef = useRef(false);
  useEffect(() => {
    void loadDrafts(session?.user?.id);
  }, [loadDrafts, session?.user?.id]);

  // Form state
  const [ticketName, setTicketName] = useState(draft?.title ?? '');
  const [departments, setDepartments] = useState<DepartmentUiItem[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [assignedStaff, setAssignedStaff] = useState<string[]>(draft?.taggedStaffIds ?? []);
  const [priority, setPriority] = useState<Priority>(draft?.priority ?? 'high');
  const [pictures, setPictures] = useState<string[]>(draft?.pictures ?? []);
  const [photoGridWidth, setPhotoGridWidth] = useState<number | null>(null);
  const [description, setDescription] = useState(draft?.description ?? '');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [departmentStaff, setDepartmentStaff] = useState<User[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const descriptionInputRef = useRef<TextInput>(null);

  // If the department changes, previously tagged staff may no longer be valid.
  // Not on the first pick (the default, or the draft's own department): a
  // reopened draft keeps the people it had tagged.
  const lastDepartmentRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = lastDepartmentRef.current;
    lastDepartmentRef.current = selectedDepartmentId;
    if (prev !== null && prev !== selectedDepartmentId) setAssignedStaff([]);
  }, [selectedDepartmentId]);

  // Autosave: anything typed or attached is kept as a draft until submitted.
  // `pendingDraftRef` holds the edit the debounce has not written yet, so
  // leaving the form right after a keystroke still keeps it (flushed on unmount).
  const pendingDraftRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    return () => {
      pendingDraftRef.current?.();
      pendingDraftRef.current = null;
    };
  }, []);
  useEffect(() => {
    if (submittedRef.current) return;
    const content = { title: ticketName, description, pictures, taggedStaffIds: assignedStaff };
    const write = () => {
      pendingDraftRef.current = null;
      if (submittedRef.current) return;
      if (!draftHasContent(content)) {
        removeDraft(draftId);
        return;
      }
      saveDraft({
        id: draftId,
        updatedAt: new Date().toISOString(),
        roomId: isPublicArea ? undefined : roomId,
        roomNumber: isPublicArea ? undefined : roomNumber || undefined,
        isPublicArea,
        publicAreaName: isPublicArea ? (publicAreaName ?? undefined) : undefined,
        departmentId: selectedDepartmentId,
        priority,
        ...content,
      });
    };
    pendingDraftRef.current = write;
    const timer = setTimeout(write, 600);
    return () => clearTimeout(timer);
  }, [
    ticketName,
    description,
    pictures,
    assignedStaff,
    priority,
    selectedDepartmentId,
    draftId,
    saveDraft,
    removeDraft,
    isPublicArea,
    roomId,
    roomNumber,
    publicAreaName,
  ]);

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
          (draft?.departmentId ? mapped.find((m) => m.id === draft.departmentId) : undefined) ??
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
  }, [departmentName, draft?.departmentId]);

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
        priority: urgencyToTicketPriority(priority),
        departmentId: selectedDepartmentId,
        departmentName: selectedDepartmentName,
        assignedToId,
        taggedStaffIds: assignedStaff,
        roomId: isPublicArea ? null : (roomId ?? null),
        locationType: isPublicArea ? 'publicArea' : 'room',
        publicAreaName: isPublicArea ? publicAreaName : null,
        pictures,
      });

      submittedRef.current = true;
      removeDraft(draftId);
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

  const taggedStaff = departmentStaff.filter((staff) => assignedStaff.includes(staff.id));

  return (
    <View style={styles.formContainer}>
      {/* Department — every department as a pink disc, four to a row, in a
          white card (Figma 589:514, 4645:496). The chosen one fills red. */}
      <View style={styles.departmentSection}>
        <Text style={styles.selectDepartmentLabel}>Select Department</Text>
        <View style={styles.departmentGrid}>
          {departmentsLoading ? (
            <ActivityIndicator color={INK} style={styles.departmentGridLoading} />
          ) : (
            departments.map((dept) => {
              const chosen = dept.id === selectedDepartmentId;
              return (
                <TouchableOpacity
                  key={dept.id}
                  style={styles.departmentCell}
                  onPress={() => setSelectedDepartmentId(dept.id)}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityLabel={dept.name}
                  accessibilityState={{ selected: chosen }}
                >
                  <View style={[styles.departmentDisc, chosen && styles.departmentDiscChosen]}>
                    {dept.iconName ? (
                      <Icon
                        name={dept.iconName}
                        size={departmentGlyphHeight(dept.iconName) * scaleX}
                        color={chosen ? '#ffffff' : DEPT_RED}
                      />
                    ) : null}
                  </View>
                  <Text
                    style={[styles.departmentLabel, chosen && styles.departmentLabelChosen]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {dept.name}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>

      {/* 4649:471 — the grey panel everything else sits on. */}
      <View style={[styles.panel, { paddingBottom: bottomInset * scaleX }]}>
      {/* Issue — the field, then the frequent cases. */}
      <Text style={styles.nameHeading}>Whats the Issue?</Text>
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

      {/* Urgency — the choice in a pink frame; its chevron opens the three options. */}
      <Text style={styles.priorityTitle}>Urgency</Text>
      <UrgencyPicker value={priority} onChange={setPriority} initiallyOpen style={styles.priorityBox} />

      {/* Tag Staff */}
      <View style={[styles.card, styles.tagStaffCard]}>
        {/* 4649:558–567: title, hint, and the + disc top-right. */}
        <View style={[styles.cardHeader, styles.tagStaffHeader]}>
          <View style={styles.tagStaffHeading}>
            <Text style={styles.tagStaffTitle}>Tag Staff</Text>
            <Text style={styles.tagStaffSubtitle}>Tag people to the ticket</Text>
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
        </View>
      </View>

      {/* Photo and Description share one card — 4649:476 (386 x 400, rule at 304). */}
      <View style={[styles.card, styles.photoDescriptionCard]}>
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

        {/* Description — the whole text area under the rule is the field. */}
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
      </View>

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
/** Department glyphs (4630:148 …): red on the pink disc, white on the chosen one. */
const DEPT_RED = '#f92424';
const GUTTER = 26;

const card = {
  backgroundColor: '#f9fafc',
  borderWidth: 1,
  borderColor: 'rgba(90, 117, 157, 0.23)',
  borderRadius: 12 * scaleX,
} as const;

const styles = StyleSheet.create({
  formContainer: {
    width: '100%',
  },

  // Department (4645:496: label at x=9, the card 421 wide, discs 55.5 on a 114 pitch)
  departmentSection: {
    paddingHorizontal: 9.5 * scaleX,
    paddingTop: 27 * scaleX,
  },
  selectDepartmentLabel: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '300',
    color: '#000000',
    marginBottom: 13 * scaleX,
  },
  departmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 29 * scaleX,
    paddingVertical: 28 * scaleX,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8 * scaleX,
  },
  departmentGridLoading: {
    flex: 1,
    paddingVertical: 40 * scaleX,
  },
  departmentCell: {
    width: '25%',
    alignItems: 'center',
    paddingHorizontal: 2 * scaleX,
  },
  departmentDisc: {
    width: 55.5 * scaleX,
    height: 55.5 * scaleX,
    borderRadius: 28 * scaleX,
    backgroundColor: '#ffebeb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  departmentDiscChosen: {
    backgroundColor: DEPT_RED,
  },
  departmentLabel: {
    marginTop: 11 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '300',
    color: '#000000',
  },
  departmentLabelChosen: {
    fontWeight: '600',
  },

  /* 4649:471 — #F9FAFC, rounded on top, 18 under the department card. */
  panel: {
    marginTop: 18 * scaleX,
    paddingTop: 41 * scaleX,
    paddingHorizontal: GUTTER * scaleX,
    backgroundColor: '#f9fafc',
    borderTopLeftRadius: 24 * scaleX,
    borderTopRightRadius: 23 * scaleX,
  },

  // Name
  nameHeading: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#607aa1',
  },
  pinkBox: {
    height: 68 * scaleX,
    marginTop: 23 * scaleX,
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
  /* 4649:480 — the same heading as "Whats the Issue?". */
  priorityBox: {
    marginTop: 24 * scaleX,
  },
  priorityTitle: {
    marginTop: 23 * scaleX,
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#607aa1',
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
  /* 4649:572: the frame 75 down, the title 14 under it, the hint 9 under that; the Description label 72 below. */
  photoDescriptionCard: {
    marginTop: 30 * scaleX,
  },
  addPhotoEmpty: {
    alignItems: 'center',
    paddingTop: 75 * scaleX,
    paddingBottom: 72 * scaleX,
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
    marginTop: 14 * scaleX,
  },
  addPhotoTitleText: {
    fontSize: 19 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
  },
  addPhotoSubtitle: {
    marginTop: 7 * scaleX,
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
    marginTop: 22 * scaleX,
    minHeight: 183 * scaleX,
    paddingTop: 13 * scaleX,
  },
  tagStaffHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tagStaffHeading: {
    flex: 1,
    paddingLeft: 2 * scaleX,
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
    paddingRight: 14 * scaleX,
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
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: INK,
  },
  /* 4649:566 — a 45 #D9DFE9 disc, 11 down and 24 in from the card's right. */
  addStaffButton: {
    width: 45 * scaleX,
    height: 45 * scaleX,
    borderRadius: 22.5 * scaleX,
    backgroundColor: '#d9dfe9',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -2 * scaleX,
    marginRight: 12 * scaleX,
  },
  addStaffText: {
    fontSize: 29 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: INK,
  },

  // Description (4649:508: label 33 in, 17 above the rule; text 24 under it)
  descriptionLabel: {
    paddingLeft: 21 * scaleX,
    marginBottom: 17 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  descriptionBody: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingLeft: 33 * scaleX,
    paddingRight: 17 * scaleX,
    paddingTop: 24 * scaleX,
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
