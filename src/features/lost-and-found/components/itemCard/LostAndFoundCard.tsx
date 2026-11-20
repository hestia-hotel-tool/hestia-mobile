import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { scaleX } from '@/utils/responsive';
import type { LostAndFoundItem } from '../../types/lostAndFound.types';
import { LOST_AND_FOUND_CARD_CHROME } from '../../constants/lostAndFoundCardChrome';
import { ItemPhoto } from './ItemPhoto';
import { ItemStatusPill, type LostAndFoundStatusAnchorLayout } from './ItemStatusPill';
import { storedLocationLabel } from '../../utils/storedLocations';
import { GuestRow } from '@features/rooms/components/roomsList/GuestRow';

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

function parse(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** "20 November  |  17:00" — when it was found (4799:245). */
function foundWhen(iso?: string): string {
  const d = parse(iso);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]}  |  ${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
}

/** "15:00, 11 Nov 2025" — since when it is where it is (4799:267). */
function sinceWhen(iso?: string): string {
  const d = parse(iso);
  return d
    ? `${pad(d.getHours())}:${pad(d.getMinutes())}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
    : '';
}

/**
 * One Lost & Found item — Figma 3128:32 (cards 4799:545 stored, 4799:543
 * shipped, 4799:544 discarded).
 *
 * The photo; the item name, when it was found and its status as a tinted chip
 * (a tap changes it); "Room" and the number large on the right. Then a panel
 * with the guest — photo with the stay's mark, name, dates — and, on the
 * right, "Email sent to guest" once the guest was emailed, or "View Shipping
 * info" once shipped. Last, who registered (or discarded) it beside the stored
 * location and since when.
 */
export function LostAndFoundCard({
  item,
  onPress,
  onStatusPress,
  statusUpdating = false,
}: LostAndFoundCardProps) {
  const chrome = LOST_AND_FOUND_CARD_CHROME[item.status] ?? LOST_AND_FOUND_CARD_CHROME.stored;
  const discarded = item.status === 'discarded';
  const shipped = item.status === 'shipped' || item.status === 'returned';

  const locationTrimmed = typeof item.location === 'string' ? item.location.trim() : '';
  const roomNumber =
    item.roomNumber != null
      ? String(item.roomNumber)
      : (item.location || '').match(/room\s*(\d+)/i)?.[1] ?? null;
  const isRoomItem = roomNumber != null || /^room\b/i.test(locationTrimmed);
  const areaName = item.publicArea ?? (locationTrimmed || 'Public Area');

  const photoKey =
    typeof item.image === 'object' && item.image !== null && 'uri' in item.image
      ? String((item.image as { uri: string }).uri)
      : String(item.image ?? 'none');

  const guestImageUrl =
    typeof item.guestImage === 'object' && item.guestImage !== null && 'uri' in item.guestImage
      ? String((item.guestImage as { uri: string }).uri)
      : null;

  const link = shipped ? 'View Shipping info' : !discarded && item.emailSent ? 'Email sent to guest' : null;

  const since = sinceWhen(
    discarded ? item.discardedAt ?? item.storedAt : shipped ? item.returnedAt ?? item.storedAt : item.storedAt ?? item.createdAt
  );
  const person = discarded ? item.discardedBy ?? item.registeredBy?.name : item.registeredBy?.name;

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button" accessibilityLabel={item.itemName}>
      <View style={styles.top}>
        {/* 4799:277 — 94 x 90, radius 10. Keyed on the source so a new photo starts clean. */}
        <View style={styles.photo}>
          <ItemPhoto key={photoKey} source={item.image} />
        </View>

        <View style={styles.details}>
          <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {item.itemName}
          </Text>
          <Text style={styles.when} numberOfLines={1}>
            {foundWhen(item.storedAt ?? item.createdAt)}
          </Text>
          <View style={styles.chip}>
            <ItemStatusPill chrome={chrome} onStatusPress={onStatusPress} updating={statusUpdating} size="chip" />
          </View>
        </View>

        {isRoomItem && roomNumber ? (
          <View style={styles.room}>
            <Text style={styles.roomLabel}>Room</Text>
            <Text style={styles.roomNumber} numberOfLines={1} adjustsFontSizeToFit>
              {roomNumber}
            </Text>
          </View>
        ) : null}
      </View>

      {/* 4799:367 — 382 x 85: the guest, or the area it was found in. */}
      <View style={styles.panel}>
        {isRoomItem ? (
          <View style={styles.guest}>
            <GuestRow
              name={item.guestName || 'No guest'}
              dates={item.guestDates || undefined}
              kind={item.guestKind ?? 'occupied'}
              imageUrl={guestImageUrl}
            />
          </View>
        ) : (
          <View style={styles.guest}>
            <Text style={styles.label}>Found in</Text>
            <Text style={styles.area} numberOfLines={1}>
              {areaName}
            </Text>
          </View>
        )}
        {link ? (
          <Text style={styles.link} numberOfLines={1}>
            {link}
          </Text>
        ) : null}
      </View>

      {/* 4799:273 … — who, a short rule, where and since when. */}
      <View style={styles.footer}>
        <View style={styles.footerPerson}>
          <Text style={styles.label}>{discarded ? 'Discarded By' : 'Registered By'}</Text>
          <Text style={[styles.footerValue, discarded && styles.footerValueDark]} numberOfLines={1}>
            {person || '—'}
          </Text>
        </View>
        <View style={styles.footerRule} />
        <View style={styles.footerPlace}>
          <Text style={styles.label}>Stored Location</Text>
          {discarded ? (
            // 4799:518 — a discarded item has no place, only when it went.
            <Text style={[styles.footerValue, styles.footerValueDark]} numberOfLines={1}>
              {since || '—'}
            </Text>
          ) : (
            <View style={styles.placeRow}>
              <Text style={[styles.footerValue, styles.placeValue]} numberOfLines={1}>
                {storedLocationLabel(item.storedLocation) || '—'}
              </Text>
              {since ? (
                <Text style={styles.placeWhen} numberOfLines={1}>
                  {since}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const androidText = Platform.select({ android: { includeFontPadding: false } as const, default: {} as const });
const s = (n: number) => n * scaleX;

const styles = StyleSheet.create({
  /* 4799:217 — #f9fafc, 1px #b0c0c6, radius 9, 409 x 259. */
  card: {
    backgroundColor: '#f9fafc',
    borderWidth: 1,
    borderColor: '#b0c0c6',
    borderRadius: s(9),
    overflow: 'hidden',
    paddingBottom: s(13),
  },
  /* The photo 11 in and 11 down; the text at 114. */
  top: {
    flexDirection: 'row',
    paddingTop: s(11),
    paddingLeft: s(10.5),
    paddingRight: s(14),
  },
  photo: {
    width: s(94),
    height: s(90),
    borderRadius: s(10),
    overflow: 'hidden',
  },
  details: {
    flex: 1,
    marginLeft: s(9.5),
    paddingTop: s(7),
  },
  /* 4799:242 — Helvetica Bold 20 #1e1e1e. */
  name: {
    fontSize: s(20),
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#1e1e1e',
    ...androidText,
  },
  /* 4799:245 — Helvetica 10 #1e1e1e, 26 under the name's top. */
  when: {
    marginTop: s(3),
    fontSize: s(10),
    fontFamily: 'Helvetica',
    color: '#1e1e1e',
    ...androidText,
  },
  /* 4799:368 — the chip's top 63 into the card. */
  chip: {
    marginTop: s(7),
  },
  /* 4799:528 — "Room" 10 #898585 over the number, Bold 54 #5a759d. */
  room: {
    marginLeft: s(8),
    paddingTop: s(12),
    alignItems: 'flex-start',
  },
  roomLabel: {
    fontSize: s(10),
    fontFamily: 'Helvetica',
    color: '#898585',
    ...androidText,
  },
  roomNumber: {
    marginTop: s(-2),
    fontSize: s(54),
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#5a759d',
    ...androidText,
  },
  /* 4799:367 — 382 x 85 at x=10.5, 10 under the photo; #eef2f7 at 59%. */
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    height: s(85),
    marginTop: s(10),
    marginLeft: s(10.5),
    marginRight: s(16.5),
    paddingLeft: s(12),
    paddingRight: s(13),
    backgroundColor: 'rgba(238, 242, 247, 0.59)',
  },
  guest: {
    flex: 1,
  },
  area: {
    marginTop: s(6),
    fontSize: s(14),
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#000000',
    ...androidText,
  },
  /* 4799:536 — Helvetica Bold 14 #9d9d9d, underlined, level with the dates. */
  link: {
    marginLeft: s(8),
    marginTop: s(18),
    fontSize: s(14),
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#9d9d9d',
    textDecorationLine: 'underline',
    ...androidText,
  },
  /* Labels 14 under the panel: "Registered By" at 15.5, "Stored Location" at 145.5. */
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: s(14),
    paddingLeft: s(15.5),
    paddingRight: s(14),
  },
  footerPerson: {
    width: s(107),
  },
  /* 4799:275 — 29 tall, #e4e4e4, at x=122.5. */
  footerRule: {
    width: 1,
    height: s(29),
    marginTop: s(7),
    backgroundColor: '#e4e4e4',
  },
  footerPlace: {
    flex: 1,
    marginLeft: s(22),
  },
  /* Inter Light 11. */
  label: {
    fontSize: s(11),
    fontFamily: 'Inter',
    fontWeight: '300',
    color: '#000000',
    ...androidText,
  },
  /* 4799:271 — Helvetica Bold 14 #7a7a7a, 20 under the label's top. */
  footerValue: {
    marginTop: s(7),
    fontSize: s(14),
    fontFamily: 'Helvetica',
    fontWeight: '700',
    color: '#7a7a7a',
    ...androidText,
  },
  /* 4799:488 / 4799:518 — a discarded card's values are #1e1e1e. */
  footerValueDark: {
    color: '#1e1e1e',
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  placeValue: {
    flexShrink: 1,
    marginLeft: s(2),
  },
  /* 4799:267 — Helvetica Light 12, at x=268.5. */
  placeWhen: {
    marginLeft: s(10),
    fontSize: s(12),
    fontFamily: 'Helvetica',
    fontWeight: '300',
    color: '#000000',
    ...androidText,
  },
});

export default LostAndFoundCard;
