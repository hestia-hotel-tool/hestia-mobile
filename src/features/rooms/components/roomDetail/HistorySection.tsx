import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography } from '@/theme';
import { scaleX, HISTORY_SECTION } from '../../constants/roomDetailStyles';
import type { HistoryEvent, HistoryGroup } from '../../types/roomDetail.types';
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
  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: HistoryGroup[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Helper function to normalize date to midnight for comparison
    const normalizeDate = (date: Date): Date => {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };

    // Sort events by timestamp (newest first)
    const sortedEvents = [...events].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Group by date
    const dateMap = new Map<string, HistoryEvent[]>();

    sortedEvents.forEach((event) => {
      const eventDate = normalizeDate(event.timestamp);
      const todayNormalized = normalizeDate(today);
      const yesterdayNormalized = normalizeDate(yesterday);

      const key = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
      if (!dateMap.has(key)) {
        dateMap.set(key, []);
      }
      dateMap.get(key)!.push(event);
    });

    // Convert map to array of HistoryGroup
    dateMap.forEach((events, key) => {
      const [year, month, day] = key.split('-').map(Number);
      const eventDate = new Date(year, month, day);
      const todayNormalized = normalizeDate(today);
      const yesterdayNormalized = normalizeDate(yesterday);
      const eventDateNormalized = normalizeDate(eventDate);

      let dateLabel: string;
      if (eventDateNormalized.getTime() === todayNormalized.getTime()) {
        dateLabel = 'Today';
      } else if (eventDateNormalized.getTime() === yesterdayNormalized.getTime()) {
        dateLabel = 'Yesterday';
      } else {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[eventDate.getMonth()];
        const yearNum = eventDate.getFullYear();
        if (yearNum === now.getFullYear()) {
          dateLabel = `${monthName} ${day}`;
        } else {
          dateLabel = `${monthName} ${day} ${yearNum}`;
        }
      }

      groups.push({
        dateLabel,
        date: eventDate,
        events: events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()), // Sort within group (newest first)
      });
    });

    // Sort groups by date (newest first)
    return groups.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [events]);

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
    fontFamily: typography.fontFamily.regular,
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
    fontFamily: typography.fontFamily.regular,
  },
  dateLine: {
    ...HISTORY_SECTION.dateLine,
  },
  todayLabel: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.bold,
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
