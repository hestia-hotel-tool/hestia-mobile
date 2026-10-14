import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useToast } from '@/contexts/ToastContext';
import { usePermissions } from '@/domain/rbac/usePermissions';
import { PERMISSIONS } from '@/domain/rbac/permissions';
import { useNow } from '@/hooks/useNow';
import { typography } from '@/theme';
import { CHECKLIST_SECTION, scaleX } from '../../constants/checklistStyles';
import {
  CHECKLIST_CATEGORY_LABEL,
  CHECKLIST_CATEGORY_ORDER,
  checklistImage,
} from '../../constants/checklistImages';
import {
  fetchRoomChecklist,
  newSubmissionId,
  submitRoomChecklist,
  type RoomChecklist,
} from '../../services/roomChecklist';
import type { ChecklistCategory as ChecklistCategoryType, ChecklistData } from '../../types/checklist.types';
import { generateChecklistReport } from '../../utils/generateChecklistReport';
import ChecklistCategory from './ChecklistCategory';
import ChecklistFooter from './ChecklistFooter';
import ChecklistHistory from './ChecklistHistory';
import ChecklistReviewSheet, { formatStayDates, type ReviewLine } from './ChecklistReviewSheet';
import DownloadReportButton from './DownloadReportButton';

/** Mini Bar shows this many rows until "Load more". */
const COLLAPSED_ROWS = 4;

interface ChecklistSectionProps {
  roomId: string;
  roomNumber: string;
  roomCode?: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const formatDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const formatTime = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/**
 * Room Checklist — count what the room used from the minibar and the
 * laundry, review it, and record it against the guest staying in the room.
 *
 * The catalogue is the hotel's (`consumables`), and a Submit is recorded on
 * the server (`submit_room_checklist`). Below the counters, what has already
 * been recorded this stay, so nobody counts the same bottle twice; the PDF
 * report is built from that record, not from unsaved counters.
 *
 * Without `rooms.checklist.complete` the tab is read-only: the record, no
 * counters, no Submit.
 */
export default function ChecklistSection({ roomId, roomNumber, roomCode }: ChecklistSectionProps) {
  const toast = useToast();
  const { can } = usePermissions();
  const canComplete = can(PERMISSIONS.ROOMS_CHECKLIST_COMPLETE);
  const now = new Date(useNow());

  const [data, setData] = useState<RoomChecklist | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  /** One id per submission attempt: a retry after a network error records once. */
  const submissionId = useRef(newSubmissionId());

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setData(await fetchRoomChecklist(roomId));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'The checklist could not be loaded.');
    }
  }, [roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** The catalogue as the shared ChecklistCategory/Item components draw it. */
  const categories: ChecklistCategoryType[] = useMemo(() => {
    if (!data) return [];
    const keys = [...new Set(data.items.map((i) => i.category))].sort((a, b) => {
      const ia = CHECKLIST_CATEGORY_ORDER.indexOf(a);
      const ib = CHECKLIST_CATEGORY_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    return keys.map((key, order) => {
      const items = data.items.filter((i) => i.category === key);
      const showAll = expanded[key] || items.length <= COLLAPSED_ROWS + 1;
      return {
        id: key,
        name: CHECKLIST_CATEGORY_LABEL[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        order,
        showLoadMore: !showAll,
        items: (showAll ? items : items.slice(0, COLLAPSED_ROWS)).map((i, idx) => ({
          id: i.id,
          categoryId: key,
          name: i.name,
          description: i.description ?? i.name,
          image: checklistImage(i.imageKey, i.category),
          quantity: quantities[i.id] ?? 0,
          initialStock: i.parLevel ?? undefined,
          order: idx,
        })),
      };
    });
  }, [data, quantities, expanded]);

  const reviewLines: ReviewLine[] = useMemo(
    () =>
      (data?.items ?? [])
        .filter((i) => (quantities[i.id] ?? 0) > 0)
        .map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category,
          imageKey: i.imageKey,
          quantity: quantities[i.id],
          unitPrice: i.unitPrice,
          billable: i.billable,
        })),
    [data, quantities]
  );
  const hasCounts = reviewLines.length > 0;

  const handleQuantityChange = useCallback((itemId: string, quantity: number) => {
    setQuantities((prev) => ({ ...prev, [itemId]: Math.max(0, quantity) }));
  }, []);

  const handleConfirm = async (remarks: string) => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitRoomChecklist(
        roomId,
        submissionId.current,
        reviewLines.map((l) => ({ consumableId: l.id, quantity: l.quantity })),
        remarks
      );
      setReviewOpen(false);
      setQuantities({});
      submissionId.current = newSubmissionId();
      toast.show(
        `${result.count} ${result.count === 1 ? 'item' : 'items'} recorded for Room ${roomNumber}`,
        { type: 'success', title: 'Checklist Submitted' }
      );
      void load();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'The checklist could not be submitted. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /** The PDF: everything recorded this stay, summed per item. */
  const handleDownloadReport = async () => {
    if (!data || data.submissions.length === 0 || isGeneratingReport) return;
    const totals = new Map<string, number>();
    for (const sub of data.submissions) {
      for (const it of sub.items) totals.set(it.consumableId, (totals.get(it.consumableId) ?? 0) + it.quantity);
    }
    const latest = data.submissions[0];
    const at = new Date(latest.reportedAt);
    const report: ChecklistData = {
      roomNumber,
      categories: categories.map((c) => ({
        ...c,
        items: data.items
          .filter((i) => i.category === c.id)
          .map((i, idx) => ({
            id: i.id,
            categoryId: c.id,
            name: i.name,
            description: i.description ?? i.name,
            image: null,
            quantity: totals.get(i.id) ?? 0,
            order: idx,
          })),
      })),
      registeredBy: { id: latest.reportedBy?.id ?? '', name: latest.reportedBy?.fullName ?? 'Staff' },
      registeredAt: { time: formatTime(at), date: formatDate(at) },
    };
    try {
      setIsGeneratingReport(true);
      await generateChecklistReport({ roomNumber, roomCode, checklistData: report });
    } catch (error) {
      console.error('Error downloading checklist report:', error);
      toast.show('Failed to generate report. Please try again.', { type: 'error', title: 'Error' });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (!data && !loadError) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#5a759d" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>{loadError}</Text>
        <TouchableOpacity style={styles.retry} onPress={() => void load()} accessibilityRole="button">
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {data.submissions.length > 0 ? (
          <DownloadReportButton onPress={() => void handleDownloadReport()} isLoading={isGeneratingReport} />
        ) : null}

        <Text style={styles.title}>Room Checklist</Text>
        <Text style={styles.stay}>
          {data.stay
            ? `For ${data.stay.guestName ?? 'the guest'} · ${formatStayDates(data.stay)}`
            : 'No guest staying — counts are recorded without a charge.'}
        </Text>

        {canComplete ? (
          data.items.length === 0 ? (
            <Text style={styles.message}>No checklist items are set up for this hotel yet.</Text>
          ) : (
            categories.map((category) => (
              <ChecklistCategory
                key={category.id}
                category={category}
                onQuantityChange={handleQuantityChange}
                onLoadMore={category.showLoadMore ? () => setExpanded((p) => ({ ...p, [category.id]: true })) : undefined}
              />
            ))
          )
        ) : (
          <Text style={styles.message}>You can see what was recorded. Counting is done by housekeeping.</Text>
        )}

        <ChecklistHistory submissions={data.submissions} hasStay={!!data.stay} />
      </ScrollView>

      {canComplete && data.items.length > 0 ? (
        <ChecklistFooter
          registeredBy={{
            id: data.me?.id ?? '',
            name: data.me?.fullName ?? 'You',
            avatar: data.me?.avatarUrl ? { uri: data.me.avatarUrl } : undefined,
          }}
          registeredAt={{ time: formatTime(now), date: formatDate(now) }}
          onSubmit={() => {
            setSubmitError(null);
            setReviewOpen(true);
          }}
          onCancel={() => setQuantities({})}
          hasChanges={hasCounts}
        />
      ) : null}

      <ChecklistReviewSheet
        visible={reviewOpen}
        roomNumber={roomNumber}
        stay={data.stay}
        lines={reviewLines}
        submitting={submitting}
        error={submitError}
        onBack={() => setReviewOpen(false)}
        onConfirm={(remarks) => void handleConfirm(remarks)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: CHECKLIST_SECTION.container.paddingHorizontal,
    paddingTop: CHECKLIST_SECTION.container.marginTop,
    paddingBottom: 20 * scaleX,
  },
  title: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: 'bold' as any,
    color: CHECKLIST_SECTION.title.color,
  },
  stay: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#334866',
    marginTop: 6 * scaleX,
    marginBottom: 20 * scaleX,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 * scaleX },
  message: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#a0a0a0',
    textAlign: 'center',
    marginVertical: 16 * scaleX,
  },
  retry: { marginTop: 8 * scaleX, paddingHorizontal: 20 * scaleX, paddingVertical: 10 * scaleX },
  retryText: { fontSize: 16 * scaleX, fontFamily: typography.fontFamily.primary, color: '#5a759d', fontWeight: '700' },
});
