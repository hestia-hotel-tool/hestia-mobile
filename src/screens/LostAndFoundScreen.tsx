import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Modal, TouchableOpacity, Text, Pressable, useWindowDimensions, Image, TextInput } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomTabBar from '../components/navigation/BottomTabBar';
import LostAndFoundHeader from '../components/lostAndFound/LostAndFoundHeader';
import LostAndFoundTabs from '../components/lostAndFound/LostAndFoundTabs';
import LostAndFoundItemCard, { type LostAndFoundStatusAnchorLayout } from '../components/lostAndFound/LostAndFoundItemCard';
import RegisterLostAndFoundModal from '../components/lostAndFound/RegisterLostAndFoundModal';
import ItemRegisteredSuccessModal from '../components/lostAndFound/ItemRegisteredSuccessModal';
import { useAIChatOverlay } from '../contexts/AIChatOverlayContext';
import { LostAndFoundTab, LostAndFoundItem, LostAndFoundStatus } from '../types/lostAndFound.types';
import {
  LOST_AND_FOUND_SPACING,
  LOST_AND_FOUND_COLORS,
  LOST_AND_FOUND_DIVIDER,
  scaleX,
} from '../constants/lostAndFoundStyles';
import type { ReturnToTab } from '../navigation/types';
import { LoadingOverlay } from '../components/shared/LoadingOverlay';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { typography } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { base64ToArrayBuffer } from '../utils/encoding';
import { getMyHotelId } from '../services/tenant';

type MainTabsParamList = {
  Home: undefined;
  Rooms: undefined;
  Chat: undefined;
  Tickets: undefined;
  LostAndFound: undefined;
  Staff: undefined;
  Settings: undefined;
};

type LostAndFoundScreenNavigationProp = BottomTabNavigationProp<MainTabsParamList, 'LostAndFound'>;

export default function LostAndFoundScreen() {
  const navigation = useNavigation<LostAndFoundScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { open: openAIChatOverlay } = useAIChatOverlay();
  const params = route.params as { openRegisterModal?: boolean; preselectedRoomId?: string } | undefined;
  const [activeTab, setActiveTab] = useState('LostAndFound');
  const [selectedTab, setSelectedTab] = useState<LostAndFoundTab>('created');
  const [items, setItems] = useState<LostAndFoundItem[]>([]);
  const itemsRef = React.useRef<LostAndFoundItem[]>([]);
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  /** First open / blank list — full-screen spinner. */
  const [listLoading, setListLoading] = useState(true);
  /** Refocus reload after we already have data — header indicator only (non-blocking). */
  const [refetchLoading, setRefetchLoading] = useState(false);
  const hasLoadedOnceRef = React.useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [preselectedRoomIdForRegister, setPreselectedRoomIdForRegister] = useState<string | undefined>(undefined);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    trackingNumber: string;
    itemImage?: string;
    itemData: any;
  } | null>(null);
  const [needsRefreshAfterRegister, setNeedsRefreshAfterRegister] = useState(false);
  const registerInflightRef = React.useRef<Promise<void> | null>(null);
  const pendingInsertedItemIdRef = React.useRef<string | null>(null);
  const [statusModalItem, setStatusModalItem] = useState<LostAndFoundItem | null>(null);
  const [statusAnchor, setStatusAnchor] = useState<LostAndFoundStatusAnchorLayout | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusUpdatingItemId, setStatusUpdatingItemId] = useState<string | null>(null);
  const [shippingMode, setShippingMode] = useState(false);
  const [shippingLocation, setShippingLocation] = useState('');
  const [shippingLocationCache, setShippingLocationCache] = useState<string[]>([]);
  const [shippingLocationByItemId, setShippingLocationByItemId] = useState<Record<string, string>>({});
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  /**
   * PostgREST schema cache may not include newly added columns immediately.
   * null = unknown, true = available, false = not available (fallback to local cache + status-only updates).
   */
  const shippedLocationColumnAvailableRef = React.useRef<boolean | null>(null);

  const SHIPPING_LOCATION_CACHE_KEY = 'lost_and_found:shipped_location_cache:v1';
  const SHIPPING_LOCATION_BY_ITEM_KEY = 'lost_and_found:shipped_location_by_item:v1';

  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SHIPPING_LOCATION_CACHE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setShippingLocationCache(parsed.filter((v) => typeof v === 'string').map((v) => v.trim()).filter(Boolean));
        }
      } catch {
        // ignore cache parse errors
      }
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SHIPPING_LOCATION_BY_ITEM_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setShippingLocationByItemId(parsed as Record<string, string>);
        }
      } catch {
        // ignore cache parse errors
      }
    })();
  }, []);

  const formatGuestDates = (arrival?: string | null, departure?: string | null): string => {
    if (!arrival || !departure) return '';
    const a = new Date(arrival);
    const d = new Date(departure);
    if (Number.isNaN(a.getTime()) || Number.isNaN(d.getTime())) return '';
    const fmt = (dt: Date) =>
      `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
    return `${fmt(a)}-${fmt(d)}`;
  };

  const formatRegisteredTimestamp = (iso?: string | null): string => {
    if (!iso) return '';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return '';
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
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
    return `${hh}:${mm}, ${dt.getDate()} ${monthNames[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  // Load items from Supabase lost_and_found_items table (with room + guest info)
  const loadItems = React.useCallback(async (source: 'mount' | 'focus' | 'pull' = 'mount') => {
    if (!isSupabaseConfigured) {
      setItems([]);
      setListLoading(false);
      setRefetchLoading(false);
      hasLoadedOnceRef.current = true;
      return;
    }

    if (source === 'pull') {
      /* refreshing toggled by onRefresh */
    } else if (source === 'focus' && hasLoadedOnceRef.current) {
      setRefetchLoading(true);
    } else {
      setListLoading(true);
    }

    try {
      const baseSelect = `
        id,
        item_name,
        description,
        status,
        storage_location,
        found_at,
        room_id,
        found_location,
        created_at,
        found_by_id,
        registered_by_id,
        tracking_number,
        image_url,
        rooms (
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
        )
      `;

      // `shipped_location` is added by a later migration; gracefully fallback when DB is behind.
      const withShippedSelect = baseSelect.replace('storage_location,', 'storage_location,\n        shipped_location,');

      let data: any[] | null = null;
      let error: any = null;

      ({ data, error } = await supabase
        .from('lost_and_found_items')
        .select(withShippedSelect)
        .order('found_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }));

      if (!error) shippedLocationColumnAvailableRef.current = true;

      if (error && error.code === '42703') {
        shippedLocationColumnAvailableRef.current = false;
        ({ data, error } = await supabase
          .from('lost_and_found_items')
          .select(baseSelect)
          .order('found_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false }));
      }

      if (error || !data) {
        console.warn('[LostAndFoundScreen] Failed to load items', error);
        setItems([]);
        return;
      }
      const rows = data as any[];

      const staffIds = Array.from(
        new Set(
          rows
            .map((row) => row.registered_by_id ?? row.found_by_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      const userById = new Map<string, { full_name?: string | null; avatar_url?: string | null }>();
      if (staffIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .in('id', staffIds);
        if (usersError) {
          console.warn('[LostAndFoundScreen] Failed to load registered-by users', usersError);
        } else if (usersData) {
          (usersData as any[]).forEach((user) => {
            userById.set(user.id, user);
          });
        }
      }
      const mapped: LostAndFoundItem[] = rows.map((row) => {
        const room = (row as any).rooms;
        const reservation = room?.reservations?.[0];
        const frontOfficeStatus = String(reservation?.front_office_status ?? '').trim();
        const isArrivalDeparture = frontOfficeStatus.toLowerCase() === 'arrival/departure';
        const guestsRaw = reservation?.guests;
        const guests = Array.isArray(guestsRaw) ? guestsRaw : guestsRaw ? [guestsRaw] : [];
        const guest = (isArrivalDeparture ? (guests?.[1] ?? guests?.[0]) : (guests?.[0])) ?? guests?.[0];
        const guestCount = (reservation?.adults || 0) + (reservation?.kids || 0);
        const registeredByUser = userById.get(row.registered_by_id ?? row.found_by_id);

        // Normalize image URL: legacy rows may store only the storage path.
        let imageUri: string | undefined;
        if (row.image_url) {
          if (typeof row.image_url === 'string') {
            const raw = row.image_url.trim();
            if (raw.startsWith('http')) {
              imageUri = raw;
            } else {
            const { data: publicUrlData } = supabase.storage
              .from('lost-and-found')
              .getPublicUrl(raw);
            imageUri = publicUrlData.publicUrl || undefined;
            }
          } else {
            const raw = String(row.image_url).trim();
            const { data: publicUrlData } = supabase.storage
              .from('lost-and-found')
              .getPublicUrl(raw);
            imageUri = publicUrlData.publicUrl || undefined;
          }
        }

        return {
          id: row.id,
          itemName: row.item_name,
          // Use tracking_number (e.g. FH31390); fall back to id if missing
          itemId: row.tracking_number ?? row.id,
          location:
            row.found_location ?? (room?.room_number ? `Room ${room.room_number}` : 'Public Area'),
          guestName: guest?.full_name,
          roomNumber: room?.room_number ? Number(room.room_number) : undefined,
          guestDates: formatGuestDates(reservation?.arrival_date, reservation?.departure_date),
          guestCount: guestCount || undefined,
          guestImage: {
            uri:
              String(guest?.image_url ?? '').trim() ||
              `https://i.pravatar.cc/96?u=${encodeURIComponent(String(guest?.id ?? `${row.room_id ?? row.id}-${guest?.full_name ?? 'guest'}`))}`,
          },
          storedLocation: row.storage_location ?? '',
          shippedLocation:
            (row as any).shipped_location ??
            shippingLocationByItemId[row.id] ??
            undefined,
          registeredBy: {
            name: registeredByUser?.full_name ?? 'Staff',
            avatar: registeredByUser?.avatar_url
              ? { uri: registeredByUser.avatar_url }
              : undefined,
            timestamp: formatRegisteredTimestamp((row as any).created_at),
          },
          // Prefer normalized public URL for the item image
          image: imageUri ? { uri: imageUri } : undefined,
          status: (row.status as LostAndFoundItem['status']) ?? 'stored',
          storedAt: (row as any).found_at ?? (row as any).created_at ?? undefined,
          createdAt: (row as any).created_at ?? '',
        };
      });
      setItems(mapped);
    } catch (e) {
      console.warn('[LostAndFoundScreen] Unexpected error loading items', e);
      setItems([]);
    } finally {
      if (source !== 'pull') {
        setListLoading(false);
      }
      setRefetchLoading(false);
      hasLoadedOnceRef.current = true;
    }
  }, [shippingLocationByItemId]);

  useEffect(() => {
    loadItems('mount');
  }, [loadItems]);

  // Open register modal if param is set
  useEffect(() => {
    if (params?.openRegisterModal) {
      setPreselectedRoomIdForRegister(params?.preselectedRoomId);
      setShowRegisterModal(true);
      // Clear the param to prevent reopening on subsequent renders
      navigation.setParams({ openRegisterModal: false, preselectedRoomId: undefined } as any);
    }
  }, [params?.openRegisterModal, navigation]);

  // Sync activeTab with current route
  useFocusEffect(
    React.useCallback(() => {
      const routeName = route.name as string;
      if (routeName === 'Home' || routeName === 'Rooms' || routeName === 'Chat' || routeName === 'Tickets') {
        setActiveTab(routeName);
      }
      // Reload when returning to this tab; after first load this is non-blocking (header spinner only)
      loadItems('focus');
    }, [route.name, loadItems])
  );

  const handleTabPress = (tab: string, options?: { fromRoomsAssignmentBadge?: boolean }) => {
    if (tab === 'AIHome') {
      openAIChatOverlay();
      return;
    }
    setActiveTab(tab); // Update immediately
    const returnToTab = (route.name as string) as 'Home' | 'Rooms' | 'Chat' | 'Tickets' | 'LostAndFound' | 'Staff' | 'Settings';
    if (tab === 'Home') {
      navigation.navigate('Home' as any);
    } else if (tab === 'Rooms') {
      navigation.navigate('Rooms' as any, {
        prioritizeMyAssignedRooms: !!options?.fromRoomsAssignmentBadge,
      });
    } else if (tab === 'Chat') {
      navigation.navigate('Chat' as any);
    } else if (tab === 'Tickets') {
      navigation.navigate('Tickets' as any);
    } else if (tab === 'LostAndFound') {
      (navigation as any).navigate('LostAndFound', { returnToTab });
    } else if (tab === 'Staff') {
      (navigation as any).navigate('Staff', { returnToTab });
    } else if (tab === 'Settings') {
      (navigation as any).navigate('Settings', { returnToTab });
    }
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      const returnToTab = (route.params as { returnToTab?: ReturnToTab } | undefined)?.returnToTab ?? 'Home';
      navigation.navigate(returnToTab as keyof MainTabsParamList);
    }
  };

  const handleRegisterPress = () => {
    setShowRegisterModal(true);
  };

  const handleCloseRegisterModal = () => {
    // Show loading immediately on close, then refresh once the modal is dismissed.
    // This avoids a perceived lag where the user taps Close but sees no feedback.
    if (hasLoadedOnceRef.current) {
      setRefetchLoading(true);
    } else {
      setListLoading(true);
    }
    setShowRegisterModal(false);
    setPreselectedRoomIdForRegister(undefined);
    // Always refresh the list when leaving the register flow (even if the user cancelled),
    // so the list reflects any new items created from another device/session.
    void loadItems('focus');
  };

  const handleRegisterNext = async (data: {
    trackingNumber?: string;
    itemImage?: string;
    itemData: any;
  }) => {
    let trackingNumberFromDb: string = data.trackingNumber ?? '';
    const firstImageUri: string | undefined = data.itemImage;

    // Close the register modal first; then show success.
    // iOS can drop a second Modal if it’s shown while another Modal is dismissing.
    // We refresh only once when the success modal is closed, but we must ensure the insert finished first.
    setNeedsRefreshAfterRegister(true);
    setSuccessData({
      trackingNumber: trackingNumberFromDb,
      itemImage: data.itemImage,
      itemData: data.itemData,
    });
    setShowRegisterModal(false);
    setTimeout(() => setShowSuccessModal(true), 250);

    registerInflightRef.current = (async () => {
      try {
      if (isSupabaseConfigured) {
        const itemData = data.itemData ?? {};
        const title: string = itemData.title ?? '';
        const notes: string = itemData.notes ?? '';
        const status: string = itemData.status ?? 'stored';
        const storedLocation: string | null = itemData.storedLocation ?? null;
        const selectedLocation: 'room' | 'publicArea' = itemData.selectedLocation ?? 'room';
        const selectedRoom = itemData.selectedRoom as { number?: string } | undefined;
        const selectedPublicArea = itemData.selectedPublicArea as string | null | undefined;
        const selectedDate: Date = itemData.selectedDate ?? new Date();
        const selectedHour: number = itemData.selectedHour ?? selectedDate.getHours();
        const selectedMinute: number = itemData.selectedMinute ?? selectedDate.getMinutes();
        const registeredByIdFromForm: string | null = itemData.registeredBy ?? null;

        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id ?? null;

        const hotelId = await getMyHotelId();
        if (!hotelId) throw new Error('No hotel assigned to this user.');

        // Build found_at timestamp
        const foundAt = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          selectedHour,
          selectedMinute,
          0,
          0
        ).toISOString();

        const foundLocation =
          selectedLocation === 'room' && selectedRoom?.number
            ? `Room ${selectedRoom.number}`
            : selectedPublicArea
              ? selectedPublicArea
              : 'Public Area';

        // Use Title when provided; fallback to deriving from notes
        const itemName =
          title.trim() ||
          (notes || '')
            .split(/[.!]/)[0]
            .trim()
            .split(' ')
            .slice(0, 4)
            .join(' ') ||
          'Lost item';

        // Upload first image to Supabase storage (lost-and-found bucket), if present.
        // Only persist a remote URL so the image displays when loading from DB (iOS and Android).
        let imageUrl: string | null = null;
        if (firstImageUri) {
          try {
            let body: ArrayBuffer | Blob;
            let contentType = 'image/jpeg';
            const extMatch = firstImageUri.split('.').pop();
            const rawExt = (extMatch || 'jpg').split('?')[0].toLowerCase();
            const normalizedExt = rawExt === 'heic' ? 'jpg' : rawExt;

            if (firstImageUri.startsWith('file://')) {
              // Prefer reading local file as base64 -> ArrayBuffer (more consistent for RN uploads).
              // This avoids relying on fetch() for `file://` URIs.
              const base64 = await FileSystem.readAsStringAsync(firstImageUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              body = base64ToArrayBuffer(base64);
              contentType = normalizedExt === 'png' ? 'image/png' : 'image/jpeg';
            } else {
              // content:// or ph:// (Android / iOS library) – copy to cache then read as base64
              let uriToRead = firstImageUri;
              if (!firstImageUri.startsWith('file://')) {
                const tempPath = `${FileSystem.cacheDirectory}lost_found_${Date.now()}.${normalizedExt}`;
                await FileSystem.copyAsync({ from: firstImageUri, to: tempPath });
                uriToRead = tempPath;
              }
              const base64 = await FileSystem.readAsStringAsync(uriToRead, {
                encoding: FileSystem.EncodingType.Base64,
              });
              contentType = normalizedExt === 'png' ? 'image/png' : 'image/jpeg';
              // Supabase storage upload is most reliable with an ArrayBuffer in React Native.
              body = base64ToArrayBuffer(base64);
            }

            const fileName = `${hotelId}/items/${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}.${normalizedExt}`;

            let uploadData: any = null;
            let uploadError: any = null;

            // 1) Try signed upload first (often more reliable in RN)
            try {
              const { data: signedUpload, error: signedUrlError } = await supabase.storage
                .from('lost-and-found')
                .createSignedUploadUrl(fileName, { upsert: false });

              if (!signedUrlError && signedUpload?.token) {
                const { data: signedUploadData, error: signedUploadError } = await supabase.storage
                  .from('lost-and-found')
                  .uploadToSignedUrl(fileName, signedUpload.token, body, {
                    contentType,
                  });

                uploadData = signedUploadData;
                uploadError = signedUploadError;
                if (signedUploadError) {
                  console.warn('[LostAndFoundScreen] uploadToSignedUrl failed', {
                    message: String(signedUploadError?.message ?? signedUploadError ?? ''),
                    status: (signedUploadError as any)?.status,
                    statusCode: (signedUploadError as any)?.statusCode,
                  });
                }
              } else if (signedUrlError) {
                console.warn('[LostAndFoundScreen] createSignedUploadUrl failed', signedUrlError);
              }
            } catch (signedException) {
              console.warn('[LostAndFoundScreen] Signed upload exception', signedException);
            }

            // 2) Fallback to direct upload with retry
            if (uploadError || !uploadData?.path) {
              const maxAttempts = 3;
              for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                // eslint-disable-next-line no-await-in-loop
                const result = await supabase.storage.from('lost-and-found').upload(fileName, body, {
                  contentType,
                  upsert: false,
                });
                uploadData = result.data;
                uploadError = result.error;

                if (!uploadError) break;

                const message = String(uploadError?.message ?? uploadError ?? '');
                const isTransientNetwork = message.includes('Network request failed');
                if (!isTransientNetwork || attempt === maxAttempts) break;

                console.warn('[LostAndFoundScreen] Upload attempt failed, retrying', {
                  attempt,
                  maxAttempts,
                  message,
                });
                // eslint-disable-next-line no-await-in-loop
                await new Promise((r) => setTimeout(r, attempt * 800));
              }
            }

            if (!uploadError && uploadData?.path) {
              const { data: publicUrlData } = supabase.storage
                .from('lost-and-found')
                .getPublicUrl(uploadData.path);
              const url = publicUrlData.publicUrl ?? null;
              // Only use URL for DB if it's a remote URL (so it displays when we load items)
              if (url) imageUrl = url;
            } else if (uploadError) {
              console.warn('[LostAndFoundScreen] Failed to upload lost-and-found image', uploadError);
            }
          } catch (uploadException) {
            console.warn('[LostAndFoundScreen] Unexpected error uploading image', uploadException);
          }
        }

        if (userId) {
          const { data: inserted, error } = await supabase
            .from('lost_and_found_items')
            .insert({
              item_name: itemName,
              description: notes.trim() || null,
              status,
              storage_location: storedLocation,
              found_at: foundAt,
              found_by_id: userId,
              registered_by_id: registeredByIdFromForm ?? userId,
              found_location: foundLocation,
              room_id:
                selectedLocation === 'room' && selectedRoom
                  ? (selectedRoom as any).id
                  : null,
              image_url: imageUrl,
              hotel_id: hotelId,
            })
            .select('id, tracking_number, image_url')
            .single();
          if (!error && inserted?.tracking_number) {
            trackingNumberFromDb = inserted.tracking_number;
          }
          if (!error && inserted?.id) {
            pendingInsertedItemIdRef.current = inserted.id;
          }
          // Do not refresh here; we refresh once when the user closes the success modal.
        } else {
          console.warn('[LostAndFoundScreen] No authenticated user – lost & found item not persisted.');
        }
      }
      } catch (e) {
        console.warn('[LostAndFoundScreen] Failed to persist lost & found item', e);
      } finally {
        // Update the success screen with the final tracking number, if we got one.
        setSuccessData((prev) => ({
          ...(prev ?? { itemData: data.itemData, itemImage: data.itemImage, trackingNumber: '' }),
          trackingNumber: trackingNumberFromDb,
        }));
      }
    })();
  };

  const handleCloseSuccessModal = () => {
    // Show loading immediately, then refresh exactly once so the new item appears without flicker.
    if (needsRefreshAfterRegister) {
      if (hasLoadedOnceRef.current) setRefetchLoading(true);
      else setListLoading(true);
      void (async () => {
        try {
          // Wait for the insert/upload to finish if the user closes quickly.
          await (registerInflightRef.current ?? Promise.resolve());

          // Refresh; if PostgREST/storage propagation is slightly behind, retry briefly until the new item shows.
          const pendingId = pendingInsertedItemIdRef.current;
          const maxAttempts = pendingId ? 3 : 1;
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            // eslint-disable-next-line no-await-in-loop
            await loadItems('focus');
            if (!pendingId) break;
            const hasIt = itemsRef.current.some((it) => it.id === pendingId);
            if (hasIt) break;
            // eslint-disable-next-line no-await-in-loop
            await new Promise((r) => setTimeout(r, attempt * 600));
          }
        } finally {
          pendingInsertedItemIdRef.current = null;
          registerInflightRef.current = null;
          setNeedsRefreshAfterRegister(false);
        }
      })();
    }
    setShowSuccessModal(false);
    setSuccessData(null);
    // No reload here: we already refresh right after insert in `handleRegisterNext`.
  };

  const handleTabChange = (tab: LostAndFoundTab) => {
    setSelectedTab(tab);
  };

  const handleItemPress = (item: LostAndFoundItem) => {
    // TODO: Navigate to item detail screen when implemented
    console.log('Item pressed:', item.id);
  };

  const handleStatusPress = (item: LostAndFoundItem, anchor?: LostAndFoundStatusAnchorLayout) => {
    setStatusModalItem(item);
    setStatusAnchor(anchor ?? null);
    setShippingMode(false);
    setShippingLocation(item.shippedLocation ?? '');
  };

  const handleStatusSelect = async (newStatus: LostAndFoundStatus) => {
    const item = statusModalItem;
    if (newStatus === 'shipped') {
      // Open shipped-location popover (Figma 3107:70)
      setShippingMode(true);
      return;
    }
    setStatusUpdating(true);
    setStatusUpdatingItemId(item?.id ?? null);
    if (!item || !isSupabaseConfigured) return;
    try {
      const { error } = await supabase
        .from('lost_and_found_items')
        .update({ status: newStatus })
        .eq('id', item.id);
      if (error) {
        console.warn('[LostAndFoundScreen] Failed to update status', error);
        return;
      }
      setStatusModalItem(null);
      setStatusAnchor(null);
      await loadItems('focus');
    } catch (e) {
      console.warn('[LostAndFoundScreen] Error updating status', e);
    } finally {
      setStatusUpdating(false);
      setStatusUpdatingItemId(null);
    }
  };

  const shippedLocationOptions = React.useMemo(() => {
    const unique = new Map<string, string>(); // lower -> original
    const add = (v: string) => {
      const trimmed = v.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!unique.has(key)) unique.set(key, trimmed);
    };
    // Prefer local cache (recent first), then DB values.
    for (const v of shippingLocationCache) add(v);
    for (const it of items) add(it.shippedLocation ?? '');

    const q = shippingLocation.trim().toLowerCase();
    const values = Array.from(unique.values());
    if (!q) return values.slice(0, 20);

    // “Contains” matching with stronger ranking for exact/prefix/word-boundary matches.
    const tokens = q.split(/\s+/).filter(Boolean);
    const score = (v: string) => {
      const lc = v.toLowerCase();
      let s = 0;

      if (lc === q) s += 100;
      if (lc.startsWith(q)) s += 60;
      if (lc.includes(` ${q}`) || lc.includes(`-${q}`) || lc.includes(`,${q}`)) s += 40; // word-ish boundary
      if (lc.includes(q)) s += 20;

      for (const t of tokens) {
        if (!t) continue;
        if (lc === t) s += 10;
        if (lc.startsWith(t)) s += 6;
        if (lc.includes(` ${t}`) || lc.includes(`-${t}`) || lc.includes(`,${t}`)) s += 4;
        if (lc.includes(t)) s += 2;
      }

      // Prefer shorter strings when scores tie (more exact).
      s -= Math.min(10, Math.floor(lc.length / 20));
      return s;
    };
    return values
      .map((v) => ({ v, s: score(v) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.v)
      .slice(0, 20);
  }, [items, shippingLocationCache, shippingLocation]);

  const saveShippedLocation = React.useCallback(
    async (value: string) => {
      const item = statusModalItem;
      const trimmed = value.trim();
      if (!item || !isSupabaseConfigured || !trimmed) return;
      setStatusUpdating(true);
      setStatusUpdatingItemId(item.id);
      try {
        // Always cache locally (we may be in schema-cache lag).
        setShippingLocationByItemId((prev) => {
          const next = { ...prev, [item.id]: trimmed };
          AsyncStorage.setItem(SHIPPING_LOCATION_BY_ITEM_KEY, JSON.stringify(next)).catch(() => {});
          return next;
        });

        // If PostgREST doesn't know this column yet, do a status-only update without warning spam.
        const shippedLocationColumnAvailable = shippedLocationColumnAvailableRef.current;
        if (shippedLocationColumnAvailable === false) {
          const statusOnly = await supabase.from('lost_and_found_items').update({ status: 'shipped' }).eq('id', item.id);
          if (statusOnly.error) {
            console.warn('[LostAndFoundScreen] Failed to update shipped status', statusOnly.error);
            return;
          }
        } else {
          // Attempt full update; if schema cache rejects shipped_location, remember and fallback.
          const { error } = await supabase
            .from('lost_and_found_items')
            .update({ status: 'shipped', shipped_location: trimmed })
            .eq('id', item.id);

          if (error && error.code === 'PGRST204') {
            shippedLocationColumnAvailableRef.current = false;
            const statusOnly = await supabase.from('lost_and_found_items').update({ status: 'shipped' }).eq('id', item.id);
            if (statusOnly.error) {
              console.warn('[LostAndFoundScreen] Failed to update shipped status', statusOnly.error);
              return;
            }
          } else if (error) {
            console.warn('[LostAndFoundScreen] Failed to update shipped location', error);
            return;
          } else {
            shippedLocationColumnAvailableRef.current = true;
          }
        }

        setStatusModalItem(null);
        setStatusAnchor(null);
        setShippingMode(false);
        setShippingLocation('');
        // Update local cache (recent-first) so it shows up as suggestions next time.
        setShippingLocationCache((prev) => {
          const next = [trimmed, ...prev.filter((p) => p.trim().toLowerCase() !== trimmed.toLowerCase())].slice(0, 30);
          AsyncStorage.setItem(SHIPPING_LOCATION_CACHE_KEY, JSON.stringify(next)).catch(() => {});
          return next;
        });
        await loadItems('focus');
      } catch (e) {
        console.warn('[LostAndFoundScreen] Error updating shipped location', e);
      } finally {
        setStatusUpdating(false);
        setStatusUpdatingItemId(null);
      }
    },
    [statusModalItem, loadItems]
  );

  const statusPopoverPosition = React.useMemo(() => {
    if (!statusAnchor) return null;
    const margin = 16 * scaleX;
    const popoverW = 340 * scaleX;
    const popoverH = 230 * scaleX; // approximate, clamped
    // Center the popover under the anchor (more robust than aligning by right edge,
    // and works even when we only have a tap point with width/height = 0).
    const anchorCenterX = statusAnchor.x + (statusAnchor.width || 0) / 2;
    const left = Math.max(margin, Math.min(windowWidth - popoverW - margin, anchorCenterX - popoverW / 2));
    const desiredTop = statusAnchor.y + statusAnchor.height + 14 * scaleX;
    const top = Math.max(margin, Math.min(windowHeight - popoverH - margin, desiredTop));

    const notchSize = 12 * scaleX;
    const notchCenterX = anchorCenterX - left;
    const notchLeft = Math.max(14 * scaleX, Math.min(popoverW - 14 * scaleX - notchSize, notchCenterX - notchSize / 2));
    return { left, top, notchLeft, width: popoverW };
  }, [statusAnchor, windowWidth, windowHeight]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadItems('pull').finally(() => setRefreshing(false));
  }, [loadItems]);

  // Filter items based on selected tab
  const filteredItems = items.filter((item) => {
    switch (selectedTab) {
      case 'created':
        return true; // Show all cards
      case 'stored':
        return item.status === 'stored';
      case 'returned':
        return item.status === 'shipped'; // Shipped tab shows items with "shipped" status
      case 'discarded':
        return item.status === 'discarded';
      default:
        return false;
    }
  });

  return (
    <View style={styles.container}>
      {(listLoading || refetchLoading) && <LoadingOverlay fullScreen message="Loading items…" />}
      {refreshing && !listLoading && <LoadingOverlay fullScreen message="Refreshing…" />}
      <View style={styles.scrollContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: LOST_AND_FOUND_SPACING.contentPaddingTop * scaleX + insets.top },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Item Cards - spacing from Figma 733-662 (card marginBottom only) */}
          {filteredItems.map((item) => (
            <LostAndFoundItemCard
              key={item.id}
              item={item}
              onPress={() => handleItemPress(item)}
              onStatusPress={(anchor) => handleStatusPress(item, anchor)}
              statusUpdating={statusUpdating && statusUpdatingItemId === item.id}
            />
          ))}
        </ScrollView>

        {/* Blur Overlay for content only */}
      </View>

      {/* Header - Fixed at top */}
      <LostAndFoundHeader
        onBackPress={handleBackPress}
        onRegisterPress={handleRegisterPress}
        syncing={refetchLoading}
      />

      {/* Tabs - Fixed below header */}
      <LostAndFoundTabs selectedTab={selectedTab} onTabPress={handleTabChange} />

      {/* Bottom Navigation */}
      <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />

      {/* Register Modal */}
      <RegisterLostAndFoundModal
        visible={showRegisterModal}
        onClose={handleCloseRegisterModal}
        onNext={handleRegisterNext}
        preselectedRoomId={preselectedRoomIdForRegister}
      />

      {/* Success Modal */}
      <ItemRegisteredSuccessModal
        visible={showSuccessModal}
        onClose={handleCloseSuccessModal}
        trackingNumber={successData?.trackingNumber || ''}
        itemImage={successData?.itemImage}
      />

      {/* Change status popover (anchored, like Tickets) */}
      <Modal
        visible={!!statusModalItem}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalItem(null)}
      >
        <View style={styles.statusModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (statusUpdating) return;
              setStatusModalItem(null);
              setStatusAnchor(null);
              setShippingMode(false);
              setShippingLocation('');
            }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss status menu"
          />
          <View
            style={[
              styles.statusPopover,
              statusPopoverPosition
                ? { position: 'absolute', left: statusPopoverPosition.left, top: statusPopoverPosition.top, width: statusPopoverPosition.width }
                : null,
            ]}
          >
            <View
              style={[
                styles.statusPopoverNotch,
                statusPopoverPosition ? { left: statusPopoverPosition.notchLeft } : null,
              ]}
            />
            {shippingMode ? (
              <View>
                <Text style={styles.shippedPopoverTitle}>Shipped Location</Text>
                <View style={styles.shippedInputRow}>
                  <TextInput
                    value={shippingLocation}
                    onChangeText={setShippingLocation}
                    placeholder="Enter location"
                    placeholderTextColor="rgba(0,0,0,0.35)"
                    editable={!statusUpdating}
                    style={styles.shippedInput}
                    onSubmitEditing={() => saveShippedLocation(shippingLocation)}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={styles.shippedSendBtn}
                    disabled={statusUpdating || !shippingLocation.trim()}
                    onPress={() => saveShippedLocation(shippingLocation)}
                  >
                    <Image source={require('../../assets/icons/arrow-forward.png')} style={styles.shippedSendIcon} resizeMode="contain" />
                  </TouchableOpacity>
                </View>

                {shippedLocationOptions.length > 0 && (
                  <ScrollView style={styles.shippedOptions} contentContainerStyle={styles.shippedOptionsContent} showsVerticalScrollIndicator={false}>
                    {shippedLocationOptions.map((opt) => {
                      const active = opt.trim().toLowerCase() === shippingLocation.trim().toLowerCase();
                      return (
                        <TouchableOpacity
                          key={opt}
                          style={styles.shippedOptionRow}
                          disabled={statusUpdating}
                          onPress={() => {
                            setShippingLocation(opt);
                            saveShippedLocation(opt);
                          }}
                        >
                          <Image source={require('../../assets/icons/location-pin-icon.png')} style={styles.shippedOptionIcon} resizeMode="contain" />
                          <Text style={styles.shippedOptionText} numberOfLines={1}>
                            {opt}
                          </Text>
                          {active ? (
                            <Image source={require('../../assets/icons/tick.png')} style={styles.shippedOptionCheck} resizeMode="contain" />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            ) : (
              <>
                <Text style={styles.statusModalTitle}>Change status</Text>
                <View style={styles.statusGrid}>
                  <TouchableOpacity
                    style={styles.statusGridItem}
                    activeOpacity={0.8}
                    disabled={statusUpdating}
                    onPress={() => handleStatusSelect('stored')}
                  >
                    <View style={[styles.statusCircle, styles.statusCircleStored, statusModalItem?.status === 'stored' && styles.statusCircleActive]}>
                      <Image source={require('../../assets/icons/down-arrow.png')} style={styles.statusCircleIcon} resizeMode="contain" />
                    </View>
                    <Text style={styles.statusGridLabel}>Stored</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.statusGridItem}
                    activeOpacity={0.8}
                    disabled={statusUpdating}
                    onPress={() => handleStatusSelect('shipped')}
                  >
                    <View
                      style={[
                        styles.statusCircle,
                        styles.statusCircleShipped,
                        (statusModalItem?.status === 'shipped' || statusModalItem?.status === 'returned') && styles.statusCircleActive,
                      ]}
                    >
                      <Image source={require('../../assets/icons/tick.png')} style={styles.statusCircleIcon} resizeMode="contain" />
                    </View>
                    <Text style={styles.statusGridLabel}>Shipped</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.statusGridItem}
                    activeOpacity={0.8}
                    disabled={statusUpdating}
                    onPress={() => handleStatusSelect('discarded')}
                  >
                    <View style={[styles.statusCircle, styles.statusCircleDiscarded, statusModalItem?.status === 'discarded' && styles.statusCircleActive]}>
                      <Text style={styles.statusCircleText}>×</Text>
                    </View>
                    <Text style={styles.statusGridLabel}>Discarded</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LOST_AND_FOUND_COLORS.background,
  },
  scrollContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: LOST_AND_FOUND_SPACING.contentPaddingTop * scaleX,
    paddingBottom: LOST_AND_FOUND_SPACING.contentPaddingBottom * scaleX,
    paddingHorizontal: 0,
    minHeight: '100%',
  },
  contentBlurOverlay: {
    position: 'absolute',
    top: (133 + 39) * scaleX, // Start below header and tabs
    left: 0,
    right: 0,
    bottom: 152 * scaleX, // Stop above bottom nav
    zIndex: 1,
  },
  blurOverlayDarkener: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(200, 200, 200, 0.6)',
  },
  statusModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  statusPopover: {
    zIndex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e3e3e3',
    borderRadius: 12 * scaleX,
    paddingVertical: 14 * scaleX,
    paddingHorizontal: 16 * scaleX,
    shadowColor: '#6483B0',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  statusPopoverNotch: {
    position: 'absolute',
    top: -6 * scaleX,
    width: 12 * scaleX,
    height: 12 * scaleX,
    backgroundColor: '#ffffff',
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: '#e3e3e3',
    transform: [{ rotate: '45deg' }],
  },
  statusModalTitle: {
    fontSize: 18 * scaleX,
    fontWeight: '700',
    color: LOST_AND_FOUND_COLORS.tabActive,
    marginBottom: 12 * scaleX,
    textAlign: 'left',
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusGridItem: {
    width: 64 * scaleX,
    alignItems: 'center',
  },
  statusCircle: {
    width: 44 * scaleX,
    height: 44 * scaleX,
    borderRadius: 22 * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCircleStored: {
    backgroundColor: LOST_AND_FOUND_COLORS.statusStored,
  },
  statusCircleShipped: {
    backgroundColor: LOST_AND_FOUND_COLORS.statusShipped,
  },
  statusCircleDiscarded: {
    backgroundColor: '#9ca3af',
  },
  statusCircleActive: {
    borderWidth: 2 * scaleX,
    borderColor: '#5b769e',
  },
  statusCircleIcon: {
    width: 12 * scaleX,
    height: 12 * scaleX,
    tintColor: '#ffffff',
  },
  statusCircleText: {
    fontSize: 12 * scaleX,
    fontWeight: '700',
    color: '#ffffff',
    includeFontPadding: false,
    lineHeight: 12 * scaleX,
  },
  statusGridLabel: {
    marginTop: 8 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    textAlign: 'center',
  },
  shippedPopoverTitle: {
    fontSize: 16 * scaleX,
    fontWeight: '700',
    color: '#48c755',
    marginBottom: 12 * scaleX,
  },
  shippedInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bdbaba',
    borderRadius: 5 * scaleX,
    height: 45 * scaleX,
    paddingLeft: 12 * scaleX,
    paddingRight: 8 * scaleX,
  },
  shippedInput: {
    flex: 1,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    paddingVertical: 0,
  },
  shippedSendBtn: {
    width: 34 * scaleX,
    height: 34 * scaleX,
    borderRadius: 17 * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shippedSendIcon: {
    width: 14 * scaleX,
    height: 14 * scaleX,
    tintColor: '#5a759d',
    transform: [{ rotate: '90deg' }],
  },
  shippedOptions: {
    marginTop: 12 * scaleX,
    maxHeight: 4 * (40 * scaleX), // max 4 rows visible, then scroll
  },
  shippedOptionsContent: {
    paddingBottom: 2 * scaleX,
  },
  shippedOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10 * scaleX,
  },
  shippedOptionIcon: {
    width: 16 * scaleX,
    height: 16 * scaleX,
    tintColor: '#c6c5c5',
    marginRight: 10 * scaleX,
  },
  shippedOptionText: {
    flex: 1,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
  },
  shippedOptionCheck: {
    width: 14 * scaleX,
    height: 14 * scaleX,
    tintColor: '#5a759d',
  },
});
