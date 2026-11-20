import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  useLostAndFoundDrafts,
  newLostAndFoundDraftId,
  lostAndFoundDraftHasContent,
  type LostAndFoundDraft,
} from '../store/lostAndFoundDrafts';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { KeyboardDoneBar, KEYBOARD_DONE_BAR_ID } from '@/components/ui/KeyboardDoneBar';
import { MAX_PHOTOS, choosePhotoSource, pickPhotos, type PhotoSource } from '@/components/media/photoPicker';
import { SafeModal as Modal } from '@/components/ui/SafeModal';
import { SafeKeyboardAvoidingView as KeyboardAvoidingView } from '@/components/ui/SafeKeyboardAvoidingView';
import { useToast } from '@/contexts/ToastContext';
import { useMessageModal } from '@/contexts/MessageModalContext';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { REGISTER_FORM, scaleX } from '../constants/lostAndFoundStyles';
import { fetchStaffFromSupabase } from '@features/staff/services/staff';
import { useAuth } from '@features/auth/hooks/useAuth';
import { RoomSearchField } from '@features/rooms/components/roomPicker';
import { RoomListCard } from '@features/rooms/components/roomsList';
import { useRoomsStore } from '@features/rooms/store/useRoomsStore';
import type { RoomCardData } from '@features/rooms/types/allRooms.types';
import CreateTicketButton from '@features/tickets/components/CreateTicketButton';
import { AddPhotosField } from '@/components/media/AddPhotosField';
import { AddPhotoMark } from '@/components/media/AddPhotoMark';
import { GradientText } from '@/components/ui/GradientText';
import { useRoomPickerRooms } from '@features/rooms/hooks/useRoomPickerRooms';
import type { RoomPickerRoom } from '@features/rooms/types/roomPicker.types';
import { fetchPublicAreas } from '../services/lostAndFound';
import DatePickerModal from './DatePickerModal';
import TimePickerModal from './TimePickerModal';
import { AllStaffModal } from './StaffSelectorModal';
import { StaffPickerCard } from './register/StaffPickerCard';
import { RegisterStatusList } from './register/RegisterStatusList';
import { LocationDropdown, LOCATION_ROOM } from '@/components/ui/LocationDropdown';
import { StaffAvatar } from './StaffAvatar';
import { RegisterConfirmStep } from './RegisterConfirmStep';
import StatusDropdown, { type StatusOption } from './StatusDropdown';
import StoredLocationDropdown, { StoredLocationOption } from './StoredLocationDropdown';
import type { StaffMember } from '@features/staff/types/staff.types';
import { PERMISSIONS, usePermissions } from '@/domain/rbac';
import { fetchTicketAccess } from '@features/tickets/services/ticketAccess';
import { useStorageLocations } from '../hooks/useStorageLocations';
import { storedLocationLabel } from '../utils/storedLocations';

/** The three people step 2 names (Figma 4649:2427). */
type PersonField = 'found' | 'registered' | 'stored';

interface RegisterLostAndFoundModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedRoomId?: string;
  /** Reopened from Lost & Found → Drafts: the sheet starts from it and keeps saving into it. */
  draft?: LostAndFoundDraft | null;
  onNext?: (data: {
    /** The draft this registration came from; the screen deletes it once the item is saved. */
    draftId?: string;
    trackingNumber?: string;
    itemImage?: string;
    itemData: {
      title: string;
      notes: string;
      selectedLocation: 'room' | 'publicArea';
      selectedRoom?: any;
      selectedPublicArea?: string | null;
      foundedBy: string;
      registeredBy: string;
      /** Who stored it — Stored only (migration 20261119120000). */
      storedBy: string;
      status: StatusOption;
      storedLocation: StoredLocationOption;
      /** Step 3's "Send Email to Guest for reclamation?". Not persisted yet. */
      sendEmailToGuest: boolean;
      /** Prefilled from `guests.primary_email` when the box is ticked. Not persisted yet. */
      guestEmail?: string;
      selectedDate: Date;
      selectedHour: number;
      selectedMinute: number;
      pictures: string[];
    };
  }) => void;
}

export default function RegisterLostAndFoundModal({
  visible,
  onClose,
  preselectedRoomId,
  draft = null,
  onNext,
}: RegisterLostAndFoundModalProps) {
  const toast = useToast();
  const messageModal = useMessageModal();
  const [selectedLocation, setSelectedLocation] = useState<'room' | 'publicArea'>('room');
  // Default to current date and time
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const now = new Date();
    return now;
  });
  const [selectedHour, setSelectedHour] = useState(() => {
    const now = new Date();
    return now.getHours();
  });
  const [selectedMinute, setSelectedMinute] = useState(() => {
    const now = new Date();
    return now.getMinutes();
  });
  /** 0 = where it was found (Figma 733:7), 1–2 = the form (4649:2379 / 4649:2427), 3 = confirm (4649:3262). */
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  // Drafts (Gmail-style): this user's, kept on this device (store/lostAndFoundDrafts).
  const saveDraft = useLostAndFoundDrafts((st) => st.save);
  const removeDraft = useLostAndFoundDrafts((st) => st.remove);
  const draftIdRef = useRef<string>('');
  /** Set on Submit, so closing the sheet afterwards never brings the item back as a draft. */
  const submittedRef = useRef(false);
  /** The edit the debounce has not written yet — flushed when the sheet closes. */
  const pendingDraftRef = useRef<(() => void) | null>(null);

  /*
   * Rooms, and the picker that shows them, are shared with the ticket flow —
   * `RoomNumberSelector`, node 1102:3287 here and 3005:494 there. This file
   * used to carry its own `RoomSelection` shape, its own mapping of
   * `listRoomsWithReservationGuests` and its own copy of the card markup.
   *
   * The list is fetched while the sheet is open and dropped when it closes: a
   * reservation can change between two registrations, and the sheet should not
   * hold a stale guest list in the background.
   */
  const { rooms: allRooms, loading: roomsLoading } = useRoomPickerRooms(visible);
  /*
   * Departure rooms only (Figma 733:7 — the departing guest's room). Items
   * are found in rooms a guest is leaving; offering all 40 buried them. A
   * room this sheet was opened *from* (Room Detail) stays selectable whatever
   * its status — the user already chose it.
   */
  const rooms = useMemo(
    () => allRooms.filter((room) => room.isDeparture || room.id === preselectedRoomId),
    [allRooms, preselectedRoomId]
  );
  const [selectedPublicArea, setSelectedPublicArea] = useState<string | null>(null);

  /*
   * Public areas come from `public_areas`, not from a literal in this file.
   *
   * They used to be five strings compiled into the app and duplicated in
   * `SelectTicketLocationScreen` — a description of a *building*, identical for
   * every tenant, unchangeable without a release. A hotel with no gym still
   * offered Gym.
   */
  const [publicAreas, setPublicAreas] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    fetchPublicAreas()
      .then((areas) => {
        if (!cancelled) setPublicAreas(areas);
      })
      .catch((e) => {
        if (__DEV__) console.warn('[RegisterLostAndFound] Failed to load public areas', e);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  /*
   * Nothing is selected until the user picks a room.
   *
   * This used to fall back to `rooms[0]`, which meant an item registered by
   * someone who never opened the picker was filed against whichever room
   * sorted first — Room 101, and a real guest's name against it. Step 1 now
   * refuses to advance without a location instead, the way the ticket flow
   * gates its Continue button.
   */
  const [selectedRoom, setSelectedRoom] = useState<RoomPickerRoom | null>(null);
  
  // Step 2 state
  const [showStoredLocationDropdown, setShowStoredLocationDropdown] = useState(false);
  const [foundedBy, setFoundedBy] = useState<string>(''); 
  const [registeredBy, setRegisteredBy] = useState<string>('');
  const [storedBy, setStoredBy] = useState<string>('');
  /** Which person's inline picker is open (Figma 4649:2427), and which one "see all" is choosing for. */
  const [openPicker, setOpenPicker] = useState<PersonField | null>(null);
  const [seeAllFor, setSeeAllFor] = useState<PersonField | null>(null);
  const [status, setStatus] = useState<StatusOption>('stored');
  const [storedLocation, setStoredLocation] = useState<StoredLocationOption>('hskOffice');
  // The hotel's locations (migration 20261026300000).
  const { active: activeStorage } = useStorageLocations();
  const storageOptions = useMemo(() => activeStorage.map((l) => ({ value: l.key, label: l.label })), [activeStorage]);
  // A retired or renamed-away default: start on the hotel's first location instead.
  useEffect(() => {
    if (storageOptions.length > 0 && !storageOptions.some((o) => o.value === storedLocation)) {
      setStoredLocation(storageOptions[0].value);
    }
  }, [storageOptions, storedLocation]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  /*
   * The signed-in user, straight off the session. Found by and Registered by
   * both default to them — Figma 733:192. This used to be fetched separately
   * after the sheet opened and, until it landed, the defaults fell back to
   * `staff[0]`: whichever colleague sorted first.
   */
  const { session } = useAuth();
  const currentUserId = session?.user?.id ?? null;
  /*
   * Housekeeping line staff (room attendants, porters, laundry, public area —
   * no lost_and_found.read_all) register items as themselves: Found by and
   * Registered by are fixed to them, no picker (client change, 2026-10-26;
   * enforced by migration 20261026260000).
   */
  const peopleLocked = !usePermissions().can(PERMISSIONS.LOST_AND_FOUND_READ_ALL);
  const sessionProfile = session?.user?.user_metadata as
    | { full_name?: string; name?: string; avatar_url?: string }
    | undefined;
  
  // Pictures state
  const [pictures, setPictures] = useState<string[]>([]);
  
  // Step 3 state
  const [sendEmailToGuest, setSendEmailToGuest] = useState(false);
  /**
   * The address the reclamation email would go to — Figma 733:448's field.
   * Filled from the guest's `primary_email` when the box is ticked; editable.
   */
  const [guestEmail, setGuestEmail] = useState('');

  // Validation state
  const [showPictureError, setShowPictureError] = useState(false);
  const [showTitleError, setShowTitleError] = useState(false);
  
  /*
   * Reset the form when the sheet opens — and only then.
   *
   * This used to also depend on `staff` and `currentUserId`, which load
   * asynchronously *after* the sheet is already open. When they landed the
   * effect re-ran mid-entry: back to step 1, title, notes, photos and the
   * chosen public area wiped. The staff defaults now live in their own effect
   * below, which only fills a blank.
   */
  useEffect(() => {
    if (!visible) return;
    draftIdRef.current = draft?.id ?? newLostAndFoundDraftId();
    submittedRef.current = false;
    setCurrentStep(0);
    setSendEmailToGuest(false);
    setGuestEmail('');
    setPictures([]);
    setShowPictureError(false);
    setShowTitleError(false);
    setSelectedPublicArea(null);
    // Each item starts fresh: last time's room, status and storage place
    // carried over, and a room no longer in the departure list could be
    // submitted unnoticed. The preselect effect below sets a given room.
    setSelectedLocation('room');
    setSelectedRoom(null);
    setStatus('stored');
    setStoredLocation('hskOffice');
    setTitle('');
    setNotes('');
    setFoundedBy(currentUserId ?? '');
    setRegisteredBy(currentUserId ?? '');
    setStoredBy(currentUserId ?? '');
    setOpenPicker(null);
    setSeeAllFor(null);
    // A draft picks up where it was left (Lost & Found → Drafts).
    if (draft) {
      setCurrentStep(Math.min(Math.max(draft.step ?? 0, 0), 3));
      setSelectedLocation(draft.selectedLocation);
      setSelectedRoom(draft.selectedRoom);
      setSelectedPublicArea(draft.selectedPublicArea);
      const found = new Date(draft.foundAt);
      if (Number.isFinite(found.getTime())) {
        setSelectedDate(found);
        setSelectedHour(found.getHours());
        setSelectedMinute(found.getMinutes());
      }
      setTitle(draft.title);
      setNotes(draft.notes);
      if (draft.foundedBy) setFoundedBy(draft.foundedBy);
      if (draft.registeredBy) setRegisteredBy(draft.registeredBy);
      if (draft.storedBy) setStoredBy(draft.storedBy);
      setStatus(draft.status as StatusOption);
      setStoredLocation(draft.storedLocation as StoredLocationOption);
      setPictures(draft.pictures);
      setSendEmailToGuest(draft.sendEmailToGuest);
      setGuestEmail(draft.guestEmail);
    }
    // Deliberately keyed on opening alone — see above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /*
   * Housekeeping (Supervisor, Executive Housekeepers) picks Found by /
   * Registered by from Housekeeping only (client change, 2026-10-26; enforced
   * by migration 20261026280000). Other departments keep everyone — a front
   * desk registers what a housekeeper found — as does the Hotel Manager.
   */
  const [pickerDepartment, setPickerDepartment] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchTicketAccess(currentUserId).then((a) => {
      if (cancelled) return;
      const hsk = (a.departmentName ?? '').trim().toLowerCase() === 'housekeeping';
      setPickerDepartment(hsk && !a.hotelWide ? a.departmentName : null);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);
  const pickerStaff = useMemo(
    () =>
      pickerDepartment
        ? staff.filter((m) => (m.department ?? '').trim().toLowerCase() === pickerDepartment.trim().toLowerCase())
        : staff,
    [staff, pickerDepartment]
  );

  // The staff list backs the two pickers; the defaults above do not wait for it.
  // Loaded the first time the sheet opens: it is always mounted, and fetching
  // on mount downloaded every user on each visit to Lost & Found.
  useEffect(() => {
    if (!visible || staff.length > 0) return;
    let cancelled = false;
    fetchStaffFromSupabase()
      .then((rows) => {
        if (!cancelled) setStaff(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, staff.length]);

  /*
   * Room Detail's "register a found item" entry passes the room it was opened
   * from. It can only be honoured once the list has arrived, so this waits for
   * `rooms` rather than running with the sheet.
   */
  useEffect(() => {
    if (!visible || !preselectedRoomId) return;
    const matchedRoom = rooms.find((room) => room.id === preselectedRoomId);
    if (!matchedRoom) return;
    setSelectedLocation('room');
    setSelectedPublicArea(null);
    setSelectedRoom(matchedRoom);
  }, [visible, preselectedRoomId, rooms]);

  // The camera, or several at once from the library — up to MAX_PHOTOS in all.
  const handleAddPicture = () => choosePhotoSource((source) => void addPictures(source));
  const addPictures = async (source: PhotoSource) => {
    setShowPictureError(false);
    const result = await pickPhotos(source, MAX_PHOTOS - pictures.length);
    if ('error' in result) {
      toast.show(result.error, { type: 'error', title: 'Photos' });
      return;
    }
    if (result.uris.length > 0) setPictures((prev) => [...prev, ...result.uris].slice(0, MAX_PHOTOS));
  };

  // Handle removing a picture
  const handleRemovePicture = (index: number) => {
    messageModal.show({
      title: 'Remove Picture',
      message: 'Are you sure you want to remove this picture?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setPictures(pictures.filter((_, i) => i !== index)),
        },
      ],
    });
  };
  
  // Refs for measuring input field positions
  const scrollViewRef = useRef<ScrollView>(null);
  /** Live scroll offset, so a dropdown's scroll correction is relative to it. */
  const scrollOffsetRef = useRef(0);
  const storedLocationFieldRef = useRef<View>(null);
  const statusPillRef = useRef<View>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [statusPillPosition, setStatusPillPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // Input field positions for dropdown positioning
  const [storedLocationFieldPosition, setStoredLocationFieldPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // Helper function to measure field position and scroll if needed
  const measureFieldPosition = (
    ref: React.RefObject<View | null>,
    setPosition: (pos: { x: number; y: number; width: number; height: number }) => void,
    onComplete?: () => void,
    /** How tall the dropdown about to open is, in real px. */
    dropdownHeight: number = REGISTER_FORM.step2.locationDropdown.modal.maxHeight * scaleX
  ) => {
    if (ref.current) {
      ref.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        const fieldBottom = y + height;
        const screenHeight = Dimensions.get('window').height;
        const modalHeight = dropdownHeight;
        const spacing = 10 * scaleX; // Gap between field and modal
        const bottomPadding = 20 * scaleX; // Extra padding at bottom to ensure modal is fully visible
        
        // Calculate if modal would be off-screen
        const modalTop = fieldBottom + spacing;
        const modalBottom = modalTop + modalHeight;
        // Available space is from header to bottom of screen, minus padding
        const availableSpace = screenHeight - bottomPadding;
        
        // If modal would extend beyond visible area, scroll to position field higher
        if (modalBottom > availableSpace && scrollViewRef.current) {
          // Calculate how much we need to scroll
          // We want the modal to fit fully on screen with padding
          // Calculate desired position: field should be high enough that modal fits
          // desiredFieldBottom + spacing + modalHeight <= availableSpace
          // desiredFieldBottom <= availableSpace - spacing - modalHeight
          const maxAllowedFieldBottom = availableSpace - spacing - modalHeight;
          const desiredFieldY = maxAllowedFieldBottom - height - 50 * scaleX; // Extra padding from top
          // Relative to where the form is scrolled now, not to its top.
          const scrollY = Math.max(0, scrollOffsetRef.current + (y - desiredFieldY));
          
          scrollViewRef.current.scrollTo({
            y: scrollY,
            animated: true,
          });
          
          // Wait for scroll animation, then measure again
          setTimeout(() => {
            if (ref.current) {
              ref.current.measureInWindow((newX: number, newY: number, newWidth: number, newHeight: number) => {
                setPosition({ x: newX, y: newY, width: newWidth, height: newHeight });
                if (onComplete) onComplete();
              });
            }
          }, 350); // Wait for scroll animation (slightly longer for smoother transition)
        } else {
          setPosition({ x, y, width, height });
          if (onComplete) onComplete();
        }
      });
    }
  };

  // Format date as "11 November 2025"
  const formatDate = (date: Date): string => {
    const day = date.getDate();
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Format time as "15:00"
  const formatTime = (hour: number, minute: number): string => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const handleDateConfirm = (date: Date) => {
    setSelectedDate(date);
  };

  const handleTimeConfirm = (hour: number, minute: number) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
  };

  /*
   * Step 1 needs a title and something to recognise the item by: a photo OR a
   * description (Notes) — either is enough (client change, 2026-10-26).
   */
  const hasPhotoOrDescription = pictures.length > 0 || notes.trim().length > 0;
  const step1Incomplete = title.trim() === '' || !hasPhotoOrDescription;

  /*
   * Autosave while the sheet is open: anything typed or photographed is kept as
   * a draft until the item is registered. Debounced; the last edit is flushed
   * when the sheet closes, so backing out right after typing still keeps it.
   */
  useEffect(() => {
    if (!visible || submittedRef.current || !draftIdRef.current) return;
    const id = draftIdRef.current;
    const write = () => {
      pendingDraftRef.current = null;
      if (submittedRef.current) return;
      if (!lostAndFoundDraftHasContent({ title, notes, pictures })) {
        removeDraft(id);
        return;
      }
      const foundAt = new Date(selectedDate);
      foundAt.setHours(selectedHour, selectedMinute, 0, 0);
      saveDraft({
        id,
        updatedAt: new Date().toISOString(),
        step: currentStep,
        selectedLocation,
        selectedRoom: selectedLocation === 'room' ? selectedRoom : null,
        selectedPublicArea: selectedLocation === 'publicArea' ? selectedPublicArea : null,
        foundAt: foundAt.toISOString(),
        title,
        notes,
        foundedBy,
        registeredBy,
        storedBy,
        status,
        storedLocation,
        pictures,
        sendEmailToGuest,
        guestEmail,
      });
    };
    pendingDraftRef.current = write;
    const timer = setTimeout(write, 600);
    return () => clearTimeout(timer);
  }, [
    visible,
    currentStep,
    selectedLocation,
    selectedRoom,
    selectedPublicArea,
    selectedDate,
    selectedHour,
    selectedMinute,
    title,
    notes,
    foundedBy,
    registeredBy,
    storedBy,
    status,
    storedLocation,
    pictures,
    sendEmailToGuest,
    guestEmail,
    saveDraft,
    removeDraft,
  ]);
  // Closing (or unmounting): write the edit the debounce was still holding.
  useEffect(() => {
    if (visible) return;
    pendingDraftRef.current?.();
    pendingDraftRef.current = null;
  }, [visible]);
  useEffect(
    () => () => {
      pendingDraftRef.current?.();
      pendingDraftRef.current = null;
    },
    []
  );

  const handleNext = () => {
    if (currentStep === 0) {
      /*
       * Where the item was found is the one fact a Lost & Found record cannot
       * be useful without — it is how the guest who lost it is traced. Step 1
       * used to check only the title, and the room came pre-filled with
       * whichever room sorted first, so this was never reachable; with that
       * fallback gone, it has to be asked for.
       */
      if (selectedLocation === 'room' && !selectedRoom) {
        toast.show('Choose the room the item was found in', {
          type: 'error',
          title: 'Missing location',
        });
        return;
      }
      if (selectedLocation === 'publicArea' && !selectedPublicArea) {
        toast.show('Choose the area the item was found in', {
          type: 'error',
          title: 'Missing location',
        });
        return;
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      const isTitleValid = title.trim().length > 0;
      if (!isTitleValid) {
        setShowTitleError(true);
        toast.show('Title is required', { type: 'error', title: 'Missing title' });
        return;
      }
      setShowTitleError(false);
      if (!hasPhotoOrDescription) {
        setShowPictureError(true);
        toast.show('Add a photo or a description of the item', { type: 'error', title: 'Missing details' });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Submit; tracking number is assigned by DB (trigger)
      if (onNext) {
        submittedRef.current = true;
        pendingDraftRef.current = null;
        onNext({
          draftId: draftIdRef.current || undefined,
          itemImage: pictures.length > 0 ? pictures[0] : undefined,
          itemData: {
            title,
            notes,
            selectedLocation,
            selectedRoom: selectedLocation === 'room' ? selectedRoom : undefined,
            selectedPublicArea: selectedLocation === 'publicArea' ? selectedPublicArea : undefined,
            // Line staff are always both, whatever the form state says.
            foundedBy: peopleLocked ? currentUserId ?? foundedBy : foundedBy,
            registeredBy: peopleLocked ? currentUserId ?? registeredBy : registeredBy,
            storedBy: peopleLocked ? currentUserId ?? storedBy : storedBy,
            status,
            storedLocation,
            sendEmailToGuest,
            guestEmail: guestEmail.trim() || undefined,
            selectedDate,
            selectedHour,
            selectedMinute,
            pictures,
          },
        });
      }
      // Parent handles closing + success flow (avoids iOS modal race).
    }
  };

  /** The signed-in user can be shown before the staff list has arrived. */
  const isMe = (staffId: string) => !!staffId && staffId === currentUserId;

  const getStaffName = (staffId: string): string =>
    staff.find((s) => s.id === staffId)?.name ??
    (isMe(staffId) ? sessionProfile?.full_name ?? sessionProfile?.name ?? 'Me' : 'Unknown');

  const getStaffDepartment = (staffId: string): string =>
    staff.find((s) => s.id === staffId)?.department ?? 'HSK';

  const getStaffAvatar = (staffId: string) =>
    staff.find((s) => s.id === staffId)?.avatar ??
    (isMe(staffId) ? sessionProfile?.avatar_url : undefined);

  // Get status label
  const getStatusLabel = (status: StatusOption): string => {
    const labels: { [key: string]: string } = {
      stored: 'Stored',
      shipped: 'Shipped',
      discarded: 'Discarded',
    };
    return labels[status] || 'Stored';
  };

  // The hotel's own name for a location (Account → Lost & Found storage).
  const getLocationLabel = (location: StoredLocationOption): string => storedLocationLabel(location);

  /* Step 2's location dropdown: "Room" or one of the hotel's public areas. */
  const locationOptions = useMemo(() => [LOCATION_ROOM, ...publicAreas], [publicAreas]);
  const locationValue = selectedLocation === 'room' ? LOCATION_ROOM : selectedPublicArea ?? LOCATION_ROOM;
  const locationChosen = selectedLocation === 'room' ? !!selectedRoom : !!selectedPublicArea;
  /*
   * Results are the Rooms list's own card (733:7), which needs the list's card
   * data. Loaded once if nobody has yet; never refetched over a list the Rooms
   * tab already holds — the same as Create Ticket → Select Location.
   */
  const roomsData = useRoomsStore((st) => st.data);
  const fetchRoomCards = useRoomsStore((st) => st.fetchRooms);
  useEffect(() => {
    if (visible && !useRoomsStore.getState().data) void fetchRoomCards();
  }, [visible, fetchRoomCards]);
  const cardsById = useMemo(() => {
    const map = new Map<string, RoomCardData>();
    const list = roomsData?.selectedShift === 'PM' ? roomsData.roomsPM ?? roomsData.rooms : roomsData?.rooms ?? [];
    for (const r of list) map.set(r.id, r);
    return map;
  }, [roomsData]);
  const renderRoomResult = (room: RoomPickerRoom, choose: () => void) => {
    const card = cardsById.get(room.id);
    return card ? <RoomListCard room={card} onPress={choose} /> : null;
  };
  const chooseLocation = (value: string) => {
    if (value === LOCATION_ROOM) {
      setSelectedLocation('room');
      setSelectedPublicArea(null);
    } else {
      setSelectedLocation('publicArea');
      setSelectedPublicArea(value);
      setSelectedRoom(null);
    }
  };

  const personFor: Record<PersonField, { id: string; set: (id: string) => void; title: string }> = {
    found: { id: foundedBy, set: setFoundedBy, title: 'Found by' },
    registered: { id: registeredBy, set: setRegisteredBy, title: 'Registered by' },
    stored: { id: storedBy, set: setStoredBy, title: 'Stored by' },
  };
  const togglePicker = (field: PersonField) => setOpenPicker((open) => (open === field ? null : field));
  const pickPerson = (field: PersonField, id: string) => {
    personFor[field].set(id);
    setOpenPicker(null);
    setSeeAllFor(null);
  };
  const meInPicker = pickerStaff.find((m) => m.id === currentUserId);
  const renderPicker = (field: PersonField) =>
    openPicker === field && !peopleLocked ? (
      <StaffPickerCard
        staff={pickerStaff}
        selectedId={personFor[field].id}
        onPick={(id) => pickPerson(field, id)}
        onSeeAll={() => setSeeAllFor(field)}
        style={field === 'stored' ? styles.pickerCardStored : styles.pickerCard}
      />
    ) : null;
  /** A person row in the grey panel — 4649:2560: avatar 36, name, "me" under it, Edit. */
  const renderPersonRow = (field: PersonField, rowStyle: object) => {
    const id = personFor[field].id;
    return (
      <View style={[styles.personRow, rowStyle]}>
        <StaffAvatar name={getStaffName(id)} avatar={getStaffAvatar(id)} size={36 * scaleX} />
        <View style={styles.personText}>
          <Text style={styles.personName} numberOfLines={1}>
            {getStaffName(id)}
          </Text>
          {isMe(id) ? <Text style={styles.personMe}>me</Text> : null}
        </View>
        {peopleLocked ? null : (
          <TouchableOpacity
            onPress={() => togglePicker(field)}
            hitSlop={10}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${personFor[field].title}`}
            accessibilityState={{ expanded: openPicker === field }}
          >
            <Text style={styles.personEdit}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      transparent={false}
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBackground} />
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            {/* Node 3128:123 — 14x28. `action-chevron`'s aspect is exactly 0.5. */}
            <Icon name="action-chevron" size={REGISTER_FORM.header.backButton.height * scaleX} color="#607AA1" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lost & Found</Text>
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          // On Android, offset by header height so focused inputs (e.g. Notes)
          // can scroll above the keyboard reliably.
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : REGISTER_FORM.header.height * scaleX}
        >
          <ScrollView
            ref={scrollViewRef}
            onScroll={(e) => {
              scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/*
              4649:2381 / 4649:2382 — "Register" and the "1/2" counter, Bold 16;
              4649:2383 — one 3-tall track, filled 237 of 397 on step 1. The
              location moved to step 2 (user, 2026-11-19), so the form is two
              steps plus the confirm page.
            */}
            {currentStep === 0 ? null : currentStep === 3 ? (
              /* 4649:3318 — a 9 x 18 chevron at x=25 back to step 2, "Confirm and submit" Bold 16 at x=49. */
              <TouchableOpacity
                style={styles.confirmHeading}
                onPress={() => setCurrentStep(2)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Back to step 2"
              >
                <Icon name="action-chevron" size={18 * scaleX} color="#000000" />
                <Text style={[styles.title, styles.confirmHeadingText]}>Confirm and submit</Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>Register</Text>
                  <Text style={styles.title}>{`${currentStep}/2`}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, currentStep === 1 && styles.progressFillHalf]} />
                </View>
              </>
            )}

          {/*
            Step 0 — Figma 733:7, the page Register opens on: the "Register
            Item" AI pill, "Where did you find the Item?" as Create Ticket's
            location dropdown, then the room search on the #f9fafc panel with
            results drawn as the Rooms list's cards.
          */}
          {currentStep === 0 && (
            <>
              <View style={styles.aiPill}>
                <CreateTicketButton label="Register Item" scaleX={scaleX} />
              </View>
              <Text style={styles.whereLabel}>Where did you find the Item?</Text>
              <LocationDropdown
                value={locationValue}
                options={locationOptions}
                onChange={chooseLocation}
                style={styles.whereDropdown}
              />
              {/* 4649:2092 — the panel, rounded on top, running to the bottom. */}
              <View style={styles.wherePanel}>
                {selectedLocation === 'room' ? (
                  <RoomSearchField
                    rooms={rooms}
                    loading={roomsLoading}
                    value={selectedRoom}
                    onChange={(room) => {
                      // A new room is a new guest: drop the previous guest's address.
                      if (room?.id !== selectedRoom?.id) {
                        setSendEmailToGuest(false);
                        setGuestEmail('');
                      }
                      setSelectedRoom(room);
                    }}
                    scaleX={scaleX}
                    renderResult={renderRoomResult}
                  />
                ) : null}
                <TouchableOpacity
                  style={[styles.nextButton, styles.nextButtonStep0, !locationChosen && styles.nextButtonDisabled]}
                  onPress={handleNext}
                  disabled={!locationChosen}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <Text style={[styles.nextButtonText, !locationChosen && styles.nextButtonTextDisabled]}>Next</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step 1 — Figma 4649:2379: date and time, the item's name, photos and notes. */}
          {currentStep === 1 && (
            <View style={styles.step1}>
              <Text style={[styles.step1Label, styles.step1LabelDate]}>Date and time</Text>
              {/* 4649:2380 — a #a3a0a0 9% bar, 402 x 52; date and time at 39%, "Edit" in blue. */}
              <View style={styles.dateTimeBar}>
                <TouchableOpacity
                  style={styles.dateSlot}
                  activeOpacity={0.7}
                  onPress={() => setShowDatePicker(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Date: ${formatDate(selectedDate)}`}
                >
                  <Text style={styles.dateTimeText}>{formatDate(selectedDate)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timeSlot}
                  activeOpacity={0.7}
                  onPress={() => setShowTimePicker(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Time: ${formatTime(selectedHour, selectedMinute)}`}
                >
                  <Text style={styles.dateTimeText}>{formatTime(selectedHour, selectedMinute)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Edit date and time"
                >
                  <Text style={styles.dateTimeEdit}>Edit</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.step1Label, styles.step1LabelName]}>Name item</Text>
              <View style={[styles.titleInputContainer, showTitleError && styles.titleInputError]}>
                <TextInput
                  style={styles.titleInput}
                  placeholder="Wrist Watch"
                  placeholderTextColor="#9ca3af"
                  value={title}
                  onChangeText={(v) => {
                    setTitle(v);
                    if (showTitleError && v.trim().length > 0) setShowTitleError(false);
                  }}
                  returnKeyType="done"
                  accessibilityLabel="Name item"
                />
              </View>

              <Text style={[styles.step1Label, styles.step1LabelPhotos]}>Photos and Notes</Text>
              {/*
                4649:2399 — one 406 x 400 card (#f9fafc, #5a759d 23% outline,
                radius 12) holding the photos and, under the rule at 304, the
                description. The same card as Create Ticket's (4649:476).
              */}
              <View style={[styles.photosCard, showPictureError && styles.photosCardError]}>
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
                  <View style={styles.photosGrid}>
                    <AddPhotosField photos={pictures} onAdd={handleAddPicture} onRemove={handleRemovePicture} />
                  </View>
                )}

                {/* A photo or a description is enough (client change): optional once there is a photo. */}
                <Text style={styles.descriptionLabel}>
                  {pictures.length > 0 ? 'Description (optional)' : 'Description (or add a photo)'}
                </Text>
                <View style={styles.descriptionRule} />
                <TextInput
                  style={styles.descriptionInput}
                  value={notes}
                  onChangeText={(v) => {
                    setNotes(v);
                    if (showPictureError && v.trim().length > 0) setShowPictureError(false);
                  }}
                  multiline
                  textAlignVertical="top"
                  inputAccessoryViewID={KEYBOARD_DONE_BAR_ID}
                  placeholder="Wrist watch found in the guest bathroom while cleaning."
                  placeholderTextColor="rgba(90, 117, 157, 0.5)"
                  accessibilityLabel="Description"
                />
                <KeyboardDoneBar />
              </View>
            </View>
          )}

          {/*
            Step 2 — Figma 4649:2427: Found by and Registered by in one grey
            panel (each with an inline picker under its Edit), then Status.
          */}
          {currentStep === 2 && (
            <View style={styles.step2}>
              <Text style={[styles.step1Label, styles.step1LabelDate]}>Found by:</Text>
              {/* 4649:2428 — x=21, 402 wide, #a3a0a0 9%, radius 8. */}
              <View style={styles.peoplePanel}>
                {renderPersonRow('found', styles.personRowFound)}
                {renderPicker('found')}
                <Text style={[styles.step1Label, styles.registeredLabel]}>Registered by</Text>
                {renderPersonRow('registered', styles.personRowRegistered)}
                {renderPicker('registered')}
              </View>

              <Text style={[styles.step1Label, styles.statusLabel]}>Status</Text>
              <RegisterStatusList
                status={status}
                onChange={setStatus}
                storedHint={storageOptions.length > 0 ? storageOptions.map((o) => o.label).join(', ') : undefined}
                storedLocationLabel={getLocationLabel(storedLocation)}
                storedLocationRef={storedLocationFieldRef}
                onPressStoredLocation={() => {
                  measureFieldPosition(storedLocationFieldRef, setStoredLocationFieldPosition, () => {
                    setShowStoredLocationDropdown(true);
                  });
                }}
                storedBy={{
                  name: getStaffName(storedBy),
                  avatar: getStaffAvatar(storedBy),
                  department: getStaffDepartment(storedBy),
                }}
                storedByLocked={peopleLocked}
                onPressStoredBy={() => togglePicker('stored')}
                storedByPicker={renderPicker('stored')}
              />
            </View>
          )}

          {/* Step 3 — Confirm and submit (Figma 4649:3262) */}
          {currentStep === 3 && (
            <RegisterConfirmStep
              title={title.trim()}
              foundDate={formatDate(selectedDate)}
              foundTime={formatTime(selectedHour, selectedMinute)}
              photo={pictures[0]}
              location={selectedLocation}
              room={selectedRoom}
              publicArea={selectedPublicArea}
              foundedBy={{ name: getStaffName(foundedBy), avatar: getStaffAvatar(foundedBy) }}
              registeredBy={{ name: getStaffName(registeredBy), avatar: getStaffAvatar(registeredBy) }}
              storedBy={{ name: getStaffName(storedBy), avatar: getStaffAvatar(storedBy) }}
              statusLabel={getStatusLabel(status)}
              statusKey={status === 'shipped' || status === 'discarded' ? status : 'stored'}
              storedLocationLabel={getLocationLabel(storedLocation)}
              statusRef={statusPillRef}
              onPressStatus={() => {
                measureFieldPosition(statusPillRef, setStatusPillPosition, () => setShowStatusDropdown(true));
              }}
            />
          )}

          {/* Next/Submit — step 0 draws its own on the panel. */}
          {currentStep === 0 ? null : (
          <TouchableOpacity
            style={[
              styles.nextButton,
              currentStep === 1 && styles.nextButtonStep1,
              currentStep === 2 && styles.nextButtonStep2,
              currentStep === 3 && styles.nextButtonStep3,
              (currentStep === 1 &&
                step1Incomplete) &&
                styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            activeOpacity={0.7}
            disabled={currentStep === 1 && step1Incomplete}
          >
            <Text
              style={[
                styles.nextButtonText,
                (currentStep === 1 &&
                  step1Incomplete) &&
                  styles.nextButtonTextDisabled,
              ]}
            >
              {currentStep === 3 ? 'Submit' : 'Next'}
            </Text>
          </TouchableOpacity>
          )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Date Picker Modal */}
        <DatePickerModal
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onConfirm={handleDateConfirm}
          initialDate={selectedDate}
        />

        {/* Time Picker Modal */}
        <TimePickerModal
          visible={showTimePicker}
          onClose={() => setShowTimePicker(false)}
          onConfirm={handleTimeConfirm}
          initialHour={selectedHour}
          initialMinute={selectedMinute}
        />

        {/* Step 2 — "see all" from an inline picker: everyone, full screen, with search. */}
        <AllStaffModal
          visible={seeAllFor !== null}
          title={seeAllFor ? personFor[seeAllFor].title : ''}
          me={meInPicker}
          others={pickerStaff.filter((m) => m.id !== currentUserId)}
          selectedStaffId={seeAllFor ? personFor[seeAllFor].id : undefined}
          onPick={(id) => seeAllFor && pickPerson(seeAllFor, id)}
          onBack={() => setSeeAllFor(null)}
        />
        {/* Step 3 — the status pill's choice. */}
        <StatusDropdown
          visible={showStatusDropdown}
          onClose={() => setShowStatusDropdown(false)}
          onSelect={setStatus}
          selectedStatus={status}
          inputFieldPosition={statusPillPosition}
        />
        <StoredLocationDropdown
          visible={showStoredLocationDropdown}
          onClose={() => setShowStoredLocationDropdown(false)}
          onSelect={setStoredLocation}
          selectedLocation={storedLocation}
          inputFieldPosition={storedLocationFieldPosition}
          options={storageOptions}
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
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    position: 'relative',
    height: REGISTER_FORM.header.height * scaleX,
    zIndex: 10,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: REGISTER_FORM.header.height * scaleX,
    backgroundColor: REGISTER_FORM.header.backgroundColor,
  },
  backButton: {
    position: 'absolute',
    left: REGISTER_FORM.header.backButton.left * scaleX,
    top: REGISTER_FORM.header.backButton.top * scaleX,
    width: REGISTER_FORM.header.backButton.width * scaleX,
    height: REGISTER_FORM.header.backButton.height * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
  },
  headerTitle: {
    position: 'absolute',
    left: REGISTER_FORM.header.title.left * scaleX,
    top: REGISTER_FORM.header.title.top * scaleX,
    fontSize: REGISTER_FORM.header.title.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.header.title.fontWeight as any,
    color: REGISTER_FORM.header.title.color,
    zIndex: 11,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // 4649:2381 — "Register" at y=153, 20 under the header.
    paddingTop: 20 * scaleX,
    paddingHorizontal: 27 * scaleX,
    // Extra space so Notes can scroll above keyboard (iOS + Android)
    paddingBottom: 240 * scaleX,
  },
  /* "Register" at x=25, "1/2" ending at x=422 — the content box is 27..413. */
  /* Chevron at x=25, text at x=49, 8 lower than step 1's title (y=161). */
  confirmHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8 * scaleX,
    marginLeft: -2 * scaleX,
  },
  confirmHeadingText: {
    marginLeft: 15 * scaleX,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: -2 * scaleX,
    marginRight: -9 * scaleX,
  },
  title: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  /* 4649:2383 — x=26, 397 wide, 3 tall, 19 under the title; square ends. */
  progressTrack: {
    width: 397 * scaleX,
    height: 3 * scaleX,
    marginLeft: -1 * scaleX,
    marginTop: 19 * scaleX,
    // The track ends at y=193; "Date and time" starts at y=216.
    marginBottom: 23 * scaleX,
    backgroundColor: REGISTER_FORM.progressBar.inactiveColor,
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: REGISTER_FORM.progressBar.activeColor,
  },
  progressFillHalf: {
    width: 237 * scaleX,
  },
  /* Step 1 runs x=17..423 (406), 10 wider each side than the padded content. */
  step1: {
    marginHorizontal: -10 * scaleX,
  },
  /* 4649:2417 / 2391 / 2392 — Helvetica Bold 18, black. */
  step1Label: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  /* x=25; the bar starts 13 under it (y=248). */
  step1LabelDate: {
    marginLeft: 8 * scaleX,
    marginBottom: 13 * scaleX,
  },
  /* x=23 at y=331; the box starts at y=368. */
  step1LabelName: {
    marginLeft: 6 * scaleX,
    marginBottom: 18 * scaleX,
  },
  /* x=22 at y=475; the card starts at y=514. */
  step1LabelPhotos: {
    marginLeft: 5 * scaleX,
    marginBottom: 20 * scaleX,
  },
  /* 4649:2390 — 406 x 68, #afa9ad, radius 8; text at x=38. Ends at y=436. */
  titleInputContainer: {
    height: 68 * scaleX,
    borderRadius: 8 * scaleX,
    borderWidth: 1,
    borderColor: '#afa9ad',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    paddingHorizontal: 20 * scaleX,
    marginBottom: 39 * scaleX,
  },
  titleInputError: {
    borderColor: '#ff0000',
    borderWidth: 2,
  },
  /* 4649:2393 — Inter Regular 16, black. */
  titleInput: {
    padding: 0,
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '400',
    color: '#000000',
  },
  /* 4649:2380 — x=21, 402 x 52, ends at y=300; "Name item" at y=331. */
  dateTimeBar: {
    height: 52 * scaleX,
    marginLeft: 4 * scaleX,
    marginBottom: 31 * scaleX,
    borderRadius: 8 * scaleX,
    backgroundColor: 'rgba(163, 160, 160, 0.09)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  /* Date at x=35, time at x=214, "Edit" ending at x=399 (24 from the bar's end). */
  dateSlot: {
    width: 193 * scaleX,
    height: '100%',
    justifyContent: 'center',
    paddingLeft: 14 * scaleX,
  },
  timeSlot: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  dateTimeText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#1e1e1e',
    opacity: 0.39,
  },
  dateTimeEdit: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
    marginRight: 24 * scaleX,
  },
  /* 4649:2400 — #f9fafc, #5a759d 23% outline, radius 12, 400 tall. */
  photosCard: {
    minHeight: 400 * scaleX,
    borderRadius: 12 * scaleX,
    borderWidth: 1,
    borderColor: 'rgba(90, 117, 157, 0.23)',
    backgroundColor: '#f9fafc',
    // Card ends at y=914, Next starts at y=937.
    marginBottom: 23 * scaleX,
  },
  photosCardError: {
    borderColor: '#f92424',
  },
  /* 4649:2404: the frame 75 down, the title 14 under it, the hint 7 under that. */
  addPhotoEmpty: {
    alignItems: 'center',
    paddingTop: 75 * scaleX,
    paddingBottom: 72 * scaleX,
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
  photosGrid: {
    padding: 16 * scaleX,
    paddingBottom: 24 * scaleX,
  },
  /* 4649:2403 — Bold 14 at x=42 (25 in), 12 above the rule. */
  descriptionLabel: {
    // 24 + the 1px outline = x 42.
    paddingLeft: 24 * scaleX,
    marginBottom: 12 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  /* 4649:2401 — inset ~3 each side, #5a759d 9%. */
  descriptionRule: {
    height: 1,
    marginHorizontal: 3 * scaleX,
    backgroundColor: 'rgba(90, 117, 157, 0.09)',
  },
  /* 4649:2402 — Light 14 at x=51 (34 in), 24 under the rule, 274 wide. */
  descriptionInput: {
    minHeight: 60 * scaleX,
    maxWidth: 308 * scaleX,
    marginTop: 24 * scaleX,
    marginBottom: 11 * scaleX,
    marginLeft: 33 * scaleX,
    padding: 0,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    lineHeight: 16 * scaleX,
  },

  /* 733:7 — the pill at x=27, 26 under the header (the content pads 20). */
  aiPill: {
    alignItems: 'flex-start',
    marginTop: 6 * scaleX,
  },
  /* 4649:2099 — Inter Medium 16 at x=31, 31 under the pill's box. */
  whereLabel: {
    marginTop: 31 * scaleX,
    marginLeft: 4 * scaleX,
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '500',
    color: '#000000',
  },
  /* 4731:151 — x=27, 22 under the question; the panel starts 34 below. */
  whereDropdown: {
    marginTop: 22 * scaleX,
    marginBottom: 34 * scaleX,
  },
  /* 4649:2092 — #f9fafc, rounded top, the frame's full width; search 16 in. */
  wherePanel: {
    marginHorizontal: -27 * scaleX,
    paddingHorizontal: 27 * scaleX,
    paddingTop: 16 * scaleX,
    // Runs to the bottom: cancels the scroll content's bottom padding.
    paddingBottom: 280 * scaleX,
    marginBottom: -240 * scaleX,
    minHeight: 600 * scaleX,
    borderTopLeftRadius: 24 * scaleX,
    borderTopRightRadius: 24 * scaleX,
    backgroundColor: '#f9fafc',
  },
  /* Step 2 runs x=17..423, like step 1. */
  step2: {
    marginHorizontal: -10 * scaleX,
  },
  /* 4649:2428 — x=21, 402 wide, #a3a0a0 9%, radius 8; 13 under "Found by:". */
  peoplePanel: {
    width: 402 * scaleX,
    marginLeft: 4 * scaleX,
    paddingTop: 15 * scaleX,
    paddingBottom: 18 * scaleX,
    borderRadius: 8 * scaleX,
    backgroundColor: 'rgba(163, 160, 160, 0.09)',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  /* 4649:2560 — the avatar at x=35, "Edit" ending ~30 from the panel's edge. */
  personRowFound: {
    paddingLeft: 14 * scaleX,
    paddingRight: 30 * scaleX,
  },
  /* 4649:2616 — the avatar at x=31, 19 under its label; "Edit" ~34 from the edge. */
  personRowRegistered: {
    marginTop: 19 * scaleX,
    paddingLeft: 10 * scaleX,
    paddingRight: 34 * scaleX,
  },
  /* Name 7 after the avatar. */
  personText: {
    flex: 1,
    marginLeft: 7 * scaleX,
  },
  /* 4649:2561 — Regular 16, #1e1e1e. */
  personName: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#1e1e1e',
  },
  /* 4649:2563 — Bold 11, #5a759d. */
  personMe: {
    marginLeft: 1 * scaleX,
    fontSize: 11 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#5a759d',
  },
  personEdit: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
  /* 4649:2565 — the picker hangs 2 under the row (tab tip), x=20. */
  pickerCard: {
    marginTop: (2 + 7.2) * scaleX,
    marginLeft: -1 * scaleX,
  },
  /* Under the Stored box, its tab on the Stored by chevron. */
  pickerCardStored: {
    marginTop: (2 + 7.2) * scaleX,
  },
  /* 4649:2615 — x=33, 21 under the row or picker above it. */
  registeredLabel: {
    marginTop: 21 * scaleX,
    marginLeft: 12 * scaleX,
  },
  /* 4649:2624 — x=22, 23 under the panel; the first pill 25 under it. */
  statusLabel: {
    marginTop: 23 * scaleX,
    marginLeft: 5 * scaleX,
    marginBottom: 25 * scaleX,
  },
  nextButton: {
    width: REGISTER_FORM.nextButton.width * scaleX,
    height: REGISTER_FORM.nextButton.height * scaleX,
    // Node 733:188 is a plain rectangle — no corner radius.
    backgroundColor: REGISTER_FORM.nextButton.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
    // Match Figma: button starts at x=36; container padding is 27.
    alignSelf: 'flex-start',
    marginLeft: (REGISTER_FORM.nextButton.left - 27) * scaleX,
    marginTop: 0,
  },
  /** 4649:2420 — step 1's Next: x=19, 404 wide. */
  nextButtonStep0: {
    marginTop: 24 * scaleX,
    marginLeft: 0,
    width: 387 * scaleX,
  },
  nextButtonStep1: {
    width: 404 * scaleX,
    marginLeft: -8 * scaleX,
  },
  /** Step 2: the last field ends at y=1036, Next starts at y=1119. */
  nextButtonStep2: {
    marginTop: 32 * scaleX,
    // The frame stops above Next; step 1's 404-wide button at x=19.
    width: 404 * scaleX,
    marginLeft: -8 * scaleX,
  },
  /** Node 733:582 — photos end at y=1174, Done starts at y=1223, x=45. */
  nextButtonStep3: {
    marginTop: 31 * scaleX,
    width: 404 * scaleX,
    marginLeft: -9 * scaleX,
  },
  nextButtonDisabled: {
    backgroundColor: '#d3d3d3', // Gray background when disabled
    opacity: 0.5, // Blur effect
  },
  nextButtonText: {
    fontSize: REGISTER_FORM.nextButton.text.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.nextButton.text.fontWeight as any,
    color: REGISTER_FORM.nextButton.text.color,
  },
  nextButtonTextDisabled: {
    color: '#999999', // Gray text when disabled
  },
});

