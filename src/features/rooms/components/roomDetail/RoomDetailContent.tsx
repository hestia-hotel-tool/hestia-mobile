/**
 * Reusable Room Detail Content Component
 *
 * Single source for room detail layout. Overview uses flex flow (Figma: Arrival/Departure
 * 2333:132; Arrival + Refused Service header 2333:835) — guest blocks, dividers, special
 * instructions, and the Assigned/Task card (Reassign row + divider when task exists + Task)
 * for every room type — vertically stacked, no screen-absolute positioning.
 */

import React, { useState, useRef, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { colors } from '@shared/theme';
import { scaleX, CONTENT_AREA, ASSIGNED_TASK_CARD } from '../../constants/roomDetailStyles';
import { getRoomTypeConfig } from '../../constants/roomTypeConfigs';
import RoomDetailHeader from './RoomDetailHeader';
import DetailTabNavigation from './DetailTabNavigation';
import GuestInfoCard, { type GuestInfoCardCategory } from './GuestInfoCard';
import NotesSection from './NotesSection';
import LostAndFoundSection from './LostAndFoundSection';
import AssignedToSection from './AssignedToSection';
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
  taskDescription,
  notes = [],
  lostAndFoundItems,
  historyEvents = [],
  onBackPress,
  onStatusPress,
  onStatusChange,
  onReassign,
  onAddNote,
  onSaveNote,
  onAddTask,
  onSaveTask,
  onAddLostAndFoundItem,
  onDownloadHistoryReport,
  onResumePause,
  onReturnLaterElapsed,
  onClearRefuseService,
  customStatusText,
  pausedAt,
  returnLaterAtTimestamp,
  promiseTimeAtTimestamp,
  refuseServiceAtTimestamp,
  refuseServiceReason,
  showWithLinenBadge = false,
  initialTab,
  departmentName,
}: RoomDetailScreenProps) {
  const config = useMemo(() => getRoomTypeConfig(roomType), [roomType]);
  const cardMinHeight = config.cardHeight * scaleX;

  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab || 'Overview');
  const statusButtonRef = useRef<React.ComponentRef<typeof TouchableOpacity>>(null);

  const [currentStatus, setCurrentStatus] = useState<RoomStatus>(status);
  React.useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  const handleStatusChange = (newStatus: RoomStatus) => {
    setCurrentStatus(newStatus);
    onStatusChange?.(newStatus);
  };

  const handleStatusPress: () => void = onStatusPress ?? (() => {});
  const handleBackPressSafe: () => void = onBackPress ?? (() => {});

  const MAX_LINES = 2;
  const LINE_HEIGHT = 18;
  const [showSeeMore, setShowSeeMore] = useState(false);
  const [textHeight, setTextHeight] = useState<number>(0);

  const charsPerLine = 50;
  const maxChars = MAX_LINES * charsPerLine;
  const estimatedNeedsTruncation = taskDescription ? taskDescription.length > maxChars : false;

  const handleFullTextLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setTextHeight(height);
    const maxHeight = MAX_LINES * LINE_HEIGHT * scaleX;
    setShowSeeMore(height > maxHeight);
  };

  React.useEffect(() => {
    if (textHeight === 0 && taskDescription) {
      setShowSeeMore(estimatedNeedsTruncation);
    }
  }, [taskDescription, textHeight, estimatedNeedsTruncation]);

  const getDisplayText = () => {
    if (!taskDescription) return '';
    if (!showSeeMore) {
      return taskDescription;
    }
    const truncated = taskDescription.substring(0, maxChars);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  };

  const handleSeeMorePress = () => {
    setShowSeeMore(false);
  };

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

  const arrivalGuest = guests.find(g => g.type === 'Arrival');
  const departureGuest = guests.find(g => g.type === 'Departure');
  const stayoverGuest = guests.find(g => g.type === 'Stayover');
  const turndownGuest = guests.find(g => g.type === 'Turndown');

  const firstGuest =
    roomType === 'ArrivalDeparture'
      ? arrivalGuest
      : roomType === 'Departure'
        ? departureGuest
        : roomType === 'Stayover'
          ? stayoverGuest
          : roomType === 'Turndown'
            ? turndownGuest
            : arrivalGuest;

  const secondGuest = roomType === 'ArrivalDeparture' ? departureGuest : undefined;
  const hasLostAndFoundItems = (lostAndFoundItems?.length ?? 0) > 0;

  const showSpecialOnFirstGuest =
    (roomType === 'ArrivalDeparture' && firstGuest?.type === 'Arrival') || roomType !== 'ArrivalDeparture';

  const specialForFirst =
    showSpecialOnFirstGuest && config.hasSpecialInstructions ? specialInstructions ?? undefined : undefined;

  const showAssignedTaskCard = !!(assignedTo || taskDescription);
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
        customStatusText={customStatusText}
        pausedAt={pausedAt}
        onResumePause={onResumePause}
        returnLaterAtTimestamp={returnLaterAtTimestamp}
        onReturnLaterElapsed={onReturnLaterElapsed}
        promiseTimeAtTimestamp={promiseTimeAtTimestamp}
        refuseServiceAtTimestamp={refuseServiceAtTimestamp}
        refuseServiceReason={refuseServiceReason}
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
                {(firstGuest || secondGuest) && (
                  <>
                    <Text style={styles.guestInfoTitle}>Guest Info</Text>

                    {firstGuest && (
                      <GuestInfoCard
                        guest={firstGuest.guest}
                        category={guestCategoryFromType(firstGuest.type)}
                        numberBadge={firstGuest.guest?.vipCode?.toString()}
                        specialInstructions={specialForFirst}
                      />
                    )}

                    {firstGuest && secondGuest && roomType === 'ArrivalDeparture' && (
                      <View style={styles.fullBleedDivider} />
                    )}

                    {secondGuest && roomType === 'ArrivalDeparture' && (
                      <GuestInfoCard
                        guest={secondGuest.guest}
                        category={guestCategoryFromType(secondGuest.type)}
                        numberBadge={
                          secondGuest.guest?.vipCode?.toString() || firstGuest?.guest?.vipCode?.toString()
                        }
                      />
                    )}

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

                    {taskDescription ? <View style={styles.cardDivider} /> : null}

                    {taskDescription ? (
                      <View style={styles.taskSection}>
                        <Text style={styles.taskTitle}>Task</Text>
                        <Text
                          style={[styles.taskText, styles.hiddenMeasureText]}
                          onLayout={handleFullTextLayout}
                        >
                          {taskDescription}
                        </Text>
                        <Text style={styles.taskText} numberOfLines={!showSeeMore ? MAX_LINES : undefined}>
                          {getDisplayText()}
                          {showSeeMore && (
                            <>
                              {' '}
                              <Text style={styles.seeMoreText} onPress={handleSeeMorePress}>
                                see more
                              </Text>
                            </>
                          )}
                        </Text>
                      </View>
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
