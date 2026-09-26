import React from 'react';
import { ScrollView, StyleSheet, Platform, View, Text, ActivityIndicator } from 'react-native';
import { SafeKeyboardAvoidingView as KeyboardAvoidingView } from '@/components/ui/SafeKeyboardAvoidingView';
import { useNavigation , NativeStackNavigationProp } from 'expo-router';
import { RootStackParamList } from '@/types/navigation';
import { colors, typography } from '@/theme';
import { scaleX } from '../../constants/roomDetailStyles';
import TicketCard from '@features/tickets/components/TicketCard';
import TicketForm from '@features/tickets/components/TicketForm';
import { getOpenTicketsForRoom } from '@features/tickets/services/tickets';
import type { TicketData } from '@features/tickets/types/tickets.types';

interface RoomTicketsSectionProps {
  roomNumber: string;
  departmentName?: string;
  roomId?: string;
  onSubmit?: (ticketData: any) => void;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function RoomTicketsSection({
  roomNumber,
  departmentName,
  roomId,
}: RoomTicketsSectionProps) {
  const [openTickets, setOpenTickets] = React.useState<TicketData[]>([]);
  const [loadingTickets, setLoadingTickets] = React.useState(false);

  const loadOpenTickets = React.useCallback(async () => {
    if (!roomId) {
      setOpenTickets([]);
      return;
    }
    setLoadingTickets(true);
    try {
      setOpenTickets(await getOpenTicketsForRoom(roomId));
    } finally {
      setLoadingTickets(false);
    }
  }, [roomId]);

  React.useEffect(() => {
    loadOpenTickets();
  }, [loadOpenTickets]);

  /*
   * Refetch rather than prepend the submitted ticket locally: `createTicket`
   * returns `void`, so the caller never learns the new row's id, and the server
   * is the only thing that knows its created_at ordering.
   */
  const handleSubmitSuccess = () => {
    loadOpenTickets();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
      >
        <View style={styles.currentTicketSection}>
          <Text style={styles.currentTicketTitle}>
            {openTickets.length > 1 ? 'Current Tickets' : 'Current Ticket'}
          </Text>
          {loadingTickets ? (
            <View style={styles.currentTicketEmpty}>
              <ActivityIndicator size="small" color={colors.primary.main} />
            </View>
          ) : openTickets.length > 0 ? (
            // Newest first — `getOpenTicketsForRoom` orders by created_at desc.
            openTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
          ) : (
            <View style={styles.currentTicketEmpty}>
              <Text style={styles.currentTicketEmptyText}>
                No open ticket for this room.
              </Text>
            </View>
          )}
        </View>

        <TicketForm
          roomNumber={roomNumber}
          roomId={roomId}
          departmentName={departmentName}
          onSubmitSuccess={handleSubmitSuccess}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    // Match the content area start position (like ChecklistSection).
    // No marginTop: the header and tab row are in the flex flow and already
    // occupy the 285 design px this used to reserve for them.
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 0,
    // Extra space so the bottom of the form can scroll above keyboard.
    paddingBottom: 320 * scaleX,
  },
  currentTicketSection: {
    paddingTop: 18 * scaleX,
    marginBottom: 8 * scaleX,
  },
  currentTicketTitle: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#607aa1',
    marginLeft: 20 * scaleX,
    marginBottom: 10 * scaleX,
  },
  currentTicketEmpty: {
    marginHorizontal: 16 * scaleX,
    minHeight: 80 * scaleX,
    borderRadius: 10 * scaleX,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    backgroundColor: '#f9fafc',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16 * scaleX,
  },
  currentTicketEmptyText: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#5a759d',
    textAlign: 'center',
  },
});
