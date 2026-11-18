import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { scaleX } from '@/utils/responsive';
import type { LostAndFoundItem } from '../../types/lostAndFound.types';
import { LOST_AND_FOUND_CARD_CHROME } from '../../constants/lostAndFoundCardChrome';
import { ItemPhoto } from './ItemPhoto';
import { ItemStatusPill, type LostAndFoundStatusAnchorLayout } from './ItemStatusPill';
import { storedLocationLabel } from '../../utils/storedLocations';

export type { LostAndFoundStatusAnchorLayout };

export type LostAndFoundCardProps = {
  item: LostAndFoundItem;
  onPress?: () => void;
  onStatusPress?: (anchor?: LostAndFoundStatusAnchorLayout) => void;
  statusUpdating?: boolean;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const pad = (n: number) => String(n).padStart(2, '0');

/** "11 November 2025" and "15:00", or empty strings for an unreadable time. */
function dateAndTime(iso?: string): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return { date: '', time: '' };
  return {
    date: `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/**
 * One Lost & Found item — Figma 3128:32 as redrawn (card 4735:374).
 *
 * The photo on the left; the item name, the day and time it was found, then
 * the guest and the room (the room number large on the right). Under a rule:
 * where it is now — the stored or shipped location with when — opposite the
 * status as a large pill. The tracking number, notes and who registered it
 * are on the item's own screen.
 */
export function LostAndFoundCard({
  item,
  onPress,
  onStatusPress,
  statusUpdating = false,
}: LostAndFoundCardProps) {
  const chrome = LOST_AND_FOUND_CARD_CHROME[item.status] ?? LOST_AND_FOUND_CARD_CHROME.stored;

  const locationTrimmed = typeof item.location === 'string' ? item.location.trim() : '';
  const roomNumber =
    item.roomNumber != null
      ? String(item.roomNumber)
      : (item.location || '').match(/room\s*(\d+)/i)?.[1] ?? null;
  const isRoomItem = roomNumber != null || /^room\b/i.test(locationTrimmed);

  const photoKey =
    typeof item.image === 'object' && item.image !== null && 'uri' in item.image
      ? String((item.image as { uri: string }).uri)
      : String(item.image ?? 'none');

  const found = dateAndTime(item.storedAt ?? item.createdAt);

  // Who or where it was found: the guest and room, the room alone, or the area.
  const foundLabel = isRoomItem ? (item.guestName ? 'Guest and Room Number' : 'Room Number') : 'Found In';
  const foundName = isRoomItem
    ? item.guestName || 'No guest'
    : item.publicArea ?? (locationTrimmed || 'Public Area');

  // Where it is now, and since when.
  const locationValue = storedLocationLabel(
    chrome.locationSource === 'shipped' ? item.shippedLocation : item.storedLocation
  );
  const since = dateAndTime(
    item.status === 'discarded'
      ? item.discardedAt ?? item.storedAt
      : item.status === 'shipped' || item.status === 'returned'
        ? item.returnedAt ?? item.storedAt
        : item.storedAt ?? item.createdAt
  );

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button" accessibilityLabel={item.itemName}>
      <View style={styles.top}>
        {/* 4735:414 — 114 x 109, radius 10. Keyed on the source so a new photo
            starts with a clean loading state. */}
        <View style={styles.photo}>
          <ItemPhoto key={photoKey} source={item.image} />
        </View>

        <View style={styles.details}>
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {item.itemName}
          </Text>
          {found.date ? (
            <Text style={styles.when} numberOfLines={1}>
              {found.date}
              {'   '}
              {found.time}
            </Text>
          ) : null}

          <View style={styles.foundRow}>
            <View style={styles.foundText}>
              <Text style={styles.label}>{foundLabel}</Text>
              <Text style={styles.foundName} numberOfLines={1}>
                {foundName}
              </Text>
            </View>
            {isRoomItem && roomNumber ? (
              <Text style={styles.roomNumber} numberOfLines={1}>
                {roomNumber}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* 4735:380 */}
      <View style={styles.rule} />

      <View style={styles.bottom}>
        <View style={styles.location}>
          {chrome.locationSource !== 'none' ? (
            <>
              <Text style={styles.label}>{chrome.locationLabel}</Text>
              <Text style={styles.locationValue} numberOfLines={1}>
                {locationValue}
              </Text>
              {since.date ? (
                <Text style={styles.locationWhen} numberOfLines={1}>
                  {`${since.time}, ${since.date}`}
                </Text>
              ) : null}
            </>
          ) : null}
        </View>
        <ItemStatusPill chrome={chrome} onStatusPress={onStatusPress} updating={statusUpdating} size="large" />
      </View>
    </Pressable>
  );
}

const androidText = Platform.select({ android: { includeFontPadding: false } as const, default: {} as const });

const styles = StyleSheet.create({
  /* 4735:375 — #f9fafc, 1px #e3e3e3, radius 9, 409 x 242. */
  card: {
    backgroundColor: '#f9fafc',
    borderWidth: 1,
    borderColor: '#e3e3e3',
    borderRadius: 9 * scaleX,
    overflow: 'hidden',
  },
  /* The photo 13 in and 15 down; the text column at 141. */
  top: {
    flexDirection: 'row',
    paddingTop: 15 * scaleX,
    paddingLeft: 13 * scaleX,
    paddingRight: 9 * scaleX,
    paddingBottom: 17 * scaleX,
  },
  photo: {
    width: 114 * scaleX,
    height: 109 * scaleX,
    borderRadius: 10 * scaleX,
    overflow: 'hidden',
  },
  details: {
    flex: 1,
    marginLeft: 14 * scaleX,
  },
  /* 4735:390 — Helvetica Bold 21 black. */
  name: {
    fontSize: 21 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#000000',
    ...androidText,
  },
  /* 4735:391 / 392 — Helvetica 12 #1e1e1e at 39%. */
  when: {
    marginTop: 4 * scaleX,
    fontSize: 12 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '400',
    color: '#1e1e1e',
    opacity: 0.39,
    ...androidText,
  },
  foundRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  foundText: {
    flex: 1,
  },
  /* Inter Light 11 — "Guest and Room Number", "Stored Location". */
  label: {
    fontSize: 11 * scaleX,
    fontFamily: 'Inter',
    fontWeight: '300',
    color: '#000000',
    ...androidText,
  },
  /* 4735:394 — Helvetica Bold 16. */
  foundName: {
    marginTop: 6 * scaleX,
    fontSize: 16 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#000000',
    ...androidText,
  },
  /* 4735:393 — Helvetica Bold 33 #334866. */
  roomNumber: {
    marginLeft: 8 * scaleX,
    fontSize: 33 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#334866',
    ...androidText,
  },
  rule: {
    height: 1,
    backgroundColor: '#e3e3e3',
  },
  /* The location 15 in; the pill 14 under the rule and 9 from the right. */
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 13 * scaleX,
    paddingBottom: 16 * scaleX,
    paddingLeft: 15 * scaleX,
    paddingRight: 9 * scaleX,
  },
  location: {
    flex: 1,
    marginRight: 10 * scaleX,
  },
  /* 4735:409 — Helvetica Bold 14 #1e1e1e. */
  locationValue: {
    marginTop: 11 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#1e1e1e',
    ...androidText,
  },
  /* 4735:410 — Helvetica Light 12. */
  locationWhen: {
    marginTop: 4 * scaleX,
    fontSize: 12 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: '#000000',
    ...androidText,
  },
});

export default LostAndFoundCard;
