import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useToast } from '@/contexts/ToastContext';
import { useMessageModal } from '@/contexts/MessageModalContext';
import type { AssignmentDepartment } from '@/domain/assignments';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import { INSPECTION_CATEGORY_ORDER, inspectionCategoryLabel } from '../../constants/inspectionImages';
import {
  fetchRoomInspection,
  finishRoomInspection,
  raiseRoomInspectionTickets,
  setRoomInspectionResult,
  type InspectionItem,
  type InspectionResult,
  type RoomInspection,
} from '../../services/roomInspection';
import { askReason } from '../../utils/askReason';
import { OVERRIDE_REASONS } from '../../utils/roomStatusMachine';
import InspectionIssueSheet from './InspectionIssueSheet';
import InspectionItemRow from './InspectionItemRow';

export type InspectionSectionProps = {
  roomId: string;
  roomNumber: string;
  department: AssignmentDepartment;
  /** The room's technician this shift, or a lead: may mark and finish. */
  canWork: boolean;
  /** A lead working someone else's room: submitting asks why. */
  actsForAssignee: boolean;
  /** The round is already Checked (no reason needed to submit again). */
  roundChecked: boolean;
  /** A mark or a submit may have moved the round: refresh the header. */
  onRoundChanged: () => void;
};

const time = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/**
 * Engineering's Checklist tab — Figma 4759:225. "Room Check List", the
 * category chips, the category's items (Good / Issue), and Next, which steps
 * through the categories; on the last it is Submit (Figma 4759:1432): everything marked →
 * the round goes Checked, then the issues can become tickets.
 *
 * Each mark is saved as it is made (no draft to lose); the technician's first
 * mark starts the round. A new service day starts a new checklist.
 */
export default function InspectionSection({
  roomId,
  roomNumber,
  department,
  canWork,
  actsForAssignee,
  roundChecked,
  onRoundChanged,
}: InspectionSectionProps) {
  const toast = useToast();
  const messageModal = useMessageModal();
  const scrollRef = useRef<ScrollView>(null);

  const [data, setData] = useState<RoomInspection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [issueFor, setIssueFor] = useState<InspectionItem | null>(null);
  const [finishing, setFinishing] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setData(await fetchRoomInspection(roomId, department));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'The checklist could not be loaded.');
    }
  }, [roomId, department]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(() => {
    const keys = [...new Set((data?.items ?? []).map((i) => i.category))];
    const rank = (k: string) => {
      const i = INSPECTION_CATEGORY_ORDER.indexOf(k);
      return i < 0 ? 99 : i;
    };
    return keys.sort((a, b) => rank(a) - rank(b));
  }, [data]);

  const current = category && categories.includes(category) ? category : (categories[0] ?? null);
  const items = useMemo(
    () => (data?.items ?? []).filter((i) => i.category === current).sort((a, b) => a.sortOrder - b.sortOrder),
    [data, current]
  );
  const isLast = current === categories[categories.length - 1];
  const unchecked = (data?.items ?? []).filter((i) => !i.result);

  const goTo = (key: string) => {
    setCategory(key);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  /** Optimistic: the row changes at once, and goes back if the save fails. */
  const mark = async (item: InspectionItem, result: InspectionResult | null, note: string | null = null) => {
    const before = data;
    const firstMark = !(data?.items ?? []).some((i) => i.result);
    setData((d) =>
      d ? { ...d, items: d.items.map((i) => (i.id === item.id ? { ...i, result, note: result === 'issue' ? note : null } : i)) } : d
    );
    try {
      await setRoomInspectionResult(roomId, department, item.id, result, note);
      if (firstMark) onRoundChanged();
    } catch (e) {
      setData(before);
      toast.show(e instanceof Error ? e.message : 'That could not be saved.', { type: 'error', title: 'Not saved' });
    }
  };

  const raiseTickets = async (count: number) => {
    messageModal.show({
      title: count === 1 ? '1 issue found' : `${count} issues found`,
      message: `Raise an Engineering ticket for ${count === 1 ? 'it' : 'each'}? The note becomes the ticket.`,
      buttons: [
        {
          text: count === 1 ? 'Raise ticket' : 'Raise tickets',
          onPress: async () => {
            try {
              const n = await raiseRoomInspectionTickets(roomId, department);
              toast.show(n === 1 ? '1 ticket raised.' : `${n} tickets raised.`, { type: 'success' });
              await load();
            } catch (e) {
              toast.show(e instanceof Error ? e.message : 'The tickets could not be raised.', { type: 'error' });
            }
          },
        },
        { text: 'Not now', style: 'cancel' as const },
      ],
    });
  };

  const finish = async () => {
    if (unchecked.length > 0) {
      goTo(unchecked[0].category);
      toast.show(
        unchecked.length === 1 ? '1 item is still unchecked.' : `${unchecked.length} items are still unchecked.`,
        { type: 'info', title: 'Not submitted' }
      );
      return;
    }
    let reason: string | null = null;
    if (actsForAssignee && !roundChecked) {
      reason = await askReason(
        messageModal,
        'Submit for the technician?',
        `Room ${roomNumber} is another technician's. Say why you are submitting it.`,
        OVERRIDE_REASONS
      );
      if (!reason) return;
    }
    setFinishing(true);
    try {
      await finishRoomInspection(roomId, department, reason);
      onRoundChanged();
      await load();
      const openIssues = (data?.items ?? []).filter((i) => i.result === 'issue' && !i.ticketId).length;
      if (openIssues > 0) void raiseTickets(openIssues);
      else toast.show(`Room ${roomNumber} checked.`, { type: 'success' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'The checklist could not be submitted.', { type: 'error' });
    } finally {
      setFinishing(false);
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
      <ScrollView ref={scrollRef} style={styles.fill} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Room Check List</Text>
        {data.completedAt ? (
          <Text style={styles.status}>
            {`Completed${data.completedBy ? ` by ${data.completedBy}` : ''} at ${time(data.completedAt)}`}
          </Text>
        ) : !canWork ? (
          <Text style={styles.status}>Only the room&apos;s technician or a lead can fill this in.</Text>
        ) : null}

        {categories.length === 0 ? (
          <Text style={styles.message}>No checklist items are set up for this hotel yet.</Text>
        ) : (
          <>
            <View style={styles.band}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {categories.map((key) => {
                  const active = key === current;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => goTo(key)}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{inspectionCategoryLabel(key)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.list}>
              {items.map((item) => (
                <InspectionItemRow
                  key={item.id}
                  item={item}
                  editable={canWork}
                  onGood={() => void mark(item, item.result === 'good' ? null : 'good')}
                  onIssue={() => setIssueFor(item)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {canWork && categories.length > 0 ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.next}
            onPress={() => {
              if (!isLast && current) goTo(categories[categories.indexOf(current) + 1]);
              else void finish();
            }}
            disabled={finishing}
            accessibilityRole="button"
          >
            {finishing ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.nextText}>{isLast ? 'Submit' : 'Next'}</Text>}
          </TouchableOpacity>
        </View>
      ) : null}

      <InspectionIssueSheet
        itemName={issueFor?.name ?? null}
        initialNote={issueFor?.note}
        isExisting={issueFor?.result === 'issue'}
        onCancel={() => setIssueFor(null)}
        onSave={(note) => {
          const item = issueFor;
          setIssueFor(null);
          if (item) void mark(item, 'issue', note);
        }}
        onRemove={() => {
          const item = issueFor;
          setIssueFor(null);
          if (item) void mark(item, null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fill: { flex: 1 },
  /* The frame's rows start 29 in and end 39 from the right (cross at 367–401). */
  content: { paddingTop: 17 * scaleX, paddingBottom: 24 * scaleX },
  title: {
    marginLeft: 25 * scaleX,
    fontSize: 19 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  status: {
    marginLeft: 25 * scaleX,
    marginTop: 4 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#8e8888',
  },
  /* 4759:1411 — #f1f6fc pill, 58 tall, 10 from each side. */
  band: {
    height: 58 * scaleX,
    marginTop: 15 * scaleX,
    marginHorizontal: 10 * scaleX,
    borderRadius: 65 * scaleX,
    backgroundColor: '#f1f6fc',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chips: { alignItems: 'center', gap: 15 * scaleX, paddingHorizontal: 14 * scaleX },
  chip: {
    paddingHorizontal: 10 * scaleX,
    height: 37 * scaleX,
    minWidth: 59 * scaleX,
    borderRadius: 33 * scaleX,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: '#5a759d' },
  chipText: { fontSize: 15 * scaleX, fontFamily: typography.fontFamily.primary, color: '#5a759d' },
  chipTextActive: { fontWeight: '700', color: '#ffffff' },
  list: { marginTop: 33 * scaleX, paddingLeft: 29 * scaleX, paddingRight: 39 * scaleX },
  /* 4759:1373 — #5a759d bar, 370 x 70, square corners, centred. */
  footer: { alignItems: 'center', paddingTop: 8 * scaleX, paddingBottom: 16 * scaleX, backgroundColor: '#ffffff' },
  next: {
    width: 370 * scaleX,
    height: 70 * scaleX,
    backgroundColor: '#5a759d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { fontSize: 18 * scaleX, fontFamily: typography.fontFamily.primary, fontWeight: '700', color: '#ffffff' },
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
