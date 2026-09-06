/**
 * Reusable Room Detail Content Component
 *
 * Single source for room detail layout. Overview uses flex flow (Figma: Arrival/Departure
 * 2333:132; Arrival + Refused Service header 2333:835) — guest blocks, dividers, special
 * instructions, and the Assigned/Task card (Reassign row + divider when task exists + Task)
 * for every room type — vertically stacked, no screen-absolute positioning.
 */

import React, { useState, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/theme';
import { scaleX, CONTENT_AREA, ASSIGNED_TASK_CARD } from '../../constants/roomDetailStyles';
import { getRoomTypeConfig } from '../../constants/roomTypeConfigs';
import { resolveGuestSlots } from '../../utils/guestSlots';
import RoomDetailHeader from './RoomDetailHeader';
import DetailTabNavigation from './DetailTabNavigation';
import GuestInfoCard, { type GuestInfoCardCategory } from './GuestInfoCard';
import NotesSection from './NotesSection';
import LostAndFoundSection from './LostAndFoundSection';
import AssignedToSection from './AssignedToSection';
import TaskSection from './TaskSection';
import ChecklistSection from './ChecklistSection';
import RoomTicketsSection from './RoomTicketsSection';
import HistorySection from './HistorySection';
import type { RoomDetailScreenProps, DetailTab } from '../../types/roomDetail.types';
import type { RoomStatus } from '../../types/allRooms.types';

const GUEST_INFO_TITLE_TOP_SCREEN = 303;
const OVERVIEW_CONTENT_TOP_PADDING = (GUEST_INFO_TITLE_TOP_SCREEN - CONTENT_AREA.top) * scaleX;
const SECTION_DIVIDER = {
  height: 1,
  backgroundColor: '#c6c5c5',
  marginVertical: 12 * scaleX,
};
const ASSIGNED_TO_GAP = 30 * scaleX;
const CARD_TO_LOST_FOUND_GAP = 38 * scaleX;

function guestCategoryFromType(t: 'Arrival' | 'Departure' | 'Stayover' | 'Turndown'): GuestInfoCardCategory {
  return t;
}

export default function RoomDetailContent({
  roomId,
  roomNumber,
  roomCode,
  status,
  isPriority = false,
  flagged = false,
  frontOfficeStatus,
  roomType,
  guests,
  specialInstructions,
  assignedTo,
  isAssigningStaff = false,
  tasks = [],
  notes = [],
  lostAndFoundItems,
  historyEvents = [],
  onBackPress,
  onStatusPress,
  onReassign,
  onAddNote,
  onAddTask,
  onSeeMoreTask,
  onAddLostAndFoundItem,
  onDownloadHistoryReport,
  onResumePause,
  onReturnLaterElapsed,
  onClearRefuseService,
  activity = { kind: 'none' },
  showWithLinenBadge = false,
  initialTab,
  departmentName,
}: RoomDetailScreenProps) {
  const config = useMemo(() => getRoomTypeConfig(roomType), [roomType]);
  const cardMinHeight = config.cardHeight * scaleX;

  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab || 'Overview');
  const statusButtonRef = useRef<React.ComponentRef<typeof TouchableOpacity>>(null);

  /*
   * `status` is used directly. It used to be mirrored into state and synced back
   * with an effect, which only ever cost a second render — the screen owns the
   * status and every change already arrives as a new prop.
   */
  const currentStatus: RoomStatus = status;

  const handleStatusPress: () => void = onStatusPress ?? (() => {});
  const handleBackPressSafe: () => void = onBackPress ?? (() => {});

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleDownloadReport = async () => {
    if (isGeneratingReport || !onDownloadHistoryReport) return;
    try {
      setIsGeneratingReport(true);
      await onDownloadHistoryReport();
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const guestBlocks = useMemo(
    () => resolveGuestSlots(roomType, guests, { fallbackSeed: roomId }),
    [roomType, guests, roomId]
  );
  const hasLostAndFoundItems = (lostAndFoundItems?.length ?? 0) > 0;

  const showAssignedTaskCard = !!(assignedTo || tasks.length > 0);
  const showAssignedToHeading = showAssignedTaskCard;


  const handleTabPress = (tab: DetailTab) => {
    setActiveTab(tab);
  };

  return (
    <View style={styles.container}>
      <View style={styles.backgroundTop} />

      <RoomDetailHeader
        roomNumber={roomNumber}
        roomCode={roomCode}
        status={currentStatus}
        onBackPress={handleBackPressSafe}
        onStatusPress={handleStatusPress}
        statusButtonRef={statusButtonRef}
        activity={activity}
        onResumePause={onResumePause}
        onReturnLaterElapsed={onReturnLaterElapsed}
        onClearRefuseService={onClearRefuseService}
        isPriority={isPriority}
        flagged={flagged}
        frontOfficeLabel={frontOfficeStatus === 'Stayover' ? 'Stayover' : undefined}
        showWithLinenBadge={showWithLinenBadge}
      />

      <DetailTabNavigation activeTab={activeTab} onTabPress={handleTabPress} />

      {activeTab === 'Checklist' ? (
        <ChecklistSection
          roomNumber={roomNumber}
          roomCode={roomCode}
          roomStatus={currentStatus}
          onSubmit={(data) => {
            console.log('Room checklist submitted:', data);
          }}
        />
      ) : activeTab === 'Tickets' ? (
        <RoomTicketsSection
          roomId={roomId}
          roomNumber={roomNumber}
          departmentName={departmentName}
          onSubmit={(ticketData) => {
            console.log('Ticket submitted:', ticketData);
          }}
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'Overview' && (
            <>
              <View style={styles.overviewTop}>
                {guestBlocks.length > 0 && (
                  <>
                    <Text style={styles.guestInfoTitle}>Guest Info</Text>

                    {guestBlocks.map((block, index) => (
                      <React.Fragment key={`${block.slot.role}-${index}`}>
                        {index > 0 && <View style={styles.fullBleedDivider} />}
                        <GuestInfoCard
                          guest={block.guest}
                          category={guestCategoryFromType(block.slot.role)}
                          numberBadge={block.numberBadge}
                          specialInstructions={
                            block.slot.showsSpecialInstructions
                              ? specialInstructions ?? undefined
                              : undefined
                          }
                        />
                      </React.Fragment>
                    ))}

                    <View style={styles.fullBleedDivider} />
                  </>
                )}

                {showAssignedToHeading ? (
                  <>
                    <Text style={styles.assignedToHeading}>Assigned to</Text>
                    <View style={{ height: ASSIGNED_TO_GAP }} />
                  </>
                ) : null}

                {showAssignedTaskCard ? (
                  <View style={[styles.assignedCard, { minHeight: cardMinHeight }]}>
                    <AssignedToSection
                      staff={assignedTo ?? null}
                      onReassignPress={onReassign}
                      isLoading={isAssigningStaff}
                    />

                    {tasks.length > 0 ? <View style={styles.cardDivider} /> : null}

                    {tasks.length > 0 ? (
                      <TaskSection
                        tasks={tasks}
                        onAddPress={onAddTask}
                        onSeeMorePress={onSeeMoreTask}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>

              <View style={{ marginTop: CARD_TO_LOST_FOUND_GAP }}>
                <LostAndFoundSection
                  displayType={hasLostAndFoundItems ? 'withItems' : 'empty'}
                  items={lostAndFoundItems}
                  onAddPhotosPress={onAddLostAndFoundItem}
                  onTitlePress={() => {
                    console.log('Lost & Found title pressed');
                  }}
                  onItemPress={(item) => {
                    console.log('Lost & Found item pressed:', item.itemName);
                  }}
                />
              </View>

              <NotesSection notes={notes} onAddPress={onAddNote} />
            </>
          )}

          {activeTab === 'History' && (
            <HistorySection
              events={historyEvents}
              roomNumber={roomNumber}
              roomCode={roomCode}
              onDownloadReport={handleDownloadReport}
              isGeneratingReport={isGeneratingReport}
            />
          )}
          {activeTab !== 'Overview' && activeTab !== 'History' && (
            <View style={styles.placeholderContent}>
              <Text style={styles.placeholderText}>{activeTab} content coming soon</Text>
            </View>
          )}
        </ScrollView>
      )}
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
    paddingTop: 0,
    paddingBottom: 200 * scaleX,
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
  overviewTop: {
    paddingTop: OVERVIEW_CONTENT_TOP_PADDING,
  },
  guestInfoTitle: {
    fontSize: 15 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8 * scaleX,
    paddingHorizontal: 20 * scaleX,
  },
  fullBleedDivider: {
    height: SECTION_DIVIDER.height,
    backgroundColor: SECTION_DIVIDER.backgroundColor,
    width: '100%',
    marginVertical: SECTION_DIVIDER.marginVertical,
  },
  assignedToHeading: {
    fontSize: 15 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: '#000000',
    paddingHorizontal: 20 * scaleX,
    marginTop: 4 * scaleX,
  },
  assignedCard: {
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
  cardDivider: {
    height: 1,
    backgroundColor: ASSIGNED_TASK_CARD.divider.backgroundColor,
    width: '100%',
    marginTop: 12 * scaleX,
    marginBottom: 12 * scaleX,
  },
  taskSection: {
    width: '100%',
  },
  taskTitle: {
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8 * scaleX,
  },
  taskText: {
    fontSize: 13 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: '#000000',
    lineHeight: 18 * scaleX,
  },
  hiddenMeasureText: {
    position: 'absolute',
    opacity: 0,
    zIndex: -1,
    width: ASSIGNED_TASK_CARD.width * scaleX - ASSIGNED_TASK_CARD.paddingHorizontal * 2 * scaleX,
    left: 0,
    top: 0,
  },
  seeMoreText: {
    fontSize: 13 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '500',
    color: '#5a759d',
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
});
