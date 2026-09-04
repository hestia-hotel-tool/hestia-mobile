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
import { useNavigation, useRoute } from 'expo-router';
import { RouteProp } from 'expo-router/react-navigation';
import { NativeStackNavigationProp } from 'expo-router';
import { typography } from '@/theme';
import type { RootStackParamList } from '@/types/navigation';
import { isSupabaseConfigured } from '@/lib/supabase';
import { resolveGuestImageUrls } from '@/lib/guests';
import { listRoomsWithReservationGuests } from '@features/rooms';
import {
  CREATE_TICKET_AI_IMAGE,
  CREATE_TICKET_BETA_OVERLAP_AI_PX,
  CREATE_TICKET_BETA_TO_DESCRIPTION_PX,
  createTicketScaleX,
} from '../constants/createTicketStyles';

type SelectTicketLocationScreenRouteProp = RouteProp<RootStackParamList, 'select-ticket-location/index'>;
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
  guests?: Array<{
    id?: string;
    full_name?: string;
    vip_code?: string;
    image_url?: string;
  }>;
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
  const route = useRoute<SelectTicketLocationScreenRouteProp>();
  const departmentName = route.params?.departmentName ?? 'Engineering';

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
        departmentName,
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
        departmentName,
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
    console.log('AI Create Ticket pressed');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress} activeOpacity={0.7}>
          <Image
            source={require('../../../../assets/icons/back-arrow.png')}
            style={styles.backArrow}
            resizeMode="contain"
          />
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
            <TouchableOpacity
              style={styles.aiButtonTouchable}
              onPress={handleAICreatePress}
              activeOpacity={0.7}
            >
              <Image
                source={CREATE_TICKET_AI_IMAGE.source}
                style={styles.aiButtonImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
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
            <View style={[styles.checkbox, locationType === 'room' && styles.checkboxActive]}>
              {locationType === 'room' && <Text style={styles.checkmark}>✓</Text>}
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
            <View style={[styles.checkbox, locationType === 'publicArea' && styles.checkboxActive]}>
              {locationType === 'publicArea' && <Text style={styles.checkmark}>✓</Text>}
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
                  <Image
                    source={require('../../../../assets/icons/dropdown-arrow.png')}
                    style={[styles.dropdownArrowIcon, showDropdown && styles.dropdownArrowIconOpen]}
                    resizeMode="contain"
                  />
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
                                          <Image
                                            source={require('../../../../assets/icons/spear-arrow.png')}
                                            style={styles.vipBadgeIcon}
                                            resizeMode="contain"
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
                                            <Image 
                                              source={require('../../../../assets/icons/people-icon.png')} 
                                              style={styles.guestCountIcon}
                                              resizeMode="contain"
                                            />
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
                              <Image
                                source={require('../../../../assets/icons/spear-arrow.png')}
                                style={styles.vipBadgeIcon}
                                resizeMode="contain"
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
                                <Image
                                  source={require('../../../../assets/icons/people-icon.png')}
                                  style={styles.guestCountIcon}
                                  resizeMode="contain"
                                />
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
                    <Image
                      source={require('../../../../assets/icons/location-pin-icon.png')}
                      style={styles.publicAreaIcon}
                      resizeMode="contain"
                    />
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
  const aiW = PixelRatio.roundToNearestPixel(CREATE_TICKET_AI_IMAGE.width * scaleX);
  const aiH = PixelRatio.roundToNearestPixel(CREATE_TICKET_AI_IMAGE.height * scaleX);
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
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
    color: '#607aa1',
    marginLeft: 80 * scaleX,
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
  aiButtonTouchable: {
    width: aiW,
    height: aiH,
  },
  aiButtonImage: {
    width: aiW,
    height: aiH,
  },
  betaLabel: {
    fontSize: 9 * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
    color: '#ff4dd8',
    marginTop: -CREATE_TICKET_BETA_OVERLAP_AI_PX * scaleX,
    marginBottom: CREATE_TICKET_BETA_TO_DESCRIPTION_PX * scaleX,
    ...androidText,
  },
  aiDescription: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.light,
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
    fontFamily: typography.fontFamily.regular,
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
  checkbox: {
    width: 28 * scaleX,
    height: 28 * scaleX,
    borderWidth: 2,
    borderColor: '#5a759d',
    borderRadius: 4 * scaleX,
    marginRight: 12 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#5a759d',
  },
  checkmark: {
    fontSize: 16 * scaleX,
    color: '#fff',
    fontWeight: 'bold',
  },
  toggleLabel: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.regular,
    color: '#5a759d',
  },
  inputLabel: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.light,
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
    fontFamily: typography.fontFamily.regular,
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
    fontFamily: typography.fontFamily.regular,
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
  selectedRoomCard: {
    borderColor: '#5a759d',
    borderWidth: 2,
    backgroundColor: '#f0f4ff',
    marginBottom: 0,
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
    fontFamily: typography.fontFamily.regular,
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
    fontFamily: typography.fontFamily.bold,
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
    fontFamily: typography.fontFamily.bold,
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
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700',
    color: '#000',
  },
  vipCode: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.light,
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
    fontFamily: typography.fontFamily.light,
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
    fontFamily: typography.fontFamily.light,
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
    fontFamily: typography.fontFamily.light,
    fontWeight: '300',
    color: '#000',
  },
  publicAreaCheckmark: {
    fontSize: 18 * scaleX,
    color: '#5a759d',
    fontWeight: 'bold',
  },
  continueButton: {
    position: 'absolute',
    bottom: 40 * scaleX,
    left: 45 * scaleX,
    right: 45 * scaleX,
    height: 70 * scaleX,
    backgroundColor: '#5a759d',
    borderRadius: 10 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.regular,
    color: '#fff',
  },
});
}
