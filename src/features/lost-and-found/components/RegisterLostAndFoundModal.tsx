import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeKeyboardAvoidingView as KeyboardAvoidingView } from '@/components/ui/SafeKeyboardAvoidingView';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '@/contexts/ToastContext';
import { useMessageModal } from '@/contexts/MessageModalContext';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { REGISTER_FORM, scaleX } from '../constants/lostAndFoundStyles';
import { fetchStaffFromSupabase } from '@features/staff/services/staff';
import { useAuth } from '@features/auth/hooks/useAuth';
import { RoomNumberSelector } from '@features/rooms/components/roomPicker';
import { useRoomPickerRooms } from '@features/rooms/hooks/useRoomPickerRooms';
import type { RoomPickerRoom } from '@features/rooms/types/roomPicker.types';
import { fetchPublicAreas } from '../services/lostAndFound';
import DatePickerModal from './DatePickerModal';
import TimePickerModal from './TimePickerModal';
import StaffSelectorModal from './StaffSelectorModal';
import { StaffAvatar } from './StaffAvatar';
import { RegisterConfirmStep } from './RegisterConfirmStep';
import StatusDropdown, { StatusOption } from './StatusDropdown';
import StoredLocationDropdown, { StoredLocationOption } from './StoredLocationDropdown';
import type { StaffMember } from '@features/staff/types/staff.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TWO_COL_GAP = 12 * scaleX;
const PHOTO_GRID_ITEM_SIZE = (SCREEN_WIDTH - 2 * (27 * scaleX) - TWO_COL_GAP) / 2;
/** Figma 733:7 — node 733:530 (photo, 185x158) and 733:149 (add tile, 183x156). */
const PHOTO_GRID_ITEM_HEIGHT = 158 * scaleX;
/** Figma 733:257 — the staff picker card (331) plus its 7px gap below the field. */
const STAFF_PICKER_HEIGHT = (331 + 7) * scaleX;

interface RegisterLostAndFoundModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedRoomId?: string;
  onNext?: (data: {
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
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

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
  const { rooms, loading: roomsLoading } = useRoomPickerRooms(visible);
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
  const [showFoundedByModal, setShowFoundedByModal] = useState(false);
  const [showRegisteredByModal, setShowRegisteredByModal] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showStoredLocationDropdown, setShowStoredLocationDropdown] = useState(false);
  const [foundedBy, setFoundedBy] = useState<string>(''); 
  const [registeredBy, setRegisteredBy] = useState<string>('');
  const [status, setStatus] = useState<StatusOption>('stored');
  const [storedLocation, setStoredLocation] = useState<StoredLocationOption>('hskOffice');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  /*
   * The signed-in user, straight off the session. Found by and Registered by
   * both default to them — Figma 733:192. This used to be fetched separately
   * after the sheet opened and, until it landed, the defaults fell back to
   * `staff[0]`: whichever colleague sorted first.
   */
  const { session } = useAuth();
  const currentUserId = session?.user?.id ?? null;
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

  /*
   * Ticking "Send Email to Guest" loads the guest's address into the field.
   * Only into a blank field: an address the user typed or corrected is kept
   * if they untick and tick again.
   */
  const handleToggleSendEmail = () => {
    const next = !sendEmailToGuest;
    setSendEmailToGuest(next);
    const email = selectedRoom?.primaryGuest?.email;
    if (next && email && !guestEmail.trim()) setGuestEmail(email);
  };
  
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
    setCurrentStep(1);
    setSendEmailToGuest(false);
    setGuestEmail('');
    setPictures([]);
    setShowPictureError(false);
    setShowTitleError(false);
    setSelectedPublicArea(null);
    if (preselectedRoomId) {
      setSelectedLocation('room');
    }
    setTitle('');
    setNotes('');
    setFoundedBy(currentUserId ?? '');
    setRegisteredBy(currentUserId ?? '');
    // Deliberately keyed on opening alone — see above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // The staff list backs the two pickers; the defaults above do not wait for it.
  useEffect(() => {
    let cancelled = false;
    fetchStaffFromSupabase()
      .then((rows) => {
        if (!cancelled) setStaff(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Handle adding pictures – align behavior with Tickets (direct gallery picker)
  const handleAddPicture = async () => {
    setShowPictureError(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.show('We need camera roll permissions to add pictures.', {
          type: 'error',
          title: 'Permission needed',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: false,
        allowsEditing: false,
        quality: 0.8,
        /*
         * iOS otherwise hands back the original HEIC, which the upload stores
         * under a .jpg name and an image/jpeg type — the bytes then fail to
         * render on the card, and Android cannot decode HEIC at all.
         * `Compatible` makes iOS transcode to JPEG before returning it.
         */
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPictures((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      toast.show('Failed to open gallery. Please try again.', {
        type: 'error',
        title: 'Error',
      });
    }
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
  const foundedByFieldRef = useRef<View>(null);
  const registeredByFieldRef = useRef<View>(null);
  const statusFieldRef = useRef<View>(null);
  const storedLocationFieldRef = useRef<View>(null);
  
  // Input field positions for dropdown positioning
  const [foundedByFieldPosition, setFoundedByFieldPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [registeredByFieldPosition, setRegisteredByFieldPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [statusFieldPosition, setStatusFieldPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
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

  const handleNext = () => {
    if (currentStep === 1) {
      const isTitleValid = title.trim().length > 0;
      if (!isTitleValid) {
        setShowTitleError(true);
        toast.show('Title is required', { type: 'error', title: 'Missing title' });
        return;
      }
      setShowTitleError(false);
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
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Submit; tracking number is assigned by DB (trigger)
      if (onNext) {
        onNext({
          itemImage: pictures.length > 0 ? pictures[0] : undefined,
          itemData: {
            title,
            notes,
            selectedLocation,
            selectedRoom: selectedLocation === 'room' ? selectedRoom : undefined,
            selectedPublicArea: selectedLocation === 'publicArea' ? selectedPublicArea : undefined,
            foundedBy,
            registeredBy,
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

  // Get stored location label
  const getLocationLabel = (location: StoredLocationOption): string => {
    const labels: { [key: string]: string } = {
      hskOffice: 'Office',
      frontDesk: 'Front Desk',
      securityOffice: 'Security Office',
      lostAndFoundRoom: 'Lost & Found Room',
    };
    return labels[location] || 'Office';
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
            {/* Title */}
            <Text style={styles.title}>
              {currentStep === 3 ? 'Confirm Registration' : 'Register'}
            </Text>

          {/* Step Indicator */}
          <Text style={styles.stepIndicator}>Step {currentStep}</Text>

          {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, currentStep >= 1 ? styles.progressBarActive : styles.progressBarInactive]} />
            <View style={[styles.progressBar, currentStep >= 2 ? styles.progressBarActive : styles.progressBarInactive]} />
            <View style={[styles.progressBar, currentStep >= 3 ? styles.progressBarActive : styles.progressBarInactive]} />
            </View>

          {/* Step 1 Content */}
          {currentStep === 1 && (
            <>
              {/* Title Field (Figma: "Wrist Watch") */}
              <Text style={styles.sectionLabel}>Title</Text>
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
                />
              </View>

              {/* Date and Time Section */}
              <Text style={styles.sectionLabel}>Date and time</Text>
              <View style={styles.dateTimeContainer}>
                <TouchableOpacity
                  style={styles.dateInput}
                  activeOpacity={0.7}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateTimeText}>{formatDate(selectedDate)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timeInput}
                  activeOpacity={0.7}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.dateTimeText}>{formatTime(selectedHour, selectedMinute)}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step 1 Content - Location Section */}
          {currentStep === 1 && (
            <>
              {/* Location Section */}
              <Text style={[styles.sectionLabel, styles.locationLabel]}>Location</Text>
              <View style={styles.locationContainer}>
            <TouchableOpacity
              style={styles.locationOption}
              onPress={() => setSelectedLocation('room')}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  selectedLocation === 'room' && styles.checkboxSelected,
                ]}
              >
                {selectedLocation === 'room' && (
                  <Icon name="action-check-bold" size={14 * scaleX} color="#5a759d" />
                )}
              </View>
              <Text
                style={[
                  styles.locationText,
                  selectedLocation === 'room' && styles.locationTextSelected,
                ]}
              >
                Room
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.locationOption}
              onPress={() => setSelectedLocation('publicArea')}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  selectedLocation === 'publicArea' && styles.checkboxSelected,
                ]}
              >
                {selectedLocation === 'publicArea' && (
                  <Icon name="action-check-bold" size={14 * scaleX} color="#5a759d" />
                )}
              </View>
              <Text
                style={[
                  styles.locationText,
                  selectedLocation === 'publicArea' && styles.locationTextSelected,
                ]}
              >
                Public Area
              </Text>
            </TouchableOpacity>
          </View>

          {/* Room Number Section */}
          {selectedLocation === 'room' && currentStep === 1 && (
            <>
              <Text style={styles.sectionLabelLight}>Room Number</Text>
              <RoomNumberSelector
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
                style={styles.roomSelectorWrapper}
              />
            </>
          )}

          {/* Public Area Selection */}
          {selectedLocation === 'publicArea' && currentStep === 1 && (
            <>
              <Text style={styles.sectionLabelLight}>Select Public Area</Text>
              <View style={styles.publicAreasContainer}>
                {publicAreas.length === 0 ? (
                  <View style={styles.publicAreaItem}>
                    <Text style={styles.publicAreaText}>
                      No public areas configured for this hotel.
                    </Text>
                  </View>
                ) : null}
                {publicAreas.map((area) => (
                  <TouchableOpacity
                    key={area}
                    style={styles.publicAreaItem}
                    onPress={() => setSelectedPublicArea(area)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.publicAreaContent}>
                      <Icon name="location-pin" size={16 * scaleX} color="#999" style={styles.publicAreaIcon} />
                      <Text style={styles.publicAreaText}>{area}</Text>
                    </View>
                    {selectedPublicArea === area ? (
                      <Text style={styles.publicAreaCheckmark}>✓</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
            </>
          )}

          {/* Pictures Section */}
          {currentStep === 1 && (
            <>
              <Text style={[styles.sectionLabel, styles.picturesLabel]}>Pictures</Text>
              <View style={styles.picturesContainer}>
                {/* One grid whether or not a photo exists yet: the frame (733:7)
                    draws photos followed by the #f2f2f2 add tile, and with none
                    the add tile simply stands alone in the first slot. */}
                <View style={styles.photosGrid}>
                    {pictures.map((uri, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.photoItem}
                        activeOpacity={0.7}
                        onPress={() => handleRemovePicture(index)}
                      >
                        <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />
                        <View style={styles.pictureRemoveOverlay}>
                          <Text style={styles.pictureRemoveText}>×</Text>
                        </View>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                      style={[styles.addPhotoGridItem, showPictureError && styles.addPhotoGridItemError]}
                      activeOpacity={0.7}
                      onPress={handleAddPicture}
                      accessibilityRole="button"
                      accessibilityLabel="Add a photo"
                    >
                      {/* Node 733:150 — the glyph alone, 33x33, on a #f2f2f2 tile. */}
                      <Icon name="action-add-photo" size={33 * scaleX} />
                    </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* Step 1 Content - End */}
          {currentStep === 1 && (
            <>
              {/* Notes Section */}
              <View style={styles.notesContainer}>
                <View style={styles.notesLabelContainer}>
                  {/* Node 1102:3222 — a 32px #ebe7e7 disc holding a 16.4px pencil. */}
                  <View style={styles.notesIcon}>
                    <Icon name="action-add-note" size={16.4 * scaleX} color="#5A759D" />
                  </View>
                  <Text style={styles.notesLabel}>Notes</Text>
                </View>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  placeholder="Wrist watch found in guest bathroom whole cleaning"
                  placeholderTextColor="#999999"
                />
                <View style={styles.notesDivider} />
              </View>
            </>
          )}

          {/* Step 2 Content */}
          {currentStep === 2 && (
            <>
              {/* Founded By Section */}
              <Text style={styles.step2LeadLabel}>Founded by</Text>
              <TouchableOpacity
                ref={foundedByFieldRef}
                style={styles.step2Field}
                activeOpacity={0.7}
                onPress={() => {
                  measureFieldPosition(foundedByFieldRef, setFoundedByFieldPosition, () => {
                    setShowFoundedByModal(true);
                  }, STAFF_PICKER_HEIGHT);
                }}
              >
                <View style={styles.step2FieldContent}>
                  <View style={styles.staffAvatarSlot}>
                    <StaffAvatar
                      name={getStaffName(foundedBy)}
                      avatar={getStaffAvatar(foundedBy)}
                      size={REGISTER_FORM.step2.foundedBy.avatar.size * scaleX}
                    />
                  </View>
                  <Text style={styles.step2FieldText}>{getStaffName(foundedBy)}</Text>
                </View>
                <Icon name="action-search" size={REGISTER_FORM.step2.foundedBy.searchIcon.height * scaleX} color="rgba(90, 117, 157, 0.59)" style={styles.step2SearchIcon} />
              </TouchableOpacity>

              {/* Registered By Section */}
              <Text style={[styles.step2Label, styles.step2RegisteredByLabel]}>Registered by</Text>
              <TouchableOpacity
                ref={registeredByFieldRef}
                style={styles.step2Field}
                activeOpacity={0.7}
                onPress={() => {
                  measureFieldPosition(registeredByFieldRef, setRegisteredByFieldPosition, () => {
                    setShowRegisteredByModal(true);
                  }, STAFF_PICKER_HEIGHT);
                }}
              >
                <View style={styles.step2FieldContent}>
                  <View style={styles.staffAvatarSlot}>
                    <StaffAvatar
                      name={getStaffName(registeredBy)}
                      avatar={getStaffAvatar(registeredBy)}
                      size={REGISTER_FORM.step2.foundedBy.avatar.size * scaleX}
                    />
                  </View>
                  <Text style={styles.step2FieldText}>{getStaffName(registeredBy)}</Text>
                </View>
                <Icon name="action-search" size={REGISTER_FORM.step2.foundedBy.searchIcon.height * scaleX} color="rgba(90, 117, 157, 0.59)" style={styles.step2SearchIcon} />
              </TouchableOpacity>

              {/* Status Section */}
              <Text style={styles.step2Label}>Status</Text>
              <TouchableOpacity
                ref={statusFieldRef}
                style={[styles.step2Field, styles.step2StatusField]}
                activeOpacity={0.7}
                onPress={() => {
                  measureFieldPosition(statusFieldRef, setStatusFieldPosition, () => {
                    setShowStatusDropdown(true);
                  });
                }}
              >
                <View style={styles.step2FieldContent}>
                  <View
                    style={[
                      styles.step2StatusCircle,
                      {
                        backgroundColor:
                          status === 'stored'
                            ? '#f0be1b'
                            : status === 'shipped'
                            ? '#41d541'
                            : '#f0be1b',
                      },
                    ]}
                  />
                  <Text style={styles.step2FieldText}>{getStatusLabel(status)}</Text>
                </View>
                <View style={styles.step2Chevron}>
                  <View style={{ transform: [{ rotate: '-90deg' }] }}>
                    <Icon name="action-chevron" size={REGISTER_FORM.step2.status.chevron.width * scaleX} color="#5a759d" />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Stored Location Section */}
              <Text style={styles.step2Label}>Stored Location</Text>
              <TouchableOpacity
                ref={storedLocationFieldRef}
                style={[styles.step2Field, styles.step2StoredLocationField]}
                activeOpacity={0.7}
                onPress={() => {
                  measureFieldPosition(storedLocationFieldRef, setStoredLocationFieldPosition, () => {
                    setShowStoredLocationDropdown(true);
                  });
                }}
              >
                <Text style={styles.step2FieldText}>{getLocationLabel(storedLocation)}</Text>
                <View style={styles.step2Chevron}>
                  <View style={{ transform: [{ rotate: '-90deg' }] }}>
                    <Icon name="action-chevron" size={REGISTER_FORM.step2.status.chevron.width * scaleX} color="#5a759d" />
                  </View>
                </View>
              </TouchableOpacity>
            </>
          )}

          {/* Step 3 — Confirm Registration (Figma 733:448) */}
          {currentStep === 3 && (
            <RegisterConfirmStep
              location={selectedLocation}
              room={selectedRoom}
              publicArea={selectedPublicArea}
              sendEmail={sendEmailToGuest}
              onToggleSendEmail={handleToggleSendEmail}
              guestEmail={guestEmail}
              onGuestEmailChange={setGuestEmail}
              foundedBy={{
                name: getStaffName(foundedBy),
                avatar: getStaffAvatar(foundedBy),
                department: getStaffDepartment(foundedBy),
              }}
              registeredBy={{
                name: getStaffName(registeredBy),
                avatar: getStaffAvatar(registeredBy),
                department: getStaffDepartment(registeredBy),
              }}
              statusLabel={getStatusLabel(status)}
              statusColor={status === 'shipped' ? '#39d47f' : '#f0be1b'}
              storedLocationLabel={getLocationLabel(storedLocation)}
              pictures={pictures}
              onEditLocation={() => setCurrentStep(1)}
              onEditDetails={() => setCurrentStep(2)}
              onAddPhoto={handleAddPicture}
            />
          )}

          {/* Next/Done Button */}
          <TouchableOpacity
            style={[
              styles.nextButton,
              currentStep === 2 && styles.nextButtonStep2,
              currentStep === 3 && styles.nextButtonStep3,
              (currentStep === 1 &&
                (pictures.length === 0 || notes.trim() === '' || title.trim() === '')) &&
                styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            activeOpacity={0.7}
            disabled={currentStep === 1 && (pictures.length === 0 || notes.trim() === '' || title.trim() === '')}
          >
            <Text
              style={[
                styles.nextButtonText,
                (currentStep === 1 &&
                  (pictures.length === 0 || notes.trim() === '' || title.trim() === '')) &&
                  styles.nextButtonTextDisabled,
              ]}
            >
              {currentStep === 3 ? 'Done' : 'Next'}
            </Text>
          </TouchableOpacity>
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

        {/* Step 2 Modals */}
        <StaffSelectorModal
          visible={showFoundedByModal}
          onClose={() => setShowFoundedByModal(false)}
          onSelect={setFoundedBy}
          selectedStaffId={foundedBy}
          title="Founded by"
          staff={staff}
          showMeOption={true}
          currentUserId={currentUserId ?? undefined}
          inputFieldPosition={foundedByFieldPosition}
        />
        <StaffSelectorModal
          visible={showRegisteredByModal}
          onClose={() => setShowRegisteredByModal(false)}
          onSelect={setRegisteredBy}
          selectedStaffId={registeredBy}
          title="Registered by"
          staff={staff}
          showMeOption={true}
          currentUserId={currentUserId ?? undefined}
          inputFieldPosition={registeredByFieldPosition}
        />
        <StatusDropdown
          visible={showStatusDropdown}
          onClose={() => setShowStatusDropdown(false)}
          onSelect={setStatus}
          selectedStatus={status}
          inputFieldPosition={statusFieldPosition}
        />
        <StoredLocationDropdown
          visible={showStoredLocationDropdown}
          onClose={() => setShowStoredLocationDropdown(false)}
          onSelect={setStoredLocation}
          selectedLocation={storedLocation}
          inputFieldPosition={storedLocationFieldPosition}
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
    paddingTop: (REGISTER_FORM.title.top - REGISTER_FORM.header.height) * scaleX,
    paddingHorizontal: 27 * scaleX,
    // Extra space so Notes can scroll above keyboard (iOS + Android)
    paddingBottom: 240 * scaleX,
  },
  title: {
    fontSize: REGISTER_FORM.title.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.title.fontWeight as any,
    color: REGISTER_FORM.title.color,
    // The container has 27px horizontal padding; Figma title starts at x=31.
    marginLeft: (REGISTER_FORM.title.left - 27) * scaleX,
    marginBottom: 9 * scaleX,
  },
  stepIndicator: {
    fontSize: REGISTER_FORM.stepIndicator.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.stepIndicator.fontWeight as any,
    color: REGISTER_FORM.stepIndicator.color,
    // The container has 27px horizontal padding; Figma step label starts at x=32.
    marginLeft: (REGISTER_FORM.stepIndicator.left - 27) * scaleX,
    marginBottom: 19 * scaleX,
  },
  progressBarContainer: {
    flexDirection: 'row',
    height: REGISTER_FORM.progressBar.height * scaleX,
    // 733:7: bars end at y=222, "Title" starts at y=241.
    marginBottom: 19 * scaleX,
  },
  progressBar: {
    height: REGISTER_FORM.progressBar.height * scaleX,
    // Nodes 1102:3193-3195 are plain rectangles — no corner radius.
  },
  progressBarActive: {
    width: REGISTER_FORM.progressBar.bars[0].width * scaleX,
    backgroundColor: REGISTER_FORM.progressBar.activeColor,
    marginRight: 9 * scaleX,
  },
  progressBarInactive: {
    width: REGISTER_FORM.progressBar.bars[1].width * scaleX,
    backgroundColor: REGISTER_FORM.progressBar.inactiveColor,
    marginRight: 9 * scaleX,
  },
  sectionLabel: {
    fontSize: REGISTER_FORM.dateTime.label.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.dateTime.label.fontWeight as any,
    color: REGISTER_FORM.dateTime.label.color,
    marginBottom: 16 * scaleX, // Relative spacing from label to input
  },
  titleInputContainer: {
    width: '100%',
    height: 68 * scaleX,
    borderRadius: 8 * scaleX,
    borderWidth: 1,
    borderColor: '#afa9ad',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    // Node 2970:392 — text at x=39 in a box at x=28.
    paddingHorizontal: 11 * scaleX,
    // Box ends at y=339, "Date and time" starts at y=353.
    marginBottom: 14 * scaleX,
  },
  titleInputError: {
    borderColor: '#ff0000',
    borderWidth: 2,
  },
  titleInput: {
    // Node 2970:392 — Helvetica Bold 18, black.
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700' as any,
    color: '#000000',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    // Boxes end at y=461, "Location" starts at y=476.
    marginBottom: 15 * scaleX,
  },
  dateInput: {
    width: REGISTER_FORM.dateTime.dateInput.width * scaleX,
    height: REGISTER_FORM.dateTime.dateInput.height * scaleX,
    borderRadius: REGISTER_FORM.dateTime.dateInput.borderRadius * scaleX,
    borderWidth: REGISTER_FORM.dateTime.dateInput.borderWidth,
    borderColor: REGISTER_FORM.dateTime.dateInput.borderColor,
    justifyContent: 'center',
    paddingLeft: 15 * scaleX,
    marginRight: 14 * scaleX,
  },
  timeInput: {
    width: REGISTER_FORM.dateTime.timeInput.width * scaleX,
    height: REGISTER_FORM.dateTime.timeInput.height * scaleX,
    borderRadius: REGISTER_FORM.dateTime.timeInput.borderRadius * scaleX,
    borderWidth: REGISTER_FORM.dateTime.timeInput.borderWidth,
    borderColor: REGISTER_FORM.dateTime.timeInput.borderColor,
    justifyContent: 'center',
    // Node 733:176 — "15:00" is centred in the 99-wide box (x=267 in 237..336).
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: REGISTER_FORM.dateTime.dateText.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.dateTime.dateText.fontWeight as any,
    color: REGISTER_FORM.dateTime.dateText.color,
  },
  locationLabel: {
    marginTop: 0,
    // "Location" ends at y=495, checkboxes start at y=519.
    marginBottom: 24 * scaleX,
  },
  locationContainer: {
    flexDirection: 'row',
    // Checkboxes end at y=547, "Room Number" starts at y=584.
    marginBottom: 37 * scaleX,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    // "Room" ends at x=109, the Public Area checkbox starts at x=130.
    marginRight: 21 * scaleX,
  },
  checkbox: {
    // Nodes 1102:3214 / 1102:3216 — 28x28 squares, 2px #5a759d outline.
    width: REGISTER_FORM.location.roomOption.checkboxSize * scaleX,
    height: REGISTER_FORM.location.roomOption.checkboxSize * scaleX,
    borderWidth: REGISTER_FORM.location.roomOption.checkboxBorderWidth,
    borderColor: REGISTER_FORM.location.roomOption.checkboxBorderColor,
    justifyContent: 'center',
    alignItems: 'center',
    // Checkbox ends at x=56, its label starts at x=66.
    marginRight: 10 * scaleX,
  },
  checkboxSelected: {
    // Checked is the same outline with a #5a759d tick (1102:3215) — not filled.
  },
  locationText: {
    fontSize: REGISTER_FORM.location.roomOption.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.location.roomOption.fontWeight as any,
    color: '#5a759d',
  },
  locationTextSelected: {
    color: REGISTER_FORM.location.roomOption.checkboxBorderColor,
  },
  sectionLabelLight: {
    fontSize: REGISTER_FORM.roomNumber.label.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.roomNumber.label.fontWeight as any,
    color: REGISTER_FORM.roomNumber.label.color,
    marginTop: 0, // Already accounted in locationContainer marginBottom
    marginBottom: 12 * scaleX, // Relative spacing from label to selector
  },
  /*
   * Spacing only: `RoomNumberSelector` owns its own stacking, because the
   * dropdown that needs it lives inside the control.
   */
  roomSelectorWrapper: {
    // Card ends at y=712, "Pictures" starts at y=738.
    marginBottom: 26 * scaleX,
  },

  publicAreasContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12 * scaleX,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    width: '100%',
    maxWidth: REGISTER_FORM.roomNumber.selector.width * scaleX,
    marginBottom: 24 * scaleX,
  },
  publicAreaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18 * scaleX,
    paddingHorizontal: 20 * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  publicAreaContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  publicAreaIcon: {
    marginRight: 16 * scaleX,
  },
  publicAreaText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000',
  },
  publicAreaCheckmark: {
    fontSize: 18 * scaleX,
    color: '#5a759d',
    fontWeight: 'bold',
  },
  picturesLabel: {
    marginTop: 0, // Already accounted in roomSelector marginBottom
    marginBottom: 16 * scaleX, // Relative spacing from label to images
  },
  picturesContainer: {
    position: 'relative',
    // Pictures end at y=932, the Notes row starts at y=969.
    marginBottom: 37 * scaleX,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TWO_COL_GAP,
  },
  photoItem: {
    width: PHOTO_GRID_ITEM_SIZE,
    height: PHOTO_GRID_ITEM_HEIGHT,
    borderRadius: 16 * scaleX,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  addPhotoGridItem: {
    // Node 733:149 — a #f2f2f2 tile at radius 11, no border.
    width: PHOTO_GRID_ITEM_SIZE,
    height: PHOTO_GRID_ITEM_HEIGHT,
    borderRadius: 11 * scaleX,
    backgroundColor: '#f2f2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** Shown when Next is pressed with no photo — the tile is the only prompt. */
  addPhotoGridItemError: {
    borderWidth: 2,
    borderColor: '#ff0000',
  },
  pictureRemoveOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24 * scaleX,
    height: 24 * scaleX,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4 * scaleX,
  },
  pictureRemoveText: {
    color: '#ffffff',
    fontSize: 18 * scaleX,
    fontWeight: 'bold' as any,
    lineHeight: 18 * scaleX,
  },
  notesContainer: {
    marginTop: 0,
    // Divider at y=1090, Next starts at y=1122.
    marginBottom: 32 * scaleX,
  },
  notesLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // Row ends at y=1001, the note text starts at y=1051.
    marginBottom: 50 * scaleX,
  },
  notesIcon: {
    width: 32 * scaleX,
    height: 32 * scaleX,
    borderRadius: 16 * scaleX,
    backgroundColor: '#ebe7e7',
    alignItems: 'center',
    justifyContent: 'center',
    // Disc ends at x=60, "Notes" starts at x=68.
    marginRight: 8 * scaleX,
  },
  notesLabel: {
    fontSize: REGISTER_FORM.notes.label.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.notes.label.fontWeight as any,
    color: REGISTER_FORM.notes.label.color,
  },
  notesInput: {
    width: '100%',
    maxWidth: REGISTER_FORM.notes.text.width * scaleX,
    fontSize: REGISTER_FORM.notes.text.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.notes.text.fontWeight as any,
    color: REGISTER_FORM.notes.text.color,
    textAlignVertical: 'top',
    // Text ends at y=1067, the divider sits at y=1090.
    marginBottom: 23 * scaleX,
  },
  notesDivider: {
    width: REGISTER_FORM.notes.divider.width * scaleX,
    height: 1,
    // Node 1102:3231 strokes #e3e3e3.
    backgroundColor: '#e3e3e3',
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
  /** Step 2: the last field ends at y=1036, Next starts at y=1119. */
  nextButtonStep2: {
    marginTop: 83 * scaleX,
    // Node 733:445 — x=45 on steps 2 and 3 (step 1's sits at x=36).
    marginLeft: 18 * scaleX,
  },
  /** Node 733:582 — photos end at y=1174, Done starts at y=1223, x=45. */
  nextButtonStep3: {
    marginTop: 49 * scaleX,
    marginLeft: 18 * scaleX,
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
  // Step 2 Styles
  step2Field: {
    width: '100%',
    maxWidth: REGISTER_FORM.step2.foundedBy.field.width * scaleX,
    height: REGISTER_FORM.step2.foundedBy.field.height * scaleX,
    borderRadius: REGISTER_FORM.step2.foundedBy.field.borderRadius * scaleX,
    borderWidth: REGISTER_FORM.step2.foundedBy.field.borderWidth,
    borderColor: REGISTER_FORM.step2.foundedBy.field.borderColor,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Figma 733:192: avatar at x=42 in a box at x=27; the search glyph ends 27
    // short of the box's right edge.
    paddingLeft: 15 * scaleX,
    paddingRight: 27 * scaleX,
    // A field ends at y=805, the next label starts at y=823.
    marginBottom: 18 * scaleX,
  },
  /** Nodes 733:408 / 733:409 — the disc sits 16 in; the chevron ends 30 short. */
  step2StatusField: {
    paddingLeft: 16 * scaleX,
    paddingRight: 30 * scaleX,
    // Field ends at y=919, "Stored Location" starts at y=940.
    marginBottom: 21 * scaleX,
  },
  /** Nodes 733:441 / 733:440 — text 12 in; the chevron ends 31 short. */
  step2StoredLocationField: {
    paddingLeft: 12 * scaleX,
    paddingRight: 31 * scaleX,
    // The last field: Next owns the gap below it (`nextButtonStep2`).
    marginBottom: 0,
  },
  /** Node 733:210 — the step's first label, Regular 16. Label to field: 13. */
  step2LeadLabel: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400' as any,
    color: '#000000',
    marginBottom: 13 * scaleX,
  },
  /** Nodes 733:395 / 733:402 / 733:439 — Light 14. Label to field: 9. */
  step2Label: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300' as any,
    color: '#000000',
    marginBottom: 9 * scaleX,
  },
  /** "Registered by" sits 11 above its field (y=707 -> 737, label 19 tall). */
  step2RegisteredByLabel: {
    marginBottom: 11 * scaleX,
  },
  step2FieldContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  /** The 32px avatar in the step 2 fields and step 3 summary, 12px before the name. */
  staffAvatarSlot: {
    marginRight: 12 * scaleX,
  },
  step2FieldText: {
    fontSize: REGISTER_FORM.step2.foundedBy.name.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step2.foundedBy.name.fontWeight as any,
    color: REGISTER_FORM.step2.foundedBy.name.color,
  },
  step2SearchIcon: {
    marginLeft: 'auto', // Push to the right
  },
  step2StatusCircle: {
    width: REGISTER_FORM.step2.status.icon.size * scaleX,
    height: REGISTER_FORM.step2.status.icon.size * scaleX,
    borderRadius: (REGISTER_FORM.step2.status.icon.size / 2) * scaleX,
    // Node 733:409 ends at x=70, "Stored" starts at x=77.
    marginRight: 7 * scaleX,
  },
  /*
   * The wrapper box, not the glyph. It keeps the designed 14x7 footprint while
   * the inner View rotates the chevron into it; the old `rotate: '270deg'` sat
   * on the image itself, which painted the arrow sideways and let it spill out
   * of this box on both sides.
   */
  step2Chevron: {
    width: REGISTER_FORM.step2.status.chevron.width * scaleX,
    height: REGISTER_FORM.step2.status.chevron.height * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Step 3 Styles
});

