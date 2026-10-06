import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography } from '@/theme';
import { scaleX, HISTORY_SECTION } from '../../constants/roomDetailStyles';
import { groupHistoryEvents } from '../../utils/groupHistoryEvents';
import type { HistoryEvent } from '../../types/roomDetail.types';
import DownloadReportButton from './DownloadReportButton';
import HistoryEventItem from './HistoryEventItem';

interface HistorySectionProps {
  events: HistoryEvent[];
  onDownloadReport?: () => void;
  roomNumber?: string;
  roomCode?: string;
  isGeneratingReport?: boolean;
}

export default function HistorySection({
  events,
  onDownloadReport,
  roomNumber,
  roomCode,
  isGeneratingReport = false,
}: HistorySectionProps) {
  const groupedEvents = useMemo(() => groupHistoryEvents(events), [events]);

  return (
    <View style={styles.container}>
      {/* Download Report Button */}
      <DownloadReportButton 
        onPress={() => {
          if (onDownloadReport) {
            onDownloadReport();
          }
        }}
        isLoading={isGeneratingReport}
      />

      {/* History Timeline */}
      {groupedEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No history available</Text>
        </View>
      ) : (
        groupedEvents.map((group, index) => {
          const isToday = group.dateLabel === 'Today';
          return (
            <View key={`${group.date.toISOString()}-${index}`} style={styles.groupContainer}>
              {/* Date Separator */}
              {isToday ? (
                <Text style={styles.todayLabel}>{group.dateLabel}</Text>
              ) : (
                <View style={styles.dateSeparator}>
                  <View style={styles.dateLine} />
                  <Text style={styles.dateLabel}>{group.dateLabel}</Text>
                  <View style={styles.dateLine} />
                </View>
              )}

            {/* Timeline Container */}
            <View style={styles.timelineContainer}>
              {/* Event Items with connectors between them */}
              {group.events.map((event, eventIndex) => (
                <View key={event.id} style={styles.eventWrapper}>
                  <HistoryEventItem
                    event={event}
                    isFirst={eventIndex === 0}
                    isLast={eventIndex === group.events.length - 1}
                  />
                  {/* Vertical divider between events (except after the last one) */}
                  {eventIndex < group.events.length - 1 && (
                    <View style={styles.eventConnector} />
                  )}
                </View>
              ))}
            </View>
          </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...HISTORY_SECTION.container,
  },
  emptyState: {
    paddingVertical: 40 * scaleX,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.regular as any,
    color: '#999999',
  },
  groupContainer: {
    marginBottom: 8 * scaleX,
  },
  dateSeparator: {
    ...HISTORY_SECTION.dateSeparator,
  },
  dateLabel: {
    ...HISTORY_SECTION.dateLabel,
    fontFamily: typography.fontFamily.primary,
  },
  dateLine: {
    ...HISTORY_SECTION.dateLine,
  },
  todayLabel: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: '#1e1e1e',
    marginTop: 24 * scaleX,
    marginBottom: 16 * scaleX,
  },
  timelineContainer: {
    ...HISTORY_SECTION.timelineContainer,
  },
  eventWrapper: {
    position: 'relative',
  },
  eventConnector: {
    position: 'absolute',
    left: 12 * scaleX, // Center of avatar circle (24px / 2) - relative to timelineContainer
    width: 2 * scaleX, // stroke-width: 2px
    height: 37 * scaleX, // height: 37px
    backgroundColor: 'rgba(228, 235, 245, 0.94)', // stroke color
    top: 28 * scaleX, // Start after avatar (24px avatar + 4px spacing)
    zIndex: 0, // Behind the event items
  },
});
