import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal, Dimensions } from 'react-native';
import { typography } from '@/theme';
import {
  scaleX,
} from '../constants/ticketsStyles';
import { TicketData } from '../types/tickets.types';
import { formatDueAtCalendarLabel } from '@/utils/ticketDue';

export type TicketStatusAnchorLayout = { x: number; y: number; width: number; height: number };

interface TicketCardProps {
  ticket: TicketData;
  onPress?: () => void;
  onStatusPress?: (anchor?: TicketStatusAnchorLayout) => void;
  onAssigneePress?: () => void;
}

export default function TicketCard({ ticket, onPress, onStatusPress, onAssigneePress }: TicketCardProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const getInitials = (name: string) => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  };

  const dueAtLine = useMemo(() => {
    if (!ticket.dueAt) return undefined;
    return formatDueAtCalendarLabel(ticket.dueAt);
  }, [ticket.dueAt]);

  const createdAtText = useMemo(() => {
    if (!ticket.createdAt) return undefined;
    const dt = new Date(ticket.createdAt);
    if (!Number.isFinite(dt.getTime())) return undefined;

    const pad2 = (n: number) => String(n).padStart(2, '0');
    const hh = pad2(dt.getHours());
    const mm = pad2(dt.getMinutes());
    const dd = pad2(dt.getDate());
    const mo = pad2(dt.getMonth() + 1);
    const yyyy = dt.getFullYear();
    return `${hh}:${mm}, ${dd}/${mo}/${yyyy}`;
  }, [ticket.createdAt]);

  const statusPillRef = useRef<View>(null);

  const handleStatusPress = () => {
    if (!onStatusPress) return;
    statusPillRef.current?.measureInWindow?.((x, y, width, height) => {
      onStatusPress({ x, y, width, height });
    });
  };

  const isDone = ticket.status === 'done';
  const isOfo = ticket.status === 'ofo';
  const hasImages = !!ticket.images?.length;

  return (
    <TouchableOpacity
      style={[styles.card, !hasImages && styles.cardNoImages]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={styles.topRowLeft}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, isDone ? styles.titleDone : isOfo ? styles.titleOfo : styles.titleOpen]}
              numberOfLines={1}
            >
              {ticket.title}
            </Text>
            {!!ticket.roomNumber && (
              <View style={[styles.roomPill, isDone ? styles.roomPillDone : isOfo ? styles.roomPillOfo : styles.roomPillOpen]}>
                <Text style={styles.roomPillText} numberOfLines={1}>
                  {ticket.roomNumber}
                </Text>
              </View>
            )}
          </View>

          {!!dueAtLine && (
            <Text style={styles.dueAtLine} numberOfLines={1}>
              {dueAtLine}
            </Text>
          )}

          {!!ticket.guest?.name && (
            <View style={styles.guestRow}>
              {ticket.guest.imageUrl ? (
                <Image source={{ uri: ticket.guest.imageUrl }} style={styles.guestThumb} resizeMode="cover" />
              ) : (
                <View style={styles.guestThumbPlaceholder}>
                  <Text style={styles.guestThumbInitial}>{getInitials(ticket.guest.name)}</Text>
                </View>
              )}
              <View style={styles.guestTextCol}>
                <Text style={styles.guestName} numberOfLines={1} ellipsizeMode="tail">
                  {ticket.guest.name}
                </Text>
                {!!ticket.guest.stayRange && (
                  <Text style={styles.guestDates} numberOfLines={1} ellipsizeMode="tail">
                    {ticket.guest.stayRange}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        <View
          ref={statusPillRef}
          collapsable={false}
          style={[styles.statusPill, isDone ? styles.statusPillDone : isOfo ? styles.statusPillOfo : styles.statusPillOpen]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handleStatusPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Change ticket status"
          />
          {isOfo ? (
            <>
              <View style={styles.ofoPillBadge}>
                <Text style={styles.ofoPillLabel}>OFT</Text>
              </View>
              <Image
                source={require('../../../../assets/icons/dropdown-arrow.png')}
                style={[styles.statusChevron, styles.statusChevronOfo]}
                resizeMode="contain"
              />
            </>
          ) : (
            <>
              <Image
                source={
                  ticket.status === 'done'
                    ? require('../../../../assets/icons/done.png')
                    : require('../../../../assets/icons/unsolved.png')
                }
                style={[
                  styles.statusIcon,
                  ticket.status === 'done' ? styles.statusIconDone : styles.statusIconUnsolved,
                ]}
                resizeMode="contain"
              />
              <Image
                source={require('../../../../assets/icons/dropdown-arrow.png')}
                style={[styles.statusChevron, isDone ? styles.statusChevronDone : styles.statusChevronOpen]}
                resizeMode="contain"
              />
            </>
          )}
        </View>
      </View>

      <View style={[styles.divider, !hasImages && styles.dividerNoImages]} />

      {hasImages && (
        <View style={styles.imagesRow}>
          {(ticket.images ?? []).slice(0, 3).map((uri, idx) => (
            <TouchableOpacity key={`${uri}-${idx}`} activeOpacity={0.7} onPress={() => setPreviewImage(uri)}>
              <View style={styles.imageThumbWrap}>
                <Image source={{ uri }} style={styles.imageThumb} resizeMode="cover" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={() => setPreviewImage(null)}>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
          )}
        </TouchableOpacity>
      </Modal>

      <View style={styles.footerRow}>
        <View style={styles.footerPerson}>
          {ticket.createdBy.avatar ? (
            <Image
              source={typeof ticket.createdBy.avatar === 'string' ? { uri: ticket.createdBy.avatar } : ticket.createdBy.avatar}
              style={styles.footerAvatar}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.footerAvatarPlaceholder}>
              <Text style={styles.footerAvatarInitial}>{getInitials(ticket.createdBy.name)}</Text>
            </View>
          )}
          <View style={styles.footerMeta}>
            <Text style={styles.footerName} numberOfLines={1}>
              {ticket.createdBy.name}
            </Text>
            <Text style={styles.footerSub} numberOfLines={1}>
              {createdAtText ?? '—'}
            </Text>
          </View>
        </View>

        <Image
          source={require('../../../../assets/icons/arrow-forward.png')}
          style={[styles.footerArrow, styles.footerArrowReversed]}
          resizeMode="contain"
        />

        <TouchableOpacity style={styles.footerPerson} onPress={onAssigneePress} activeOpacity={0.7}>
          {ticket.assignedTo?.avatar ? (
            <Image
              source={typeof ticket.assignedTo.avatar === 'string' ? { uri: ticket.assignedTo.avatar } : ticket.assignedTo.avatar}
              style={styles.footerAvatar}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.footerAvatarPlaceholder}>
              <Text style={styles.footerAvatarInitial}>
                {ticket.assignedTo?.name ? getInitials(ticket.assignedTo.name) : '—'}
              </Text>
            </View>
          )}
          <View style={styles.footerMeta}>
            <Text style={styles.footerName} numberOfLines={1}>
              {ticket.assignedTo?.name ?? 'Tag staff'}
            </Text>
            <Text style={styles.footerSub} numberOfLines={1}>
              {ticket.assignedTo?.departmentName ?? (ticket.assignedTo?.name ? '—' : 'Select staff')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 409 * scaleX,
    minHeight: 216 * scaleX,
    backgroundColor: '#f9fafc',
    borderWidth: 1,
    borderColor: '#e3e3e3',
    borderRadius: 9 * scaleX,
    marginHorizontal: 16 * scaleX,
    marginBottom: 16 * scaleX,
    position: 'relative',
    paddingHorizontal: 22 * scaleX,
    paddingTop: 18 * scaleX,
    paddingBottom: 14 * scaleX,
  },
  // Figma: no-image cards have a slightly tighter bottom padding and the divider sits lower.
  cardNoImages: {
    paddingBottom: 10 * scaleX,
  },
  divider: {
    height: 1,
    backgroundColor: '#e3e3e3',
    marginTop: 16 * scaleX,
    marginBottom: 12 * scaleX,
  },
  dividerNoImages: {
    marginTop: 28 * scaleX,
    marginBottom: 10 * scaleX,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12 * scaleX,
  },
  topRowLeft: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 10 * scaleX,
  },
  dueAtLine: {
    marginTop: 6 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: '#334866',
    includeFontPadding: false,
  },
  title: {
    flexShrink: 1,
    fontSize: 27 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    includeFontPadding: false,
  },
  titleOpen: {
    color: '#f92424',
  },
  /** Figma 3129:1362 — solved ticket title */
  titleDone: {
    color: '#7ae07c',
  },
  /** Figma 3147:114 — OFO / OFT ticket title */
  titleOfo: {
    color: '#c6c5c5',
  },
  roomPill: {
    borderRadius: 7 * scaleX,
    paddingHorizontal: 14 * scaleX,
    paddingVertical: 8 * scaleX,
    flexShrink: 0,
  },
  roomPillOpen: {
    backgroundColor: '#f92424',
  },
  roomPillDone: {
    backgroundColor: '#41d541',
  },
  /** Figma 3147:127 — room badge when OFO */
  roomPillOfo: {
    backgroundColor: '#c6c5c5',
  },
  roomPillText: {
    fontSize: 24 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#fff',
    includeFontPadding: false,
  },
  guestRow: {
    marginTop: 10 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10 * scaleX,
  },
  guestThumb: {
    width: 34.6 * scaleX,
    height: 34.6 * scaleX,
    borderRadius: 5 * scaleX,
  },
  guestThumbPlaceholder: {
    width: 34.6 * scaleX,
    height: 34.6 * scaleX,
    borderRadius: 5 * scaleX,
    backgroundColor: '#e4eefe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestThumbInitial: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#5a759d',
  },
  guestTextCol: {
    flex: 1,
    minWidth: 0,
  },
  guestName: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  guestDates: {
    marginTop: 2 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#1e1e1e',
  },
  statusPill: {
    width: 67 * scaleX,
    height: 44 * scaleX,
    borderRadius: 75 * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6 * scaleX,
    paddingHorizontal: 12 * scaleX,
  },
  statusPillOpen: {
    backgroundColor: '#f9edef',
  },
  /** Figma 3147:79 — solved status control */
  statusPillDone: {
    backgroundColor: '#41d541',
  },
  /** Figma 3147:147 — OFT pill (grey) */
  statusPillOfo: {
    backgroundColor: '#c6c5c5',
    gap: 4 * scaleX,
    paddingHorizontal: 10 * scaleX,
  },
  /** Figma 3147:229 — white 26×26 circle holding "OFT" */
  ofoPillBadge: {
    width: 26 * scaleX,
    height: 26 * scaleX,
    borderRadius: 13 * scaleX,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Figma 3147:230 — "OFT" inside the white circle */
  ofoPillLabel: {
    fontSize: 9 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#c6c5c5',
    includeFontPadding: false,
  },
  statusIcon: {
    width: 17 * scaleX,
    height: 17 * scaleX,
  },
  statusIconUnsolved: {
    tintColor: '#f92424',
  },
  statusIconDone: {
    tintColor: '#ffffff',
  },
  statusChevron: {
    width: 10 * scaleX,
    height: 10 * scaleX,
  },
  statusChevronOpen: {
    tintColor: '#f92424',
  },
  statusChevronDone: {
    tintColor: '#ffffff',
  },
  statusChevronOfo: {
    tintColor: '#ffffff',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10 * scaleX,
  },
  imagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10 * scaleX,
    marginTop: 10 * scaleX,
    marginBottom: 8 * scaleX,
  },
  imageThumbWrap: {
    width: 120 * scaleX,
    height: 120 * scaleX,
    borderRadius: 8 * scaleX,
    overflow: 'hidden',
    backgroundColor: '#e6e6e6',
  },
  imageThumb: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: Dimensions.get('window').width - 40,
    height: Dimensions.get('window').height - 120,
  },
  footerPerson: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 8 * scaleX,
  },
  footerAvatar: {
    width: 28 * scaleX,
    height: 28 * scaleX,
    borderRadius: 14 * scaleX,
  },
  footerAvatarPlaceholder: {
    width: 28 * scaleX,
    height: 28 * scaleX,
    borderRadius: 14 * scaleX,
    backgroundColor: '#e4eefe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerAvatarInitial: {
    fontSize: 11 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#5a759d',
  },
  footerMeta: {
    flex: 1,
    minWidth: 0,
  },
  footerName: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  footerSub: {
    marginTop: 2 * scaleX,
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000',
  },
  footerArrow: {
    width: 18 * scaleX,
    height: 18 * scaleX,
    tintColor: '#1e1e1e',
  },
  footerArrowReversed: {
    transform: [{ rotate: '180deg' }],
  },
});

