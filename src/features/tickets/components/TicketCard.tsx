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

/** The status pill — Figma 4799:648 (174.8 x 59.1). */
const STATUS: Record<TicketStatus, { label: string; color: string; icon: IconName | null }> = {
  unsolved: { label: 'Unsolved', color: '#f92424', icon: 'action-thumbs-down-line' },
  inProgress: { label: 'In Progress', color: '#f0be1b', icon: 'action-in-progress' },
  done: { label: 'Solved', color: '#41d541', icon: 'action-thumbs-up-line' },
  ofo: { label: 'OFT', color: '#c6c5c5', icon: null },
};

/**
 * One ticket — Figma 667:3068 (Tickets, card 4799:646) and 285:4037 (Room
 * Detail → Tickets): one design.
 *
 * The first photo as a 60 thumbnail (a "+n" disc on its corner for the rest),
 * or the department disc when there is none; the title with priority and due
 * line; the room as "Room / 401" on the right. Then the description, and the
 * footer: who has it (or "Assign Ticket") beside the status pill. The card
 * opens the ticket.
 */
export default function TicketCard({ ticket, onPress, onStatusPress, onAssigneePress }: TicketCardProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const statusRef = useRef<View>(null);
  const departmentIcon: IconName | null = departmentIconName(ticket.category);
  const priority = PRIORITY[ticket.priority ?? 'medium'];
  const status = STATUS[ticket.status] ?? STATUS.unsolved;
  const dueLine = useMemo(() => (ticket.dueAt ? formatDueAtCalendarLabel(ticket.dueAt) : ''), [ticket.dueAt]);
  const images = ticket.images ?? [];
  const description = ticket.description?.trim();
  const assignee = ticket.assignedTo?.name ? ticket.assignedTo : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8} accessibilityRole="button">
      {/* Header — 4799:671 */}
      <View style={styles.header}>
        {images.length > 0 ? (
          <TouchableOpacity
            onPress={() => setPreviewImage(images[0])}
            activeOpacity={0.8}
            accessibilityRole="imagebutton"
            accessibilityLabel={images.length > 1 ? `Photos, ${images.length}` : 'Photo'}
          >
            <Image source={{ uri: images[0] }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" />
            {images.length > 1 ? (
              <View style={styles.more}>
                <Text style={styles.moreText}>{`+${images.length - 1}`}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ) : (
          <View style={[styles.thumb, styles.deptDisc]}>
            {departmentIcon ? (
              <Icon name={departmentIcon} size={departmentGlyphHeight(departmentIcon) * 0.8 * scaleX} color="#f92424" />
            ) : null}
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {ticket.title}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.flags}>
              {Array.from({ length: priority.flags }, (_, i) => (
                <Icon key={i} name="action-flag-priority" width={6.4 * scaleX} height={9.2 * scaleX} color={priority.color} />
              ))}
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              <Text style={{ color: priority.color }}>{priority.label}</Text>
              {dueLine ? `  |  ${dueLine}` : ''}
            </Text>
          </View>
        </View>
        {!!ticket.roomNumber && (
          <View style={styles.room}>
            <Text style={styles.roomLabel}>Room</Text>
            <Text style={styles.roomNumber} numberOfLines={1} adjustsFontSizeToFit>
              {ticket.roomNumber}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.rule} />

      {/* Description — 4799:669 */}
      {description ? (
        <View style={styles.description}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Text style={styles.descriptionText} numberOfLines={3}>
            {description}
          </Text>
        </View>
      ) : null}

      {/* Footer — who has it, then the status (4799:658 / 4799:200, 4799:648) */}
      <View style={[styles.footer, !description && styles.footerTight]}>
        <TouchableOpacity
          style={styles.assignee}
          disabled={!onAssigneePress}
          onPress={onAssigneePress}
          activeOpacity={0.7}
          accessibilityRole={onAssigneePress ? 'button' : undefined}
          accessibilityLabel={assignee ? `Assigned to ${assignee.name}` : onAssigneePress ? 'Assign ticket' : 'Not assigned'}
        >
          {assignee ? (
            <>
              <Avatar uri={typeof assignee.avatar === 'string' ? assignee.avatar : undefined} name={assignee.name} size={30 * scaleX} />
              <View style={styles.assigneeText}>
                <Text style={styles.assigneeName} numberOfLines={1}>
                  {assignee.name}
                </Text>
                {assignee.departmentName ? (
                  <Text style={styles.assigneeSub} numberOfLines={1}>
                    {assignee.departmentName}
                  </Text>
                ) : null}
              </View>
            </>
          ) : onAssigneePress ? (
            <>
              <Icon name="action-assign-rooms" size={19.4 * scaleX} color="#5a759d" />
              <Text style={styles.assignLabel}>Assign Ticket</Text>
            </>
          ) : (
            <Text style={[styles.assignLabel, styles.unassigned]}>Unassigned</Text>
          )}
        </TouchableOpacity>

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
            {status.icon ? <Icon name={status.icon} size={19.6 * scaleX} color="#ffffff" /> : null}
            <Text style={styles.statusLabel} numberOfLines={1} adjustsFontSizeToFit>
              {status.label}
            </Text>
            <Icon name="action-chevron-down-wide" width={21 * scaleX} height={10 * scaleX} color="#ffffff" />
          </TouchableOpacity>
        </View>
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
  /* 4799:647 — #f9fafc, 1px #b0c0c6, radius 9, 409 wide. */
  card: {
    backgroundColor: '#f9fafc',
    borderWidth: 1,
    borderColor: '#b0c0c6',
    borderRadius: 9 * scaleX,
    overflow: 'hidden',
  },
  /* The thumbnail 19 in and 13 down; 13 under it to the rule. */
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 13 * scaleX,
    paddingLeft: 19 * scaleX,
    paddingRight: 19 * scaleX,
    paddingBottom: 13 * scaleX,
  },
  thumb: {
    width: 60 * scaleX,
    height: 59 * scaleX,
    borderRadius: 5 * scaleX,
  },
  deptDisc: {
    backgroundColor: '#ffebeb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* 4799:692 — white 20 disc over the thumbnail's corner, 2 in from its right, 4 up from its bottom. */
  more: {
    position: 'absolute',
    right: 2 * scaleX,
    bottom: 4 * scaleX,
    width: 20 * scaleX,
    height: 20 * scaleX,
    borderRadius: 10 * scaleX,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 7 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#000000',
    ...androidText,
  },
  /* Title 8 right of the thumbnail and 10 down; the priority line 29 under it. */
  headerText: {
    flex: 1,
    marginLeft: 8 * scaleX,
    paddingTop: 10 * scaleX,
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
    gap: 4 * scaleX,
    marginRight: 7 * scaleX,
  },
  meta: {
    flexShrink: 1,
    fontSize: 10 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#898585',
    ...androidText,
  },
  /* 4799:688 — "Room" Light 10 grey over the number, Bold 36 #5a759d. */
  room: {
    marginLeft: 8 * scaleX,
    paddingTop: 8 * scaleX,
    alignItems: 'flex-start',
  },
  roomLabel: {
    marginLeft: 2 * scaleX,
    fontSize: 10 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#898585',
    ...androidText,
  },
  roomNumber: {
    fontSize: 36 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#5a759d',
    lineHeight: 41 * scaleX,
    ...androidText,
  },
  rule: {
    height: 1,
    backgroundColor: '#e3e3e3',
  },
  description: {
    paddingTop: 9 * scaleX,
    paddingHorizontal: 19 * scaleX,
  },
  sectionLabel: {
    fontSize: 10 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#898585',
    ...androidText,
  },
  descriptionText: {
    marginTop: 10 * scaleX,
    maxWidth: 330 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    ...androidText,
  },
  /* 17 under the description (13 under the rule without one); 19 to the card's foot. */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 17 * scaleX,
    paddingLeft: 24 * scaleX,
    paddingRight: 38 * scaleX,
    paddingBottom: 19 * scaleX,
  },
  footerTight: { paddingTop: 13 * scaleX },
  /* 4799:661 — white, 143 x 52, fully round. */
  assignee: {
    width: 143.2 * scaleX,
    height: 52.3 * scaleX,
    borderRadius: 26.2 * scaleX,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 9 * scaleX,
    paddingRight: 10 * scaleX,
  },
  assigneeText: { flexShrink: 1, marginLeft: 5 * scaleX },
  assigneeName: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
    ...androidText,
  },
  assigneeSub: {
    marginTop: 2 * scaleX,
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    ...androidText,
  },
  assignLabel: {
    marginLeft: 10 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#334866',
    ...androidText,
  },
  unassigned: { marginLeft: 0, flex: 1, textAlign: 'center', color: '#8a94a6' },
  /* 4799:650 — 174.8 x 59.1, fully round; the chevron 18 from its right. */
  statusPill: {
    width: 174.8 * scaleX,
    height: 59.1 * scaleX,
    borderRadius: 29.55 * scaleX,
  },
  statusPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 26 * scaleX,
    paddingRight: 18 * scaleX,
    gap: 14 * scaleX,
  },
  statusLabel: {
    flex: 1,
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
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
