import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, Platform } from 'react-native';
import { SafeKeyboardAvoidingView as KeyboardAvoidingView } from '@/components/ui/SafeKeyboardAvoidingView';
import { useNavigation, useRoute, useRouter , NativeStackNavigationProp } from 'expo-router';
import { RouteProp } from 'expo-router/react-navigation';
import { typography } from '@/theme';
import type { RootStackParamList } from '@/types/navigation';
import { Icon } from '@/components/Icon';
import RoomDetailHeader from '@features/rooms/components/roomDetail/RoomDetailHeader';
import {
  getRoomDetailsById,
  fullRoomDetailsToRoomCardData,
} from '@features/rooms/services/rooms';
import {
  deriveRoomActivityState,
  type RoomCardData,
} from '@features/rooms/types/allRooms.types';
import { useRoomsStore } from '@features/rooms/store/useRoomsStore';
import { showStayoverWithLinenBadge } from '@features/rooms/utils/stayoverLinen';
import TicketForm from '../components/TicketForm';
import { useAssistantScreen, type ScreenFact } from '@features/ai-agent/screenContext';

/** Same guard `RoomDetailScreen` uses before treating a param as a room id. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

type CreateTicketFormScreenRouteProp = RouteProp<RootStackParamList, 'create-ticket-form/index'>;
type CreateTicketFormScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'create-ticket-form/index'
>;

/** For the assistant: what this screen is for (see screenContext.ts). */
const ASSISTANT_FACTS: ScreenFact[] = [{ label: 'Doing', value: 'Filling in a new ticket (title, location, priority, photos, assignee)' }];

export default function CreateTicketFormScreen() {
  useAssistantScreen('Create ticket', ASSISTANT_FACTS);
  const navigation = useNavigation<CreateTicketFormScreenNavigationProp>();
  const router = useRouter();
  const route = useRoute<CreateTicketFormScreenRouteProp>();
  const paramDepartmentName = route.params?.departmentName ?? 'Engineering';
  const paramRoomId = route.params?.roomId;
  const paramRoomNumber = route.params?.roomNumber;
  const paramIsPublicArea = route.params?.isPublicArea;
  const paramPublicAreaName = route.params?.publicAreaName;
  const { data: roomsData } = useRoomsStore();
  const shift = roomsData?.selectedShift ?? 'AM';

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(paramRoomId ?? null);
  const [selectedRoomLabel, setSelectedRoomLabel] = useState<string>(
    paramRoomNumber
      ? `Room ${paramRoomNumber}`
      : paramIsPublicArea
        ? paramPublicAreaName || 'Public Area'
        : 'Select a room'
  );
  const [activeTab, setActiveTab] = useState<'Overview' | 'Tickets' | 'Checklist' | 'History'>('Tickets');

  // Keep local selection in sync with navigation params (e.g. coming back from SelectTicketLocation)
  useEffect(() => {
    setSelectedRoomId(paramRoomId ?? null);
    setSelectedRoomLabel(
      paramRoomNumber
        ? `Room ${paramRoomNumber}`
        : paramIsPublicArea
          ? paramPublicAreaName || 'Public Area'
          : 'Select a room'
    );
  }, [paramRoomId, paramRoomNumber, paramIsPublicArea, paramPublicAreaName]);

  const isPublicArea = !!paramIsPublicArea;

  const headerTitle = isPublicArea
    ? 'Public Area'
    : selectedRoomLabel;

  const headerSubtitle = isPublicArea
    ? (paramPublicAreaName ?? null)
    : null;

  /*
   * The room behind the header.
   *
   * This screen used to draw its own header with `ST2K-1.4` and "✓ Cleaned"
   * hardcoded, so it claimed a room code and a status that had nothing to do
   * with the room being ticketed. `RoomDetailHeader` is the real one — the same
   * component Room Detail renders — so it needs the same input: a `RoomCardData`,
   * fetched the way `RoomDetailScreen` fetches it.
   *
   * Public areas keep the plain header below: they have no housekeeping status
   * and no room code, and `RoomDetailHeader` cannot represent one.
   */
  const headerRoomId =
    !isPublicArea && selectedRoomId && UUID_REGEX.test(selectedRoomId)
      ? selectedRoomId
      : null;

  const [headerRoom, setHeaderRoom] = useState<RoomCardData | null>(null);

  useEffect(() => {
    if (!headerRoomId) return;
    let cancelled = false;
    getRoomDetailsById(headerRoomId)
      .then((full) => {
        if (cancelled || !full) return;
        setHeaderRoom(fullRoomDetailsToRoomCardData(full, shift as 'AM' | 'PM'));
      })
      .catch(() => {
        // Non-fatal: the fallback header below still names the room.
      });
    return () => {
      cancelled = true;
    };
  }, [headerRoomId, shift]);

  /*
   * Matched on id rather than cleared in the effect: changing room would
   * otherwise paint the previous room's status until the new fetch lands, and
   * clearing it synchronously is a setState-in-effect.
   */
  const activeHeaderRoom = headerRoom?.id === headerRoomId ? headerRoom : null;

  const tabs = useMemo(() => {
    // Figma: Public Area screen only has Tickets + History tabs.
    return (isPublicArea ? (['Tickets', 'History'] as const) : (['Overview', 'Tickets', 'Checklist', 'History'] as const));
  }, [isPublicArea]);

  const handleChangeLocation = () => {
    navigation.navigate('select-ticket-location/index', { departmentName: paramDepartmentName } as any);
  };

  /*
   * `navigation.goBack()` alone strands a cold-start deep link: this screen is
   * reachable by URL with no history behind it, and the bare call logs
   * "GO_BACK was not handled by any navigator" and does nothing. The tickets
   * tab is where this form belongs when there is nothing to pop.
   */
  const handleBackPress = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else router.replace('/(tabs)/(tickets)');
  };

  return (
    <View style={styles.container}>
      {/*
        Room Detail's own header, not a copy of it. The status ground, the
        activity line and the room code all come from the room being ticketed.
      */}
      {activeHeaderRoom ? (
        <RoomDetailHeader
          roomNumber={activeHeaderRoom.roomNumber}
          roomCode={`${activeHeaderRoom.roomCategory} - ${activeHeaderRoom.credit}`}
          status={activeHeaderRoom.houseKeepingStatus}
          activity={deriveRoomActivityState(activeHeaderRoom)}
          onBackPress={handleBackPress}
          flagged={activeHeaderRoom.flagged}
          frontOfficeLabel={
            activeHeaderRoom.frontOfficeStatus === 'Stayover' ? 'Stayover' : undefined
          }
          showWithLinenBadge={
            activeHeaderRoom.frontOfficeStatus === 'Stayover' &&
            showStayoverWithLinenBadge(activeHeaderRoom)
          }
        />
      ) : (
        /* Public areas, and the moment before the room lands. */
        <View style={[styles.header, isPublicArea && styles.headerPublicArea]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress} activeOpacity={0.7}>
            <Icon name="action-chevron" size={28 * scaleX} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={handleChangeLocation} activeOpacity={0.7}>
              <Text style={[styles.roomNumber, isPublicArea && styles.roomNumberPublicArea]}>
                {headerTitle}
              </Text>
            </TouchableOpacity>
            {headerSubtitle ? (
              <Text style={styles.publicAreaSubtitle} numberOfLines={1} ellipsizeMode="tail">
                {headerSubtitle}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={styles.tab}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.tabDivider} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <TicketForm
          roomNumber={paramRoomNumber ?? ''}
          roomId={isPublicArea ? undefined : (selectedRoomId ?? undefined)}
          departmentName={paramDepartmentName}
          publicAreaName={isPublicArea ? (paramPublicAreaName ?? 'Public Area') : null}
          onSubmitSuccess={() => router.replace('/(tabs)/(tickets)')}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    height: 232 * scaleX,
    backgroundColor: '#4a91fc',
    paddingTop: 50 * scaleX,
    paddingHorizontal: 24 * scaleX,
  },
  headerPublicArea: {
    backgroundColor: '#e4eefe',
  },
  backButton: {
    width: 40 * scaleX,
    height: 40 * scaleX,
    justifyContent: 'center',
  },
  backArrow: {
    width: 28 * scaleX,
    height: 28 * scaleX,
    tintColor: '#ffffff',
  },
  backArrowPublicArea: {
    tintColor: '#5b769e',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 8 * scaleX,
  },
  publicAreaSubtitle: {
    fontSize: 17 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#1e1e1e',
    marginTop: 4 * scaleX,
    maxWidth: 320 * scaleX,
  },
  roomNumber: {
    fontSize: 24 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4 * scaleX,
  },
  roomNumberPublicArea: {
    color: '#5b769e',
  },
  ticketCode: {
    fontSize: 17 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#ffffff',
    marginBottom: 12 * scaleX,
  },
  statusBadge: {
    paddingHorizontal: 16 * scaleX,
    paddingVertical: 8 * scaleX,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20 * scaleX,
  },
  statusText: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20 * scaleX,
    height: 52 * scaleX,
    alignItems: 'center',
  },
  tab: {
    marginRight: 32 * scaleX,
    height: '100%',
    justifyContent: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#5a759d',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4 * scaleX,
    backgroundColor: '#5a759d',
  },
  tabDivider: {
    height: 1,
    backgroundColor: '#e3e3e3',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  // TicketForm brings its own gutter and bottom space.
  scrollContent: {
    paddingBottom: 100 * scaleX,
  },
});
