import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoGallery } from '@/components/media/PhotoGallery';
import { DetailCard, DetailPersonRow, DetailRow } from '@/components/ui/DetailRows';
import { useToast } from '@/contexts/ToastContext';
import { usePermissions } from '@/domain/rbac/usePermissions';
import { PERMISSIONS } from '@/domain/rbac/permissions';
import { typography } from '@/theme';
import { formatMoment } from '@/utils/formatting';
import { useAuth } from '@features/auth/hooks/useAuth';
import { deleteTicket, fetchTicketDetail, updateTicketStatus, type TicketDetail } from '../services/tickets';
import type { TicketStatus } from '../types/tickets.types';

const C = {
  header: '#e4eefe',
  title: '#5a759d',
  ink: '#1e1e1e',
  muted: '#6b7a90',
  danger: '#e5484d',
} as const;

/** The ticket card's colours (TicketCard), plus a label per status. */
const STATUS: Record<TicketStatus, { label: string; color: string }> = {
  unsolved: { label: 'Unsolved', color: '#f92424' },
  done: { label: 'Solved', color: '#41d541' },
  ofo: { label: 'Out of Order', color: '#a3a2a2' },
};
const STATUS_ORDER: TicketStatus[] = ['unsolved', 'done', 'ofo'];

const PRIORITY: Record<NonNullable<TicketDetail['priority']>, { label: string; color: string }> = {
  urgent: { label: 'High priority', color: '#f92424' },
  medium: { label: 'Medium priority', color: '#e0a800' },
  notUrgent: { label: 'Low priority', color: '#6b7a90' },
};

/**
 * One ticket — reached from its card in Tickets or in a room's detail. Its
 * photos (swipeable, full screen on tap), status (changed in place), priority,
 * where it is, who raised it and who has it, and the description.
 *
 * The ticket's author and managers (`tickets.manage`) get Edit; managers also
 * get Delete. The database enforces the same rules, so this only decides what
 * is offered.
 */
export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { session } = useAuth();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.TICKETS_MANAGE);

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [missing, setMissing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TicketStatus | null>(null);

  const canEdit = canManage || (!!ticket && ticket.createdBy?.id === session?.user?.id);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const next = await fetchTicketDetail(id);
      setTicket(next);
      setMissing(!next);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Could not load ticket' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, toast]);

  // On open, and again on return from Edit.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openEdit = () => router.push({ pathname: '/ticket/edit/[id]', params: { id: id! } });

  const changeStatus = async (next: TicketStatus) => {
    if (!ticket || next === ticket.status || pendingStatus) return;
    const previous = ticket.status;
    setPendingStatus(next);
    setTicket({ ...ticket, status: next });
    try {
      await updateTicketStatus(ticket.id, next);
      void Haptics.selectionAsync();
    } catch (e) {
      setTicket((t) => (t ? { ...t, status: previous } : t));
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Status not changed' });
    } finally {
      setPendingStatus(null);
    }
  };

  const confirmDelete = () => {
    if (!ticket) return;
    Alert.alert(
      `Delete “${ticket.title}”?`,
      'The ticket and its photos will be removed permanently. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteTicket(ticket.id, ticket.photos);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              toast.show(`${ticket.title} was deleted.`, { type: 'success', title: 'Ticket deleted' });
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)/(tickets)');
            } catch (e) {
              setDeleting(false);
              toast.show(e instanceof Error ? e.message : 'Please try again.', {
                type: 'error',
                title: 'Ticket not deleted',
              });
            }
          },
        },
      ]
    );
  };

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: ticket?.title ?? 'Ticket',
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: C.title,
        headerStyle: { backgroundColor: C.header },
        headerTitleStyle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 18, color: C.title },
        headerShadowVisible: false,
        headerRight:
          canEdit && ticket
            ? () => (
                <Pressable onPress={openEdit} hitSlop={10} accessibilityRole="button" accessibilityLabel="Edit ticket">
                  <Text style={styles.headerAction}>Edit</Text>
                </Pressable>
              )
            : undefined,
      }}
    />
  );

  if (loading) {
    return (
      <View style={styles.center}>
        {header}
        <ActivityIndicator color={C.title} />
      </View>
    );
  }

  if (missing || !ticket) {
    return (
      <View style={styles.center}>
        {header}
        <Text style={styles.missingTitle}>This ticket is no longer here</Text>
        <Text style={styles.missingBody}>It may have been deleted.</Text>
      </View>
    );
  }

  const status = STATUS[ticket.status];
  const priority = ticket.priority ? PRIORITY[ticket.priority] : null;
  const showGallery = ticket.photos.length > 0 || canEdit;

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        {showGallery ? (
          <PhotoGallery photos={ticket.photos} emptyIcon="action-add-photo" onAddPhotos={canEdit ? openEdit : undefined} />
        ) : null}

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: status.color }]} numberOfLines={3}>
              {ticket.title}
            </Text>
            {ticket.room ? (
              <View style={[styles.roomPill, { backgroundColor: status.color }]}>
                <Text style={styles.roomPillText}>{ticket.room.number}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.chips}>
            {priority ? (
              <View style={[styles.chip, { borderColor: priority.color }]}>
                <View style={[styles.chipDot, { backgroundColor: priority.color }]} />
                <Text style={[styles.chipText, { color: priority.color }]}>{priority.label}</Text>
              </View>
            ) : null}
            {ticket.departmentName ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{ticket.departmentName}</Text>
              </View>
            ) : null}
            {ticket.dueAt ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>Due {formatMoment(ticket.dueAt)}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.segment} accessibilityRole="radiogroup">
            {STATUS_ORDER.map((key) => {
              const s = STATUS[key];
              const selected = ticket.status === key;
              const busy = pendingStatus === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => void changeStatus(key)}
                  disabled={!!pendingStatus}
                  style={[styles.segmentItem, selected && { backgroundColor: s.color }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, busy }}
                  accessibilityLabel={s.label}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={selected ? '#ffffff' : s.color} />
                  ) : (
                    <Text style={[styles.segmentText, selected ? styles.segmentTextSelected : { color: s.color }]}>
                      {s.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <DetailCard>
            <DetailRow
              label="Location"
              value={ticket.locationText}
              action={
                ticket.room
                  ? {
                      label: 'Open room',
                      onPress: () => router.push({ pathname: '/room/[roomId]', params: { roomId: ticket.room!.id } }),
                    }
                  : undefined
              }
            />
            {ticket.guest ? (
              <DetailPersonRow
                label="Guest"
                name={ticket.guest.name}
                avatarUrl={ticket.guest.imageUrl}
                detail={ticket.guest.stayRange}
              />
            ) : null}
            {ticket.createdBy ? (
              <DetailPersonRow
                label="Raised by"
                name={ticket.createdBy.name}
                avatarUrl={ticket.createdBy.avatarUrl}
                detail={formatMoment(ticket.createdAt)}
              />
            ) : null}
            {ticket.assignedTo ? (
              <DetailPersonRow
                label="Assigned to"
                name={ticket.assignedTo.name}
                avatarUrl={ticket.assignedTo.avatarUrl}
                detail={ticket.assignedTo.departmentName}
                last={ticket.tagged.length === 0}
              />
            ) : (
              <DetailRow label="Assigned to" value="Not assigned yet" last={ticket.tagged.length === 0} />
            )}
            {ticket.tagged.length > 0 ? (
              <DetailRow label="Tagged" value={ticket.tagged.map((p) => p.name).join(', ')} last />
            ) : null}
          </DetailCard>

          <Text style={styles.sectionTitle}>Description</Text>
          <DetailCard>
            <Text style={ticket.description ? styles.notes : styles.notesEmpty}>
              {ticket.description || 'No description for this ticket.'}
            </Text>
          </DetailCard>

          {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt ? (
            <Text style={styles.meta}>Last updated {formatMoment(ticket.updatedAt)}</Text>
          ) : null}

          {canManage ? (
            <Pressable
              onPress={confirmDelete}
              disabled={deleting}
              style={({ pressed }) => [styles.delete, (pressed || deleting) && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Delete ticket"
            >
              {deleting ? <ActivityIndicator color={C.danger} /> : <Text style={styles.deleteText}>Delete ticket</Text>}
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', padding: 24 },
  headerAction: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 16, color: C.title },
  missingTitle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 17, color: C.ink },
  missingBody: { marginTop: 6, fontFamily: typography.fontFamily.primary, fontSize: 14, color: C.muted },
  body: { paddingHorizontal: 20, paddingTop: 18 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 24 },
  roomPill: { borderRadius: 7, paddingHorizontal: 12, paddingVertical: 6 },
  roomPillText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 20, color: '#ffffff' },
  chips: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(90,117,157,0.3)',
    backgroundColor: '#ffffff',
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontFamily: typography.fontFamily.primary, fontWeight: '600', fontSize: 13, color: C.title },
  sectionTitle: { marginTop: 24, fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 15, color: C.ink },
  segment: {
    marginTop: 10,
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: 12,
    backgroundColor: '#f1f4f9',
  },
  segmentItem: { flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 14 },
  segmentTextSelected: { color: '#ffffff' },
  notes: { paddingVertical: 14, fontFamily: typography.fontFamily.primary, fontSize: 15, lineHeight: 22, color: C.ink },
  notesEmpty: { paddingVertical: 14, fontFamily: typography.fontFamily.primary, fontSize: 15, color: C.muted },
  meta: { marginTop: 14, fontFamily: typography.fontFamily.primary, fontSize: 12, color: C.muted, textAlign: 'center' },
  pressed: { opacity: 0.7 },
  delete: {
    marginTop: 28,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229,72,77,0.35)',
    backgroundColor: '#fff5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 16, color: C.danger },
});
