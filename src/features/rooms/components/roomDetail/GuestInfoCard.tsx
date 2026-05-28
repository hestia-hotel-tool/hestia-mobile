import React, { useState, useRef } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { GUEST_INFO as ROOM_DETAIL_GUEST_INFO, scaleX } from '../../constants/roomDetailStyles';
import { GUEST_INFO } from '../../constants/allRoomsStyles';
import { formatGuestCount, formatDatesOfStay } from '@shared/utils/formatting';
import GuestProfileImageModal, { type GuestImageAnchorLayout } from '@shared/ui/GuestProfileImageModal';
import type { GuestInfo } from '../../types/allRooms.types';

export type GuestInfoCardCategory = 'Arrival' | 'Departure' | 'Stayover' | 'Turndown';

interface GuestInfoCardProps {
  guest: GuestInfo;
  /** Room-detail guest row type — drives label color, avatar badge, and icon fallback. */
  category: GuestInfoCardCategory;
  numberBadge?: string;
  /** Shown below the guest row when present (Arrival / Stayover / Turndown; not Departure). */
  specialInstructions?: string;
}

const AVATAR_SIZE = 73;
const ROW_HORIZONTAL_INSET = 20;
const AVATAR_TEXT_GAP = 20;

function categoryColors(cat: GuestInfoCardCategory): { label: string; badgeBg: string } {
  switch (cat) {
    case 'Arrival':
      return { label: '#39d47f', badgeBg: '#41D541' };
    case 'Departure':
      return { label: '#f92424', badgeBg: '#f92424' };
    case 'Stayover':
      return { label: '#3BC1F6', badgeBg: '#3BC1F6' };
    case 'Turndown':
      return { label: '#9b51e0', badgeBg: '#9b51e0' };
    default:
      return { label: '#000000', badgeBg: '#5a759d' };
  }
}

function fallbackIconSource(cat: GuestInfoCardCategory) {
  switch (cat) {
    case 'Departure':
      return require('../../../../../assets/icons/guest-departure-icon.png');
    case 'Stayover':
      return require('../../../../../assets/icons/stayover-guest_icon.png');
    case 'Turndown':
      return require('../../../../../assets/icons/moon.png');
    default:
      return require('../../../../../assets/icons/guest-arrival-icon.png');
  }
}

function badgeIconSource(cat: GuestInfoCardCategory, _guest: GuestInfo) {
  if (cat === 'Arrival') return require('../../../../../assets/icons/arrow-forward.png');
  if (cat === 'Departure') return require('../../../../../assets/icons/departure-spear.png');
  if (cat === 'Stayover') return require('../../../../../assets/icons/stayover-guest_icon.png');
  return require('../../../../../assets/icons/moon.png');
}

export default function GuestInfoCard({
  guest,
  category,
  numberBadge,
  specialInstructions,
}: GuestInfoCardProps) {
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [imageModalAnchorLayout, setImageModalAnchorLayout] = useState<GuestImageAnchorLayout | null>(null);
  const guestImageWrapRef = useRef<View>(null);
  const { label: labelColor, badgeBg } = categoryColors(category);
  const hasGuestImage = !!guest.imageUrl;

  const openGuestImageModal = () => {
    guestImageWrapRef.current?.measureInWindow((x, y, width, height) => {
      setImageModalAnchorLayout({ x, y, width, height });
      setIsImageModalVisible(true);
    });
  };

  return (
    <View style={styles.block}>
      <View style={styles.mainRow}>
        {/* Avatar / icon */}
        <View style={styles.avatarColumn}>
          {hasGuestImage ? (
            <View ref={guestImageWrapRef} collapsable={false} style={styles.avatarWrap}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={openGuestImageModal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Image
                  source={{ uri: guest.imageUrl }}
                  style={styles.guestImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
              <View style={[styles.imageBadge, { backgroundColor: badgeBg }]}>
                <Image
                  source={badgeIconSource(category, guest)}
                  style={category === 'Turndown' ? styles.imageBadgeIconNoTint : styles.imageBadgeIcon}
                  resizeMode="contain"
                />
              </View>
            </View>
          ) : (
            <View>
              <Image
                source={fallbackIconSource(category)}
                style={[styles.guestIcon, category === 'Turndown' ? styles.guestIconNoTint : null]}
                resizeMode="contain"
              />
            </View>
          )}
        </View>

        <View style={styles.infoColumn}>
          <Text style={[styles.categoryLabel, { color: labelColor }]}>{category}</Text>

          <View style={styles.nameRow}>
            <Text style={styles.guestName} numberOfLines={2}>
              {guest.name}
            </Text>
            {numberBadge ? <Text style={styles.numberBadge}>{numberBadge}</Text> : null}
          </View>

          <View style={styles.detailsRow}>
            {guest.datesOfStay ? (
              <Text style={styles.dateRange}>{formatDatesOfStay(guest.datesOfStay)}</Text>
            ) : null}
            {guest.guestCount?.adults !== undefined ? (
              <>
                <Image
                  source={require('../../../../../assets/icons/people-icon.png')}
                  style={styles.countIcon}
                  resizeMode="contain"
                />
                <Text style={styles.countText}>{formatGuestCount(guest.guestCount)}</Text>
              </>
            ) : null}
            {guest.timeLabel &&
            guest.time &&
            guest.timeLabel !== 'N/A' &&
            guest.time !== 'N/A' ? (
              <Text style={styles.timeText}>
                {`${guest.timeLabel}: ${guest.time}`}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {specialInstructions ? (
        <View style={styles.specialBlock}>
          <Text style={styles.specialTitle}>Special Instructions</Text>
          <Text style={styles.specialText}>{specialInstructions}</Text>
        </View>
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
  guestIcon: {
    width: 28.371 * scaleX,
    height: 29.919 * scaleX,
    marginTop: 4 * scaleX,
  },
  guestIconNoTint: {
    tintColor: '#FFEA80',
  },
  imageBadgeIcon: {
    width: 12 * scaleX,
    height: 12 * scaleX,
    tintColor: '#ffffff',
  },
  imageBadgeIconNoTint: {
    width: 12 * scaleX,
    height: 12 * scaleX,
    tintColor: '#FFEA80',
  },
  imageBadge: {
    position: 'absolute',
    bottom: -2 * scaleX,
    right: -2 * scaleX,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8 * scaleX,
    marginBottom: 8 * scaleX,
  },
  guestName: {
    fontSize: ROOM_DETAIL_GUEST_INFO.arrival.name.fontSize * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: ROOM_DETAIL_GUEST_INFO.arrival.name.color,
    lineHeight: 21 * scaleX,
    flexShrink: 1,
    maxWidth: '85%',
  },
  numberBadge: {
    fontSize: ROOM_DETAIL_GUEST_INFO.arrival.numberBadge.fontSize * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: ROOM_DETAIL_GUEST_INFO.arrival.numberBadge.color,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    rowGap: 4 * scaleX,
    columnGap: 12 * scaleX,
  },
  dateRange: {
    fontSize: ROOM_DETAIL_GUEST_INFO.arrival.dates.fontSize * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: ROOM_DETAIL_GUEST_INFO.arrival.dates.color,
    lineHeight: 17 * scaleX,
  },
  countIcon: {
    width: GUEST_INFO.guestCount.icon.width * scaleX,
    height: GUEST_INFO.guestCount.icon.height * scaleX,
    tintColor: '#334866',
  },
  countText: {
    fontSize: ROOM_DETAIL_GUEST_INFO.arrival.occupancy.fontSize * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: ROOM_DETAIL_GUEST_INFO.arrival.occupancy.color,
    lineHeight: 17 * scaleX,
  },
  timeText: {
    fontSize: ROOM_DETAIL_GUEST_INFO.arrival.eta.fontSize * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '400',
    color: ROOM_DETAIL_GUEST_INFO.arrival.eta.color,
    lineHeight: 17 * scaleX,
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
