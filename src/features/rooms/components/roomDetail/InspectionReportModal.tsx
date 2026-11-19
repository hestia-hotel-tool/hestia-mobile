import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { SafeModal } from '@/components/ui/SafeModal';
import { useToast } from '@/contexts/ToastContext';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import type { RoomInspection } from '../../services/roomInspection';
import { formatInspectionStamp, generateInspectionReport } from '../../utils/generateInspectionReport';
import InspectionCategoryChips, { inspectionCategories, inspectionItemsIn } from './InspectionCategoryChips';
import InspectionItemRow from './InspectionItemRow';

export type InspectionReportModalProps = {
  visible: boolean;
  roomNumber: string;
  roomCode?: string;
  inspection: RoomInspection;
  onClose: () => void;
};

/**
 * "View Report" on a submitted checklist: the checklist exactly as it was
 * submitted — the same chips and rows as Figma 4759:225, read-only — with who
 * submitted it and when, the issue notes, and a PDF to download or share.
 */
export default function InspectionReportModal({
  visible,
  roomNumber,
  roomCode,
  inspection,
  onClose,
}: InspectionReportModalProps) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const categories = useMemo(() => inspectionCategories(inspection.items), [inspection]);
  const [category, setCategory] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const current = category && categories.includes(category) ? category : (categories[0] ?? null);
  const items = useMemo(() => inspectionItemsIn(inspection.items, current), [inspection, current]);
  const issues = inspection.items.filter((i) => i.result === 'issue').length;

  const download = async () => {
    setExporting(true);
    try {
      await generateInspectionReport({ roomNumber, roomCode, inspection });
    } catch {
      toast.show('The PDF could not be made. Please try again.', { type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeModal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Icon name="action-chevron" size={28 * scaleX} color="#5a759d" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>{`Room ${roomNumber} Check List`}</Text>
            {inspection.completedAt ? (
              <Text style={styles.meta}>
                {`Submitted${inspection.completedBy ? ` by ${inspection.completedBy}` : ''} · ${formatInspectionStamp(inspection.completedAt)}`}
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={[styles.summary, issues > 0 && styles.summaryIssues]}>
          {issues === 0 ? 'All items good' : issues === 1 ? '1 issue found' : `${issues} issues found`}
        </Text>

        <InspectionCategoryChips categories={categories} current={current} onSelect={setCategory} />

        <ScrollView style={styles.fill} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {items.map((item) => (
            <InspectionItemRow key={item.id} item={item} editable={false} onGood={() => {}} onIssue={() => {}} />
          ))}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16 * scaleX) }]}>
          <TouchableOpacity style={styles.pdf} onPress={() => void download()} disabled={exporting} accessibilityRole="button">
            {exporting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.pdfText}>Download PDF</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </SafeModal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 23 * scaleX,
    paddingTop: 16 * scaleX,
    paddingBottom: 12 * scaleX,
  },
  headerText: { flex: 1, marginLeft: 18 * scaleX },
  title: { fontSize: 20 * scaleX, fontFamily: typography.fontFamily.primary, fontWeight: '700', color: '#1e1e1e' },
  meta: {
    marginTop: 4 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#334866',
  },
  summary: {
    marginLeft: 25 * scaleX,
    marginTop: 6 * scaleX,
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#41d541',
  },
  summaryIssues: { color: '#f92424' },
  list: { paddingTop: 33 * scaleX, paddingBottom: 24 * scaleX, paddingLeft: 29 * scaleX, paddingRight: 39 * scaleX },
  footer: { alignItems: 'center', paddingTop: 8 * scaleX, backgroundColor: '#ffffff' },
  pdf: {
    width: 370 * scaleX,
    height: 60 * scaleX,
    backgroundColor: '#5a759d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfText: { fontSize: 17 * scaleX, fontFamily: typography.fontFamily.primary, fontWeight: '700', color: '#ffffff' },
});
