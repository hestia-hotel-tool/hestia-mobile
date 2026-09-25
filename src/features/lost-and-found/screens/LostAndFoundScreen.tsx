import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from 'expo-router';
import { BottomTabNavigationProp } from "expo-router/js-tabs";
import { LOST_AND_FOUND_CARD_LAYOUT as CARD_LAYOUT } from '../components/itemCard/lostAndFoundCardLayout';
import { LOST_AND_FOUND_SCREEN_LAYOUT as SCREEN_LAYOUT } from '../constants/lostAndFoundScreenLayout';
import LostAndFoundStatusPopover from '../components/LostAndFoundStatusPopover';
import { rankShippedLocations } from '../utils/shippedLocationSuggestions';
import BottomTabBar from '@/components/layout/BottomTabBar';
import LostAndFoundHeader from '../components/LostAndFoundHeader';
import LostAndFoundTabs from '../components/LostAndFoundTabs';
import LostAndFoundItemCard, { type LostAndFoundStatusAnchorLayout } from '../components/LostAndFoundItemCard';
import EmptyLostAndFoundState from '../components/EmptyLostAndFoundState';
import RegisterLostAndFoundModal from '../components/RegisterLostAndFoundModal';
import ItemRegisteredSuccessModal from '../components/ItemRegisteredSuccessModal';
import { useUserStore } from '@features/account/store/useUserStore';
import { LostAndFoundTab, LostAndFoundItem, LostAndFoundStatus } from '../types/lostAndFound.types';
import { LOST_AND_FOUND_COLORS, scaleX } from '../constants/lostAndFoundStyles';
import type { ReturnToTab } from '@/types/navigation';
import { LoadingOverlay } from '@/components/feedback/LoadingOverlay';
import { useToast } from '@/contexts/ToastContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchLostAndFoundRows,
  fetchRegisteredByUsers,
  getLostAndFoundPublicUrl,
  createLostAndFoundItem,
  updateLostAndFoundStatus,
  setLostAndFoundShipped,
} from '../services/lostAndFound';

type MainTabsParamList = {
  '(home)/index': undefined;
  '(rooms)/index': undefined;
  '(chats)/index': undefined;
  '(tickets)/index': undefined;
  '(lost_and_found)/index': undefined;
  '(staff)/index': undefined;
  '(settings)/index': undefined;
};

type LostAndFoundScreenNavigationProp = BottomTabNavigationProp<MainTabsParamList, '(lost_and_found)/index'>;

/**
 * Which statuses each tab shows. `null` means "no filter".
 *
 * A table rather than a `switch`, so the tab set and its meaning sit together
 * and a new state is a row.
 *
 * **`returned` matches two statuses.** The filter used to be
 * `item.status === 'shipped'` alone, so a row whose status is literally
 * `'returned'` — a value `LostAndFoundStatus` permits and the free-text DB
 * column allows — appeared under no tab at all and was invisible in the app.
 * The card has always coalesced the two for display; this makes the filter
 * agree with it.
 *
 * On the naming: the tab reads "Returned" while the cards inside it read
 * "Shipped". That is what Figma 3128:32 draws and it is deliberate — see
 * `LOST_AND_FOUND_TAB_LABELS`.
 */
const TAB_STATUS: Record<LostAndFoundTab, LostAndFoundStatus[] | null> = {
  created: null,
  stored: ['stored'],
  returned: ['shipped', 'returned'],
  discarded: ['discarded'],
};

export default function LostAndFoundScreen() {
  const navigation = useNavigation<LostAndFoundScreenNavigationProp>();
  const toast = useToast();
  const route = useRoute();
  const userProfile = useUserStore((s) => s.profile);
  const params = route.params as { openRegisterModal?: boolean; preselectedRoomId?: string } | undefined;
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
  /*
   * The band's measured height, in device px.
   *
   * The status popover positions itself below the chrome and must not open over
   * it. That used to be a literal, which stopped being true the moment the
   * header became flex + safe-area based — so it is measured instead.
   */
  const [headerHeight, setHeaderHeight] = useState(0);
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
      let rows: any[];
      try {
        const result = await fetchLostAndFoundRows();
        rows = result.rows;
        shippedLocationColumnAvailableRef.current = result.shippedLocationColumnAvailable;
      } catch (error) {
        console.warn('[LostAndFoundScreen] Failed to load items', error);
        setItems([]);
        return;
      }

      const userById = await fetchRegisteredByUsers(
        rows.map((row) => row.registered_by_id ?? row.found_by_id)
      );

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
        const imageUri = row.image_url
          ? getLostAndFoundPublicUrl(String(row.image_url))
          : undefined;

        const guestImageUri = String(guest?.image_url ?? '').trim() || undefined;

        return {
          id: row.id,
          itemName: row.item_name,
          // Use tracking_number (e.g. FH31390); fall back to id if missing
          itemId: row.tracking_number ?? row.id,
          location:
            row.found_location ?? (room?.room_number ? `Room ${room.room_number}` : 'Public Area'),
          guestName: guest?.full_name,
          guestVipCode: guest?.vip_code ?? null,
          roomNumber: room?.room_number ? Number(room.room_number) : undefined,
          guestDates: formatGuestDates(reservation?.arrival_date, reservation?.departure_date),
          guestCount: guestCount || undefined,
          /*
           * Only what the database holds.
           *
           * This used to synthesise `https://i.pravatar.cc/96?u=<guest id>`
           * whenever `guests.image_url` was empty — inventing a stranger's face
           * and attaching it to a named, real guest. It also meant the card
           * could never show its initials fallback, because there was always a
           * URL to load.
           *
           * Absent now means absent: the card falls back to the guest's
           * initials, which is `Avatar`'s designed empty state.
           */
          guestImage: guestImageUri ? { uri: guestImageUri } : undefined,
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

  // Reload on return to this tab; after the first load this is non-blocking
  // (header spinner only). Preserved from a focus effect whose other half — an
  // `activeTab` resync against route names the router never emits — was dead.
  useFocusEffect(
    React.useCallback(() => {
      loadItems('focus');
    }, [loadItems])
  );



  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      const returnToTab = (route.params as { returnToTab?: ReturnToTab } | undefined)?.returnToTab ?? '(home)/index';
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
    const successTimer = setTimeout(() => setShowSuccessModal(true), 250);

    registerInflightRef.current = (async () => {
      try {
      if (isSupabaseConfigured) {
        const result = await createLostAndFoundItem({
          itemData: data.itemData,
          imageUri: firstImageUri,
        });
        if (result.trackingNumber) trackingNumberFromDb = result.trackingNumber;
        if (result.id) pendingInsertedItemIdRef.current = result.id;
        if (result.error) {
          // The success sheet opened optimistically; take it back and say why.
          clearTimeout(successTimer);
          setShowSuccessModal(false);
          setSuccessData(null);
          toast.show(result.error, { type: 'error', title: 'Item not registered', duration: 6000 });
        }
        // Do not refresh here; we refresh once when the user closes the success modal.
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
             
            await loadItems('focus');
            if (!pendingId) break;
            const hasIt = itemsRef.current.some((it) => it.id === pendingId);
            if (hasIt) break;
             
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
    // TODO: no lost-and-found detail screen yet.
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
      await updateLostAndFoundStatus(item.id, newStatus);
      setStatusModalItem(null);
      setStatusAnchor(null);
      await loadItems('focus');
    } catch (e) {
      console.warn('[LostAndFoundScreen] Failed to update status', e);
    } finally {
      setStatusUpdating(false);
      setStatusUpdatingItemId(null);
    }
  };

  const closeStatusPopover = React.useCallback(() => {
    if (statusUpdating) return;
    setStatusModalItem(null);
    setStatusAnchor(null);
    setShippingMode(false);
    setShippingLocation('');
  }, [statusUpdating]);

  const shippedLocationOptions = React.useMemo(
    () =>
      rankShippedLocations(shippingLocation, {
        // Cache first: a hotel ships to the same few addresses, and it is also
        // the only source that survives the shipped_location schema-cache lag.
        cached: shippingLocationCache,
        fromItems: items.map((it) => it.shippedLocation),
      }),
    [items, shippingLocationCache, shippingLocation]
  );

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

        // Handles PostgREST schema-cache lag on `shipped_location` internally.
        const { shippedLocationColumnAvailable } = await setLostAndFoundShipped(
          item.id,
          trimmed,
          shippedLocationColumnAvailableRef.current
        );
        shippedLocationColumnAvailableRef.current = shippedLocationColumnAvailable;

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


  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadItems('pull').finally(() => setRefreshing(false));
  }, [loadItems]);

  const filteredItems = items.filter((item) => {
    const allowed = TAB_STATUS[selectedTab];
    return allowed == null || allowed.includes(item.status);
  });

  return (
    <View style={styles.container}>
      {(listLoading || refetchLoading) && <LoadingOverlay fullScreen message="Loading items…" />}
      {refreshing && !listLoading && <LoadingOverlay fullScreen message="Refreshing…" />}
      <LostAndFoundHeader
        onBackPress={handleBackPress}
        onRegisterPress={handleRegisterPress}
        syncing={refetchLoading}
        onHeightChange={setHeaderHeight}
      />

      <View style={styles.tabRow}>
        <LostAndFoundTabs selectedTab={selectedTab} onTabPress={handleTabChange} />
      </View>

      <View style={styles.scrollContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Item cards — Figma 3128:32. Spacing is the list's, not the card's. */}
          {filteredItems.length === 0 ? (
            /*
             * Gated on the loading flags as well as the count. The overlay
             * above is full-screen so it would hide this anyway, but on the
             * first paint — before `loadItems` has set `listLoading` — neither
             * is showing, and an empty list is indistinguishable from a list
             * that has not loaded. Without the gate the screen says "nothing
             * has been handed in" for a frame on every cold open.
             */
            !listLoading && !refetchLoading && !refreshing ? (
              <EmptyLostAndFoundState selectedTab={selectedTab} />
            ) : null
          ) : (
            filteredItems.map((item) => (
              <LostAndFoundItemCard
                key={item.id}
                item={item}
                onPress={() => handleItemPress(item)}
                onStatusPress={(anchor) => handleStatusPress(item, anchor)}
                statusUpdating={statusUpdating && statusUpdatingItemId === item.id}
              />
            ))
          )}
        </ScrollView>

      </View>

      {/* Bottom Navigation */}
      <BottomTabBar />

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
      <LostAndFoundStatusPopover
        visible={!!statusModalItem}
        onClose={closeStatusPopover}
        buttonPosition={statusAnchor}
        headerHeight={headerHeight}
        currentStatus={statusModalItem?.status}
        busy={statusUpdating}
        onSelect={(status, dismiss) => {
          if (status === 'shipped') {
            // Stay open and swap to the shipping form rather than dismissing.
            setShippingMode(true);
            return;
          }
          dismiss(() => handleStatusSelect(status));
        }}
        shippingMode={shippingMode}
        shippingLocation={shippingLocation}
        onShippingLocationChange={setShippingLocation}
        shippingSuggestions={shippedLocationOptions}
        onSubmitShippingLocation={(value, dismiss) => {
          if (!value.trim()) return;
          dismiss(() => saveShippedLocation(value));
        }}
      />
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
  /** The frame insets the labels 32 from the left and the search glyph 47 from the right. */
  tabRow: {
    paddingLeft: SCREEN_LAYOUT.tabRow.paddingLeft * scaleX,
    paddingRight: SCREEN_LAYOUT.tabRow.paddingRight * scaleX,
    paddingTop: SCREEN_LAYOUT.bandToTabs * scaleX,
    backgroundColor: LOST_AND_FOUND_COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    /*
     * `dividerToFirstCard`, not `contentPaddingTop: 213`.
     *
     * 213 was header (133) + tab row (39) + gap (41) — three things this screen
     * no longer has to know about, because they are siblings above it now. All
     * that is left is the frame's own 18 between the divider and the first card.
     */
    paddingTop: SCREEN_LAYOUT.dividerToFirstCard * scaleX,
    paddingBottom: SCREEN_LAYOUT.listBottomInset * scaleX,
    /*
     * The gutter and the inter-card gap moved here from the card.
     *
     * The card used to carry `width: 409` plus its own horizontal and bottom
     * margins, which is why it clipped inside any container narrower than the
     * frame (409 + 16 + 16 = 441 against a 440 frame). It now stretches, so the
     * list owns the spacing — `LOST_AND_FOUND_CARD_LAYOUT.gutter` and
     * `.gapBetweenCards`, the latter being 18 per Figma 3128:32, not the 16 the
     * old constant claimed.
     */
    paddingHorizontal: CARD_LAYOUT.gutter * scaleX,
    gap: CARD_LAYOUT.gapBetweenCards * scaleX,
    minHeight: '100%',
  },
});
