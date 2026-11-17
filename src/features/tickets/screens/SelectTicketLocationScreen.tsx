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

  const [locationType, setLocationType] = useState<'room' | 'publicArea'>('room');
  const [selectedRoom, setSelectedRoom] = useState<RoomPickerRoom | null>(null);
  const [selectedPublicArea, setSelectedPublicArea] = useState<string | null>(null);

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

  const PUBLIC_AREAS = [
    'Brasserie',
    'Gym',
    'Toilet',
    'Reception',
    'Elevator',
  ];

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
        
        {/* Location Type Toggles */}
        <View style={styles.locationToggles}>
          <TouchableOpacity
            style={[styles.toggleButton, locationType === 'room' && styles.toggleButtonActive]}
            onPress={() => {
              setLocationType('room');
              setSelectedRoom(null); // When coming back to Room, show dropdown again
              setSelectedPublicArea(null);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, locationType === 'room' && styles.checkboxChecked]}>
              {locationType === 'room' && (
                <Icon name="action-checkbox-checked" size={28 * scaleX} color="#5a759d" />
              )}
            </View>
            {/* 4649:832 — the bed, 23 after the box and 15.5 before the label. */}
            <Icon name="checklist-bed" size={25 * scaleX} color="#5a759d" style={styles.bedIcon} />
            <Text style={styles.toggleLabel}>Room</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleButton, locationType === 'publicArea' && styles.toggleButtonActive]}
            onPress={() => {
              setLocationType('publicArea');
              setSelectedRoom(null); // Unchecking Room should return to dropdown state
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

        </View>

        {/* 4649:1016 — the #F9FAFC panel under the toggles, rounded on top. */}
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
    marginBottom: 25 * scaleX,
    ...androidText,
  },
  /* Boxes at x=35 and x=242 (y=287); the panel starts 77 below them. */
  locationToggles: {
    flexDirection: 'row',
    gap: 50 * scaleX,
    marginLeft: 8 * scaleX,
    marginBottom: 77 * scaleX,
  },
  bedIcon: {
    marginLeft: 8 * scaleX,
    marginRight: 15.5 * scaleX,
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
    marginRight: 15 * scaleX,
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
