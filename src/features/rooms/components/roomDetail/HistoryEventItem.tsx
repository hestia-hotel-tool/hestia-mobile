import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { typography } from '@shared/theme';
import { scaleX, HISTORY_SECTION } from '../../constants/roomDetailStyles';
import type { HistoryEvent } from '../../types/roomDetail.types';

interface HistoryEventItemProps {
  event: HistoryEvent;
  isFirst: boolean; // First item in group (for timeline connector)
  isLast: boolean; // Last item in group (for timeline connector)
}

export default function HistoryEventItem({
  event,
  isFirst,
  isLast,
}: HistoryEventItemProps) {
  // Get first letter for initial if no avatar
  const initial = event.staff.initials || (event.staff.name ? event.staff.name.charAt(0).toUpperCase() : '?');
  
  // Generate color for initial circle based on name
  const getInitialColor = (name: string): string => {
    const colors = ['#ff4dd8', '#5a759d', '#607aa1', '#f0be1b'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Format timestamp: "HH:mm | DD MMM"
  const formatTimestamp = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    return `${hours}:${minutes} | ${day} ${month}`;
  };

  return (
    <View style={styles.container}>
      {/* Avatar/Initials Circle */}
      <View style={styles.avatarContainer} pointerEvents="none">
        {event.staff.avatar ? (
          <Image
            source={event.staff.avatar}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.initialsCircle,
              { backgroundColor: event.staff.avatarColor || getInitialColor(event.staff.name) },
            ]}
          >
            <Text style={styles.initialsText}>{initial}</Text>
          </View>
        )}
      </View>

      {/* Event Content */}
      <View style={styles.eventContent}>
        <Text style={styles.eventDescription}>{event.staff.name} {event.action}</Text>
        <Text style={styles.eventTimestamp}>{formatTimestamp(event.timestamp)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...HISTORY_SECTION.eventItem,
  },
  avatarContainer: {
    ...HISTORY_SECTION.avatarContainer,
  },
  avatar: {
    ...HISTORY_SECTION.avatar,
  },
  initialsCircle: {
    ...HISTORY_SECTION.initialsCircle,
  },
  initialsText: {
    ...HISTORY_SECTION.initialsText,
    fontFamily: typography.fontFamily.primary,
  },
  eventContent: {
    ...HISTORY_SECTION.eventContent,
  },
  eventDescription: {
    ...HISTORY_SECTION.eventDescription,
    fontFamily: typography.fontFamily.primary,
  },
  eventTimestamp: {
    ...HISTORY_SECTION.eventTimestamp,
    fontFamily: typography.fontFamily.primary,
  },
});
