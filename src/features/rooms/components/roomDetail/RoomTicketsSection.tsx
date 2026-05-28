import React from 'react';
import { ScrollView, StyleSheet, KeyboardAvoidingView, Platform, View, Text, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@app/navigation/types';
import { colors, typography } from '@shared/theme';
import { scaleX, CONTENT_AREA } from '../../constants/roomDetailStyles';
import { TicketForm, TicketCard, getLatestTicketForRoom, type TicketData } from '@features/tickets';

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
  const navigation = useNavigation<NavigationProp>();
  const [latestTicket, setLatestTicket] = React.useState<TicketData | null>(null);
  const [loadingLatest, setLoadingLatest] = React.useState(false);

  const loadLatestTicket = React.useCallback(async () => {
    if (!roomId) {
      setLatestTicket(null);
      return;
    }
    setLoadingLatest(true);
    try {
      const row = await getLatestTicketForRoom(roomId);
      setLatestTicket(row);
    } finally {
      setLoadingLatest(false);
    }
  }, [roomId]);

  React.useEffect(() => {
    loadLatestTicket();
  }, [loadLatestTicket]);

  const handleSubmitSuccess = () => {
    loadLatestTicket();
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
          <Text style={styles.currentTicketTitle}>Current Ticket</Text>
          {loadingLatest ? (
            <View style={styles.currentTicketEmpty}>
              <ActivityIndicator size="small" color={colors.primary.main} />
            </View>
          ) : latestTicket ? (
            <TicketCard ticket={latestTicket} />
          ) : (
            <View style={styles.currentTicketEmpty}>
              <Text style={styles.currentTicketEmptyText}>No ticket has been created for this room yet.</Text>
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
    marginTop: CONTENT_AREA.top * scaleX,
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
