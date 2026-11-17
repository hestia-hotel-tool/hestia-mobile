import React from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { DESIGN_WIDTH } from '@/utils/responsive';
import type { ChecklistSubmission } from '../../services/roomChecklist';
import { checklistImage } from '../../constants/checklistImages';
import { formatMoney } from './ChecklistReviewSheet';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date}, ${time}`;
}

/**
 * "Recorded this stay": every checklist submitted for the guest now in the
 * room (or, with no guest, in the last day) — who, when, what — so the next
 * person to open the tab does not count the minibar twice.
 */
export default function ChecklistHistory({ submissions, hasStay }: { submissions: ChecklistSubmission[]; hasStay: boolean }) {
  const { width } = useWindowDimensions();
  const s = (n: number) => (n * width) / DESIGN_WIDTH;

  return (
    <View style={{ marginTop: s(8), marginBottom: s(16) }}>
      <Text style={[styles.heading, { fontSize: s(17), marginBottom: s(12) }]}>
        {hasStay ? 'Recorded this stay' : 'Recorded today'}
      </Text>
      {submissions.length === 0 ? (
        <Text style={[styles.empty, { fontSize: s(14) }]}>Nothing recorded yet.</Text>
      ) : (
        submissions.map((sub) => (
          <View
            key={sub.submissionId}
            style={[styles.card, { borderRadius: s(9), padding: s(14), marginBottom: s(12) }]}
          >
            <View style={[styles.cardHeader, { marginBottom: s(10) }]}>
              <Avatar
                uri={sub.reportedBy?.avatarUrl ?? undefined}
                name={sub.reportedBy?.fullName ?? 'Staff'}
                size={s(32)}
              />
              <View style={{ flex: 1, marginLeft: s(10) }}>
                <Text style={[styles.who, { fontSize: s(14) }]}>{sub.reportedBy?.fullName ?? 'Staff'}</Text>
                <Text style={[styles.when, { fontSize: s(12) }]}>{formatWhen(sub.reportedAt)}</Text>
              </View>
              {sub.total != null && sub.total > 0 ? (
                <Text style={[styles.total, { fontSize: s(15) }]}>{formatMoney(sub.total)}</Text>
              ) : null}
            </View>
            {sub.items.map((it) => (
              <View key={it.consumableId} style={[styles.row, { marginTop: s(6) }]}>
                <Image
                  source={checklistImage(it.imageKey, it.category)}
                  style={{ width: s(24), height: s(24), marginRight: s(10) }}
                  resizeMode="contain"
                />
                <Text style={[styles.itemName, { fontSize: s(14) }]}>{it.name}</Text>
                <Text style={[styles.qty, { fontSize: s(14) }]}>× {it.quantity}</Text>
              </View>
            ))}
            {sub.remarks ? (
              <Text style={[styles.remarks, { fontSize: s(13), marginTop: s(10) }]}>“{sub.remarks}”</Text>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontFamily: 'Helvetica', fontWeight: '700', color: '#1e1e1e' },
  empty: { fontFamily: 'Helvetica', fontWeight: '300', color: '#a0a0a0' },
  card: { backgroundColor: '#f9fafc', borderWidth: 1, borderColor: '#e3e3e3' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  who: { fontFamily: 'Helvetica', fontWeight: '700', color: '#1e1e1e' },
  when: { fontFamily: 'Helvetica', fontWeight: '400', color: '#a0a0a0', marginTop: 2 },
  total: { fontFamily: 'Helvetica', fontWeight: '700', color: '#334866' },
  row: { flexDirection: 'row', alignItems: 'center' },
  itemName: { flex: 1, fontFamily: 'Helvetica', fontWeight: '400', color: '#1e1e1e' },
  qty: { fontFamily: 'Helvetica', fontWeight: '700', color: '#1e1e1e' },
  remarks: { fontFamily: 'Helvetica', fontWeight: '300', fontStyle: 'italic', color: '#334866' },
});
