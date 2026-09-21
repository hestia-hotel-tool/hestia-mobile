import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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
import { RoomNumberSelector } from '@features/rooms/components/roomPicker';
import { useRoomPickerRooms } from '@features/rooms/hooks/useRoomPickerRooms';
import type { RoomPickerRoom } from '@features/rooms/types/roomPicker.types';
import {
  CREATE_TICKET_BETA_OVERLAP_AI_PX,
  CREATE_TICKET_BETA_TO_DESCRIPTION_PX,
  createTicketScaleX,
} from '../constants/createTicketStyles';

type SelectTicketLocationScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'select-ticket-location/index'
>;

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
  const [selectedRoom, setSelectedRoom] = useState<RoomPickerRoom | null>(null);
  const [selectedPublicArea, setSelectedPublicArea] = useState<string | null>(null);

  /*
   * Rooms, and the picker that shows them, are shared with Lost & Found →
   * Register (node 1102:3287 there, 3005:494 here — one design). This screen
   * used to carry its own 110-line mapping of
   * `listRoomsWithReservationGuests` and its own copy of the card.
   */
  const { rooms, loading } = useRoomPickerRooms(locationType === 'room');

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
              setSelectedPublicArea(null);
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
            <RoomNumberSelector
              rooms={rooms}
              loading={loading}
              value={selectedRoom}
              onChange={setSelectedRoom}
              scaleX={scaleX}
              style={styles.roomSelector}
            />
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
  /** Spacing to whatever follows the picker; the control owns its own height. */
  roomSelector: {
    marginBottom: 16 * scaleX,
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
