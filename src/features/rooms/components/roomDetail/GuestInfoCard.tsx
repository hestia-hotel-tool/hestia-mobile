import React, { useState, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { GUEST_INFO as ROOM_DETAIL_GUEST_INFO, scaleX } from '../../constants/roomDetailStyles';
import { formatDatesOfStayShort, formatGuestCountWords } from '@/utils/formatting';
import { colors } from '@/theme';
import { vipTierFor } from '@/domain/vip';
import { useVipTiers } from '@/store/vipTiers';
import { useAIChatOverlay } from '@features/ai-agent';
import GuestProfileImageModal, { type GuestImageAnchorLayout } from '@features/rooms/components/GuestProfileImageModal';
import type { GuestInfo } from '../../types/allRooms.types';
import { GuestKindDisc, VipDisc, type GuestRowKind } from '../roomsList/GuestRow';
import { VipInfoPopover, VIP_POPOVER_SPACE, VIP_ASSISTANT_QUESTION, type VipAnchor } from '../roomsList/VipInfoPopover';
import type { MeasureAnchor, RevealBelow } from '../../hooks/useRevealBelow';
import { guestTimeLabelForKind } from '../../utils/roomCardProps';

export type GuestInfoCardCategory = 'Arrival' | 'Departure' | 'Stayover' | 'Turndown';

/**
 * This block's category expressed as the room card's `GuestRowKind`, so the two
 * screens share one table for "what time prefix does this guest get".
 *
 * `stayover-no-linen` stands for both stayover variants: the linen rule needs
 * the room, not the guest, and it makes no difference to the time line — which
 * is all this mapping is used for.
 */
const GUEST_KIND_BY_CATEGORY: Record<GuestInfoCardCategory, GuestRowKind> = {
  Arrival: 'arrival',
  Departure: 'departure',
  Stayover: 'stayover-no-linen',
  Turndown: 'turndown',
};

interface GuestInfoCardProps {
  guest: GuestInfo;
  /** Room-detail guest row type — drives label color, avatar badge, and icon fallback. */
  category: GuestInfoCardCategory;
  /** Shown below the guest row when present (Arrival / Stayover / Turndown; not Departure). */
  specialInstructions?: string;
  /** The room's cleaning credits, for the VIP popover's "Use 80 credits…". */
  credits?: number;
  /** Scrolls the screen so the VIP popover fits under the disc (useRevealBelow). */
  revealVip?: RevealBelow;
  /** The VIP popover closed: drop the reveal's padding. */
  endVipReveal?: () => void;
}

const AVATAR_SIZE = 73;
const ROW_HORIZONTAL_INSET = 20;
const AVATAR_TEXT_GAP = 20;
/** The VIP disc's top below the photo's (357 - 331.5, Figma 2333:312), and its gap from the text. */
const VIP_DISC_TOP = 25.5;
const VIP_DISC_GAP = 8;

/**
 * The word and the avatar badge, per guest category.
 *
 * Arrival is the one case where the two differ: the design gives the word
 * `guest.arrival` (#39d47f) and the disc the brighter `status.inspected`
 * (#41d541) — checked against Figma 2701:396 and 2701:381 rather than assumed
 * to be one colour that had drifted.
 */
function categoryColors(cat: GuestInfoCardCategory): { label: string; badgeBg: string } {
  switch (cat) {
    case 'Arrival':
      return { label: colors.guest.arrival, badgeBg: colors.status.inspected };
    case 'Departure':
      return { label: colors.guest.departure, badgeBg: colors.guest.departure };
    case 'Stayover':
      return { label: colors.guest.stayover, badgeBg: colors.guest.stayover };
    case 'Turndown':
      return { label: colors.guest.turndown, badgeBg: colors.guest.turndown };
    default:
      // Unreachable — the four cases above are the whole union. Left as the
      // literals it always carried rather than swapped for near-miss tokens
      // (`text.primary` is #1e1e1e, not #000000).
      return { label: '#000000', badgeBg: '#5a759d' };
  }
}

export default function GuestInfoCard({
  guest,
  category,
  specialInstructions,
  credits = 0,
  revealVip,
  endVipReveal,
}: GuestInfoCardProps) {
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [imageModalAnchorLayout, setImageModalAnchorLayout] = useState<GuestImageAnchorLayout | null>(null);
  const guestImageWrapRef = useRef<View>(null);
  const { label: labelColor } = categoryColors(category);
  const kind = GUEST_KIND_BY_CATEGORY[category];
  const hasGuestImage = !!guest.imageUrl;
  const timeLine = guestTimeLabelForKind(kind, guest);
  const occupancy = formatGuestCountWords(guest.guestCount);
  const dates = formatDatesOfStayShort(guest.datesOfStay);
  // The room card's second line: "ETA: 09:00  2 Adults".
  const detail = [timeLine, occupancy].filter(Boolean) as string[];

  // This guest's own VIP level — never the slot's inherited badge.
  const vipTiers = useVipTiers();
  const tier = guest.vipCode ? vipTierFor(guest.vipCode, vipTiers) : null;
  const assistant = useAIChatOverlay();
  // Kept after closing so the modal fades out (see RoomListCard).
  const [vipCard, setVipCard] = useState<{
    anchor: VipAnchor;
    cropTop: number;
    clearAbove: number;
    open: boolean;
  } | null>(null);
  const blockRef = useRef<View>(null);
  const measureBlockTop = () =>
    new Promise<number | null>((resolve) => {
      const node = blockRef.current;
      if (!node) return resolve(null);
      node.measureInWindow((_x, y, _w, h) => resolve(Number.isFinite(y) && h > 0 ? y : null));
    });
  const openVip = async (measure: MeasureAnchor) => {
    const revealed = revealVip
      ? await revealVip(measure, VIP_POPOVER_SPACE)
      : await measure().then((rect) => (rect ? { rect, clearAbove: 0 } : null));
    if (!revealed) {
      endVipReveal?.();
      return;
    }
    const cropTop = (await measureBlockTop()) ?? revealed.rect.y;
    setVipCard({ anchor: revealed.rect, cropTop, clearAbove: revealed.clearAbove, open: true });
  };
  const closeVip = () => {
    setVipCard((v) => (v ? { ...v, open: false } : v));
    endVipReveal?.();
  };

  const openGuestImageModal = () => {
    guestImageWrapRef.current?.measureInWindow((x, y, width, height) => {
      setImageModalAnchorLayout({ x, y, width, height });
      setIsImageModalVisible(true);
    });
  };

  return (
    <View ref={blockRef} collapsable={false} style={styles.block}>
      <View style={styles.mainRow}>
        {/* Photo with the guest-kind disc on its corner — the room card's
            SVG disc (GuestKindDisc), not the old PNG arrows. Without a photo,
            the card's grey placeholder. */}
        <View style={styles.avatarColumn}>
          <View ref={guestImageWrapRef} collapsable={false} style={styles.avatarWrap}>
            {hasGuestImage ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={openGuestImageModal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Image source={{ uri: guest.imageUrl }} style={styles.guestImage} resizeMode="cover" />
              </TouchableOpacity>
            ) : (
              <View style={[styles.guestImage, styles.guestImagePlaceholder]} />
            )}
            <View style={styles.imageBadge}>
              <GuestKindDisc kind={kind} size={22 * scaleX} />
            </View>
          </View>
        </View>

        <View style={styles.infoColumn}>
          <Text style={[styles.categoryLabel, { color: labelColor }]}>{category}</Text>

          <Text style={styles.guestName} numberOfLines={2}>
            {guest.name}
          </Text>

          {/* The room card's lines (GuestRow): the arrival or departure time
              with the guests in words, then the stay. The time comes from
              `category` — this block's role — not `guest.timeLabel`, which
              disagreed with it on Arrival/Departure rooms; see
              `guestTimeLabelForKind`. */}
          {detail.length > 0 ? (
            <View style={styles.detailsRow}>
              {detail.map((d) => (
                <Text key={d} style={styles.detailText}>
                  {d}
                </Text>
              ))}
            </View>
          ) : null}
          {dates ? <Text style={styles.detailText}>{dates}</Text> : null}
        </View>

        {/* Figma 2333:312: the room card's VIP disc (grey 35, "V3", ⓘ on its
            corner) at the row's right, level with the name's second line.
            A tap on either opens the VIP popover, as on the card. */}
        {tier && guest.vipCode ? (
          <VipDisc
            code={guest.vipCode}
            tier={tier}
            name={guest.name}
            onInfoPress={openVip}
            offset={{ left: VIP_DISC_GAP * scaleX, top: VIP_DISC_TOP * scaleX }}
          />
        ) : null}
      </View>

      {specialInstructions ? (
        <View style={styles.specialBlock}>
          <Text style={styles.specialTitle}>Special Instructions</Text>
          <Text style={styles.specialText}>{specialInstructions}</Text>
        </View>
      ) : null}

      {tier ? (
        <VipInfoPopover
          visible={!!vipCard?.open}
          onClose={closeVip}
          anchor={vipCard?.anchor ?? null}
          cropTop={vipCard?.cropTop ?? 0}
          clearAbove={vipCard?.clearAbove ?? 0}
          tier={tier}
          credits={credits}
          onAskAssistant={() => {
            // Close first: iOS presents one modal at a time.
            closeVip();
            assistant.open(VIP_ASSISTANT_QUESTION);
          }}
        />
      ) : null}

      <GuestProfileImageModal
        visible={isImageModalVisible}
        onClose={() => {
          setIsImageModalVisible(false);
          setImageModalAnchorLayout(null);
        }}
        guest={guest.imageUrl ? { imageUrl: guest.imageUrl, name: guest.name } : null}
        anchorLayout={imageModalAnchorLayout}
      />
    </View>
  );
}

const SI = ROOM_DETAIL_GUEST_INFO.arrival.specialInstructions;

const styles = StyleSheet.create({
  block: {
    width: '100%',
    paddingHorizontal: ROW_HORIZONTAL_INSET * scaleX,
    paddingBottom: 4 * scaleX,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarColumn: {
    width: AVATAR_SIZE * scaleX,
    marginRight: AVATAR_TEXT_GAP * scaleX,
  },
  avatarWrap: {
    position: 'relative',
  },
  guestImage: {
    width: AVATAR_SIZE * scaleX,
    height: AVATAR_SIZE * scaleX,
    borderRadius: 5 * scaleX,
  },
  guestImagePlaceholder: {
    backgroundColor: colors.background.secondary,
  },
  imageBadge: {
    position: 'absolute',
    bottom: -4 * scaleX,
    right: -4 * scaleX,
    zIndex: 10,
  },
  infoColumn: {
    flex: 1,
    minWidth: 0,
  },
  categoryLabel: {
    fontSize: 13 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    marginBottom: 4 * scaleX,
  },
  guestName: {
    fontSize: ROOM_DETAIL_GUEST_INFO.arrival.name.fontSize * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: ROOM_DETAIL_GUEST_INFO.arrival.name.color,
    lineHeight: 21 * scaleX,
    marginBottom: 8 * scaleX,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8 * scaleX,
  },
  /** Helvetica light, the room card's guest lines (GuestRow), at this screen's size. */
  detailText: {
    fontSize: ROOM_DETAIL_GUEST_INFO.arrival.dates.fontSize * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: '#000000',
    lineHeight: 22 * scaleX,
  },
  specialBlock: {
    marginTop: 22 * scaleX,
    paddingRight: 4 * scaleX,
  },
  specialTitle: {
    fontSize: SI.title.fontSize * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: SI.title.color,
    marginBottom: 8 * scaleX,
  },
  specialText: {
    fontSize: SI.text.fontSize * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: SI.text.color,
    lineHeight: 18 * scaleX,
  },
});
