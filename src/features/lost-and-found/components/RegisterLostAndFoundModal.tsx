import React, { useMemo, useState, useRef, useEffect } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '@/contexts/ToastContext';
import { useMessageModal } from '@/contexts/MessageModalContext';
import { typography } from '@/theme';
import { REGISTER_FORM, scaleX, LOST_AND_FOUND_COLORS } from '../constants/lostAndFoundStyles';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { fetchStaffFromSupabase } from '@features/staff';
import { GUEST_IMAGES_BUCKET } from '@/lib/guests';
import DatePickerModal from './DatePickerModal';
import TimePickerModal from './TimePickerModal';
import StaffSelectorModal from './StaffSelectorModal';
import StatusDropdown, { StatusOption } from './StatusDropdown';
import StoredLocationDropdown, { StoredLocationOption } from './StoredLocationDropdown';
import type { StaffMember } from '@features/staff';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TWO_COL_GAP = 12 * scaleX;
const PHOTO_GRID_ITEM_SIZE = (SCREEN_WIDTH - 2 * (27 * scaleX) - TWO_COL_GAP) / 2;

function isHttpUrl(raw?: string | null): boolean {
  return /^https?:\/\//i.test(String(raw ?? '').trim());
}

function fallbackGuestAvatarUrl(seed: string): string {
  return `https://i.pravatar.cc/96?u=${encodeURIComponent(seed)}`;
}

function getInitials(name?: string): string {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase();
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
  const fontSize = typeof textStyle?.fontSize === 'number' ? (textStyle.fontSize as number) : 16;
  const fontFamily = textStyle?.fontFamily;
  const fontWeight = textStyle?.fontWeight;

  return (
    <View style={{ alignItems: 'center' }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
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
      ) : (
        <Text style={textStyle}>{text}</Text>
      )}
    </View>
  );
}

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
  const getCurrentDateTime = () => {
    const now = new Date();
    return {
      date: now,
      hour: now.getHours(),
      minute: now.getMinutes(),
    };
  };
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
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  
  interface RoomSelection {
    id?: string;
    number: string;
    guestName: string; // Used by Lost & Found cards
    badgeCount: number; // Backward-compat (used by older UI)
    // Create-ticket-like guest info (optional)
    guest_count?: number;
    vip_code?: string | null;
    image_url?: string | null;
    check_in?: string | null;
    check_out?: string | null;
  }

  // Fallback to mock data when Supabase is not configured.
  // Note: keep `number` + `guestName` because the parent Lost&Found screen reads those.
  const fallbackRooms: RoomSelection[] = [
    { number: '201', guestName: 'Mohamed B', badgeCount: 11, guest_count: 11, vip_code: '11' },
    { number: '202', guestName: 'Sarah Johnson', badgeCount: 3, guest_count: 3, vip_code: '3' },
    { number: '203', guestName: 'Ahmed Al-Mansouri', badgeCount: 7, guest_count: 7, vip_code: '7' },
    { number: '204', guestName: 'Emma Williams', badgeCount: 2, guest_count: 2, vip_code: '2' },
    { number: '205', guestName: 'John Smith', badgeCount: 5, guest_count: 5, vip_code: '5' },
    { number: '301', guestName: 'Maria Garcia', badgeCount: 9, guest_count: 9, vip_code: '9' },
    { number: '302', guestName: 'David Chen', badgeCount: 4, guest_count: 4, vip_code: '4' },
    { number: '303', guestName: 'Fatima Ali', badgeCount: 6, guest_count: 6, vip_code: '6' },
  ];

  const [rooms, setRooms] = useState<RoomSelection[]>(fallbackRooms);
  const [roomSearch, setRoomSearch] = useState('');
  const [selectedPublicArea, setSelectedPublicArea] = useState<string | null>(null);

  const PUBLIC_AREAS = ['Brasserie', 'Gym', 'Toilet', 'Reception', 'Elevator'];

  const getInitialRoom = (): RoomSelection =>
    rooms[0] ?? { number: '—', guestName: '', badgeCount: 0, guest_count: 0, vip_code: null, image_url: null };
  const [selectedRoom, setSelectedRoom] = useState<RoomSelection | null>(getInitialRoom());
  const [failedGuestImages, setFailedGuestImages] = useState<Record<string, true>>({});
  
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Pictures state
  const [pictures, setPictures] = useState<string[]>([]);
  
  // Step 3 state
  const [sendEmailToGuest, setSendEmailToGuest] = useState(true);
  
  // Validation state
  const [showPictureError, setShowPictureError] = useState(false);
  const [showTitleError, setShowTitleError] = useState(false);
  
  // Reset to step 1 when modal opens
  useEffect(() => {
    if (visible) {
      const defaultStaffId =
        staff.find((s) => s.id === currentUserId)?.id ?? staff[0]?.id ?? '';
      setCurrentStep(1);
      setSendEmailToGuest(true); // Reset email checkbox
      setPictures([]); // Reset pictures
      setShowPictureError(false); // Reset error state
      setShowTitleError(false);
      setRoomSearch('');
      setShowRoomDropdown(false);
      setSelectedPublicArea(null);
      if (preselectedRoomId) {
        setSelectedLocation('room');
      }
      setTitle('');
      setNotes('');
      setFoundedBy(defaultStaffId);
      setRegisteredBy(defaultStaffId);
    }
  }, [visible, staff, currentUserId, preselectedRoomId]);

  // Load staff from Supabase when available (used for Founded by / Registered by)
  useEffect(() => {
    let cancelled = false;
    const loadStaffWithCurrentUserDefault = async () => {
      const rows = await fetchStaffFromSupabase();
      const { data: sessionData } = await supabase.auth.getSession();
      const loginUserId = sessionData?.session?.user?.id ?? null;

      if (cancelled) return;
      setCurrentUserId(loginUserId);
      setStaff(rows);
      if (rows.length > 0) {
        const defaultStaffId = rows.some((s) => s.id === loginUserId)
          ? loginUserId
          : rows[0].id;
        setFoundedBy((prev) => prev || defaultStaffId || '');
        setRegisteredBy((prev) => prev || defaultStaffId || '');
      }
    };

    loadStaffWithCurrentUserDefault()
      .then(() => {
        if (cancelled) return;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!visible || !preselectedRoomId) return;
    const matchedRoom = rooms.find((room) => room.id === preselectedRoomId);
    if (!matchedRoom) return;
    setSelectedLocation('room');
    setSelectedPublicArea(null);
    setSelectedRoom(matchedRoom);
  }, [visible, preselectedRoomId, rooms]);

  // Load rooms from Supabase for Location dropdown when configured
  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured) return;
    (async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          id,
          room_number,
          reservations (
            guests (
              id,
              full_name,
              vip_code,
              image_url
            ),
            arrival_date,
            departure_date,
            adults,
            kids,
            front_office_status
          )
        `)
        .order('room_number', { ascending: true });

      if (cancelled || error || !data) return;

      const expiresIn = 60 * 60; // 1 hour
      const resolveAccessibleImageUrl = async (
        rawUrl: string | null | undefined,
        seed: string
      ): Promise<string> => {
        const v = String(rawUrl ?? '').trim();
        if (!v) return fallbackGuestAvatarUrl(seed);
        if (isHttpUrl(v)) return v;
        try {
          const { data: signed } = await supabase.storage
            .from(GUEST_IMAGES_BUCKET)
            .createSignedUrl(v, expiresIn);
          const signedUrl = (signed as any)?.signedUrl as string | undefined;
          if (signedUrl) return signedUrl;
        } catch {}
        try {
          const { data: pub } = supabase.storage.from(GUEST_IMAGES_BUCKET).getPublicUrl(v);
          if (pub?.publicUrl) return pub.publicUrl;
        } catch {}
        return fallbackGuestAvatarUrl(seed);
      };

      const mapped: RoomSelection[] = await Promise.all(
        (data as any[]).map(async (room) => {
          const reservation = room.reservations?.[0];
          const frontOfficeStatus = String(reservation?.front_office_status ?? '').trim();
          const isArrivalDeparture = frontOfficeStatus.toLowerCase() === 'arrival/departure';
          const guestsRaw = reservation?.guests;
          const guests = Array.isArray(guestsRaw) ? guestsRaw : guestsRaw ? [guestsRaw] : [];
          const guest = (isArrivalDeparture ? (guests?.[1] ?? guests?.[0]) : (guests?.[0])) ?? guests?.[0];
          const guestCount = (reservation?.adults || 0) + (reservation?.kids || 0);
          const guestName = guest?.full_name ?? '';
          const seed = String(guest?.id ?? `${room.id ?? room.room_number}-${guestName || 'guest'}`);
          const img = await resolveAccessibleImageUrl(guest?.image_url ?? null, seed);

          return {
            id: room.id,
            number: room.room_number,
            guestName,
            badgeCount: guestCount,
            guest_count: guestCount,
            vip_code: guest?.vip_code ?? null,
            image_url: img,
            check_in: reservation?.arrival_date ?? null,
            check_out: reservation?.departure_date ?? null,
          };
        })
      );

      if (cancelled) return;
      if (mapped.length) {
        setRooms(mapped);
        const preselectedRoom =
          preselectedRoomId != null
            ? mapped.find((room) => room.id === preselectedRoomId)
            : undefined;
        setSelectedRoom(preselectedRoom ?? mapped[0]);
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [preselectedRoomId]);

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
    onComplete?: () => void
  ) => {
    if (ref.current) {
      ref.current.measureInWindow((x: number, y: number, width: number, height: number) => {
        const fieldBottom = y + height;
        const screenHeight = Dimensions.get('window').height;
        const headerHeight = REGISTER_FORM.header.height * scaleX;
        // Use actual modal maxHeight from constants (200px scaled)
        const modalHeight = REGISTER_FORM.step2.locationDropdown.modal.maxHeight * scaleX;
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
          const overflow = modalBottom - availableSpace;
          // Calculate desired position: field should be high enough that modal fits
          // desiredFieldBottom + spacing + modalHeight <= availableSpace
          // desiredFieldBottom <= availableSpace - spacing - modalHeight
          const maxAllowedFieldBottom = availableSpace - spacing - modalHeight;
          const desiredFieldY = maxAllowedFieldBottom - height - 50 * scaleX; // Extra padding from top
          const scrollY = Math.max(0, y - desiredFieldY);
          
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

  // Format ISO date strings as "07/10"
  const formatDateStr = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
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

  const getStaffName = (staffId: string): string =>
    staff.find((s) => s.id === staffId)?.name ?? 'Unknown';

  const getStaffDepartment = (staffId: string): string =>
    staff.find((s) => s.id === staffId)?.department ?? 'HSK';

  const getStaffAvatar = (staffId: string) =>
    staff.find((s) => s.id === staffId)?.avatar;

  // Get first letter for initial
  const getInitial = (name: string): string => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  // Generate color for initial circle
  const getInitialColor = (name: string): string => {
    const colors = ['#ff4dd8', '#5a759d', '#607aa1', '#f0be1b'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

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
            <Image
              source={require('../../../../assets/icons/back-arrow.png')}
              style={styles.backArrow}
              resizeMode="contain"
              tintColor="#607AA1"
            />
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
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
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
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
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
              <View style={styles.roomSelectorWrapper}>
                {!selectedRoom ? (
                  <>
                    <TouchableOpacity
                      style={styles.searchInputContainer}
                      onPress={() => setShowRoomDropdown((v) => !v)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.searchInputText, !roomSearch && styles.searchInputPlaceholder]}>
                        {roomSearch ? roomSearch : 'Search room...'}
                      </Text>
                      <Image
                        source={require('../../../../assets/icons/dropdown-arrow.png')}
                        style={[styles.dropdownArrowIcon, showRoomDropdown && styles.dropdownArrowIconOpen]}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>

                    {showRoomDropdown && (
                      <View style={styles.dropdownMenu}>
                        <TextInput
                          style={styles.dropdownSearchInput}
                          placeholder="Search room..."
                          value={roomSearch}
                          onChangeText={setRoomSearch}
                          placeholderTextColor="#999"
                          autoFocus
                        />

                        <ScrollView style={styles.roomsDropdownList} nestedScrollEnabled>
                          {rooms
                            .filter((room) =>
                              room.number.toLowerCase().includes(roomSearch.trim().toLowerCase())
                            )
                            .map((room) => (
                              <TouchableOpacity
                                key={room.id ?? room.number}
                                style={styles.roomCard}
                                onPress={() => {
                                  setSelectedRoom(room);
                                  setShowRoomDropdown(false);
                                  setRoomSearch('');
                                }}
                                activeOpacity={0.7}
                              >
                                <View style={styles.roomCardContent}>
                                  <View style={styles.roomNumberSection}>
                                    <Text style={styles.roomNumberText}>Room {room.number}</Text>
                                  </View>

                                  {room.guestName ? (
                                    <>
                                      <View style={styles.verticalDivider} />
                                      <View style={styles.guestInfoSection}>
                                        <View style={styles.guestImageContainer}>
                                          {room.image_url && !failedGuestImages[room.image_url] ? (
                                            <Image
                                              source={{ uri: room.image_url }}
                                              style={styles.guestImage}
                                              onError={() =>
                                                setFailedGuestImages((prev) => ({ ...prev, [room.image_url!]: true }))
                                              }
                                            />
                                          ) : (
                                            <View style={styles.guestImagePlaceholder}>
                                              <Text style={styles.guestImagePlaceholderText}>
                                                {getInitials(room.guestName)}
                                              </Text>
                                            </View>
                                          )}
                                          {room.vip_code ? (
                                            <View style={styles.vipBadge}>
                                              <Image
                                                source={require('../../../../assets/icons/spear-arrow.png')}
                                                style={styles.vipBadgeIcon}
                                                resizeMode="contain"
                                              />
                                            </View>
                                          ) : null}
                                        </View>

                                        <View style={styles.guestDetails}>
                                          <View style={styles.guestNameRow}>
                                            <Text style={styles.guestNameText}>{room.guestName}</Text>
                                            {room.vip_code ? (
                                              <Text style={styles.vipCodeText}>{room.vip_code}</Text>
                                            ) : null}
                                          </View>
                                          <View style={styles.guestMetaRow}>
                                            <Text style={styles.guestDatesText}>
                                              {formatDateStr(room.check_in)}-{formatDateStr(room.check_out)}
                                            </Text>
                                            {typeof room.guest_count === 'number' ? (
                                              <>
                                                <Image
                                                  source={require('../../../../assets/icons/people-icon.png')}
                                                  style={styles.guestCountIcon}
                                                  resizeMode="contain"
                                                />
                                                <Text style={styles.guestCountText}>{room.guest_count}/2</Text>
                                              </>
                                            ) : null}
                                          </View>
                                        </View>
                                      </View>
                                    </>
                                  ) : null}
                                </View>
                              </TouchableOpacity>
                            ))}
                        </ScrollView>
                      </View>
                    )}
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.roomCard, styles.selectedRoomCard]}
                    onPress={() => setSelectedRoom(null)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.roomCardContent}>
                      <View style={styles.roomNumberSection}>
                        <Text style={styles.roomNumberText}>Room {selectedRoom.number}</Text>
                      </View>

                      {selectedRoom.guestName ? (
                        <>
                          <View style={styles.verticalDivider} />
                          <View style={styles.guestInfoSection}>
                            <View style={styles.guestImageContainer}>
                              {selectedRoom.image_url && !failedGuestImages[selectedRoom.image_url] ? (
                                <Image
                                  source={{ uri: selectedRoom.image_url }}
                                  style={styles.guestImage}
                                  onError={() =>
                                    setFailedGuestImages((prev) => ({ ...prev, [selectedRoom.image_url!]: true }))
                                  }
                                />
                              ) : (
                                <View style={styles.guestImagePlaceholder}>
                                  <Text style={styles.guestImagePlaceholderText}>
                                    {getInitials(selectedRoom.guestName)}
                                  </Text>
                                </View>
                              )}
                              {selectedRoom.vip_code ? (
                                <View style={styles.vipBadge}>
                                  <Image
                                    source={require('../../../../assets/icons/spear-arrow.png')}
                                    style={styles.vipBadgeIcon}
                                    resizeMode="contain"
                                  />
                                </View>
                              ) : null}
                            </View>

                            <View style={styles.guestDetails}>
                              <View style={styles.guestNameRow}>
                                <Text style={styles.guestNameText}>{selectedRoom.guestName}</Text>
                                {selectedRoom.vip_code ? (
                                  <Text style={styles.vipCodeText}>{selectedRoom.vip_code}</Text>
                                ) : null}
                              </View>
                              <View style={styles.guestMetaRow}>
                                <Text style={styles.guestDatesText}>
                                  {formatDateStr(selectedRoom.check_in)}-{formatDateStr(selectedRoom.check_out)}
                                </Text>
                                {typeof selectedRoom.guest_count === 'number' ? (
                                  <>
                                    <Image
                                      source={require('../../../../assets/icons/people-icon.png')}
                                      style={styles.guestCountIcon}
                                      resizeMode="contain"
                                    />
                                    <Text style={styles.guestCountText}>{selectedRoom.guest_count}/2</Text>
                                  </>
                                ) : null}
                              </View>
                            </View>
                          </View>
                        </>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                )}

              </View>
            </>
          )}

          {/* Public Area Selection */}
          {selectedLocation === 'publicArea' && currentStep === 1 && (
            <>
              <Text style={styles.sectionLabelLight}>Select Public Area</Text>
              <View style={styles.publicAreasContainer}>
                {PUBLIC_AREAS.map((area) => (
                  <TouchableOpacity
                    key={area}
                    style={styles.publicAreaItem}
                    onPress={() => setSelectedPublicArea(area)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.publicAreaContent}>
                      <Image
                        source={require('../../../../assets/icons/location-pin-icon.png')}
                        style={styles.publicAreaIcon}
                        resizeMode="contain"
                      />
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
                {pictures.length === 0 ? (
                  <TouchableOpacity
                    style={[
                      styles.addPhotoContainer,
                      showPictureError && styles.picture2Error,
                    ]}
                    activeOpacity={0.7}
                    onPress={handleAddPicture}
                  >
                    <Image
                      source={require('../../../../assets/icons/add-photos.png')}
                      style={styles.addPhotoIcon}
                      resizeMode="contain"
                    />
                    <GradientText text="Add Photo" textStyle={styles.addPhotoTitle} />
                    <Text style={styles.addPhotoSubtitle}>
                      Add photos of the item and our AI will do the rest
                    </Text>
                  </TouchableOpacity>
                ) : (
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
                      style={styles.addPhotoGridItem}
                      activeOpacity={0.7}
                      onPress={handleAddPicture}
                    >
                      <Image
                        source={require('../../../../assets/icons/add-photos.png')}
                        style={styles.addPhotoGridIcon}
                        resizeMode="contain"
                      />
                      <GradientText text="Add Photo" textStyle={styles.addPhotoGridTitle} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}

          {/* Step 1 Content - End */}
          {currentStep === 1 && (
            <>
              {/* Notes Section */}
              <View style={styles.notesContainer}>
                <View style={styles.notesLabelContainer}>
                  <Image
                    source={require('../../../../assets/icons/notes-icon.png')}
                    style={styles.notesIcon}
                    resizeMode="contain"
                  />
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
              <Text style={styles.sectionLabelLight}>Founded by</Text>
              <TouchableOpacity
                ref={foundedByFieldRef}
                style={styles.step2Field}
                activeOpacity={0.7}
                onPress={() => {
                  measureFieldPosition(foundedByFieldRef, setFoundedByFieldPosition, () => {
                    setShowFoundedByModal(true);
                  });
                }}
              >
                <View style={styles.step2FieldContent}>
                  {getStaffAvatar(foundedBy) ? (
                    <Image
                      source={getStaffAvatar(foundedBy)}
                      style={styles.step2Avatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.step2InitialsCircle,
                        { backgroundColor: getInitialColor(getStaffName(foundedBy)) },
                      ]}
                    >
                      <Text style={styles.step2InitialsText}>
                        {getInitial(getStaffName(foundedBy))}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.step2FieldText}>{getStaffName(foundedBy)}</Text>
                </View>
                <Image
                  source={require('../../../../assets/icons/search-icon.png')}
                  style={styles.step2SearchIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              {/* Registered By Section */}
              <Text style={styles.sectionLabelLight}>Registered by</Text>
              <TouchableOpacity
                ref={registeredByFieldRef}
                style={styles.step2Field}
                activeOpacity={0.7}
                onPress={() => {
                  measureFieldPosition(registeredByFieldRef, setRegisteredByFieldPosition, () => {
                    setShowRegisteredByModal(true);
                  });
                }}
              >
                <View style={styles.step2FieldContent}>
                  {getStaffAvatar(registeredBy) ? (
                    <Image
                      source={getStaffAvatar(registeredBy)}
                      style={styles.step2Avatar}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.step2InitialsCircle,
                        styles.step2RegisteredInitialsCircle,
                        { backgroundColor: getInitialColor(getStaffName(registeredBy)) },
                      ]}
                    >
                      <Text style={[styles.step2InitialsText, styles.step2RegisteredInitialsText]}>
                        {getInitial(getStaffName(registeredBy))}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.step2FieldText}>{getStaffName(registeredBy)}</Text>
                </View>
                <Image
                  source={require('../../../../assets/icons/search-icon.png')}
                  style={styles.step2SearchIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              {/* Status Section */}
              <Text style={styles.sectionLabelLight}>Status</Text>
              <TouchableOpacity
                ref={statusFieldRef}
                style={styles.step2Field}
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
                <Image
                  source={require('../../../../assets/icons/down-arrow.png')}
                  style={styles.step2Chevron}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              {/* Stored Location Section */}
              <Text style={styles.sectionLabelLight}>Stored location</Text>
              <TouchableOpacity
                ref={storedLocationFieldRef}
                style={styles.step2Field}
                activeOpacity={0.7}
                onPress={() => {
                  measureFieldPosition(storedLocationFieldRef, setStoredLocationFieldPosition, () => {
                    setShowStoredLocationDropdown(true);
                  });
                }}
              >
                <Text style={styles.step2FieldText}>{getLocationLabel(storedLocation)}</Text>
                <Image
                  source={require('../../../../assets/icons/down-arrow.png')}
                  style={styles.step2Chevron}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </>
          )}

          {/* Step 3 Content */}
          {currentStep === 3 && (
            <>
              {/* Item Images */}
              {pictures.length > 0 ? (
                <View style={styles.step3PicturesContainer}>
                  {pictures.length === 1 ? (
                    <TouchableOpacity
                      style={styles.step3PictureSingleContainer}
                      onPress={() => setCurrentStep(1)}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri: pictures[0] }}
                        style={styles.step3PictureImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ) : (
                    pictures.map((uri, index) => {
                      const row = Math.floor(index / 2);
                      const col = index % 2;
                      const pictureWidth = ((Dimensions.get('window').width - (27 * 2 * scaleX) - (12 * scaleX)) / 2);
                      const left = 27 * scaleX + col * (pictureWidth + 12 * scaleX);
                      const top = row * (REGISTER_FORM.pictures.image1.height * scaleX + 12 * scaleX);
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.step3PictureGridContainer,
                            {
                              left,
                              top,
                            },
                          ]}
                          onPress={() => setCurrentStep(1)}
                          activeOpacity={0.85}
                        >
                          <Image
                            source={{ uri }}
                            style={styles.step3PictureImage}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.step3ItemImageContainer}
                  onPress={() => setCurrentStep(1)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={require('../../../../assets/images/wrist-watch.png')}
                    style={styles.step3ItemImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}

              {/* Item Description */}
              <View
                style={[
                  styles.step3ItemDescriptionContainer,
                  {
                    marginTop:
                      pictures.length > 0
                        ? pictures.length === 1
                          ? (REGISTER_FORM.step3.itemDescription.top - REGISTER_FORM.step3.itemImage.top - REGISTER_FORM.step3.itemImage.height) * scaleX * 0.7
                          : (REGISTER_FORM.step3.itemDescription.top - REGISTER_FORM.step3.itemImage.top - REGISTER_FORM.step3.itemImage.height) * scaleX * 0.7 +
                            (Math.ceil(pictures.length / 2) - 1) * (REGISTER_FORM.pictures.image1.height * scaleX + 12 * scaleX - REGISTER_FORM.step3.itemImage.height * scaleX)
                        : (REGISTER_FORM.step3.itemDescription.top - REGISTER_FORM.step3.itemImage.top - REGISTER_FORM.step3.itemImage.height) * scaleX * 0.7,
                  },
                ]}
              >
                <Text style={styles.step3ItemDescription}>{notes}</Text>
                <TouchableOpacity
                  style={styles.step3EditIcon}
                  onPress={() => setCurrentStep(1)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={require('../../../../assets/icons/notes-icon.png')}
                    style={styles.step3EditIconImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>

              {/* Found In Section */}
              <Text style={styles.step3FoundInLabel}>Found In</Text>
              <View style={styles.step3FoundInContent}>
                <View style={styles.step3FoundInOptionsRow}>
                  <View style={styles.step3CheckboxContainer}>
                    <View style={[styles.step3Checkbox, selectedLocation === 'room' && styles.step3CheckboxChecked]}>
                      {selectedLocation === 'room' && <Text style={styles.step3Checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.step3CheckboxLabel}>Room</Text>
                  </View>

                  <View style={styles.step3CheckboxContainer}>
                    <View
                      style={[
                        styles.step3Checkbox,
                        selectedLocation === 'publicArea' && styles.step3CheckboxChecked,
                      ]}
                    >
                      {selectedLocation === 'publicArea' && <Text style={styles.step3Checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.step3CheckboxLabel}>Public Area</Text>
                  </View>
                </View>

                {selectedLocation === 'room' ? (
                  <View style={styles.step3FoundInCard}>
                    <View style={styles.step3FoundInCardContent}>
                      <Text style={styles.step3FoundInRoomText}>Room {selectedRoom?.number ?? '—'}</Text>
                      <View style={styles.step3FoundInDivider} />

                      <View style={styles.step3FoundInGuestSection}>
                        <View style={styles.step3FoundInGuestImageContainer}>
                          {selectedRoom?.image_url && !failedGuestImages[selectedRoom.image_url] ? (
                            <Image
                              source={{ uri: selectedRoom.image_url }}
                              style={styles.step3FoundInGuestImage}
                              resizeMode="cover"
                              onError={() =>
                                setFailedGuestImages((prev) => ({ ...prev, [selectedRoom.image_url!]: true }))
                              }
                            />
                          ) : (
                            <View style={styles.step3FoundInGuestImagePlaceholder}>
                              <Text style={styles.guestImagePlaceholderText}>
                                {getInitials(selectedRoom?.guestName)}
                              </Text>
                            </View>
                          )}
                          {selectedRoom?.vip_code ? (
                            <View style={styles.step3FoundInVipBadge}>
                              <Image
                                source={require('../../../../assets/icons/spear-arrow.png')}
                                style={styles.step3FoundInVipBadgeIcon}
                                resizeMode="contain"
                              />
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.step3FoundInGuestDetails}>
                          <View style={styles.step3FoundInGuestNameRow}>
                            <Text style={styles.step3FoundInGuestName}>
                              {selectedRoom?.guestName ? `Mr ${selectedRoom.guestName}` : '—'}
                            </Text>
                            {selectedRoom?.vip_code ? (
                              <Text style={styles.step3FoundInVipCode}>{selectedRoom.vip_code}</Text>
                            ) : null}
                          </View>

                          <View style={styles.step3FoundInGuestMetaRow}>
                            <Text style={styles.step3FoundInDates}>
                              {formatDateStr(selectedRoom?.check_in)}-{formatDateStr(selectedRoom?.check_out)}
                            </Text>
                            {typeof selectedRoom?.guest_count === 'number' ? (
                              <>
                                <Image
                                  source={require('../../../../assets/icons/people-icon.png')}
                                  style={styles.step3FoundInGuestCountIcon}
                                  resizeMode="contain"
                                />
                                <Text style={styles.step3FoundInGuestCountText}>
                                  {selectedRoom.guest_count}/2
                                </Text>
                              </>
                            ) : null}
                          </View>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.step3EditIcon}
                        onPress={() => setCurrentStep(1)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('../../../../assets/icons/notes-icon.png')}
                          style={styles.step3EditIconImage}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : selectedLocation === 'publicArea' ? (
                  <View style={styles.step3FoundInCard}>
                    <View style={styles.step3FoundInCardContent}>
                      <Text style={styles.step3FoundInPublicAreaText}>
                        {selectedPublicArea ?? 'Public Area'}
                      </Text>
                      <TouchableOpacity
                        style={styles.step3EditIcon}
                        onPress={() => setCurrentStep(1)}
                        activeOpacity={0.7}
                      >
                        <Image
                          source={require('../../../../assets/icons/notes-icon.png')}
                          style={styles.step3EditIconImage}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
              </View>

              {/* Email Checkbox */}
              <TouchableOpacity
                style={styles.step3EmailContainer}
                onPress={() => setSendEmailToGuest(!sendEmailToGuest)}
                activeOpacity={0.7}
              >
                <View style={[styles.step3Checkbox, sendEmailToGuest && styles.step3CheckboxChecked]}>
                  {sendEmailToGuest && (
                    <Text style={styles.step3Checkmark}>✓</Text>
                  )}
                </View>
                <Text style={styles.step3EmailLabel}>Send Email to Guest for reclamation?</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={[styles.step3Divider, { marginTop: (716 - REGISTER_FORM.step3.emailCheckbox.top) * scaleX * 0.5, marginBottom: 0 }]} />

              {/* Date and Time Section */}
              <Text style={styles.step3DateTimeLabel}>Date and time</Text>
              <View style={styles.step3DateTimeContainer}>
                <Text style={styles.step3Date}>{formatDate(selectedDate)}</Text>
                <Text style={styles.step3Time}>{formatTime(selectedHour, selectedMinute)}</Text>
                <TouchableOpacity
                  style={styles.step3EditIcon}
                  onPress={() => {
                    setCurrentStep(1);
                    setTimeout(() => {
                      setShowDatePicker(true);
                    }, 100);
                  }}
                  activeOpacity={0.7}
                >
                  <Image
                    source={require('../../../../assets/icons/notes-icon.png')}
                    style={styles.step3EditIconImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={[styles.step3Divider, { marginTop: (804 - REGISTER_FORM.step3.dateTime.date.top) * scaleX * 0.7, marginBottom: 0 }]} />

              {/* Founded By Section */}
              <Text style={styles.step3FoundedByLabel}>Founded by</Text>
              <View style={styles.step3StaffInfo}>
                {getStaffAvatar(foundedBy) ? (
                  <Image
                    source={getStaffAvatar(foundedBy)}
                    style={styles.step3Avatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.step3Avatar,
                      styles.step3InitialsCircle,
                      { backgroundColor: getInitialColor(getStaffName(foundedBy)) },
                    ]}
                  >
                    <Text style={styles.step3InitialsText}>
                      {getInitial(getStaffName(foundedBy))}
                    </Text>
                  </View>
                )}
                <View style={styles.step3StaffDetails}>
                  <Text style={styles.step3StaffName}>{getStaffName(foundedBy)}</Text>
                  <Text style={styles.step3StaffDepartment}>{getStaffDepartment(foundedBy)}</Text>
                </View>
              </View>

              {/* Registered By Section */}
              <Text style={styles.step3RegisteredByLabel}>Registered by</Text>
              <View style={styles.step3RegisteredByStaffInfo}>
                {getStaffAvatar(registeredBy) ? (
                  <Image
                    source={getStaffAvatar(registeredBy)}
                    style={styles.step3Avatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.step3Avatar,
                      styles.step3InitialsCircle,
                      styles.step3RegisteredInitialsCircle,
                      { backgroundColor: getInitialColor(getStaffName(registeredBy)) },
                    ]}
                  >
                    <Text style={[styles.step3InitialsText, styles.step3RegisteredInitialsText]}>
                      {getInitial(getStaffName(registeredBy))}
                    </Text>
                  </View>
                )}
                <View style={styles.step3StaffDetails}>
                  <Text style={styles.step3StaffName}>{getStaffName(registeredBy)}</Text>
                  <Text style={styles.step3StaffDepartment}>{getStaffDepartment(registeredBy)}</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={[styles.step3Divider, { marginTop: (1021 - REGISTER_FORM.step3.registeredBy.department.top) * scaleX * 0.5, marginBottom: 0 }]} />

              {/* Status Section */}
              <Text style={styles.step3StatusLabel}>Status</Text>
              <View style={styles.step3StatusContainer}>
                <View
                  style={[
                    styles.step3StatusCircle,
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
                <Text style={styles.step3StatusValue}>{getStatusLabel(status)}</Text>
              </View>

              {/* Stored Location Section */}
              <Text style={styles.step3StoredLocationLabel}>Stored Location</Text>
              <Text style={styles.step3StoredLocationValue}>{getLocationLabel(storedLocation)}</Text>
            </>
          )}

          {/* Next/Done Button */}
          <TouchableOpacity
            style={[
              styles.nextButton,
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
          currentUserId="1"
          inputFieldPosition={foundedByFieldPosition}
        />
        <StaffSelectorModal
          visible={showRegisteredByModal}
          onClose={() => setShowRegisteredByModal(false)}
          onSelect={setRegisteredBy}
          selectedStaffId={registeredBy}
          title="Registered by"
          staff={staff}
          showMeOption={false}
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
  backArrow: {
    width: REGISTER_FORM.header.backButton.width * scaleX,
    height: REGISTER_FORM.header.backButton.height * scaleX,
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
    marginBottom: 16 * scaleX, // Relative spacing
  },
  progressBar: {
    height: REGISTER_FORM.progressBar.height * scaleX,
    borderRadius: 3 * scaleX,
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
    paddingHorizontal: 16 * scaleX,
    marginBottom: 24 * scaleX,
  },
  titleInputError: {
    borderColor: '#ff0000',
    borderWidth: 2,
  },
  titleInput: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300' as any,
    color: '#111827',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    marginBottom: 24 * scaleX, // Relative spacing to next section
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
    paddingLeft: 15 * scaleX,
  },
  dateTimeText: {
    fontSize: REGISTER_FORM.dateTime.dateText.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.dateTime.dateText.fontWeight as any,
    color: REGISTER_FORM.dateTime.dateText.color,
  },
  locationLabel: {
    marginTop: 0, // Already accounted in dateTimeContainer marginBottom
    marginBottom: 16 * scaleX, // Relative spacing from label to checkboxes
  },
  locationContainer: {
    flexDirection: 'row',
    marginBottom: 24 * scaleX, // Relative spacing to next section
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 74 * scaleX,
  },
  checkbox: {
    width: REGISTER_FORM.location.roomOption.checkboxSize * scaleX,
    height: REGISTER_FORM.location.roomOption.checkboxSize * scaleX,
    borderRadius: (REGISTER_FORM.location.roomOption.checkboxSize / 2) * scaleX,
    borderWidth: REGISTER_FORM.location.roomOption.checkboxBorderWidth,
    borderColor: REGISTER_FORM.location.roomOption.checkboxBorderColor,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10 * scaleX,
  },
  checkboxSelected: {
    backgroundColor: REGISTER_FORM.location.roomOption.checkboxBorderColor,
  },
  checkmark: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#ffffff',
    fontSize: 16 * scaleX,
    fontWeight: 'bold' as any,
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
  roomSelectorWrapper: {
    position: 'relative',
    marginBottom: 24 * scaleX, // Relative spacing to next section
    zIndex: 9999, // Stronger layering (Android needs extra help)
    elevation: 12,
  },
  // Ticket-like dropdown-in-input
  searchInputContainer: {
    width: '100%',
    maxWidth: REGISTER_FORM.roomNumber.selector.width * scaleX,
    height: 50 * scaleX,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8 * scaleX,
    paddingHorizontal: 16 * scaleX,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchInputText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#000',
    flex: 1,
  },
  searchInputPlaceholder: {
    color: '#999',
  },
  dropdownArrowIcon: {
    width: 12 * scaleX,
    height: 12 * scaleX,
    tintColor: '#5a759d',
  },
  dropdownArrowIconOpen: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownMenu: {
    position: 'absolute',
    top: 55 * scaleX,
    left: 0,
    right: 0,
    maxWidth: REGISTER_FORM.roomNumber.selector.width * scaleX,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8 * scaleX,
    maxHeight: 400 * scaleX,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 16, // Android stacking
    zIndex: 10001,
  },
  dropdownSearchInput: {
    height: 50 * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16 * scaleX,
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
  },
  roomsDropdownList: {
    maxHeight: 350 * scaleX,
  },
  roomCard: {
    backgroundColor: '#fff',
    borderRadius: 12 * scaleX,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12 * scaleX,
    overflow: 'hidden',
  },
  selectedRoomCard: {
    width: '100%',
    maxWidth: REGISTER_FORM.roomNumber.selector.width * scaleX,
    height: REGISTER_FORM.roomNumber.selector.height * scaleX,
    borderRadius: REGISTER_FORM.roomNumber.selector.borderRadius * scaleX,
    borderWidth: 2,
    borderColor: '#5a759d',
    backgroundColor: '#f0f4ff',
    overflow: 'hidden',
  },
  roomCardContent: {
    flexDirection: 'row',
    minHeight: REGISTER_FORM.roomNumber.selector.height * scaleX,
    alignItems: 'center',
  },
  roomSelector: {
    width: '100%',
    maxWidth: REGISTER_FORM.roomNumber.selector.width * scaleX,
    height: REGISTER_FORM.roomNumber.selector.height * scaleX,
    borderRadius: REGISTER_FORM.roomNumber.selector.borderRadius * scaleX,
    borderWidth: REGISTER_FORM.roomNumber.selector.borderWidth,
    borderColor: REGISTER_FORM.roomNumber.selector.borderColor,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20 * scaleX,
    position: 'relative',
    backgroundColor: '#ffffff',
  },
  roomSelectorContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Create-ticket-like room card (used inside Lost & Found Location selector)
  roomNumberSection: {
    justifyContent: 'center',
    paddingHorizontal: 18 * scaleX,
    minWidth: 150 * scaleX,
  },
  roomNumberText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#5a759d',
  },
  verticalDivider: {
    width: 1,
    height: 54 * scaleX,
    backgroundColor: '#e5e7eb',
  },
  guestInfoSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14 * scaleX,
  },
  guestImageContainer: {
    position: 'relative',
    marginRight: 14 * scaleX,
  },
  guestImage: {
    width: 35 * scaleX,
    height: 35 * scaleX,
    borderRadius: 5 * scaleX,
  },
  guestImagePlaceholder: {
    width: 35 * scaleX,
    height: 35 * scaleX,
    borderRadius: 5 * scaleX,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestImagePlaceholderText: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#5a759d',
  },
  vipBadge: {
    position: 'absolute',
    right: -4 * scaleX,
    bottom: -4 * scaleX,
    width: 14 * scaleX,
    height: 14 * scaleX,
    borderRadius: 7 * scaleX,
    backgroundColor: '#ff0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vipBadgeText: {
    fontSize: 10 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'bold',
    color: '#fff',
  },
  vipBadgeIcon: {
    width: 12 * scaleX,
    height: 12 * scaleX,
    tintColor: '#ffffff',
  },
  guestDetails: {
    flex: 1,
  },
  guestNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4 * scaleX,
  },
  guestNameText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000',
  },
  vipCodeText: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#334866',
    marginLeft: 6 * scaleX,
  },
  guestMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestDatesText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000',
    marginRight: 12 * scaleX,
    flexShrink: 1,
  },
  guestCountIcon: {
    width: 12 * scaleX,
    height: 12 * scaleX,
    marginRight: 4 * scaleX,
    tintColor: '#666',
  },
  guestCountText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000',
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
    width: 16 * scaleX,
    height: 16 * scaleX,
    tintColor: '#999',
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
  roomText: {
    fontSize: REGISTER_FORM.roomNumber.roomText.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.roomNumber.roomText.fontWeight as any,
    color: REGISTER_FORM.roomNumber.roomText.color,
  },
  roomDivider: {
    width: REGISTER_FORM.roomNumber.divider.width,
    height: REGISTER_FORM.roomNumber.divider.height * scaleX,
    backgroundColor: REGISTER_FORM.roomNumber.divider.color,
    marginHorizontal: 20 * scaleX,
  },
  guestNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestText: {
    fontSize: REGISTER_FORM.roomNumber.guestText.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.roomNumber.guestText.fontWeight as any,
    color: REGISTER_FORM.roomNumber.guestText.color,
  },
  spinnerIcon: {
    width: 16 * scaleX,
    height: 16 * scaleX,
    marginLeft: 24 * scaleX, // Increased spacing to match Figma - positioned further right
  },
  avatar: {
    marginLeft: 20 * scaleX,
  },
  avatarCircle: {
    width: REGISTER_FORM.roomNumber.avatar.size * scaleX,
    height: REGISTER_FORM.roomNumber.avatar.size * scaleX,
    borderRadius: (REGISTER_FORM.roomNumber.avatar.size / 2) * scaleX,
    backgroundColor: '#5a759d',
  },
  badge: {
    position: 'absolute',
    right: -10 * scaleX,
    top: -10 * scaleX,
    width: REGISTER_FORM.roomNumber.badge.size * scaleX,
    height: REGISTER_FORM.roomNumber.badge.size * scaleX,
    borderRadius: (REGISTER_FORM.roomNumber.badge.size / 2) * scaleX,
    backgroundColor: REGISTER_FORM.roomNumber.badge.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: REGISTER_FORM.roomNumber.badge.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.roomNumber.badge.fontWeight as any,
    color: REGISTER_FORM.roomNumber.badge.textColor,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: -1000 * scaleX,
    right: -1000 * scaleX,
    bottom: -1000 * scaleX,
    backgroundColor: 'transparent',
    zIndex: 99,
  },
  roomDropdown: {
    position: 'absolute',
    top: REGISTER_FORM.roomNumber.selector.height * scaleX + 4 * scaleX,
    left: 0,
    right: 0,
    maxWidth: REGISTER_FORM.roomNumber.selector.width * scaleX,
    backgroundColor: '#ffffff',
    borderRadius: 8 * scaleX,
    borderWidth: 1,
    borderColor: '#afa9ad',
    maxHeight: 260 * scaleX,
    zIndex: 101,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  roomSearchContainer: {
    paddingHorizontal: 12 * scaleX,
    paddingVertical: 8 * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  roomSearchInput: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#111827',
  },
  roomDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20 * scaleX,
    paddingVertical: 12 * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  roomDropdownItemSelected: {
    backgroundColor: '#f5f5f5',
  },
  roomDropdownItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomDropdownRoomText: {
    fontSize: REGISTER_FORM.roomNumber.roomText.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.roomNumber.roomText.fontWeight as any,
    color: REGISTER_FORM.roomNumber.roomText.color,
  },
  roomDropdownDivider: {
    width: 1,
    height: 20 * scaleX,
    backgroundColor: REGISTER_FORM.roomNumber.divider.color,
    marginHorizontal: 12 * scaleX,
  },
  roomDropdownGuestText: {
    fontSize: REGISTER_FORM.roomNumber.guestText.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.roomNumber.guestText.fontWeight as any,
    color: REGISTER_FORM.roomNumber.guestText.color,
  },
  roomDropdownGuestNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roomDropdownGuestImage: {
    width: 18 * scaleX,
    height: 18 * scaleX,
    borderRadius: 4 * scaleX,
    marginRight: 8 * scaleX,
  },
  roomDropdownVipCodeText: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#334866',
    marginLeft: 6 * scaleX,
  },
  roomDropdownCheckmark: {
    fontSize: 18 * scaleX,
    color: '#5a759d',
    fontWeight: 'bold' as any,
    marginLeft: 12 * scaleX,
  },
  picturesLabel: {
    marginTop: 0, // Already accounted in roomSelector marginBottom
    marginBottom: 16 * scaleX, // Relative spacing from label to images
  },
  picturesContainer: {
    position: 'relative',
    marginBottom: 24 * scaleX, // Relative spacing to next section
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TWO_COL_GAP,
  },
  photoItem: {
    width: PHOTO_GRID_ITEM_SIZE,
    height: PHOTO_GRID_ITEM_SIZE,
    borderRadius: 16 * scaleX,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  addPhotoGridItem: {
    width: PHOTO_GRID_ITEM_SIZE,
    height: PHOTO_GRID_ITEM_SIZE,
    borderRadius: 11 * scaleX,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e3e3e3',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
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
  addPhotoSubtitle: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    textAlign: 'center',
    maxWidth: 280 * scaleX,
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
  picture1Grid: {
    position: 'absolute',
    width: ((Dimensions.get('window').width - (27 * 2 * scaleX) - (12 * scaleX)) / 2), // Two columns: (container width - padding - margin) / 2
    height: REGISTER_FORM.pictures.image1.height * scaleX,
    borderRadius: REGISTER_FORM.pictures.image1.borderRadius * scaleX,
    overflow: 'hidden',
  },
  picture2: {
    position: 'absolute',
    width: ((Dimensions.get('window').width - (27 * 2 * scaleX) - (12 * scaleX)) / 2), // Same width as picture1 for two-column layout
    height: REGISTER_FORM.pictures.image2.height * scaleX,
    borderRadius: REGISTER_FORM.pictures.image2.borderRadius * scaleX,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e3e3e3',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  picture2FullWidth: {
    width: Dimensions.get('window').width - (27 * 2 * scaleX), // Full width when no pictures
    height: REGISTER_FORM.pictures.image2.height * scaleX,
    borderRadius: REGISTER_FORM.pictures.image2.borderRadius * scaleX,
    backgroundColor: REGISTER_FORM.pictures.image2.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
  },
  picture2Error: {
    borderWidth: 2,
    borderColor: '#ff0000', // Red border for error
  },
  addIcon: {
    width: REGISTER_FORM.pictures.addIcon.width * scaleX,
    height: REGISTER_FORM.pictures.addIcon.height * scaleX,
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
    marginTop: 0, // Already accounted in picturesContainer marginBottom
    marginBottom: 45 * scaleX, // Space to next button (from Notes to Next button)
  },
  notesLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10 * scaleX,
  },
  notesIcon: {
    width: REGISTER_FORM.notes.icon.width * scaleX,
    height: REGISTER_FORM.notes.icon.height * scaleX,
    marginRight: 10 * scaleX,
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
    minHeight: 60 * scaleX,
    textAlignVertical: 'top',
    marginBottom: 39 * scaleX,
  },
  notesDivider: {
    width: REGISTER_FORM.notes.divider.width * scaleX,
    height: REGISTER_FORM.notes.divider.height,
    backgroundColor: REGISTER_FORM.notes.divider.color,
  },
  nextButton: {
    width: REGISTER_FORM.nextButton.width * scaleX,
    height: REGISTER_FORM.nextButton.height * scaleX,
    borderRadius: REGISTER_FORM.nextButton.borderRadius * scaleX,
    backgroundColor: REGISTER_FORM.nextButton.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
    // Match Figma: button starts at x=36; container padding is 27.
    alignSelf: 'flex-start',
    marginLeft: (REGISTER_FORM.nextButton.left - 27) * scaleX,
    marginTop: 32 * scaleX,
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
    paddingHorizontal: REGISTER_FORM.step2.foundedBy.field.paddingHorizontal * scaleX,
    marginBottom: 24 * scaleX, // Relative spacing to next section
  },
  step2FieldContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  step2Avatar: {
    width: REGISTER_FORM.step2.foundedBy.avatar.size * scaleX,
    height: REGISTER_FORM.step2.foundedBy.avatar.size * scaleX,
    borderRadius: (REGISTER_FORM.step2.foundedBy.avatar.size / 2) * scaleX,
    marginRight: 12 * scaleX,
  },
  step2InitialsCircle: {
    width: REGISTER_FORM.step2.foundedBy.avatar.size * scaleX,
    height: REGISTER_FORM.step2.foundedBy.avatar.size * scaleX,
    borderRadius: (REGISTER_FORM.step2.foundedBy.avatar.size / 2) * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12 * scaleX,
  },
  step2RegisteredInitialsCircle: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  step2InitialsText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'bold' as any,
    color: '#ffffff',
  },
  step2RegisteredInitialsText: {
    fontSize: 18 * scaleX,
    fontWeight: '800' as any,
  },
  step2FieldText: {
    fontSize: REGISTER_FORM.step2.foundedBy.name.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step2.foundedBy.name.fontWeight as any,
    color: REGISTER_FORM.step2.foundedBy.name.color,
  },
  step2SearchIcon: {
    width: REGISTER_FORM.step2.foundedBy.searchIcon.width * scaleX,
    height: REGISTER_FORM.step2.foundedBy.searchIcon.height * scaleX,
    tintColor: '#5a759d',
    marginLeft: 'auto', // Push to the right
  },
  step2StatusIcon: {
    width: REGISTER_FORM.step2.status.icon.size * scaleX,
    height: REGISTER_FORM.step2.status.icon.size * scaleX,
    marginRight: 12 * scaleX,
  },
  step2StatusCircle: {
    width: REGISTER_FORM.step2.status.icon.size * scaleX,
    height: REGISTER_FORM.step2.status.icon.size * scaleX,
    borderRadius: (REGISTER_FORM.step2.status.icon.size / 2) * scaleX,
    marginRight: 12 * scaleX,
  },
  step2Chevron: {
    width: REGISTER_FORM.step2.status.chevron.width * scaleX,
    height: REGISTER_FORM.step2.status.chevron.height * scaleX,
    tintColor: '#5a759d',
    transform: [{ rotate: '270deg' }],
  },
  // Step 3 Styles
  step3ItemImageContainer: {
    marginTop: (REGISTER_FORM.step3.itemImage.top - REGISTER_FORM.progressBar.top - REGISTER_FORM.progressBar.height - 10) * scaleX,
    marginLeft: REGISTER_FORM.step3.itemImage.left * scaleX,
    width: REGISTER_FORM.step3.itemImage.width * scaleX,
    height: REGISTER_FORM.step3.itemImage.height * scaleX,
    borderRadius: REGISTER_FORM.step3.itemImage.borderRadius * scaleX,
    overflow: 'hidden',
  },
  step3ItemImage: {
    width: '100%',
    height: '100%',
  },
  step3PicturesContainer: {
    position: 'relative',
    marginTop: (REGISTER_FORM.step3.itemImage.top - REGISTER_FORM.progressBar.top - REGISTER_FORM.progressBar.height - 10) * scaleX,
    marginLeft: 0, // No left margin, container padding handles it
    minHeight: REGISTER_FORM.pictures.image1.height * scaleX,
    marginBottom: 24 * scaleX,
  },
  step3PictureSingleContainer: {
    width: Dimensions.get('window').width - (27 * 2 * scaleX), // Full width minus container padding
    height: REGISTER_FORM.step3.itemImage.height * scaleX,
    borderRadius: REGISTER_FORM.step3.itemImage.borderRadius * scaleX,
    overflow: 'hidden',
  },
  step3PictureGridContainer: {
    position: 'absolute',
    width: ((Dimensions.get('window').width - (27 * 2 * scaleX) - (12 * scaleX)) / 2),
    height: REGISTER_FORM.pictures.image1.height * scaleX,
    borderRadius: REGISTER_FORM.pictures.image1.borderRadius * scaleX,
    overflow: 'hidden',
  },
  step3PictureImage: {
    width: '100%',
    height: '100%',
  },
  step3ItemDescriptionContainer: {
    marginTop: (REGISTER_FORM.step3.itemDescription.top - REGISTER_FORM.step3.itemImage.top - REGISTER_FORM.step3.itemImage.height) * scaleX * 0.7,
    marginLeft: REGISTER_FORM.step3.itemDescription.left * scaleX,
    width: '100%',
    paddingRight: 20 * scaleX,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  step3ItemDescription: {
    flex: 1,
    fontSize: REGISTER_FORM.step3.itemDescription.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step3.itemDescription.fontWeight as any,
    color: REGISTER_FORM.step3.itemDescription.color,
    marginRight: 8 * scaleX,
  },
  step3EditIcon: {
    width: REGISTER_FORM.step3.editIcon.size * scaleX,
    height: REGISTER_FORM.step3.editIcon.size * scaleX,
    marginLeft: 8 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  step3EditIconImage: {
    width: REGISTER_FORM.step3.editIcon.size * scaleX,
    height: REGISTER_FORM.step3.editIcon.size * scaleX,
  },
  step3FoundInLabel: {
    marginTop: (REGISTER_FORM.step3.foundIn.label.top - REGISTER_FORM.step3.itemDescription.top) * scaleX * 0.7,
    marginLeft: REGISTER_FORM.step3.foundIn.label.left * scaleX,
    fontSize: REGISTER_FORM.step3.foundIn.label.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step3.foundIn.label.fontWeight as any,
    color: REGISTER_FORM.step3.foundIn.label.color,
    marginBottom: 0,
  },
  step3FoundInContent: {
    marginTop: (REGISTER_FORM.step3.foundIn.checkbox.top - REGISTER_FORM.step3.foundIn.label.top) * scaleX * 0.5,
    marginLeft: 0,
    width: '100%',
    paddingRight: 0,
    marginBottom: 0,
  },
  step3FoundInOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40 * scaleX,
  },
  step3FoundInCard: {
    marginTop: 14 * scaleX,
    backgroundColor: 'rgba(100,131,176,0.07)',
    borderRadius: 6 * scaleX,
    paddingHorizontal: 12 * scaleX,
    paddingVertical: 12 * scaleX,
    width: '100%',
    alignSelf: 'stretch',
  },
  step3FoundInCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  step3FoundInRoomText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300' as any,
    color: '#5a759d',
    minWidth: 78 * scaleX,
  },
  step3FoundInDivider: {
    width: 1,
    height: 54 * scaleX,
    backgroundColor: '#5a759d',
    marginHorizontal: 12 * scaleX,
  },
  step3FoundInGuestSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  step3FoundInGuestImageContainer: {
    position: 'relative',
    marginRight: 12 * scaleX,
  },
  step3FoundInGuestImage: {
    width: 34.588 * scaleX,
    height: 34.588 * scaleX,
    borderRadius: 5 * scaleX,
  },
  step3FoundInGuestImagePlaceholder: {
    width: 34.588 * scaleX,
    height: 34.588 * scaleX,
    borderRadius: 5 * scaleX,
    backgroundColor: '#e5e7eb',
  },
  step3FoundInVipBadge: {
    position: 'absolute',
    right: -4 * scaleX,
    bottom: -4 * scaleX,
    width: 14.118 * scaleX,
    height: 14.118 * scaleX,
    borderRadius: 7.059 * scaleX,
    backgroundColor: '#ff0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  step3FoundInVipBadgeText: {
    fontSize: 10 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'bold',
    color: '#fff',
  },
  step3FoundInVipBadgeIcon: {
    width: 10 * scaleX,
    height: 10 * scaleX,
    tintColor: '#ffffff',
  },
  step3FoundInGuestDetails: {
    flex: 1,
  },
  step3FoundInGuestNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4 * scaleX,
  },
  step3FoundInGuestName: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000',
    flexShrink: 1,
  },
  step3FoundInVipCode: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#334866',
    marginLeft: 6 * scaleX,
  },
  step3FoundInGuestMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  step3FoundInDates: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000',
    marginRight: 12 * scaleX,
  },
  step3FoundInGuestCountIcon: {
    width: 12 * scaleX,
    height: 12 * scaleX,
    marginRight: 4 * scaleX,
    tintColor: '#666',
  },
  step3FoundInGuestCountText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000',
  },
  step3FoundInPublicAreaText: {
    flex: 1,
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300' as any,
    color: '#5a759d',
  },
  step3CheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  step3Checkbox: {
    width: REGISTER_FORM.step3.foundIn.checkbox.size * scaleX,
    height: REGISTER_FORM.step3.foundIn.checkbox.size * scaleX,
    borderWidth: 2,
    borderColor: '#5a759d',
    borderRadius: 4 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8 * scaleX,
  },
  step3CheckboxChecked: {
    backgroundColor: '#5a759d',
  },
  step3Checkmark: {
    fontSize: 18 * scaleX,
    color: '#ffffff',
    fontWeight: 'bold' as any,
  },
  step3CheckboxLabel: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'regular' as any,
    color: '#5a759d',
  },
  step3GuestInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: (REGISTER_FORM.step3.foundIn.guestInfo.top - REGISTER_FORM.step3.foundIn.checkbox.top) * scaleX * 0.5,
    marginLeft: (REGISTER_FORM.step3.foundIn.guestInfo.left - REGISTER_FORM.step3.foundIn.checkbox.left) * scaleX,
    width: '100%',
    paddingRight: 20 * scaleX,
    marginBottom: 0,
  },
  step3GuestIcon: {
    width: 28.371 * scaleX,
    height: 29.919 * scaleX,
    marginRight: 8 * scaleX,
    marginTop: 0, // Align icon with name baseline
  },
  step3GuestDetails: {
    flex: 1,
  },
  step3GuestName: {
    fontSize: REGISTER_FORM.step3.foundIn.guestName.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step3.foundIn.guestName.fontWeight as any,
    color: REGISTER_FORM.step3.foundIn.guestName.color,
  },
  step3RoomNumber: {
    fontSize: REGISTER_FORM.step3.foundIn.roomNumber.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step3.foundIn.roomNumber.fontWeight as any,
    color: REGISTER_FORM.step3.foundIn.roomNumber.color,
    marginTop: 4 * scaleX, // Reduced gap between name and room
  },
  step3EmailContainer: {
    marginTop: (REGISTER_FORM.step3.emailCheckbox.top - REGISTER_FORM.step3.foundIn.roomNumber.top) * scaleX * 0.7,
    marginLeft: REGISTER_FORM.step3.emailCheckbox.left * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 0,
  },
  step3EmailLabel: {
    fontSize: REGISTER_FORM.step3.emailCheckbox.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'regular' as any,
    color: REGISTER_FORM.step3.emailCheckbox.color,
  },
  step3Divider: {
    width: '100%',
    height: REGISTER_FORM.step3.divider.height * scaleX,
    backgroundColor: REGISTER_FORM.step3.divider.backgroundColor,
    marginBottom: 0,
  },
  step3DateTimeLabel: {
    marginTop: (REGISTER_FORM.step3.dateTime.label.top - 716) * scaleX * 0.7, // Divider is at 716px
    marginLeft: REGISTER_FORM.step3.dateTime.label.left * scaleX,
    fontSize: REGISTER_FORM.step3.dateTime.label.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step3.dateTime.label.fontWeight as any,
    color: REGISTER_FORM.step3.dateTime.label.color,
    marginBottom: 0,
  },
  step3DateTimeContainer: {
    marginTop: (REGISTER_FORM.step3.dateTime.date.top - REGISTER_FORM.step3.dateTime.label.top) * scaleX * 0.5,
    marginLeft: REGISTER_FORM.step3.dateTime.date.left * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingRight: 20 * scaleX,
    marginBottom: 0,
  },
  step3Date: {
    fontSize: REGISTER_FORM.step3.dateTime.date.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'regular' as any,
    color: REGISTER_FORM.step3.dateTime.date.color,
    marginRight: 16 * scaleX,
  },
  step3Time: {
    fontSize: REGISTER_FORM.step3.dateTime.time.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'regular' as any,
    color: REGISTER_FORM.step3.dateTime.time.color,
    marginRight: 16 * scaleX,
  },
  step3FoundedByLabel: {
    marginTop: (REGISTER_FORM.step3.foundedBy.label.top - 804) * scaleX * 0.7, // Divider is at 804px
    marginLeft: REGISTER_FORM.step3.foundedBy.label.left * scaleX,
    fontSize: REGISTER_FORM.step3.foundedBy.label.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step3.foundedBy.label.fontWeight as any,
    color: REGISTER_FORM.step3.foundedBy.label.color,
    marginBottom: 0,
  },
  step3RegisteredByLabel: {
    marginTop: (REGISTER_FORM.step3.registeredBy.label.top - REGISTER_FORM.step3.foundedBy.department.top) * scaleX * 0.7,
    marginLeft: REGISTER_FORM.step3.registeredBy.label.left * scaleX,
    fontSize: REGISTER_FORM.step3.registeredBy.label.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step3.registeredBy.label.fontWeight as any,
    color: REGISTER_FORM.step3.registeredBy.label.color,
    marginBottom: 0,
  },
  step3StaffInfo: {
    marginTop: (REGISTER_FORM.step3.foundedBy.avatar.top - REGISTER_FORM.step3.foundedBy.label.top) * scaleX * 0.5,
    marginLeft: REGISTER_FORM.step3.foundedBy.avatar.left * scaleX,
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 0,
  },
  step3RegisteredByStaffInfo: {
    marginTop: (REGISTER_FORM.step3.registeredBy.avatar.top - REGISTER_FORM.step3.registeredBy.label.top) * scaleX * 0.5,
    marginLeft: REGISTER_FORM.step3.registeredBy.avatar.left * scaleX,
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 0,
  },
  step3Avatar: {
    width: REGISTER_FORM.step3.foundedBy.avatar.size * scaleX,
    height: REGISTER_FORM.step3.foundedBy.avatar.size * scaleX,
    borderRadius: (REGISTER_FORM.step3.foundedBy.avatar.size / 2) * scaleX,
    marginRight: 12 * scaleX,
    marginTop: 0, // Align avatar with name baseline
  },
  step3InitialsCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  step3RegisteredInitialsCircle: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  step3InitialsText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'bold' as any,
    color: '#ffffff',
  },
  step3RegisteredInitialsText: {
    fontSize: 18 * scaleX,
    fontWeight: '800' as any,
  },
  step3StaffDetails: {
    flex: 1,
  },
  step3StaffName: {
    fontSize: REGISTER_FORM.step3.foundedBy.name.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step3.foundedBy.name.fontWeight as any,
    color: REGISTER_FORM.step3.foundedBy.name.color,
  },
  step3StaffDepartment: {
    fontSize: REGISTER_FORM.step3.foundedBy.department.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step3.foundedBy.department.fontWeight as any,
    color: REGISTER_FORM.step3.foundedBy.department.color,
    marginTop: 4 * scaleX, // Reduced gap between name and department
  },
  step3StatusLabel: {
    marginTop: (REGISTER_FORM.step3.status.label.top - 1021) * scaleX * 0.7, // Divider is at 1021px
    marginLeft: REGISTER_FORM.step3.status.label.left * scaleX,
    fontSize: REGISTER_FORM.step3.status.label.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step3.status.label.fontWeight as any,
    color: REGISTER_FORM.step3.status.label.color,
    marginBottom: 0,
  },
  step3StatusContainer: {
    marginTop: (REGISTER_FORM.step3.status.icon.top - REGISTER_FORM.step3.status.label.top) * scaleX * 0.5,
    marginLeft: REGISTER_FORM.step3.status.icon.left * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 0,
  },
  step3StatusCircle: {
    width: REGISTER_FORM.step3.status.icon.size * scaleX,
    height: REGISTER_FORM.step3.status.icon.size * scaleX,
    borderRadius: (REGISTER_FORM.step3.status.icon.size / 2) * scaleX,
    marginRight: 8 * scaleX,
  },
  step3StatusValue: {
    fontSize: REGISTER_FORM.step3.status.value.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step3.status.value.fontWeight as any,
    color: REGISTER_FORM.step3.status.value.color,
  },
  step3StoredLocationLabel: {
    marginTop: (REGISTER_FORM.step3.storedLocation.label.top - REGISTER_FORM.step3.status.value.top) * scaleX * 0.5,
    marginLeft: REGISTER_FORM.step3.storedLocation.label.left * scaleX,
    fontSize: REGISTER_FORM.step3.storedLocation.label.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step3.storedLocation.label.fontWeight as any,
    color: REGISTER_FORM.step3.storedLocation.label.color,
    marginBottom: 0,
  },
  step3StoredLocationValue: {
    marginTop: (REGISTER_FORM.step3.storedLocation.value.top - REGISTER_FORM.step3.storedLocation.label.top) * scaleX * 0.5,
    marginLeft: REGISTER_FORM.step3.storedLocation.value.left * scaleX,
    fontSize: REGISTER_FORM.step3.storedLocation.value.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: REGISTER_FORM.step3.storedLocation.value.fontWeight as any,
    color: REGISTER_FORM.step3.storedLocation.value.color,
    width: '100%',
  },
});

