import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, router } from 'expo-router';
import { NativeStackNavigationProp } from 'expo-router';
import { colors, typography } from '@/theme';
import { scaleX, ROOM_DETAIL_HEADER, DETAIL_TABS, CONTENT_AREA, ASSIGNED_TASK_CARD } from '../constants/roomDetailStyles';
import RoomDetailHeader from '../components/roomDetail/RoomDetailHeader';
import DetailTabNavigation from '../components/roomDetail/DetailTabNavigation';
import GuestInfoCard from '../components/roomDetail/GuestInfoCard';
import NotesSection from '../components/roomDetail/NotesSection';
import LostAndFoundSection from '../components/roomDetail/LostAndFoundSection';
import AssignedToSection from '../components/roomDetail/AssignedToSection';
import TaskSection from '../components/roomDetail/TaskSection';
import CleanChecklistSection from '../components/roomDetail/CleanChecklistSection';
import StatusChangeModal from '../components/allRooms/StatusChangeModal';
import InspectedStatusSlideModal from '../components/allRooms/InspectedStatusSlideModal';
import CleanChecklistModal from '../components/allRooms/CleanChecklistModal';
import ReturnLaterModal from '../components/roomDetail/ReturnLaterModal';
import PromiseTimeModal from '../components/roomDetail/PromiseTimeModal';
import RefuseServiceModal from '../components/roomDetail/RefuseServiceModal';
import ReassignModal from '../components/roomDetail/ReassignModal';
import AddNoteModal from '../components/roomDetail/AddNoteModal';
import AddTaskModal from '../components/roomDetail/AddTaskModal';
import ViewTaskModal from '../components/roomDetail/ViewTaskModal';
import type { RoomCardData, StatusChangeOption } from '../types/allRooms.types';
import { STATUS_OPTIONS } from '../types/allRooms.types';
import type { RoomDetailData, DetailTab, Note, Task } from '../types/roomDetail.types';
import type { RootStackParamList } from '@/types/navigation';
import { useRoomsStore } from '../store/useRoomsStore';
import { authService } from '@features/auth';
import { showStayoverWithLinenBadge } from '../utils/stayoverLinen';
import { getRoomNotes, addRoomNote } from '../services/rooms';

type ArrivalDepartureDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'arrival-departure/[id]'
>;

export default function ArrivalDepartureDetailScreen() {
  const navigation = useNavigation<ArrivalDepartureDetailScreenNavigationProp>();
  const route = useRoute();
  const room = (route.params as any)?.room as RoomCardData;
  const initialTab = (route.params as any)?.initialTab as DetailTab | undefined;
  const departmentName = (route.params as any)?.departmentName as string | undefined;
  const { updateRoom, updatingRoomId } = useRoomsStore();
  const isUpdating = room && updatingRoomId === room.id;

  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab || 'Overview');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showInspectedModal, setShowInspectedModal] = useState(false);
  const [showCleanChecklistModal, setShowCleanChecklistModal] = useState(false);
  const [buttonPositionForInspection, setButtonPositionForInspection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [showReturnLaterModal, setShowReturnLaterModal] = useState(false);
  const [showPromiseTimeModal, setShowPromiseTimeModal] = useState(false);
  const [showRefuseServiceModal, setShowRefuseServiceModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showViewTaskModal, setShowViewTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusButtonPosition, setStatusButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const statusButtonRef = useRef<React.ComponentRef<typeof TouchableOpacity>>(null);
  // Track current status to update header background color
  const [currentStatus, setCurrentStatus] = useState<RoomCardData['houseKeepingStatus']>(room.houseKeepingStatus);
  // Track selected status option text to display in header
  const [selectedStatusText, setSelectedStatusText] = useState<string | undefined>(undefined);
  // Track Return Later: timestamp for time-only + remaining countdown (e.g. "2:30 PM · 30 mins 2s")
  const [returnLaterAtTimestamp, setReturnLaterAtTimestamp] = useState<number | undefined>(undefined);
  // Track Promise Time: timestamp for time + countdown in header
  const [promiseTimeAtTimestamp, setPromiseTimeAtTimestamp] = useState<number | undefined>(undefined);
  // Track Refuse Service: selected reason or custom reason to show in header
  const [refuseServiceReason, setRefuseServiceReason] = useState<string | undefined>(undefined);
  // Track room data locally to allow updates (e.g., flagged status)
  const [localRoom, setLocalRoom] = useState<RoomCardData>(room);
  // Track notes and assigned staff in state
  // Initial notes: parse room notes (split by \n\n) if present, else default InProgress notes or empty
  const [notes, setNotes] = useState<Note[]>(() => {
    // Parse notes from Supabase: split by \n\n to get individual notes
    const roomNote: Note[] = room.roomNotes && room.roomNotes.trim()
      ? room.roomNotes.split(/\n\n+/).filter(text => text.trim()).map((text, index) => ({
          id: `room-note-${index}`,
          text: text.trim(),
          staff: {
            name: room.noteMadeBy?.name || 'Staff',
            avatar: room.noteMadeBy?.avatar ?? require('../../../../assets/icons/profile-avatar.png'),
          },
          createdAt: new Date().toISOString(),
        }))
      : [];
    if (room.houseKeepingStatus === 'InProgress' && roomNote.length === 0) {
      return [
        {
          id: '1',
          text: "Guest wants 2 extra bath towels + 1 hand towel. Don't move items on desk. Refill water bottles daily. Check minibar usage. Leave AC on medium-cool.",
          staff: {
            name: room.roomAttendantAssigned?.name || 'Stella Kitou',
            avatar: require('../../../../assets/icons/profile-avatar.png'),
          },
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          text: 'Deep clean bathroom (heavy bath use). Change all linens + pillow protectors. Vacuum under bed. Restock all amenities. Light at entrance flickering report to maintenance.',
          staff: {
            name: room.roomAttendantAssigned?.name || 'Stella Kitou',
            avatar: require('../../../../assets/icons/profile-avatar.png'),
          },
          createdAt: new Date().toISOString(),
        },
      ];
    }
    return roomNote;
  });

  // Load notes from room_notes when room is from Supabase (valid UUID)
  useEffect(() => {
    if (!room?.id) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(room.id)) return;
    getRoomNotes(room.id).then((loaded) => {
      if (loaded.length > 0) setNotes(loaded);
    }).catch(() => {});
  }, [room?.id]);

  const [assignedStaff, setAssignedStaff] = useState<{
    id: string;
    name: string;
    avatar?: any;
    initials?: string;
    avatarColor?: string;
    department?: string;
  } | undefined>(
    room.roomAttendantAssigned
      ? {
          id: '1', // Default id since StaffInfo doesn't have id
          name: room.roomAttendantAssigned.name,
          avatar: room.roomAttendantAssigned.avatar || require('../../../../assets/icons/profile-avatar.png'),
          initials: room.roomAttendantAssigned.initials,
          avatarColor: room.roomAttendantAssigned.avatarColor,
          // Get department from mock data by matching name
          department: undefined,
        }
      : undefined
  );
  // Track tasks in state
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Track paused time - show when status is Pause
  const [pausedAt, setPausedAt] = useState<string | undefined>(
    selectedStatusText === 'Pause' ? '11:22' : undefined // Default for demo, in real app get from room data
  );

  // Transform room data to detail data format
  // In a real app, this would come from an API or be passed directly
  const roomDetail: RoomDetailData = {
    ...room,
    roomType: 'ArrivalDeparture',
    specialInstructions: room.specialInstructions ?? undefined,
    notes: notes,
    tasks: tasks,
    assignedTo: assignedStaff,
    isUrgent: room.isPriority,
  };

  const handleBackPress = () => {
    // Navigate back to previous screen (All Rooms)
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback: navigate to AllRooms if can't go back
      router.navigate('/(tabs)/(rooms)');
    }
  };

  const handleStatusPress = () => {
    // Measure the status button position
    if (statusButtonRef.current) {
      statusButtonRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setStatusButtonPosition({
          x: pageX,
          y: pageY,
          width,
          height,
        });
        setShowStatusModal(true);
      });
    } else {
      // Fallback: use header position constants
      setStatusButtonPosition({
        x: ROOM_DETAIL_HEADER.statusIndicator.left * scaleX,
        y: ROOM_DETAIL_HEADER.statusIndicator.top * scaleX,
        width: ROOM_DETAIL_HEADER.statusIndicator.width * scaleX,
        height: ROOM_DETAIL_HEADER.statusIndicator.height * scaleX,
      });
      setShowStatusModal(true);
    }
  };

  const handleStatusSelect = (statusOption: StatusChangeOption) => {
    // Find the status option label
    const statusOptionConfig = STATUS_OPTIONS.find(opt => opt.id === statusOption);
    const statusLabel = statusOptionConfig?.label || '';

    // If Return Later is selected, show the Return Later modal
    if (statusOption === 'ReturnLater') {
      setShowStatusModal(false);
      setShowReturnLaterModal(true);
      setSelectedStatusText(statusLabel);
      return;
    }

    // If PromisedTime is selected, show the Promise Time modal
    if (statusOption === 'PromisedTime') {
      setShowStatusModal(false);
      setShowPromiseTimeModal(true);
      setSelectedStatusText(statusLabel);
      return;
    }

    // If RefuseService is selected, show the Refuse Service modal
    if (statusOption === 'RefuseService') {
      setShowStatusModal(false);
      setShowRefuseServiceModal(true);
      setSelectedStatusText(statusLabel);
      return;
    }

    // Map status option to RoomStatus
    const mapStatusOptionToRoomStatus = (option: StatusChangeOption): RoomCardData['houseKeepingStatus'] => {
      switch (option) {
        case 'Dirty':
          return 'Dirty';
        case 'InProgress':
          return 'InProgress';
        case 'Cleaned':
          return 'Cleaned';
        case 'Inspected':
          return 'Inspected';
        case 'Priority':
        case 'Pause':
        case 'ReturnLater':
        case 'RefuseService':
        case 'PromisedTime':
          return 'InProgress';
        default:
          return 'InProgress';
      }
    };

    // Priority only toggles rush icon on room card; do not change room detail background or status icon
    if (statusOption === 'Priority') {
      const newIsPriority = !localRoom?.isPriority;
      setLocalRoom((prev) => (prev ? { ...prev, isPriority: newIsPriority } : prev));
      setSelectedStatusText(undefined);
      setPausedAt(undefined);
      const priorityPayload = newIsPriority ? 'high' : 'normal';
      updateRoom(room.id, {
        ...(localRoom?.houseKeepingStatus && { house_keeping_status: localRoom.houseKeepingStatus }),
        priority: priorityPayload,
      }).catch((e) => console.warn('Failed to update room status in Supabase', e));
      setShowStatusModal(false);
      setStatusButtonPosition(null);
      return;
    }

    const newStatus = mapStatusOptionToRoomStatus(statusOption);
    setCurrentStatus(newStatus);

    if (statusOption === 'Pause') {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setPausedAt(`${hours}:${minutes}`);
      setSelectedStatusText(undefined);
    } else {
      setSelectedStatusText(statusLabel);
      setPausedAt(undefined);
    }

    updateRoom(room.id, {
      house_keeping_status: newStatus,
    }).catch((e) => console.warn('Failed to update room status in Supabase', e));

    setShowStatusModal(false);
    setStatusButtonPosition(null);
  };

  const handleReturnLaterConfirm = (returnTime: string, period: 'AM' | 'PM', taskDescription?: string, _formattedDateTime?: string, returnAtTimestamp?: number) => {
    console.log('Return Later confirmed for room:', room.roomNumber, 'at:', returnTime, period);
    if (taskDescription && taskDescription.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        text: taskDescription,
        createdAt: new Date().toISOString(),
      };
      setTasks(prev => [...prev, newTask]);
      console.log('Task saved from Return Later modal:', taskDescription);
    }
    if (returnAtTimestamp != null) {
      setReturnLaterAtTimestamp(returnAtTimestamp);
    }
    setShowReturnLaterModal(false);
  };

  const handlePromiseTimeConfirm = (promiseTime: string, period: 'AM' | 'PM', _formattedDateTime?: string, promiseAtTimestamp?: number) => {
    console.log('Promise Time confirmed for room:', room.roomNumber, 'at:', promiseTime, period);
    if (promiseAtTimestamp != null) {
      setPromiseTimeAtTimestamp(promiseAtTimestamp);
    }
    setShowPromiseTimeModal(false);
  };

  const handleRefuseServiceConfirm = (reason: string) => {
    setRefuseServiceReason(reason);
    setShowRefuseServiceModal(false);
  };

  const handleTabPress = (tab: DetailTab) => {
    setActiveTab(tab);
    // TODO: Load content for other tabs
  };

  const handleAddNote = () => {
    setShowAddNoteModal(true);
  };

  const handleAddTask = () => {
    setShowAddTaskModal(true);
  };

  const handleSeeMoreTask = (task: Task) => {
    setSelectedTask(task);
    setShowViewTaskModal(true);
  };

  const handleCloseViewTaskModal = () => {
    setShowViewTaskModal(false);
    setSelectedTask(null);
  };

  const handleSaveTask = (taskText: string) => {
    // Create a new task (no creator/staff info needed)
    const newTask: Task = {
      id: Date.now().toString(),
      text: taskText,
      createdAt: new Date().toISOString(),
    };
    
    // Add task to state
    setTasks(prev => [...prev, newTask]);
    
    // TODO: Save task to backend/API
    console.log('Task added for room:', room.roomNumber, 'task:', taskText);
  };

  const handleSaveNote = async (noteText: string): Promise<void> => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (room.id && uuidRegex.test(room.id)) {
      try {
        const newNote = await addRoomNote(room.id, noteText);
        setNotes((prev) => [...prev, newNote]);
        setLocalRoom((prev) =>
          prev
            ? {
                ...prev,
                notes: { count: (prev.notes?.count ?? 0) + 1, hasRushed: prev.notes?.hasRushed || false },
                noteMadeBy: { name: newNote.staff.name, avatar: newNote.staff.avatar },
              }
            : prev
        );
      } catch (e) {
        console.warn('Failed to save note to Supabase', e);
      }
      return;
    }
    const [noteAuthorLabel, avatarUrl] = await Promise.all([
      authService.getCurrentUserNoteLabel(),
      authService.getCurrentUserAvatarUrl(),
    ]);
    const newNote: Note = {
      id: Date.now().toString(),
      text: noteText,
      staff: {
        name: noteAuthorLabel,
        avatar: avatarUrl || require('../../../../assets/icons/profile-avatar.png'),
      },
      createdAt: new Date().toISOString(),
    };
    const updatedNotes = [...notes, newNote];
    setNotes(updatedNotes);
    setLocalRoom((prev) =>
      prev
        ? {
            ...prev,
            notes: { count: updatedNotes.length, hasRushed: prev.notes?.hasRushed || false },
            noteMadeBy: { name: noteAuthorLabel, avatar: avatarUrl || undefined },
          }
        : prev
    );
  };

  const handleAddPhotos = () => {
    // Navigate to Lost and Found screen and open the register modal
    navigation.navigate('(tabs)/(lost_and_found)' as any, {
      openRegisterModal: true,
      preselectedRoomId: localRoom?.id,
    } as any);
  };

  const handleLostAndFoundTitlePress = () => {
    // Navigate to Lost and Found screen
    navigation.navigate('(tabs)/(lost_and_found)' as any, {});
  };

  const handleReassign = () => {
    console.log('handleReassign called, opening ReassignModal');
    setShowReassignModal(true);
  };

  const handleStaffSelect = (staffId: string) => {
    console.log('Staff selected:', staffId);
    // Staff data should come from Supabase, not mock data
    if (staffId) {
      setAssignedStaff({
        id: staffId,
        name: staffId,
        initials: staffId.slice(0, 2).toUpperCase(),
        department: '',
        avatarColor: (() => {
          const colors = ['#ff4dd8', '#5a759d', '#607aa1', '#f0be1b'];
          const index = staffId.charCodeAt(0) % colors.length;
          return colors[index];
        })(),
      });
      // TODO: Update room assignment in backend/API
      console.log('Room assigned to:', staffId);
    }
    setShowReassignModal(false);
  };

  const handleAutoAssign = () => {
    console.log('Auto assign requested');
    // TODO: Implement auto assign logic
    // For now, just close the modal
    setShowReassignModal(false);
  };

  if (!room) {
    return null;
  }

  // For Arrival/Departure rooms, find both guests
  const arrivalGuest = room.guests.find((g) => g.timeLabel === 'ETA');
  const departureGuest = room.guests.find((g) => g.timeLabel === 'EDT');
  
  // Ensure we have both guests for Arrival/Departure screen
  const hasArrivalGuest = !!arrivalGuest;
  const hasDepartureGuest = !!departureGuest;

  return (
    <View style={styles.container}>
      {isUpdating && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      )}
      <View style={styles.backgroundTop} />

      {/* Header - Yellow (0-232px) */}
      <RoomDetailHeader
        roomNumber={room.roomNumber}
        roomCode={`${room.roomCategory} - ${room.credit}`}
        status={currentStatus}
        onBackPress={handleBackPress}
        onStatusPress={handleStatusPress}
        statusButtonRef={statusButtonRef}
        customStatusText={
          showReturnLaterModal
            ? 'Return Later'
            : showPromiseTimeModal ? 'Promise Time' :
            showRefuseServiceModal ? 'Refuse Service' :
            selectedStatusText
        }
        pausedAt={pausedAt}
        returnLaterAtTimestamp={returnLaterAtTimestamp}
        promiseTimeAtTimestamp={promiseTimeAtTimestamp}
        refuseServiceAtTimestamp={refuseServiceReason ? Date.now() : undefined}
        refuseServiceReason={refuseServiceReason}
        isPriority={localRoom?.isPriority === true}
        flagged={localRoom?.flagged === true}
        frontOfficeLabel={room.frontOfficeStatus === 'Stayover' ? 'Stayover' : undefined}
        showWithLinenBadge={room.frontOfficeStatus === 'Stayover' && showStayoverWithLinenBadge(localRoom)}
      />

      {/* Tab Navigation - Below header (252px) */}
      <DetailTabNavigation
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />

      {/* Content Area - Starts at 285px */}
      {/* Checklist Tab has its own ScrollView, so render separately */}
      {activeTab === 'Checklist' ? (
        <CleanChecklistSection
          roomNumber={room.roomNumber}
          roomCode={`${room.roomCategory} - ${room.credit}`}
          onComplete={() => console.log('Clean checklist completed')}
          onAddPhoto={() => console.log('Add photo')}
          onAddNotes={() => console.log('Add notes')}
        />
      ) : activeTab === 'Tickets' ? (
        <View style={styles.ticketsTabContainer}>
          <TouchableOpacity
            style={styles.createTicketButton}
            onPress={() => {
              navigation.navigate('create-ticket-form/index', {
                roomId: room.id,
                roomNumber: room.roomNumber,
                departmentName: departmentName,
              });
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.createTicketButtonText}>+ Create Ticket</Text>
          </TouchableOpacity>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.noTicketsText}>No tickets yet. Create one to get started.</Text>
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Content Sections - Only show Overview tab content for now */}
          {activeTab === 'Overview' && (
          <>
            {(hasArrivalGuest || hasDepartureGuest) && (
              <View style={styles.overviewGuestBlock}>
                <Text style={styles.guestInfoTitleFlex}>Guest Info</Text>
                {arrivalGuest && (
                  <GuestInfoCard
                    guest={arrivalGuest}
                    category="Arrival"
                    numberBadge={room.guests[0]?.vipCode?.toString()}
                    specialInstructions={roomDetail.specialInstructions}
                  />
                )}
                {arrivalGuest && departureGuest ? <View style={styles.sectionDivider} /> : null}
                {departureGuest && (
                  <GuestInfoCard
                    guest={departureGuest}
                    category="Departure"
                    numberBadge={
                      room.guests[1]?.vipCode?.toString() || room.guests[0]?.vipCode?.toString()
                    }
                  />
                )}
                <View style={styles.sectionDivider} />
              </View>
            )}

            {roomDetail.assignedTo ? (
              <>
                <Text style={styles.assignedToHeadingFlex}>Assigned to</Text>
                <View style={{ height: 30 * scaleX }} />
              </>
            ) : null}

            {(roomDetail.assignedTo || (roomDetail.tasks && roomDetail.tasks.length > 0)) ? (
              <View
                style={[
                  styles.assignedCardFlex,
                  { minHeight: ASSIGNED_TASK_CARD.height * scaleX },
                ]}
              >
                {roomDetail.assignedTo ? (
                  <AssignedToSection
                    staff={roomDetail.assignedTo}
                    onReassignPress={handleReassign}
                  />
                ) : null}
                {roomDetail.assignedTo && roomDetail.tasks && roomDetail.tasks.length > 0 ? (
                  <View style={styles.cardDividerFlex} />
                ) : null}
                {roomDetail.tasks && roomDetail.tasks.length > 0 ? (
                  <TaskSection
                    tasks={roomDetail.tasks || []}
                    onAddPress={handleAddTask}
                    onSeeMorePress={handleSeeMoreTask}
                  />
                ) : null}
              </View>
            ) : null}

            <View style={{ marginTop: 38 * scaleX }}>
              <LostAndFoundSection
                displayType="empty"
                onAddPhotosPress={handleAddPhotos}
                onTitlePress={handleLostAndFoundTitlePress}
              />
            </View>

            {/* Notes Section */}
            <NotesSection
              notes={roomDetail.notes}
              onAddPress={handleAddNote}
            />
          </>
        )}

          {/* Other tabs content - placeholder */}
          {activeTab !== 'Overview' && (
            <View style={styles.placeholderContent}>
              <Text style={styles.placeholderText}>
                {activeTab} content coming soon
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Status Change Modal */}
      <StatusChangeModal
        visible={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setStatusButtonPosition(null);
        }}
        onStatusSelect={handleStatusSelect}
        onInspectedSelect={() => {
          setButtonPositionForInspection(statusButtonPosition);
          setShowInspectedModal(true);
        }}
        onCleanedSelect={() => setShowCleanChecklistModal(true)}
        currentStatus={currentStatus}
        room={localRoom}
        buttonPosition={statusButtonPosition}
        showTriangle={false}
        onFlagToggle={(flagged) => {
          setLocalRoom((prev) => ({ ...prev, flagged }));
          updateRoom(room.id, { flagged }).catch((e) => console.warn('Failed to update room flag in Supabase', e));
        }}
      />

      <InspectedStatusSlideModal
        visible={showInspectedModal}
        onClose={() => {
          setShowInspectedModal(false);
          setButtonPositionForInspection(null);
        }}
        onComplete={() => {
          handleStatusSelect('Inspected');
          setShowInspectedModal(false);
          setButtonPositionForInspection(null);
        }}
        buttonPosition={buttonPositionForInspection}
        headerHeight={232}
        showTriangle={false}
      />

      <CleanChecklistModal
        visible={showCleanChecklistModal}
        onClose={() => setShowCleanChecklistModal(false)}
        onComplete={() => {
          handleStatusSelect('Cleaned');
          setShowCleanChecklistModal(false);
        }}
        headerHeight={232}
        showTriangle={false}
      />

      <ReturnLaterModal
        visible={showReturnLaterModal}
        onClose={() => {
          setShowReturnLaterModal(false);
          // Clear selected status text when modal is closed without confirmation
          setSelectedStatusText(undefined);
        }}
        onConfirm={handleReturnLaterConfirm}
        roomNumber={room.roomNumber}
        assignedTo={roomDetail.assignedTo}
        onReassignPress={handleReassign}
        taskDescription={roomDetail.tasks && roomDetail.tasks.length > 0 ? roomDetail.tasks[0].text : undefined}      />

      <PromiseTimeModal
        visible={showPromiseTimeModal}
        onClose={() => {
          setShowPromiseTimeModal(false);
          // Clear selected status text when modal is closed without confirmation
          setSelectedStatusText(undefined);
        }}
        onConfirm={handlePromiseTimeConfirm}
        roomNumber={room.roomNumber}
      />

      <RefuseServiceModal
        visible={showRefuseServiceModal}
        onClose={() => {
          setShowRefuseServiceModal(false);
          setSelectedStatusText(undefined);
          setRefuseServiceReason(undefined);
        }}
        onConfirm={handleRefuseServiceConfirm}
        roomNumber={room.roomNumber}
        assignedTo={roomDetail.assignedTo}
        onReassignPress={handleReassign}
      />

      {/* Reassign Modal */}
      <ReassignModal
        visible={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        onStaffSelect={handleStaffSelect}
        onAutoAssign={handleAutoAssign}
        currentAssignedStaffId={roomDetail.assignedTo?.id}
        roomNumber={room.roomNumber}
      />

      {/* Add Note Modal */}
      <AddNoteModal
        visible={showAddNoteModal}
        onClose={() => setShowAddNoteModal(false)}
        onSave={handleSaveNote}
        roomNumber={room.roomNumber}
      />

      {/* Add Task Modal */}
      <AddTaskModal
        visible={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        onSave={handleSaveTask}
      />

      <ViewTaskModal
        visible={showViewTaskModal}
        task={selectedTask}
        onClose={handleCloseViewTaskModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
    marginTop: CONTENT_AREA.top * scaleX,
  },
  scrollContent: {
    paddingTop: 0, // No extra padding at top, content starts immediately
    paddingBottom: 200 * scaleX, // Extra padding at bottom to ensure all sections are visible
  },
  backgroundTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CONTENT_AREA.backgroundTopHeight * scaleX,
    backgroundColor: CONTENT_AREA.backgroundTop,
    zIndex: 0,
  },
  overviewGuestBlock: {
    width: '100%',
    paddingTop: (303 - CONTENT_AREA.top) * scaleX,
  },
  guestInfoTitleFlex: {
    fontSize: 15 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: 'bold' as any,
    color: '#000000',
    marginBottom: 8 * scaleX,
    paddingHorizontal: 20 * scaleX,
  },
  sectionDivider: {
    height: 1,
    width: '100%',
    backgroundColor: '#c6c5c5',
    marginVertical: 12 * scaleX,
  },
  assignedToHeadingFlex: {
    fontSize: 15 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: 'bold' as any,
    color: '#000000',
    paddingHorizontal: 20 * scaleX,
    marginTop: 4 * scaleX,
  },
  assignedCardFlex: {
    position: 'relative',
    alignSelf: 'center',
    width: ASSIGNED_TASK_CARD.width * scaleX,
    borderRadius: ASSIGNED_TASK_CARD.borderRadius * scaleX,
    backgroundColor: ASSIGNED_TASK_CARD.backgroundColor,
    borderWidth: ASSIGNED_TASK_CARD.borderWidth,
    borderColor: ASSIGNED_TASK_CARD.borderColor,
    paddingHorizontal: ASSIGNED_TASK_CARD.paddingHorizontal * scaleX,
    paddingVertical: ASSIGNED_TASK_CARD.paddingVertical * scaleX,
    overflow: 'hidden',
  },
  cardDividerFlex: {
    height: 1,
    backgroundColor: ASSIGNED_TASK_CARD.divider.backgroundColor,
    width: '100%',
    marginTop: 12 * scaleX,
    marginBottom: 12 * scaleX,
  },
  placeholderContent: {
    padding: 40 * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200 * scaleX,
  },
  placeholderText: {
    fontSize: 16 * scaleX,
    color: '#999',
  },
  ticketsTabContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  createTicketButton: {
    backgroundColor: '#5a759d',
    marginHorizontal: 24 * scaleX,
    marginTop: 20 * scaleX,
    marginBottom: 16 * scaleX,
    paddingVertical: 14 * scaleX,
    borderRadius: 10 * scaleX,
    alignItems: 'center',
  },
  createTicketButtonText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '600',
    color: '#ffffff',
  },
  noTicketsText: {
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#666',
    textAlign: 'center',
    marginTop: 40 * scaleX,
  },
});
