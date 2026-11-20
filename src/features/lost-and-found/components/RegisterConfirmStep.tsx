import React, { type Ref } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { formatDatesOfStayShort, formatGuestCountWords } from '@/utils/formatting';
import { vipTierFor } from '@/domain/vip';
import { useVipTiers } from '@/store/vipTiers';
import type { RoomPickerRoom } from '@features/rooms/types/roomPicker.types';
import type { FrontOfficeStatus } from '@features/rooms/types/allRooms.types';
import { GuestRow } from '@features/rooms/components/roomsList/GuestRow';
import { RoomCardHeader } from '@features/rooms/components/roomsList/RoomCardHeader';
import { PANEL_FILL } from '@features/rooms/components/roomsList/roomCardLayout';
import { scaleX } from '../constants/lostAndFoundStyles';
import { LOST_AND_FOUND_STATUS_MARK, type LostAndFoundStatusKey } from './LostAndFoundStatusDisc';
import { StaffAvatar } from './StaffAvatar';

const s = (n: number) => n * scaleX;

export type ConfirmPerson = { name: string; avatar?: unknown; department?: string };

const FRONT_OFFICE: readonly FrontOfficeStatus[] = ['Arrival', 'Departure', 'Arrival/Departure', 'Stayover', 'Turndown', 'No Task', 'Refresh'];

/** What a non-stored item's status means, under its name. */
const STATUS_HINT: Record<LostAndFoundStatusKey, string> = {
  stored: '',
  shipped: 'Sent to guest Address',
  discarded: 'Thrown away or Destroyed',
};

export type RegisterConfirmStepProps = {
  title: string;
  /** "11 November 2025" and "15:00". */
  foundDate: string;
  foundTime: string;
  /** The first photo, top right; none draws no frame. */
  photo?: string;
  location: 'room' | 'publicArea';
  room: RoomPickerRoom | null;
  publicArea: string | null;
  foundedBy: ConfirmPerson;
  registeredBy: ConfirmPerson;
  storedBy: ConfirmPerson;
  statusKey: LostAndFoundStatusKey;
  statusLabel: string;
  storedLocationLabel: string;
  /** The status pill opens the status choice; measured from this. */
  statusRef?: Ref<View>;
  onPressStatus: () => void;
};

/**
 * Register's last page, "Confirm and submit" — Figma 4649:3262. One card: the
 * item's name, when it was found and who found it beside its photo; where it
 * was found (the room as the Rooms list draws it, guest and all); who
 * registered and who stored it; and, under a rule, where it is kept and its
 * status as a pill that can still be changed.
 */
export function RegisterConfirmStep({
  title,
  foundDate,
  foundTime,
  photo,
  location,
  room,
  publicArea,
  foundedBy,
  registeredBy,
  storedBy,
  statusKey,
  statusLabel,
  storedLocationLabel,
  statusRef,
  onPressStatus,
}: RegisterConfirmStepProps) {
  const mark = LOST_AND_FOUND_STATUS_MARK[statusKey] ?? LOST_AND_FOUND_STATUS_MARK.stored;
  const stored = statusKey === 'stored';

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.topText}>
          <Text style={styles.title} numberOfLines={2}>
            {title || 'Lost item'}
          </Text>
          <View style={styles.whenRow}>
            <Text style={[styles.when, styles.whenDate]}>{foundDate}</Text>
            <Text style={styles.when}>{foundTime}</Text>
          </View>
          {/* 4649:3265 — avatar 35, "Found By" Light 11 over the name in Bold 13. */}
          <View style={styles.foundBy}>
            <StaffAvatar name={foundedBy.name} avatar={foundedBy.avatar} size={s(35)} />
            <View style={styles.foundByText}>
              <Text style={styles.smallLabel}>Found By</Text>
              <Text style={styles.foundByName} numberOfLines={1}>
                {foundedBy.name}
              </Text>
            </View>
          </View>
        </View>
        {photo ? <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" /> : null}
      </View>

      <Text style={[styles.smallLabel, styles.foundInLabel]}>Found in</Text>
      {location === 'room' && room ? (
        <RoomPanel room={room} />
      ) : (
        <View style={[styles.panel, styles.areaPanel]}>
          <Text style={styles.areaName} numberOfLines={1}>
            {publicArea ?? 'Public Area'}
          </Text>
        </View>
      )}

      {/* 4649:3274 / 3276 — two columns split by a 46-tall rule at x=141. */}
      <View style={styles.people}>
        <View style={styles.personColumn}>
          <Text style={styles.smallLabel}>Registerd By</Text>
          <Text style={styles.personName} numberOfLines={1}>
            {registeredBy.name}
          </Text>
        </View>
        {stored ? (
          <>
            <View style={styles.peopleRule} />
            <View style={[styles.personColumn, styles.storedByColumn]}>
              <Text style={styles.smallLabel}>Stored By</Text>
              <Text style={styles.personName} numberOfLines={1}>
                {storedBy.name}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.rule} />

      <View style={styles.bottom}>
        <View style={styles.bottomText}>
          {stored ? (
            <>
              <Text style={styles.smallLabel}>Stored Location</Text>
              <Text style={styles.locationValue} numberOfLines={1}>
                {storedLocationLabel}
              </Text>
              <Text style={styles.locationStamp}>{`${foundTime}, ${foundDate}`}</Text>
            </>
          ) : (
            <>
              <Text style={styles.smallLabel}>Status</Text>
              <Text style={styles.locationValue} numberOfLines={2}>
                {STATUS_HINT[statusKey]}
              </Text>
            </>
          )}
        </View>

        {/* 4664:620 — 177 x 70, the status colour, its mark, name and a chevron. */}
        <TouchableOpacity
          ref={statusRef}
          style={[styles.statusPill, { backgroundColor: mark.tone }]}
          onPress={onPressStatus}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Status: ${statusLabel}. Change status`}
        >
          <View style={styles.statusGlyph}>
            <Icon name={mark.icon} size={s(26)} color="#ffffff" />
          </View>
          <Text style={styles.statusText} numberOfLines={1}>
            {statusLabel}
          </Text>
          <Icon name="action-chevron-down-wide" width={s(23)} height={s(11.8)} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** 4649:3291 — the room as the Rooms list's card draws it: number, type chip, guest. */
function RoomPanel({ room }: { room: RoomPickerRoom }) {
  const vipTiers = useVipTiers();
  const guest = room.primaryGuest;
  const type: FrontOfficeStatus = FRONT_OFFICE.includes(room.frontOfficeStatus as FrontOfficeStatus)
    ? (room.frontOfficeStatus as FrontOfficeStatus)
    : 'Departure';
  const kind = room.guestKind;
  const tier = vipTierFor(guest?.vipCode, vipTiers);
  const timeLabel = room.time
    ? kind === 'arrival'
      ? `ETA: ${room.time}`
      : kind === 'departure'
        ? `EDT: ${room.time}`
        : undefined
    : undefined;

  return (
    <View style={styles.panel}>
      <View style={styles.roomHeader}>
        <RoomCardHeader roomNumber={room.number} type={type} />
      </View>
      {guest ? (
        <View style={styles.guest}>
          <GuestRow
            name={guest.fullName ?? '—'}
            dates={room.checkIn && room.checkOut ? formatDatesOfStayShort({ from: room.checkIn, to: room.checkOut }) : undefined}
            occupancy={formatGuestCountWords({ adults: room.adults ?? 0, kids: room.kids ?? 0 }) || undefined}
            timeLabel={timeLabel}
            kind={kind}
            imageUrl={guest.imageUrl}
            vip={tier && guest.vipCode ? { code: guest.vipCode, tier } : undefined}
          />
        </View>
      ) : (
        <Text style={styles.noGuest}>No guest</Text>
      )}
    </View>
  );
}

/*
 * Figma 4649:3262, design px. The card is x=14..423 (409); the scroll content
 * is padded 27, so the card hangs 13 out on each side.
 */
const styles = StyleSheet.create({
  /* 4649:3263 — #f9fafc, #e3e3e3 hairline, radius 9; 27 under the heading. */
  card: {
    width: s(409),
    marginLeft: s(-13),
    marginTop: s(27),
    paddingBottom: s(25),
    borderWidth: 1,
    borderColor: '#e3e3e3',
    borderRadius: s(9),
    backgroundColor: '#f9fafc',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: s(15),
    paddingRight: s(10),
  },
  topText: {
    flex: 1,
    paddingTop: s(11),
  },
  /* 4649:3288 — Bold 21 at x=34. */
  title: {
    marginLeft: s(19),
    fontSize: s(21),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  /* 4649:3289 / 3290 — Regular 14 at 39%, x=32 and x=162. */
  whenRow: {
    flexDirection: 'row',
    marginTop: s(10),
    marginLeft: s(17),
  },
  when: {
    fontSize: s(14),
    fontFamily: typography.fontFamily.primary,
    color: '#1e1e1e',
    opacity: 0.39,
  },
  whenDate: {
    width: s(130),
  },
  foundBy: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: s(12),
    marginLeft: s(17),
  },
  foundByText: {
    flex: 1,
    marginLeft: s(9),
  },
  /* Inter Light 11. */
  smallLabel: {
    fontSize: s(11),
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '300',
    color: '#000000',
  },
  foundByName: {
    marginTop: s(2),
    fontSize: s(13),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  /* 4649:3264 — 183 x 135, radius 10, at x=229. */
  photo: {
    width: s(183),
    height: s(135),
    borderRadius: s(10),
  },
  /* 4649:3275 — x=32, at y=353. */
  foundInLabel: {
    marginTop: s(-4),
    marginLeft: s(17),
  },
  /* 4649:3291 — 383 wide at x=29, #dfe6f0 40%, radius 10; 10 under "Found in". */
  panel: {
    width: s(383),
    marginTop: s(10),
    marginLeft: s(14),
    paddingBottom: s(15),
    borderRadius: s(10),
    backgroundColor: PANEL_FILL,
  },
  /* "201" at x=49, 21 down (the header pads 13 / 12). */
  roomHeader: {
    paddingTop: s(9),
    paddingLeft: s(7),
  },
  /* The photo at x=52, 81 under the panel's top; the VIP disc ending 33 short. */
  guest: {
    marginTop: s(22),
    paddingLeft: s(23),
    paddingRight: s(33),
  },
  noGuest: {
    marginTop: s(16),
    marginLeft: s(20),
    fontSize: s(14),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
  },
  areaPanel: {
    paddingTop: s(21),
    paddingBottom: s(21),
    paddingLeft: s(20),
  },
  areaName: {
    fontSize: s(24),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#334866',
  },
  /* Labels at y=565, 36 under the panel. */
  people: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: s(30),
    marginLeft: s(19),
  },
  personColumn: {
    width: s(107),
  },
  /* 4649:3319 — 1 x 46, black, at x=141. */
  peopleRule: {
    width: 1,
    height: s(46),
    backgroundColor: '#000000',
  },
  /* "Stored By" at x=168. */
  storedByColumn: {
    marginLeft: s(26),
    width: s(200),
  },
  /* Bold 14, 7 under its label. */
  personName: {
    marginTop: s(7),
    fontSize: s(14),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  /* 4649:3271 — #e3e3e3 across the card, 42 under the rule beside the names. */
  rule: {
    height: 1,
    marginTop: s(42),
    backgroundColor: '#e3e3e3',
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: s(19),
    paddingLeft: s(19),
    paddingRight: s(21),
  },
  bottomText: {
    flex: 1,
  },
  /* 4649:3266 — Bold 13. */
  locationValue: {
    marginTop: s(10),
    fontSize: s(13),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  /* 4649:3270 — Light 12. */
  locationStamp: {
    marginTop: s(2),
    fontSize: s(12),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
  },
  statusPill: {
    width: s(177),
    height: s(70),
    borderRadius: s(35),
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: s(18),
    paddingRight: s(22),
  },
  /* The mark at x=242; "Stored" at x=280. */
  statusGlyph: {
    width: s(38),
  },
  /* 4664:624 — Bold 17, white. */
  statusText: {
    flex: 1,
    fontSize: s(17),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default RegisterConfirmStep;
