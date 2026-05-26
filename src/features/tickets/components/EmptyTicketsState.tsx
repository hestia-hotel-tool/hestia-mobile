import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { typography } from '@shared/theme';
import { scaleX } from '../constants/ticketsStyles';
import type { TicketTab } from '../types/tickets.types';

interface EmptyTicketsStateProps {
  selectedTab: TicketTab;
}

const MESSAGES = {
  myTickets: {
    title: 'No Tickets Assigned',
    subtitle: 'You don\'t have any tickets assigned to you yet.',
  },
  all: {
    title: 'No Tickets Available',
    subtitle: 'There are no tickets in the system yet.',
  },
  open: {
    title: 'No Open Tickets',
    subtitle: 'All tickets have been resolved or closed.',
  },
  closed: {
    title: 'No Closed Tickets',
    subtitle: 'There are no closed tickets yet.',
  },
};

export default function EmptyTicketsState({ selectedTab }: EmptyTicketsStateProps) {
  const message = MESSAGES[selectedTab];

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Image
          source={require('../../../../assets/icons/clip-board.png')}
          style={styles.icon}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>{message.title}</Text>
      <Text style={styles.subtitle}>{message.subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40 * scaleX,
    paddingVertical: 60 * scaleX,
  },
  iconContainer: {
    width: 80 * scaleX,
    height: 80 * scaleX,
    borderRadius: 40 * scaleX,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24 * scaleX,
  },
  icon: {
    width: 40 * scaleX,
    height: 40 * scaleX,
    tintColor: '#5a759d',
  },
  title: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
    marginBottom: 8 * scaleX,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#666',
    textAlign: 'center',
    lineHeight: 22 * scaleX,
  },
});
