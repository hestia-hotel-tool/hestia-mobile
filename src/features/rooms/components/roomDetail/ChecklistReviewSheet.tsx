import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeModal as Modal } from '@/components/ui/SafeModal';
import { KeyboardDoneBar, KEYBOARD_DONE_BAR_ID } from '@/components/ui/KeyboardDoneBar';
import { DESIGN_WIDTH } from '@/utils/responsive';
import { checklistImage } from '../../constants/checklistImages';
import type { ChecklistStay } from '../../services/roomChecklist';

export type ReviewLine = {
  id: string;
  name: string;
  category: string;
  imageKey: string | null;
  quantity: number;
  unitPrice: number | null;
  billable: boolean;
};

const REMARKS_MAX = 500;

export function formatMoney(n: number): string {
  return n.toFixed(2);
}

export function formatStayDates(stay: ChecklistStay): string {
  const f = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${f(stay.arrivalDate)} – ${f(stay.departureDate)}`;
}

/**
 * Check before it is recorded: what is being submitted, who it is charged
 * to, and room for a remark ("bottle opened, half full"). Submitting from the
 * tab used to fire straight away — and, in fact, did nothing at all.
 */
export default function ChecklistReviewSheet({
  visible,
  roomNumber,
  stay,
  lines,
  submitting,
  error,
  onBack,
  onConfirm,
}: {
  visible: boolean;
  roomNumber: string;
  stay: ChecklistStay | null;
  lines: ReviewLine[];
  submitting: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: (remarks: string) => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const s = (n: number) => (n * width) / DESIGN_WIDTH;
  const [remarks, setRemarks] = useState('');

  const priced = lines.filter((l) => l.billable && (l.unitPrice ?? 0) > 0);
  const total = priced.reduce((sum, l) => sum + (l.unitPrice ?? 0) * l.quantity, 0);
  const units = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={submitting ? undefined : onBack}>
      <Pressable style={styles.backdrop} onPress={submitting ? undefined : onBack} accessibilityLabel="Back" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrap}
        pointerEvents="box-none"
      >
        <View style={[styles.sheet, { borderTopLeftRadius: s(20), borderTopRightRadius: s(20) }]}>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: s(24), paddingTop: s(24), paddingBottom: s(12) }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.title, { fontSize: s(20) }]}>Review Room {roomNumber} checklist</Text>
            <Text style={[styles.subtitle, { fontSize: s(14), marginTop: s(6) }]}>
              {stay
                ? `Recorded for ${stay.guestName ?? 'the guest'} · ${formatStayDates(stay)}`
                : 'No guest is staying in this room — recorded without a charge.'}
            </Text>

            <View style={[styles.divider, { marginVertical: s(16) }]} />

            {lines.map((l) => (
              <View key={l.id} style={[styles.line, { marginBottom: s(14) }]}>
                <Image
                  source={checklistImage(l.imageKey, l.category)}
                  style={{ width: s(40), height: s(40), marginRight: s(14) }}
                  resizeMode="contain"
                />
                <Text style={[styles.lineName, { fontSize: s(15) }]} numberOfLines={2}>
                  {l.name}
                </Text>
                <Text style={[styles.lineQty, { fontSize: s(15) }]}>× {l.quantity}</Text>
                {priced.length > 0 ? (
                  <Text style={[styles.linePrice, { fontSize: s(14), width: s(70) }]}>
                    {l.billable && (l.unitPrice ?? 0) > 0 ? formatMoney((l.unitPrice ?? 0) * l.quantity) : '—'}
                  </Text>
                ) : null}
              </View>
            ))}

            <View style={[styles.totalRow, { paddingTop: s(12) }]}>
              <Text style={[styles.totalLabel, { fontSize: s(15) }]}>
                {units} {units === 1 ? 'item' : 'items'}
              </Text>
              {priced.length > 0 ? (
                <Text style={[styles.totalValue, { fontSize: s(16) }]}>Total {formatMoney(total)}</Text>
              ) : null}
            </View>

            <Text style={[styles.label, { fontSize: s(15), marginTop: s(20) }]}>Remarks</Text>
            <TextInput
              style={[styles.input, { marginTop: s(10), height: s(90), borderRadius: s(7), padding: s(12), fontSize: s(15) }]}
              placeholder="Optional — e.g. bottle opened, half full"
              placeholderTextColor="#999999"
              multiline
              maxLength={REMARKS_MAX}
              value={remarks}
              onChangeText={setRemarks}
              editable={!submitting}
              inputAccessoryViewID={KEYBOARD_DONE_BAR_ID}
              textAlignVertical="top"
            />
            <KeyboardDoneBar />

            {error ? (
              <Text style={[styles.error, { fontSize: s(14), marginTop: s(12) }]} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}
          </ScrollView>

          <View style={{ paddingHorizontal: s(24), paddingBottom: insets.bottom + s(12), gap: s(10) }}>
            <TouchableOpacity
              style={[styles.primary, { height: s(56), borderRadius: s(10) }, submitting && styles.busy]}
              onPress={() => onConfirm(remarks)}
              disabled={submitting}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={[styles.primaryText, { fontSize: s(17) }]}>Confirm & Submit</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondary, { height: s(52), borderRadius: s(10) }]}
              onPress={onBack}
              disabled={submitting}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={[styles.secondaryText, { fontSize: s(17) }]}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)' },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#ffffff', maxHeight: '90%' },
  title: { fontFamily: 'Helvetica', fontWeight: '700', color: '#607aa1' },
  subtitle: { fontFamily: 'Helvetica', fontWeight: '400', color: '#334866' },
  divider: { height: 1, backgroundColor: '#e3e3e3' },
  line: { flexDirection: 'row', alignItems: 'center' },
  lineName: { flex: 1, fontFamily: 'Helvetica', fontWeight: '400', color: '#1e1e1e' },
  lineQty: { fontFamily: 'Helvetica', fontWeight: '700', color: '#1e1e1e', marginLeft: 8 },
  linePrice: { fontFamily: 'Helvetica', fontWeight: '400', color: '#334866', textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e3e3e3',
  },
  totalLabel: { fontFamily: 'Helvetica', fontWeight: '400', color: '#334866' },
  totalValue: { fontFamily: 'Helvetica', fontWeight: '700', color: '#1e1e1e' },
  label: { fontFamily: 'Helvetica', fontWeight: '700', color: '#1e1e1e' },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: '#000000',
  },
  error: { color: '#f92424', textAlign: 'center' },
  primary: { backgroundColor: '#5a759d', justifyContent: 'center', alignItems: 'center' },
  busy: { opacity: 0.7 },
  primaryText: { fontFamily: 'Helvetica', fontWeight: '700', color: '#ffffff' },
  secondary: { backgroundColor: '#eeeef2', justifyContent: 'center', alignItems: 'center' },
  secondaryText: { fontFamily: 'Helvetica', fontWeight: '700', color: '#1e1e1e' },
});
