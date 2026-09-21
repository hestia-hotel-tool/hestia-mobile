import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NativeStackNavigationProp } from 'expo-router';
import { Icon } from '@/components/Icon';
import CreateTicketButton from '../components/CreateTicketButton';
import { typography } from '@/theme';
import type { RootStackParamList } from '@/types/navigation';
import { isSupabaseConfigured } from '@/lib/supabase';
import { resolveGuestImageUrls } from '@/lib/guests';
import { listRoomsWithReservationGuests } from '@features/rooms/services/rooms';
import {
  CREATE_TICKET_BETA_OVERLAP_AI_PX,
  CREATE_TICKET_BETA_TO_DESCRIPTION_PX,
  createTicketScaleX,
} from '../constants/createTicketStyles';

type SelectTicketLocationScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'select-ticket-location/index'
>;

interface RoomData {
  id: string;
  room_number: string;
  guest_name?: string;
  check_in?: string;
  check_out?: string;
  guest_count?: number;
  vip_code?: string;
  image_url?: string;
  front_office_status?: string;
  guests?: {
    id?: string;
    full_name?: string;
    vip_code?: string;
    image_url?: string;
  }[];
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

function isHttpUrl(raw?: string | null): boolean {
  return /^https?:\/\//i.test(String(raw ?? '').trim());
}

function fallbackGuestAvatarUrl(seed: string): string {
  // Mirrors other screens that use pravatar as a deterministic placeholder.
  return `https://i.pravatar.cc/96?u=${encodeURIComponent(seed)}`;
}

export default function SelectTicketLocationScreen() {
  const navigation = useNavigation<SelectTicketLocationScreenNavigationProp>();

  const { width: windowWidth } = useWindowDimensions();
  const scaleX = createTicketScaleX(windowWidth);
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => buildSelectTicketLocationStyles(scaleX, windowWidth),
    [scaleX, windowWidth],
  );

  const [locationType, setLocationType] = useState<'room' | 'publicArea'>('room');
  const [searchQuery, setSearchQuery] = useState('');
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<RoomData[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
  const [selectedGuestIndex, setSelectedGuestIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPublicArea, setSelectedPublicArea] = useState<string | null>(null);
  const [failedGuestImages, setFailedGuestImages] = useState<Record<string, true>>({});
  // Room selection dropdown state

  const PUBLIC_AREAS = [
    'Brasserie',
    'Gym',
    'Toilet',
    'Reception',
    'Elevator',
  ];

  useEffect(() => {
    if (locationType === 'room') {
      loadRooms();
    }
  }, [locationType]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = rooms.filter((room) =>
        room.room_number.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRooms(filtered);
    } else {
      setFilteredRooms(rooms);
    }
  }, [searchQuery, rooms]);

  const loadRooms = async () => {
    if (!isSupabaseConfigured) return;
    
    setLoading(true);
    try {
      const data = await listRoomsWithReservationGuests();

      const now = new Date();
      let roomsData: RoomData[] = (data || []).map((room: any) => {
        const reservations = Array.isArray(room.reservations) ? room.reservations : [];
        // Pick the "active" reservation first (today between arrival/departure), otherwise latest by arrival_date.
        const sorted = [...reservations].sort((a: any, b: any) => {
          const aT = a?.arrival_date ? new Date(a.arrival_date).getTime() : 0;
          const bT = b?.arrival_date ? new Date(b.arrival_date).getTime() : 0;
          return bT - aT;
        });
        const isActive = (r: any) => {
          const a = r?.arrival_date ? new Date(r.arrival_date) : null;
          const d = r?.departure_date ? new Date(r.departure_date) : null;
          if (!a || !d || Number.isNaN(a.getTime()) || Number.isNaN(d.getTime())) return false;
          // include same-day departure as active until end of day
          const end = new Date(d);
          end.setHours(23, 59, 59, 999);
          return a.getTime() <= now.getTime() && now.getTime() <= end.getTime();
        };
        const reservation = sorted.find(isActive) ?? sorted[0];

        const rawGuests = reservation?.guests;
        const guests = Array.isArray(rawGuests) ? rawGuests : rawGuests ? [rawGuests] : [];
        const frontOfficeStatus = String(reservation?.front_office_status ?? '').trim();
        const isArrivalDeparture = frontOfficeStatus.toLowerCase() === 'arrival/departure';
        // For "Arrival/Departure", show the departure guest (typically index 1) wherever we display a single guest.
        const primaryGuest =
          (isArrivalDeparture ? (guests?.[1] ?? guests?.[0]) : (guests?.[0])) ??
          guests.find((g: any) => g?.full_name) ??
          guests?.[0];
        
        const mappedGuests = guests.map((g: any, idx: number) => {
          const id = g?.id ? String(g.id) : undefined;
          const fullName = g?.full_name ? String(g.full_name) : undefined;
          const rawImageUrl = g?.image_url ? String(g.image_url) : undefined;
          const img =
            rawImageUrl && rawImageUrl.trim()
              ? rawImageUrl
              : fullName
                ? fallbackGuestAvatarUrl(id ?? `${room.id}-${idx}-${fullName}`)
                : fallbackGuestAvatarUrl(id ?? `${room.id}-${idx}`);
          return {
            id,
            full_name: fullName,
            vip_code: g?.vip_code,
            image_url: img,
          };
        });

        return {
          id: room.id,
          room_number: room.room_number,
          guest_name: primaryGuest?.full_name,
          check_in: reservation?.arrival_date,
          check_out: reservation?.departure_date,
          guest_count: (reservation?.adults || 0) + (reservation?.kids || 0),
          vip_code: primaryGuest?.vip_code,
          // image_url might be a public URL or a Storage path. We'll resolve accessibility below.
          image_url:
            primaryGuest?.image_url && String(primaryGuest.image_url).trim()
              ? String(primaryGuest.image_url)
              : mappedGuests.find((g) => g?.full_name)?.image_url ?? mappedGuests[0]?.image_url,
          front_office_status: frontOfficeStatus || undefined,
          guests: mappedGuests,
        };
      });

      // If guest images are stored as Storage paths (private bucket), we need signed URLs to display them.
      // We keep URLs as-is when they are already http(s).
      const rawPaths = Array.from(
        new Set(
          roomsData
            .flatMap((r) => [
              r.image_url,
              ...(r.guests?.map((g) => g?.image_url) ?? []),
            ])
            .filter((p): p is string => typeof p === 'string' && p.trim().length > 0 && !isHttpUrl(p))
        )
      );

      if (rawPaths.length > 0) {
        const signedByPath = await resolveGuestImageUrls(rawPaths);

        if (signedByPath.size > 0) {
          roomsData = roomsData.map((r) => ({
            ...r,
            image_url: (r.image_url && signedByPath.get(r.image_url)) || r.image_url,
            guests: (r.guests ?? []).map((g) => ({
              ...g,
              image_url: (g.image_url && signedByPath.get(g.image_url)) || g.image_url,
            })),
          }));
        }
      }

      setRooms(roomsData);
      setFilteredRooms(roomsData);
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleContinue = async () => {
    if (locationType === 'room' && selectedRoom) {
      const frontOfficeStatus = String(selectedRoom.front_office_status ?? '').trim();
      const isArrivalDeparture = frontOfficeStatus.toLowerCase() === 'arrival/departure';
      const roomGuests = selectedRoom.guests ?? [];
      const selectedGuest =
        (isArrivalDeparture ? (roomGuests[1] ?? roomGuests[0]) : (roomGuests[0])) ??
        roomGuests.find((g) => g?.full_name) ??
        roomGuests[0];

      // Navigate to ticket form with room + guest info (as before).
      navigation.navigate('create-ticket-form/index', {
        roomId: selectedRoom.id,
        roomNumber: selectedRoom.room_number,
        guestId: selectedGuest?.id,
        guestName: selectedGuest?.full_name ?? selectedRoom.guest_name,
        checkIn: selectedRoom.check_in,
        checkOut: selectedRoom.check_out,
        guestCount: selectedRoom.guest_count,
        vipCode: selectedGuest?.vip_code ?? selectedRoom.vip_code,
        guestImageUrl: selectedGuest?.image_url ?? selectedRoom.image_url,
        isPublicArea: false,
      });
    } else if (locationType === 'publicArea' && selectedPublicArea) {
      navigation.navigate('create-ticket-form/index', {
        isPublicArea: true,
        publicAreaName: selectedPublicArea,
      });
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const handleAICreatePress = () => {
    // TODO: Implement AI ticket creation
    // TODO: no AI ticket flow exists yet; this control is inert by design.
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress} activeOpacity={0.7}>
          <Icon name="action-chevron" size={28 * scaleX} color="#607AA1" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Ticket</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.scrollView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* AI Create Ticket Button */}
          <View style={styles.aiButtonSection}>
            {/*
              The same component the Tickets header uses (node 1107:3855 here,
              3005:59 there — one design). Replaces `CreateTicketAI.png`, which
              was a raster of a pill the design builds from a gradient stroke,
              a label and a white disc.
            */}
            <CreateTicketButton onPress={handleAICreatePress} scaleX={scaleX} />
            <Text style={styles.betaLabel} maxFontSizeMultiplier={1.35}>
              BETA
            </Text>
            <Text style={styles.aiDescription} maxFontSizeMultiplier={1.35}>
              AI detects issues and auto-creates tickets for the right department no manual reporting needed.
            </Text>
          </View>

        {/* Location Section */}
        <Text style={styles.sectionTitle}>Location</Text>
        
        {/* Location Type Toggles */}
        <View style={styles.locationToggles}>
          <TouchableOpacity
            style={[styles.toggleButton, locationType === 'room' && styles.toggleButtonActive]}
            onPress={() => {
              setLocationType('room');
              setSelectedRoom(null); // When coming back to Room, show dropdown again
                setSelectedGuestIndex(null);
              setSelectedPublicArea(null);
              setShowDropdown(false);
              setSearchQuery('');
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, locationType === 'room' && styles.checkboxChecked]}>
              {locationType === 'room' && (
                <Icon name="action-checkbox-checked" size={28 * scaleX} color="#5a759d" />
              )}
            </View>
            <Text style={styles.toggleLabel}>Room</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, locationType === 'publicArea' && styles.toggleButtonActive]}
            onPress={() => {
              setLocationType('publicArea');
              setSelectedRoom(null); // Unchecking Room should return to dropdown state
                setSelectedGuestIndex(null);
              setShowDropdown(false);
              setSearchQuery('');
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, locationType === 'publicArea' && styles.checkboxChecked]}>
              {locationType === 'publicArea' && (
                <Icon name="action-checkbox-checked" size={28 * scaleX} color="#5a759d" />
              )}
            </View>
            <Text style={styles.toggleLabel}>Public Area</Text>
          </TouchableOpacity>
        </View>

        {/* Room Selection */}
        {locationType === 'room' && (
          <>
            <Text style={styles.inputLabel}>Enter Room Number</Text>
            
            {!selectedRoom ? (
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={styles.searchInput}
                  onPress={() => setShowDropdown(!showDropdown)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.searchInputText, styles.searchInputPlaceholder]}>
                    Search room...
                  </Text>
                  <View style={[styles.dropdownArrowIcon, showDropdown && styles.dropdownArrowIconOpen]}>
                    <Icon name="action-chevron" size={12 * scaleX} color="#5a759d" />
                  </View>
                </TouchableOpacity>

                {showDropdown && (
                  <View style={styles.dropdownMenu}>
                    <TextInput
                      style={styles.dropdownSearchInput}
                      placeholder="Search room..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholderTextColor="#999"
                      autoFocus
                    />
                    
                    <ScrollView style={styles.roomsDropdownList} nestedScrollEnabled>
                      {loading ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="large" color="#5a759d" />
                        </View>
                      ) : (
                        filteredRooms.map((room) => (
                          <TouchableOpacity
                            key={room.id}
                            style={styles.roomCard}
                            onPress={() => {
                              setSelectedRoom(room);
                              setSelectedGuestIndex(null);
                              setShowDropdown(false);
                              setSearchQuery('');
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.roomCardContent}>
                              <View style={styles.roomNumberSection}>
                                <Text style={styles.roomNumber}>Room {room.room_number}</Text>
                              </View>
                              
                              {room.guest_name && (
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
                                            {getInitials(room.guest_name)}
                                          </Text>
                                        </View>
                                      )}
                                      {room.vip_code && (
                                        <View style={styles.vipBadge}>
                                          <Icon
                                name="guest-arrow"
                                size={7 * scaleX}
                                color="#ffffff"
                                style={{ transform: [{ scaleX: -1 }] }}
                              />
                                        </View>
                                      )}
                                    </View>
                                    <View style={styles.guestDetails}>
                                      <View style={styles.guestNameRow}>
                                        <Text style={styles.guestName}>{room.guest_name}</Text>
                                        {room.vip_code && <Text style={styles.vipCode}>{room.vip_code}</Text>}
                                      </View>
                                      <View style={styles.guestMetaRow}>
                                        <Text style={styles.guestDates}>
                                          {formatDate(room.check_in)}-{formatDate(room.check_out)}
                                        </Text>
                                        {room.guest_count !== undefined && (
                                          <>
                                            <View style={styles.guestCountIcon}>
                                              <Icon name="guest-occupancy" size={12 * scaleX} color="#666" />
                                            </View>
                                            <Text style={styles.guestCount}>{room.guest_count}/2</Text>
                                          </>
                                        )}
                                      </View>
                                    </View>
                                  </View>
                                </>
                              )}
                            </View>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.selectedRoomWrap}>
              {/* Node 3005:494 unions the card with a small tab (Vector 46) that
                  pokes 7.5 above its top edge, 44 in from the left. */}
              <View style={styles.selectedRoomNotch} />
              <TouchableOpacity
                style={[styles.roomCard, styles.selectedRoomCard]}
                onPress={() => {
                  setSelectedRoom(null);
                  setSelectedGuestIndex(null);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.roomCardContent}>
                  <View style={styles.roomNumberSection}>
                    <Text style={styles.roomNumber}>Room {selectedRoom.room_number}</Text>
                  </View>

                  {selectedRoom.guest_name && (
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
                                {getInitials(selectedRoom.guest_name)}
                              </Text>
                            </View>
                          )}
                          {selectedRoom.vip_code && (
                            <View style={styles.vipBadge}>
                              <Icon
                                name="guest-arrow"
                                size={7 * scaleX}
                                color="#ffffff"
                                style={{ transform: [{ scaleX: -1 }] }}
                              />
                            </View>
                          )}
                        </View>
                        <View style={styles.guestDetails}>
                          <View style={styles.guestNameRow}>
                            <Text style={styles.guestName}>{selectedRoom.guest_name}</Text>
                            {selectedRoom.vip_code && <Text style={styles.vipCode}>{selectedRoom.vip_code}</Text>}
                          </View>
                          <View style={styles.guestMetaRow}>
                            <Text style={styles.guestDates}>
                              {formatDate(selectedRoom.check_in)}-{formatDate(selectedRoom.check_out)}
                            </Text>
                            {selectedRoom.guest_count !== undefined && (
                              <>
                                <View style={styles.guestCountIcon}>
                                  <Icon name="guest-occupancy" size={12 * scaleX} color="#666" />
                                </View>
                                <Text style={styles.guestCount}>{selectedRoom.guest_count}/2</Text>
                              </>
                            )}
                          </View>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Public Area Selection */}
        {locationType === 'publicArea' && (
          <>
            <Text style={styles.inputLabel}>Select Public Area</Text>
            <View style={styles.publicAreasContainer}>
              {/* List of public areas with location pin icons */}
              {PUBLIC_AREAS.map((area) => (
                <TouchableOpacity
                  key={area}
                  style={styles.publicAreaItem}
                  onPress={() => setSelectedPublicArea(area)}
                  activeOpacity={0.7}
                >
                  <View style={styles.publicAreaContent}>
                    <Text style={styles.publicAreaText}>{area}</Text>
                  </View>
                  {selectedPublicArea === area && (
                    <Text style={styles.publicAreaCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Continue Button */}
      <TouchableOpacity
        style={[
          styles.continueButton,
          ((locationType === 'room' && !selectedRoom) || (locationType === 'publicArea' && !selectedPublicArea)) &&
            styles.continueButtonDisabled,
          {
            bottom: PixelRatio.roundToNearestPixel(40 * scaleX + Math.max(insets.bottom, 8 * scaleX)),
          },
        ]}
        onPress={handleContinue}
        disabled={(locationType === 'room' && !selectedRoom) || (locationType === 'publicArea' && !selectedPublicArea)}
        activeOpacity={0.7}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

function buildSelectTicketLocationStyles(scaleX: number, windowWidth: number) {
  const androidText = Platform.select({
    android: { includeFontPadding: false } as const,
    default: {} as const,
  });
  const descriptionMaxWidth = Math.min(
    318 * scaleX,
    Math.max(0, windowWidth - PixelRatio.roundToNearestPixel(32)),
  );

  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 127 * scaleX,
    backgroundColor: '#e4eefe',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24 * scaleX,
    paddingTop: 40 * scaleX,
  },
  backButton: {
    width: 28 * scaleX,
    height: 28 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    width: 14 * scaleX,
    height: 28 * scaleX,
    tintColor: '#607AA1',
  },
  headerTitle: {
    fontSize: 24 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#607aa1',
    // Node 1085:2964 sits at x=69; the chevron box ends at 24+28 = 52.
    marginLeft: 17 * scaleX,
    ...androidText,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24 * scaleX,
    // Give extra space for dropdown + keyboard so user can scroll up freely.
    paddingBottom: 220 * scaleX,
  },
  aiButtonSection: {
    alignItems: 'center',
    marginTop: 48 * scaleX,
    marginBottom: 48 * scaleX,
  },
  betaLabel: {
    fontSize: 9 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ff4dd8',
    marginTop: -CREATE_TICKET_BETA_OVERLAP_AI_PX * scaleX,
    marginBottom: CREATE_TICKET_BETA_TO_DESCRIPTION_PX * scaleX,
    ...androidText,
  },
  aiDescription: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000',
    textAlign: 'center',
    marginTop: 0,
    maxWidth: descriptionMaxWidth,
    alignSelf: 'center',
    lineHeight: 20 * scaleX,
    ...androidText,
  },
  sectionTitle: {
    fontSize: 16 * scaleX,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: '#000',
    marginBottom: 16 * scaleX,
  },
  locationToggles: {
    flexDirection: 'row',
    gap: 40 * scaleX,
    marginBottom: 32 * scaleX,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButtonActive: {},
  /*
   * Node 3005:489 — 28x28, 2px `#5a759d`, **square**. The checked state
   * (3005:490) is not a fill: it is the same outline with a blue tick, and
   * `action-checkbox-checked` is byte-identical to it, so the box simply steps
   * aside and lets the glyph draw the whole control.
   *
   * Deliberately not `ui/Checkbox`: that component's checked state is a filled
   * box with a white tick from node 2702:3195, which the filter sheets use.
   * Two designed states, not one.
   */
  checkbox: {
    width: 28 * scaleX,
    height: 28 * scaleX,
    borderWidth: 2,
    borderColor: '#5a759d',
    marginRight: 12 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderWidth: 0,
  },
  toggleLabel: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
  inputLabel: {
    fontSize: 16 * scaleX,
    fontFamily: 'Inter',
    fontWeight: '300',
    color: '#000',
    marginBottom: 12 * scaleX,
  },
  dropdownContainer: {
    position: 'relative',
    marginBottom: 16 * scaleX,
    zIndex: 1000,
  },
  searchInput: {
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
  /*
   * `action-chevron` points left, so the closed state turns it to point down and
   * the open state turns it the other way. The box keeps the unrotated footprint
   * because a transform does not change layout size — same idiom as
   * RoomStatusPill and the ticket card's status row.
   */
  dropdownArrowIcon: {
    width: 12 * scaleX,
    height: 12 * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-90deg' }],
  },
  dropdownArrowIconOpen: {
    transform: [{ rotate: '90deg' }],
  },
  dropdownMenu: {
    position: 'absolute',
    top: 55 * scaleX,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8 * scaleX,
    maxHeight: 400 * scaleX,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1001,
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
  loadingContainer: {
    paddingVertical: 40 * scaleX,
    alignItems: 'center',
  },
  roomCard: {
    backgroundColor: '#fff',
    borderRadius: 12 * scaleX,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12 * scaleX,
    overflow: 'hidden',
  },
  roomCardSelected: {
    borderColor: '#5a759d',
    borderWidth: 2,
    backgroundColor: '#f0f4ff',
  },
  selectedRoomWrap: {
    position: 'relative',
    paddingTop: 10 * scaleX,
    marginBottom: 16 * scaleX,
  },
  /*
   * Node 3005:493 draws the selected room as a plain **white** card lifted off
   * the page by a soft shadow — no border and no tint. What was here painted a
   * 2px `#5a759d` outline on `#f0f4ff`, which reads as a form field rather than
   * the floating panel the design shows.
   */
  selectedRoomCard: {
    backgroundColor: '#fff',
    borderWidth: 0,
    marginBottom: 0,
    // `roomCard` clips its children; a clipped view does not cast a shadow, and
    // without one a white card on a white page has no edge at all.
    overflow: 'visible',
    /*
     * Blue-grey and broad, measured off the frame rather than guessed: the page
     * is pure white, and immediately outside the card it reads `#e5e9f1`, which
     * is `rgb(100,131,176)` at about 17% over white. That is the same tint the
     * nav shadow token and the ticket card's footer band already use — a neutral
     * black shadow at 10% was both too weak and the wrong hue.
     */
    shadowColor: '#6483b0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 5,
  },
  /*
   * The tab on the card's top edge, centred 44 in from the left.
   *
   * A square turned 45 degrees, not a border-triangle. In the design the tab and
   * the card are one unioned shape under one shadow (node 3005:494); a
   * border-triangle has no background, so React Native gives it no shadow, and a
   * shadowless white tab on a white page is invisible — which is exactly how it
   * rendered. A rotated square has a real background and casts one.
   *
   * It is painted *before* the card so the card covers its lower half, leaving
   * only the corner poking 7.5 above the top edge. 16 x 16 turned 45 has a
   * 22.6 diagonal, so a top at 3.3 puts that corner on the wrapper's edge.
   */
  selectedRoomNotch: {
    position: 'absolute',
    /*
     * Sized off the frame's own profile, measured row by row: its apex sits
     * 7.9 above the card and the tab is ~21 wide where it meets the top edge.
     *
     * A square turned 45 always has a right-angled apex, so its width is
     * exactly twice its protrusion — it cannot reproduce the frame's squatter,
     * obtuse tip. Matching the *width* matters more than the apex angle here,
     * so the protrusion is 10 and the tab comes out 20 wide against the
     * frame's 21, rather than the 15 a 7.5 protrusion gave.
     *
     * Side 26 turned 45 has a 36.8 diagonal, so a top of 5.4 puts the corner
     * on the wrapper edge, 10 above the card.
     */
    top: 5.4 * scaleX,
    left: 31 * scaleX,
    width: 26 * scaleX,
    height: 26 * scaleX,
    backgroundColor: '#fff',
    borderRadius: 4 * scaleX,
    transform: [{ rotate: '45deg' }],
    shadowColor: '#6483b0',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  roomCardContent: {
    flexDirection: 'row',
    minHeight: 98 * scaleX,
  },
  roomNumberSection: {
    justifyContent: 'center',
    paddingHorizontal: 28 * scaleX,
    minWidth: 165 * scaleX,
  },
  roomNumber: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 22 * scaleX,
  },
  guestInfoSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14 * scaleX,
    paddingVertical: 22 * scaleX,
  },
  guestImageContainer: {
    position: 'relative',
    marginRight: 16 * scaleX,
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
    backgroundColor: '#5a759d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestImagePlaceholderText: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
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
  guestName: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000',
  },
  vipCode: {
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
  guestDates: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000',
    marginRight: 12 * scaleX,
  },
  guestCountIcon: {
    width: 12 * scaleX,
    height: 12 * scaleX,
    marginRight: 4 * scaleX,
    tintColor: '#666',
  },
  guestCount: {
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
  /*
   * Node 3005:443 — 351 x 70 at x=38, `#5a759d`, and **no corner radius**.
   *
   * Kept pinned to the bottom rather than in the flow, which is where the frame
   * draws it (y=653, just under the suggestion card). Pinning keeps Continue
   * reachable once the room list is long; the frame's placement is a
   * consequence of its short mock content. A stated deviation, not an oversight.
   */
  continueButton: {
    position: 'absolute',
    bottom: 40 * scaleX,
    left: 38 * scaleX,
    width: 351 * scaleX,
    height: 70 * scaleX,
    backgroundColor: '#5a759d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#fff',
  },
});
}
