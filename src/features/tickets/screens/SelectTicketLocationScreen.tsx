import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
  PixelRatio,
} from 'react-native';
import { SafeKeyboardAvoidingView as KeyboardAvoidingView } from '@/components/ui/SafeKeyboardAvoidingView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NativeStackNavigationProp } from 'expo-router';
import { Icon } from '@/components/Icon';
import { LocationDropdown, LOCATION_ROOM } from '@/components/ui/LocationDropdown';
import CreateTicketButton from '../components/CreateTicketButton';
import { typography } from '@/theme';
import type { RootStackParamList } from '@/types/navigation';
import { RoomSearchField } from '@features/rooms/components/roomPicker';
import { useRoomPickerRooms } from '@features/rooms/hooks/useRoomPickerRooms';
import type { RoomPickerRoom } from '@features/rooms/types/roomPicker.types';
import { createTicketScaleX } from '../constants/createTicketStyles';
import { RoomListCard } from '@features/rooms/components/roomsList';
import { useRoomsStore } from '@features/rooms/store/useRoomsStore';
import type { RoomCardData } from '@features/rooms/types/allRooms.types';
import { useAssistantScreen, type ScreenFact } from '@features/ai-agent/screenContext';

type SelectTicketLocationScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'select-ticket-location/index'
>;

/** For the assistant: what this screen is for (see screenContext.ts). */
const ASSISTANT_FACTS: ScreenFact[] = [{ label: 'Doing', value: 'Choosing the room or public area for a ticket' }];

/**
 * The "Select Location" dropdown's choices — Figma 4649:1018. "Room" opens the
 * room search; every other entry is a public area, sent to the form by name.
 */
const ROOM = LOCATION_ROOM;
const LOCATIONS = [ROOM, 'Restaurant', 'Gym', 'Spa', 'Kitchen', 'Basement', 'Roof top'] as const;

export default function SelectTicketLocationScreen() {
  useAssistantScreen('Ticket location', ASSISTANT_FACTS);
  const navigation = useNavigation<SelectTicketLocationScreenNavigationProp>();

  const { width: windowWidth } = useWindowDimensions();
  const scaleX = createTicketScaleX(windowWidth);
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => buildSelectTicketLocationStyles(scaleX),
    [scaleX],
  );

  const [location, setLocation] = useState<string>(ROOM);
  const locationType: 'room' | 'publicArea' = location === ROOM ? 'room' : 'publicArea';
  const selectedPublicArea = locationType === 'publicArea' ? location : null;
  const [selectedRoom, setSelectedRoom] = useState<RoomPickerRoom | null>(null);

  const chooseLocation = (next: string) => {
    setLocation(next);
    setSelectedRoom(null);
  };

  /*
   * Rooms, and the picker that shows them, are shared with Lost & Found →
   * Register (node 1102:3287 there, 3005:494 here — one design). This screen
   * used to carry its own 110-line mapping of
   * `listRoomsWithReservationGuests` and its own copy of the card.
   */
  const { rooms, loading } = useRoomPickerRooms(locationType === 'room');

  /*
   * Results are drawn as the Rooms list's own card (Figma 4649:921), which
   * needs the list's card data. Load it once if nobody has yet; never refetch
   * over a list the Rooms tab already holds (it may be on another shift).
   */
  const roomsData = useRoomsStore((s) => s.data);
  const fetchRooms = useRoomsStore((s) => s.fetchRooms);
  useEffect(() => {
    if (locationType === 'room' && !useRoomsStore.getState().data) void fetchRooms();
  }, [locationType, fetchRooms]);
  const cardsById = useMemo(() => {
    const map = new Map<string, RoomCardData>();
    for (const r of roomsData?.selectedShift === 'PM' ? roomsData.roomsPM ?? roomsData.rooms : roomsData?.rooms ?? []) {
      map.set(r.id, r);
    }
    return map;
  }, [roomsData]);
  const renderResult = useCallback(
    (room: RoomPickerRoom, choose: () => void) => {
      const card = cardsById.get(room.id);
      // Display only: tapping anywhere picks the room for the ticket.
      return card ? <RoomListCard room={card} onPress={choose} /> : null;
    },
    [cardsById],
  );

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleContinue = async () => {
    if (locationType === 'room' && selectedRoom) {
      // `primaryGuest` already applies the Arrival/Departure rule.
      const selectedGuest = selectedRoom.primaryGuest;

      navigation.navigate('create-ticket-form/index', {
        roomId: selectedRoom.id,
        roomNumber: selectedRoom.number,
        guestId: selectedGuest?.id,
        guestName: selectedGuest?.fullName,
        checkIn: selectedRoom.checkIn ?? undefined,
        checkOut: selectedRoom.checkOut ?? undefined,
        guestCount: selectedRoom.guestCount,
        vipCode: selectedGuest?.vipCode ?? undefined,
        guestImageUrl: selectedGuest?.imageUrl,
        isPublicArea: false,
      });
    } else if (locationType === 'publicArea' && selectedPublicArea) {
      navigation.navigate('create-ticket-form/index', {
        isPublicArea: true,
        publicAreaName: selectedPublicArea,
      });
    }
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
          <View style={styles.topSection}>
          {/* AI Create Ticket Button */}
          <View style={styles.aiButtonSection}>
            {/*
              The same component the Tickets header uses (node 1107:3855 here,
              3005:59 there — one design). Replaces `CreateTicketAI.png`, which
              was a raster of a pill the design builds from a gradient stroke,
              a label and a white disc.
            */}
            <CreateTicketButton onPress={handleAICreatePress} scaleX={scaleX} />
          </View>

        {/* Location Section */}
        <Text style={styles.sectionTitle}>Select Location</Text>
        
        <LocationDropdown
          value={location}
          options={LOCATIONS}
          onChange={chooseLocation}
          scale={scaleX}
          style={styles.locationBlock}
        />
        </View>

        {/* 4649:1016 — the #F9FAFC panel under the dropdown, rounded on top. */}
        <View style={styles.panel}>
        {/* Room Selection */}
        {locationType === 'room' && (
          <RoomSearchField
            rooms={rooms}
            loading={loading}
            value={selectedRoom}
            onChange={setSelectedRoom}
            scaleX={scaleX}
            renderResult={renderResult}
          />
        )}

        </View>
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

function buildSelectTicketLocationStyles(scaleX: number) {
  const androidText = Platform.select({
    android: { includeFontPadding: false } as const,
    default: {} as const,
  });

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
  /* Lets the panel run to the bottom however short the results are. */
  scrollContent: {
    flexGrow: 1,
  },
  topSection: {
    paddingHorizontal: 27 * scaleX,
  },
  /* 4649:814 — the pill at x=27, 22 under the header, left-aligned. */
  aiButtonSection: {
    alignItems: 'flex-start',
    marginTop: 22 * scaleX,
    marginBottom: 20 * scaleX,
  },
  /* 4649:820 — Inter Light 14 at x=34. */
  sectionTitle: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '300',
    color: '#000',
    marginLeft: 7 * scaleX,
    marginBottom: 13 * scaleX,
    ...androidText,
  },
  /* 4731:111 — the box at x=33, 13 under the label; the list ends ~28 above the panel. */
  locationBlock: {
    marginLeft: 6 * scaleX,
    marginBottom: 28 * scaleX,
  },
  panel: {
    flexGrow: 1,
    backgroundColor: '#f9fafc',
    borderTopLeftRadius: 24 * scaleX,
    borderTopRightRadius: 23 * scaleX,
    paddingTop: 23 * scaleX,
    paddingHorizontal: 27 * scaleX,
    // Room for the pinned Continue button and the keyboard.
    paddingBottom: 220 * scaleX,
  },
  /*
   * Node 4649:823 — 386 x 70 at x=25, `#5a759d`, and **no corner radius**.
   *
   * Kept pinned to the bottom rather than in the flow, which is where the frame
   * draws it (y=653, just under the suggestion card). Pinning keeps Continue
   * reachable once the room list is long; the frame's placement is a
   * consequence of its short mock content. A stated deviation, not an oversight.
   */
  continueButton: {
    position: 'absolute',
    bottom: 40 * scaleX,
    left: 25 * scaleX,
    width: 386 * scaleX,
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
