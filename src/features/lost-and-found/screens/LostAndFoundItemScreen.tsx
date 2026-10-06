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
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DetailCard, DetailPersonRow, DetailRow } from '@/components/ui/DetailRows';
import { useToast } from '@/contexts/ToastContext';
import { usePermissions } from '@/domain/rbac/usePermissions';
import { PERMISSIONS } from '@/domain/rbac/permissions';
import { typography } from '@/theme';
import { formatMoment } from '@/utils/formatting';
import { useRoomsStore } from '@features/rooms/store/useRoomsStore';
import { PhotoGallery } from '@/components/media/PhotoGallery';
import {
  deleteLostAndFoundItem,
  fetchLostAndFoundItemDetail,
  type LostAndFoundItemDetail,
} from '../services/lostAndFound';
import type { LostAndFoundStatus } from '../types/lostAndFound.types';
import { storedLocationLabel } from '../utils/storedLocations';

const C = {
  header: '#e4eefe',
  title: '#5a759d',
  ink: '#1e1e1e',
  muted: '#6b7a90',
  danger: '#e5484d',
} as const;

/** The list's pill colours (lostAndFoundTheme), plus a label per status. */
const STATUS: Record<LostAndFoundStatus, { label: string; color: string }> = {
  stored: { label: 'Stored', color: '#f0be1b' },
  shipped: { label: 'Shipped', color: '#39d47f' },
  returned: { label: 'Returned', color: '#39d47f' },
  discarded: { label: 'Discarded', color: '#9ca3af' },
};

/**
 * One lost & found item — reached from its card in Lost & Found or in a
 * room's detail. Every photo (swipeable, full screen on tap), where and when
 * it was found, who found and registered it, where it is kept, and its notes.
 *
 * Managers (`lost_and_found.manage`) also get Edit and Delete; the database
 * enforces the same rule, so this only decides what is offered.
 */
export default function LostAndFoundItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { can } = usePermissions();
  const canManage = can(PERMISSIONS.LOST_AND_FOUND_MANAGE);
  const refreshRoomBadges = useRoomsStore((s) => s.refreshRoomBadges);

  const [item, setItem] = useState<LostAndFoundItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [missing, setMissing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const next = await fetchLostAndFoundItemDetail(id);
      setItem(next);
      setMissing(!next);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Please try again.', { type: 'error', title: 'Could not load item' });
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

  const openEdit = () => router.push({ pathname: '/lost-and-found/edit/[id]', params: { id: id! } });

  const copyTracking = async () => {
    if (!item?.trackingNumber) return;
    await Clipboard.setStringAsync(item.trackingNumber);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast.show(`${item.trackingNumber} copied`, { type: 'success' });
  };

  const confirmDelete = () => {
    if (!item) return;
    Alert.alert(
      `Delete ${item.itemName}?`,
      'The item and its photos will be removed permanently. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteLostAndFoundItem(item.id, item.photos);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              // The room's card drops its lost-and-found tile if this was the last one.
              void refreshRoomBadges(item.room?.id);
              toast.show(`${item.itemName} was deleted.`, { type: 'success', title: 'Item deleted' });
              if (router.canGoBack()) router.back();
              else router.replace('/(tabs)/(lost_and_found)');
            } catch (e) {
              setDeleting(false);
              toast.show(e instanceof Error ? e.message : 'Please try again.', {
                type: 'error',
                title: 'Item not deleted',
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
        title: item?.itemName ?? 'Lost & Found',
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: C.title,
        headerStyle: { backgroundColor: C.header },
        headerTitleStyle: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 18, color: C.title },
        headerShadowVisible: false,
        headerRight:
          canManage && item
            ? () => (
                <Pressable onPress={openEdit} hitSlop={10} accessibilityRole="button" accessibilityLabel="Edit item">
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

  if (missing || !item) {
    return (
      <View style={styles.center}>
        {header}
        <Text style={styles.missingTitle}>This item is no longer here</Text>
        <Text style={styles.missingBody}>It may have been deleted.</Text>
      </View>
    );
  }

  const status = STATUS[item.status] ?? STATUS.stored;
  const keptAt =
    item.status === 'shipped' || item.status === 'returned'
      ? { label: 'Shipped to', value: item.shippedLocation }
      : { label: 'Stored at', value: storedLocationLabel(item.storageLocation) };

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
        <PhotoGallery photos={item.photos} emptyIcon="lost-found-basket" onAddPhotos={canManage ? openEdit : undefined} />

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.itemName}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: status.color }]}>
              <Text style={styles.statusText}>{status.label}</Text>
            </View>
          </View>

          {item.trackingNumber ? (
            <Pressable
              onPress={copyTracking}
              style={({ pressed }) => [styles.tracking, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Tracking number ${item.trackingNumber}. Double tap to copy.`}
            >
              <Text style={styles.trackingText}>{item.trackingNumber}</Text>
              <Text style={styles.trackingHint}>Copy</Text>
            </Pressable>
          ) : null}

          <DetailCard>
            <DetailRow
              label="Found in"
              value={item.foundLocation}
              action={
                item.room
                  ? {
                      label: 'Open room',
                      onPress: () => router.push({ pathname: '/room/[roomId]', params: { roomId: item.room!.id } }),
                    }
                  : undefined
              }
            />
            {item.guest ? (
              <DetailPersonRow
                label="Guest"
                name={item.guest.name}
                avatarUrl={item.guest.imageUrl}
                detail={item.guest.dates}
              />
            ) : null}
            <DetailRow label="Found on" value={formatMoment(item.foundAt)} />
            <DetailRow label={keptAt.label} value={keptAt.value || '—'} last={!item.foundBy && !item.registeredBy} />
            {item.foundBy ? <DetailPersonRow label="Found by" name={item.foundBy.name} avatarUrl={item.foundBy.avatarUrl} /> : null}
            {item.registeredBy && item.registeredBy.id !== item.foundBy?.id ? (
              <DetailPersonRow
                label="Registered by"
                name={item.registeredBy.name}
                avatarUrl={item.registeredBy.avatarUrl}
                detail={formatMoment(item.createdAt)}
                last
              />
            ) : null}
          </DetailCard>

          <Text style={styles.sectionTitle}>Notes</Text>
          <DetailCard>
            <Text style={item.description ? styles.notes : styles.notesEmpty}>
              {item.description || 'No notes for this item.'}
            </Text>
          </DetailCard>

          {item.updatedAt && item.createdAt && item.updatedAt !== item.createdAt ? (
            <Text style={styles.meta}>Last updated {formatMoment(item.updatedAt)}</Text>
          ) : null}

          {canManage ? (
            <Pressable
              onPress={confirmDelete}
              disabled={deleting}
              style={({ pressed }) => [styles.delete, (pressed || deleting) && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Delete item"
            >
              {deleting ? <ActivityIndicator color={C.danger} /> : <Text style={styles.deleteText}>Delete item</Text>}
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
  itemName: { flex: 1, fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 24, color: C.ink },
  statusPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 13, color: '#ffffff' },
  tracking: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e4eefe',
  },
  trackingText: { fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 14, color: C.title, letterSpacing: 0.5 },
  trackingHint: { fontFamily: typography.fontFamily.primary, fontSize: 12, color: C.muted },
  pressed: { opacity: 0.7 },
  sectionTitle: { marginTop: 24, fontFamily: typography.fontFamily.primary, fontWeight: '700', fontSize: 15, color: C.ink },
  notes: { paddingVertical: 14, fontFamily: typography.fontFamily.primary, fontSize: 15, lineHeight: 22, color: C.ink },
  notesEmpty: { paddingVertical: 14, fontFamily: typography.fontFamily.primary, fontSize: 15, color: C.muted },
  meta: { marginTop: 14, fontFamily: typography.fontFamily.primary, fontSize: 12, color: C.muted, textAlign: 'center' },
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
