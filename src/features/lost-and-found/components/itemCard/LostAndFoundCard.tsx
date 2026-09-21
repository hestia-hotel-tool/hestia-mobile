import React from 'react';
import { Pressable, Text, View } from '@/tw';
import { scaleX } from '@/utils/responsive';
import type { LostAndFoundItem } from '../../types/lostAndFound.types';
import { LOST_AND_FOUND_CARD_CHROME } from '../../constants/lostAndFoundCardChrome';
import { LOST_AND_FOUND_CARD_LAYOUT as L } from './lostAndFoundCardLayout';
import { ItemCardHeader } from './ItemCardHeader';
import { ItemPhoto } from './ItemPhoto';
import { FoundInGuestRow } from './FoundInGuestRow';
import { FoundInPublicAreaRow } from './FoundInPublicAreaRow';
import { ItemLocationBlock } from './ItemLocationBlock';
import { ItemCardFooter } from './ItemCardFooter';
import { ItemStatusPill, type LostAndFoundStatusAnchorLayout } from './ItemStatusPill';
import { typography } from '@/theme';

export type { LostAndFoundStatusAnchorLayout };

export type LostAndFoundCardProps = {
  item: LostAndFoundItem;
  onPress?: () => void;
  onStatusPress?: (anchor?: LostAndFoundStatusAnchorLayout) => void;
  statusUpdating?: boolean;
};

/** "11:00, 12/2/2026" from an ISO string; empty when unparseable. */
function formatTimestamp(iso?: string): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(dt.getHours())}:${pad(dt.getMinutes())} ${pad(dt.getDate())}/${pad(
    dt.getMonth() + 1
  )}/${dt.getFullYear()}`;
}

/**
 * Turn a stored-location key into something a person would read.
 *
 * The column holds camelCase keys — `hskOffice`, `frontDesk` — and the card used
 * to print them raw, so the list said "hskOffice" where Figma 3871:3599 says
 * "HSK Office". Step 2 of the register form has always mapped them (its
 * `getLocationLabel`), so the two surfaces disagreed about the same value.
 *
 * Unknown keys fall through unchanged rather than being mangled: a free-text
 * shipped location like "34 bremgarten zug" must survive this untouched.
 */
const STORED_LOCATION_LABEL: Record<string, string> = {
  hskOffice: 'HSK Office',
  frontDesk: 'Front Desk',
  securityOffice: 'Security Office',
  lostAndFoundRoom: 'Lost & Found Room',
};

/**
 * Pull a URL out of whatever shape `registeredBy.avatar` arrives in.
 *
 * The screen builds it as `{ uri }` from `users.avatar_url`, mock data has used
 * a bare string, and a `require()`d local image would be a number. `ui/Avatar`
 * takes a string, so anything else resolves to its initials fallback — which is
 * a reasonable end state, but only for sources that genuinely have no URL.
 */
function avatarUriOf(avatar: unknown): string | undefined {
  if (typeof avatar === 'string') return avatar;
  if (avatar && typeof avatar === 'object' && 'uri' in avatar) {
    const { uri } = avatar as { uri?: unknown };
    return typeof uri === 'string' ? uri : undefined;
  }
  return undefined;
}

function locationLabel(value?: string): string {
  const raw = (value ?? '').trim();
  if (!raw) return '—';
  return STORED_LOCATION_LABEL[raw] ?? raw;
}

/**
 * One Lost & Found item — Figma **3128:32**, nodes 3871:3585 and 3871:3619.
 *
 * **A flex column, not 30 absolute boxes.** What this replaces positioned every
 * element with `top`/`left` against the 440pt frame, which is why the card
 * asserted a 271 height it could not honour once a title wrapped to two lines.
 * Here the height falls out of the content, which is what the frame's own two
 * cards prove it is — both reach 271 from different photographs.
 *
 * **The card stretches; it is not 409 wide.** `409 + 16 + 16` is 441 against a
 * 440 frame, which is why the fixed width clipped inside any padded container.
 * It fills the gutter instead — the same correction `TICKET_CARD_LAYOUT.gutter`
 * documents. This visibly changes the card in Room Detail's
 * `LostAndFoundSection`, where it had been overflowing a narrower column.
 *
 * **The photo is on the left.** 3128:32 and 3107:70 both draw it at x=34 with
 * the "Found In" column at x=194; only 3128:310 has it on the right, which is
 * where the previous implementation put it. Two frames against one, and the
 * target frame is among the two.
 */
export function LostAndFoundCard({
  item,
  onPress,
  onStatusPress,
  statusUpdating = false,
}: LostAndFoundCardProps) {
  const chrome = LOST_AND_FOUND_CARD_CHROME[item.status] ?? LOST_AND_FOUND_CARD_CHROME.stored;

  const locationTrimmed = typeof item.location === 'string' ? item.location.trim() : '';
  const isRoomItem = item.roomNumber != null || /^room\b/i.test(locationTrimmed);
  const roomNumber =
    item.roomNumber != null
      ? String(item.roomNumber)
      : (item.location || '').match(/room\s*(\d+)/i)?.[1] ?? null;
  const hasGuest = Boolean(item.guestName || item.guestDates || item.guestImage);

  const photoKey =
    typeof item.image === 'object' && item.image !== null && 'uri' in item.image
      ? String((item.image as { uri: string }).uri)
      : String(item.image ?? 'none');
  const guestKey = `${String(
    typeof item.guestImage === 'object' && item.guestImage !== null && 'uri' in item.guestImage
      ? (item.guestImage as { uri: string }).uri
      : 'none'
  )}|${item.guestName ?? ''}`;

  const locationValue = locationLabel(
    chrome.locationSource === 'shipped' ? item.shippedLocation : item.storedLocation
  );

  return (
    <Pressable
      className="overflow-hidden border border-border-medium bg-surface-card"
      onPress={onPress}
      style={{
        borderRadius: L.radius * scaleX,
        paddingHorizontal: L.paddingLeft * scaleX,
        paddingTop: L.paddingTop * scaleX,
        paddingBottom: 14 * scaleX,
        gap: 14 * scaleX,
      }}
    >
      <ItemCardHeader itemName={item.itemName} itemId={item.itemId} />

      <View className="flex-row" style={{ gap: 16 * scaleX }}>
        {/* Keyed on the source: a new photo is a new component, which is how
            `ItemPhoto` clears its loading state without a reset effect. */}
        <ItemPhoto key={photoKey} source={item.image} />

        <View className="flex-1" style={{ gap: 10 * scaleX }}>
          <Text
            className="font-hestia-primary font-light text-ink-primary"
            style={{ fontSize: 14 * scaleX, fontFamily: typography.fontFamily.primary }}
          >
            Found In
          </Text>

          {isRoomItem && hasGuest ? (
            <FoundInGuestRow
              /* Keyed on the same two values the old reset effect watched, so a
                 different guest starts with a clean thumbnail-error state. */
              key={guestKey}
              guestName={item.guestName}
              guestDates={item.guestDates}
              guestImage={item.guestImage}
              guestVipCode={item.guestVipCode}
              roomNumber={roomNumber}
            />
          ) : isRoomItem ? (
            /* A room with no reservation: same title/chip/timestamp layout, but
               no area tile — that glyph would claim it is a public area. */
            <FoundInPublicAreaRow
              areaName={roomNumber ? `Room ${roomNumber}` : locationTrimmed || 'Room'}
              timestamp={formatTimestamp(item.storedAt ?? item.createdAt)}
              chipLabel={roomNumber}
              showTile={false}
            />
          ) : (
            <FoundInPublicAreaRow
              areaName={item.publicArea ?? item.location ?? 'Public Area'}
              timestamp={formatTimestamp(item.storedAt ?? item.createdAt) || item.guestDates}
            />
          )}

          <ItemLocationBlock label={chrome.locationLabel} value={locationValue} />
        </View>
      </View>

      <ItemCardFooter
        label={chrome.footerLabel}
        name={item.registeredBy.name}
        timestamp={item.registeredBy.timestamp}
        avatarUri={avatarUriOf(item.registeredBy.avatar)}
      >
        <ItemStatusPill chrome={chrome} onStatusPress={onStatusPress} updating={statusUpdating} />
      </ItemCardFooter>
    </Pressable>
  );
}

export default LostAndFoundCard;
