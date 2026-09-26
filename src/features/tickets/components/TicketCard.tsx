import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { SafeModal as Modal } from '@/components/ui/SafeModal';
import { typography } from '@/theme';
import { Icon } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import { Avatar } from '@/components/ui/Avatar';
import { TICKET_CARD_LAYOUT as L } from './ticketCardLayout';
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
            {/*
              Shrink to fit rather than ellipsize. Figma 667-3068 sets the title
              at Helvetica Bold 27 and its two mock titles ("Deliver Laundry",
              "Tv Broken") fit at that size, but real ones do not — "Stain
              carpet living room" rendered as "Stain carpet li...". The frame
              shows a whole title, so the size gives way before the words do.
              `minimumFontScale` floors it at 27 * 0.55 ~ 15 so a very long
              title still degrades to an ellipsis instead of becoming unreadable.
            */}
            <Text
              style={[styles.title, isDone ? styles.titleDone : isOfo ? styles.titleOfo : styles.titleOpen]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
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
          {/*
            The glyphs are *children* of the touchable, not siblings painted over
            it. This was a `StyleSheet.absoluteFill` Touchable rendered before
            them, so the thumb and the chevron — which cover most of the pill —
            sat on top of the tap target. They are not touchable themselves, so
            a tap on either fell through to the card's own `onPress` and logged
            "Ticket pressed" instead of opening the status popover. Only the
            bare slivers between the glyphs actually worked.
          */}
          <TouchableOpacity
            style={styles.statusPillPress}
            onPress={handleStatusPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Change ticket status"
          >
          {isOfo ? (
            <>
              <View style={styles.ofoPillBadge}>
                <Text style={styles.ofoPillLabel}>OFT</Text>
              </View>
              <View style={styles.statusChevron}>
                <Icon name="action-chevron" size={10 * scaleX} color="#ffffff" />
              </View>
            </>
          ) : (
            <>
              {/*
                The *solid* thumb, not the outline one: Figma 667-3068 node
                3147:58 fills the body and knocks the detail out in white. The
                outline `action-thumbs-down` is the inverse of it and is
                two-tone, so it cannot be tinted into this.
              */}
              <Icon
                name={ticket.status === 'done' ? 'action-thumbs-up-solid' : 'action-thumbs-down-solid'}
                size={17 * scaleX}
                color={ticket.status === 'done' ? '#ffffff' : '#f92424'}
              />
              <View style={styles.statusChevron}>
                <Icon
                  name="action-chevron"
                  size={10 * scaleX}
                  color={isDone ? '#ffffff' : '#f92424'}
                />
              </View>
            </>
          )}
          </TouchableOpacity>
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
          <Avatar
            uri={typeof ticket.createdBy.avatar === 'string' ? ticket.createdBy.avatar : undefined}
            name={ticket.createdBy.name}
            size={L.footerAvatar.creator * scaleX}
          />
          <View style={styles.footerMeta}>
            <Text style={styles.footerName} numberOfLines={1}>
              {ticket.createdBy.name}
            </Text>
            <Text style={styles.footerSub} numberOfLines={1}>
              {createdAtText ?? '—'}
            </Text>
          </View>
        </View>

        {/*
          The same drawing as the frame's arrow (node 3129:1130): shaft plus a
          round-capped head. `guest-arrow` points left and its own header
          comment documents mirroring as the intended reuse, so this is a flip
          rather than a near-duplicate export. Height 10 gives width 17.4
          against the frame's 18.571 x 10.
        */}
        <View style={styles.footerArrow}>
          <Icon name="guest-arrow" size={10 * scaleX} color="#1e1e1e" />
        </View>

        <TouchableOpacity style={styles.footerPerson} onPress={onAssigneePress} activeOpacity={0.7}>
          <Avatar
            uri={typeof ticket.assignedTo?.avatar === 'string' ? ticket.assignedTo.avatar : undefined}
            name={ticket.assignedTo?.name}
            size={L.footerAvatar.assignee * scaleX}
          />
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
    // Not `width: 409`: with marginHorizontal 16 that totals 441 in a 440
    // frame, so the card overflowed its own design. Stretching inside the
    // gutter lands on 408 and survives any device width.
    alignSelf: 'stretch',
    backgroundColor: '#f9fafc',
    borderWidth: 1,
    borderColor: '#e3e3e3',
    borderRadius: 9 * scaleX,
    marginHorizontal: L.gutter * scaleX,
    marginBottom: L.gapBetweenCards * scaleX,
    position: 'relative',
    paddingHorizontal: 22 * scaleX,
    paddingTop: 18 * scaleX,
    paddingBottom: 14 * scaleX,
  },
  // Figma: no-image cards have a slightly tighter bottom padding and the divider sits lower.
  cardNoImages: {
    paddingBottom: 10 * scaleX,
  },
  /*
   * Node 3129:1096 — `<path d="M0 0.5H409" stroke="#E4E4E4"/>`, i.e. the card's
   * **full** 409 width, edge to edge. It was sitting inside the 22pt content
   * padding and measured 362, so the negative margin cancels that padding.
   */
  divider: {
    height: 1,
    backgroundColor: '#e4e4e4',
    marginHorizontal: -L.paddingHorizontal * scaleX,
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
    overflow: 'hidden',
  },
  /** Fills the pill so every glyph inside it is part of the tap target. */
  statusPillPress: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  statusChevron: {
    width: 10 * scaleX,
    height: 10 * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
    // The outer box keeps the unrotated footprint; a transform does not change
    // layout size. Same idiom as RoomStatusPill / RoomHeaderStatusButton.
    transform: [{ rotate: '-90deg' }],
  },
  /*
   * Node 3129:994. The band the card never drew: 392 wide inside a 409 card,
   * so it pulls back out past the 22pt content padding to sit 9 from the card
   * edge, and carries its own radius.
   */
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10 * scaleX,
    marginHorizontal: (L.footerBand.inset - L.paddingHorizontal) * scaleX,
    paddingHorizontal: (L.paddingHorizontal - L.footerBand.inset) * scaleX,
    minHeight: L.footerBand.height * scaleX,
    borderRadius: L.footerBand.radius * scaleX,
    backgroundColor: 'rgba(100,131,176,0.06)',
  },
  imagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: L.photo.gap * scaleX,
    marginTop: 10 * scaleX,
    marginBottom: 8 * scaleX,
  },
  imageThumbWrap: {
    width: L.photo.width * scaleX,
    height: L.photo.height * scaleX,
    borderRadius: L.photo.radius * scaleX,
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
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scaleX: -1 }],
  },
});

