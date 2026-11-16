import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { SafeModal as Modal } from '@/components/ui/SafeModal';
import { typography } from '@/theme';
import { Icon, type IconName } from '@/components/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { scaleX } from '@/utils/responsive';
import { formatDueAtCalendarLabel } from '@/utils/ticketDue';
import { departmentGlyphHeight, departmentIconName } from '@/lib/departments';
import type { TicketData, TicketStatus } from '../types/tickets.types';

export type TicketStatusAnchorLayout = { x: number; y: number; width: number; height: number };

export interface TicketCardProps {
  ticket: TicketData;
  onPress?: () => void;
  /**
   * The status pill was tapped, with where it is on screen (the Tickets list
   * opens its status popover there). Without it the pill is part of the card.
   */
  onStatusPress?: (anchor?: TicketStatusAnchorLayout) => void;
  /** The tagged person was tapped (reassign). Without it they are part of the card. */
  onAssigneePress?: () => void;
}

const PRIORITY = {
  urgent: { label: 'High Priority', flags: 3, color: '#f92424' },
  medium: { label: 'Normal', flags: 2, color: '#f0be1b' },
  notUrgent: { label: 'Low Priority', flags: 1, color: '#9797a3' },
} as const;

/** The full-width status pill — Figma 4664:886 (377 x 61, radius 30.5). */
const STATUS: Record<TicketStatus, { label: string; color: string; icon: IconName | null }> = {
  unsolved: { label: 'Unsolved', color: '#f92424', icon: 'action-thumbs-down-line' },
  inProgress: { label: 'In Progress', color: '#f0be1b', icon: 'action-in-progress' },
  done: { label: 'Solved', color: '#41d541', icon: 'action-thumbs-up-line' },
  ofo: { label: 'OFT', color: '#c6c5c5', icon: null },
};

function formatCreatedAt(iso?: string): string | undefined {
  if (!iso) return undefined;
  const dt = new Date(iso);
  if (!Number.isFinite(dt.getTime())) return undefined;
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}, ${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

/** "Dimotia Mavros" -> "Dimotia. M", as the frame labels a tagged person. */
function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? '';
  return `${parts[0]}. ${parts[parts.length - 1][0].toUpperCase()}`;
}

/**
 * One ticket — Figma 667:3068 (Tickets, card 4664:875) and 285:4037 (Room
 * Detail → Tickets, card 4664:877): one design.
 *
 * The department disc and the title with priority and due line, the room as a
 * blue pill; the photos; who raised it → who is tagged; then the status as a
 * full-width pill. The card opens the ticket.
 */
export default function TicketCard({ ticket, onPress, onStatusPress, onAssigneePress }: TicketCardProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const statusRef = useRef<View>(null);
  const departmentIcon: IconName | null = departmentIconName(ticket.category);
  const priority = PRIORITY[ticket.priority ?? 'medium'];
  const status = STATUS[ticket.status] ?? STATUS.unsolved;
  const dueLine = useMemo(() => (ticket.dueAt ? formatDueAtCalendarLabel(ticket.dueAt) : ''), [ticket.dueAt]);
  const createdAt = useMemo(() => formatCreatedAt(ticket.createdAt), [ticket.createdAt]);
  const images = (ticket.images ?? []).slice(0, 3);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8} accessibilityRole="button">
      {/* Header — 4664:904 / 4664:930 */}
      <View style={styles.header}>
        <View style={styles.deptDisc}>
          {departmentIcon ? (
            <Icon name={departmentIcon} size={departmentGlyphHeight(departmentIcon) * 0.8 * scaleX} color="#f92424" />
          ) : null}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {ticket.title}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.flags}>
              {Array.from({ length: priority.flags }, (_, i) => (
                <Icon key={i} name="action-flag-priority" width={8.5 * scaleX} height={11 * scaleX} color={priority.color} />
              ))}
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {priority.label}
              {dueLine ? `  |  ${dueLine}` : ''}
            </Text>
          </View>
        </View>
        {!!ticket.roomNumber && (
          <View style={styles.roomPill}>
            <Text style={styles.roomPillText} numberOfLines={1} adjustsFontSizeToFit>
              {ticket.roomNumber}
            </Text>
          </View>
        )}
      </View>

      {/* Photos — 4664:895, 93 x 92 thumbs 12 apart */}
      {images.length > 0 && (
        <>
          <View style={styles.rule} />
          <View style={styles.photos}>
            <Text style={styles.sectionLabel}>Photos</Text>
            <View style={styles.thumbs}>
              {images.map((uri, idx) => (
                <TouchableOpacity key={`${uri}-${idx}`} activeOpacity={0.8} onPress={() => setPreviewImage(uri)}>
                  <Image source={{ uri }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      <View style={styles.rule} />

      {/* Created by → Tagged — 4664:879 / 4664:897 */}
      <View style={styles.people}>
        <View style={styles.personCol}>
          <Text style={styles.sectionLabel}>Created by</Text>
          <View style={styles.person}>
            <Avatar
              uri={typeof ticket.createdBy.avatar === 'string' ? ticket.createdBy.avatar : undefined}
              name={ticket.createdBy.name}
              size={28 * scaleX}
            />
            <View style={styles.personText}>
              <Text style={styles.personName} numberOfLines={1}>
                {ticket.createdBy.name}
              </Text>
              <Text style={styles.personSub} numberOfLines={1}>
                {createdAt ?? '—'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.arrow}>
          <Icon name="guest-arrow" size={10 * scaleX} color="#1e1e1e" />
        </View>
        <TouchableOpacity
          style={[styles.personCol, styles.taggedCol]}
          disabled={!onAssigneePress}
          onPress={onAssigneePress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Tagged staff"
        >
          <Text style={styles.sectionLabel}>Tagged</Text>
          <View style={styles.person}>
            <Avatar
              uri={typeof ticket.assignedTo?.avatar === 'string' ? ticket.assignedTo.avatar : undefined}
              name={ticket.assignedTo?.name}
              size={27 * scaleX}
            />
            <View style={styles.personText}>
              <Text style={styles.personName} numberOfLines={1}>
                {ticket.assignedTo?.name ? shortName(ticket.assignedTo.name) : 'No one yet'}
              </Text>
              <Text style={styles.personSub} numberOfLines={1}>
                {ticket.assignedTo?.departmentName ?? '—'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Status — 4664:883 */}
      <View ref={statusRef} collapsable={false} style={[styles.statusPill, { backgroundColor: status.color }]}>
        <TouchableOpacity
          style={styles.statusPress}
          disabled={!onStatusPress}
          onPress={() =>
            statusRef.current?.measureInWindow((x, y, width, height) => onStatusPress?.({ x, y, width, height }))
          }
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Status: ${status.label}. Change status`}
        >
          {status.icon ? <Icon name={status.icon} size={20.6 * scaleX} color="#ffffff" /> : null}
          <Text style={styles.statusLabel}>{status.label}</Text>
          <Icon name="action-chevron-down-wide" width={20 * scaleX} height={10 * scaleX} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={() => setPreviewImage(null)}>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={styles.previewImage} contentFit="contain" cachePolicy="memory-disk" />
          )}
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
}

const androidText = Platform.select({ android: { includeFontPadding: false } as const, default: {} as const });

const styles = StyleSheet.create({
  /* 4664:878 — #f9fafc, 1px #bbb, radius 9, 409 wide. */
  card: {
    backgroundColor: '#f9fafc',
    borderWidth: 1,
    borderColor: '#bbbbbb',
    borderRadius: 9 * scaleX,
    paddingBottom: 21 * scaleX,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 16 * scaleX,
    paddingLeft: 17 * scaleX,
    paddingRight: 21 * scaleX,
    paddingBottom: 13 * scaleX,
  },
  deptDisc: {
    width: 55.5 * scaleX,
    height: 55.5 * scaleX,
    borderRadius: 28 * scaleX,
    backgroundColor: '#ffebeb',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1 * scaleX,
  },
  headerText: {
    flex: 1,
    marginLeft: 8.5 * scaleX,
    paddingTop: 6 * scaleX,
  },
  title: {
    fontSize: 20 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#5a759d',
    ...androidText,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6 * scaleX,
    paddingLeft: 4 * scaleX,
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
  /* 4664:931 — 71 x 49, #5a759d, "201" Helvetica Bold 26 white. */
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
  rule: {
    height: 1,
    backgroundColor: '#e3e3e3',
  },
  photos: {
    paddingTop: 10 * scaleX,
    paddingLeft: 23 * scaleX,
    paddingBottom: 16 * scaleX,
  },
  sectionLabel: {
    fontSize: 10 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#898585',
    ...androidText,
  },
  thumbs: {
    flexDirection: 'row',
    gap: 12 * scaleX,
    marginTop: 10 * scaleX,
    paddingLeft: 1 * scaleX,
  },
  thumb: {
    width: 93 * scaleX,
    height: 92 * scaleX,
    borderRadius: 5 * scaleX,
  },
  people: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 13 * scaleX,
    paddingHorizontal: 11 * scaleX,
  },
  personCol: {
    flex: 1,
  },
  taggedCol: {
    flex: 0,
    maxWidth: 130 * scaleX,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12 * scaleX,
  },
  personText: {
    flexShrink: 1,
    marginLeft: 7 * scaleX,
  },
  personName: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
    ...androidText,
  },
  personSub: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    ...androidText,
  },
  /* The arrow points right: guest-arrow points left and is mirrored (as on TicketCard). */
  arrow: {
    marginHorizontal: 12 * scaleX,
    marginBottom: 12 * scaleX,
    transform: [{ scaleX: -1 }],
  },
  statusPill: {
    height: 61 * scaleX,
    borderRadius: 30.5 * scaleX,
    marginTop: 28 * scaleX,
    marginHorizontal: 21 * scaleX,
  },
  statusPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11 * scaleX,
  },
  statusLabel: {
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
    marginRight: 2 * scaleX,
    ...androidText,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
});
