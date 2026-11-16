import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { typography } from '@/theme';
import { Icon } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import type { TicketDraft } from '../store/ticketDrafts';

export interface TicketDraftCardProps {
  draft: TicketDraft;
  onPress: () => void;
  onDiscard: () => void;
}

const PRIORITY = {
  high: { label: 'High Priority', flags: 3, color: '#f92424' },
  medium: { label: 'Normal', flags: 2, color: '#f0be1b' },
  low: { label: 'Low Priority', flags: 1, color: '#9797a3' },
} as const;

function formatEdited(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return `Edited ${pad2(d.getHours())}:${pad2(d.getMinutes())}, ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
}

/**
 * One draft on Tickets → Drafts. Figma draws only the "Drafts (1)" chip, so
 * the card follows the ticket card's dress (#f9fafc, #bbb hairline, radius 9,
 * the blue room pill) without a status: tap to continue, or discard.
 */
export default function TicketDraftCard({ draft, onPress, onDiscard }: TicketDraftCardProps) {
  const priority = PRIORITY[draft.priority] ?? PRIORITY.medium;
  const where = draft.isPublicArea ? (draft.publicAreaName ?? 'Public Area') : null;
  const photos = draft.pictures.length;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Draft: ${draft.title || 'Untitled ticket'}. Continue editing`}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !draft.title.trim() && styles.titleEmpty]} numberOfLines={1}>
              {draft.title.trim() || 'Untitled ticket'}
            </Text>
            <View style={styles.draftChip}>
              <Text style={styles.draftChipText}>Draft</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.flags}>
              {Array.from({ length: priority.flags }, (_, i) => (
                <Icon key={i} name="action-flag-priority" width={8.5 * scaleX} height={11 * scaleX} color={priority.color} />
              ))}
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {[priority.label, where, photos ? `${photos} photo${photos === 1 ? '' : 's'}` : null, formatEdited(draft.updatedAt)]
                .filter(Boolean)
                .join('  |  ')}
            </Text>
          </View>
        </View>
        {!!draft.roomNumber && (
          <View style={styles.roomPill}>
            <Text style={styles.roomPillText} numberOfLines={1} adjustsFontSizeToFit>
              {draft.roomNumber}
            </Text>
          </View>
        )}
      </View>

      {!!draft.description.trim() && (
        <Text style={styles.description} numberOfLines={2}>
          {draft.description.trim()}
        </Text>
      )}

      <View style={styles.rule} />
      <View style={styles.actions}>
        <TouchableOpacity onPress={onDiscard} hitSlop={8} accessibilityRole="button" accessibilityLabel="Discard draft">
          <Text style={styles.discard}>Discard</Text>
        </TouchableOpacity>
        <Text style={styles.continue}>Continue</Text>
      </View>
    </TouchableOpacity>
  );
}

const androidText = Platform.select({ android: { includeFontPadding: false } as const, default: {} as const });

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f9fafc',
    borderWidth: 1,
    borderColor: '#bbbbbb',
    borderRadius: 9 * scaleX,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 16 * scaleX,
    paddingLeft: 20 * scaleX,
    paddingRight: 21 * scaleX,
    paddingBottom: 12 * scaleX,
  },
  headerText: {
    flex: 1,
    paddingTop: 6 * scaleX,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 * scaleX,
  },
  title: {
    flexShrink: 1,
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#5a759d',
    ...androidText,
  },
  titleEmpty: {
    color: '#9aa7bd',
  },
  draftChip: {
    paddingHorizontal: 8 * scaleX,
    paddingVertical: 3 * scaleX,
    borderRadius: 9 * scaleX,
    backgroundColor: '#eef2f7',
  },
  draftChipText: {
    fontSize: 11 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#5a759d',
    ...androidText,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6 * scaleX,
  },
  flags: {
    flexDirection: 'row',
    gap: 2 * scaleX,
    marginRight: 8 * scaleX,
  },
  meta: {
    flexShrink: 1,
    fontSize: 10 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#898585',
    ...androidText,
  },
  roomPill: {
    minWidth: 71 * scaleX,
    height: 49 * scaleX,
    borderRadius: 41 * scaleX,
    paddingHorizontal: 12 * scaleX,
    backgroundColor: '#5a759d',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8 * scaleX,
  },
  roomPillText: {
    fontSize: 26 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
    ...androidText,
  },
  description: {
    paddingHorizontal: 20 * scaleX,
    paddingBottom: 12 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    ...androidText,
  },
  rule: {
    height: 1,
    backgroundColor: '#e3e3e3',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20 * scaleX,
    paddingVertical: 14 * scaleX,
  },
  discard: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: '#f92424',
    ...androidText,
  },
  continue: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#5a759d',
    ...androidText,
  },
});
