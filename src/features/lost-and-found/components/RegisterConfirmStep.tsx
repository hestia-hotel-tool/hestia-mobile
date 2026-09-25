import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { typography } from '@/theme';
import { Icon } from '@/components/Icon';
import type { RoomPickerRoom } from '@features/rooms/types/roomPicker.types';
import { scaleX } from '../constants/lostAndFoundStyles';
import { StaffAvatar } from './StaffAvatar';

const s = (n: number) => n * scaleX;

/** Tinted panel fill used by all three cards — `#6483b0` at 7%. */
const PANEL = 'rgba(100, 131, 176, 0.07)';
/** Rules and the email field outline — `#afa9ad` at 26%. */
const HAIRLINE = 'rgba(175, 169, 173, 0.26)';

export type ConfirmPerson = { name: string; avatar?: unknown; department?: string };

export type RegisterConfirmStepProps = {
  location: 'room' | 'publicArea';
  room: RoomPickerRoom | null;
  publicArea: string | null;
  sendEmail: boolean;
  onToggleSendEmail: () => void;
  guestEmail: string;
  onGuestEmailChange: (value: string) => void;
  foundedBy: ConfirmPerson;
  registeredBy: ConfirmPerson;
  statusLabel: string;
  statusColor: string;
  storedLocationLabel: string;
  pictures: string[];
  /** Back to step 1 — where the item was found. */
  onEditLocation: () => void;
  /** Back to step 2 — people, status and storage. */
  onEditDetails: () => void;
  onAddPhoto: () => void;
};

/** "2026-10-07" -> "07/10". */
function dayMonth(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function initialsOf(name?: string): string {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase() || '?';
}

/**
 * Step 3, "Confirm Registration" — Figma 733:448.
 *
 * Three tinted panels summarising the first two steps — where it was found (with
 * the email-the-guest option), who found and registered it, and its status —
 * then the photos. Every section has an edit button that returns to the step
 * that owns it.
 *
 * Replaces an absolutely positioned layout whose offsets were differences of
 * old frame coordinates multiplied by fudge factors (`* 0.7`, `* 0.5`), and
 * which led with a large photo and a notes block the frame does not have.
 */
export function RegisterConfirmStep(props: RegisterConfirmStepProps) {
  const {
    location,
    room,
    publicArea,
    sendEmail,
    onToggleSendEmail,
    guestEmail,
    onGuestEmailChange,
    foundedBy,
    registeredBy,
    statusLabel,
    statusColor,
    storedLocationLabel,
    pictures,
    onEditLocation,
    onEditDetails,
    onAddPhoto,
  } = props;
  const isRoom = location === 'room';
  const guest = room?.primaryGuest;

  return (
    <View>
      {/* Node 1102:3262 */}
      <Text style={[styles.heading, styles.foundInHeading]}>Found in</Text>

      {/* Node 4242:598 — where, and whether to tell the guest. */}
      <View style={[styles.panel, styles.foundInPanel]}>
        <View style={styles.optionsRow}>
          <Option label="Room" checked={isRoom} labelGap={10} />
          <View style={{ width: s(21) }} />
          <Option label="Public Area" checked={!isRoom} labelGap={15} />
        </View>

        <View style={styles.whereRow}>
          {isRoom ? (
            <>
              <Text style={styles.roomText} numberOfLines={1}>
                Room {room?.number ?? '—'}
              </Text>
              {guest ? <GuestBlock room={room} /> : <View style={{ flex: 1 }} />}
            </>
          ) : (
            <Text style={[styles.roomText, styles.areaText]} numberOfLines={1}>
              {publicArea ?? 'Public Area'}
            </Text>
          )}
          <EditButton onPress={onEditLocation} label="Edit where it was found" />
        </View>

        {/* A guest to email exists only for an item found in a room. */}
        {isRoom && guest ? (
          <>
            <View style={styles.foundInRule} />
            <TouchableOpacity
              style={styles.emailToggle}
              onPress={onToggleSendEmail}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: sendEmail }}
            >
              {/* Node 1102:3283 — a 22px ring with a tick. */}
              <View style={styles.emailRing}>
                {sendEmail ? <Icon name="action-check" size={s(6.3)} color="#5a759d" /> : null}
              </View>
              <Text style={styles.emailLabel}>Send Email to Guest for reclamation?</Text>
            </TouchableOpacity>
            {sendEmail ? (
              <View style={styles.emailField}>
                <TextInput
                  value={guestEmail}
                  onChangeText={onGuestEmailChange}
                  placeholder="Guest email"
                  placeholderTextColor="rgba(0,0,0,0.35)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.emailInput}
                />
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      {/* Node 4231:581 — who found it, who registered it. */}
      <View style={[styles.panel, styles.peoplePanel]}>
        <Text style={[styles.heading, styles.peopleHeading]}>Founded by</Text>
        <PersonRow person={foundedBy} onEdit={onEditDetails} editLabel="Edit who found it" />
        <View style={styles.peopleRule} />
        <Text style={[styles.heading, styles.peopleHeading, styles.registeredHeading]}>
          Registered by
        </Text>
        <PersonRow person={registeredBy} onEdit={onEditDetails} editLabel="Edit who registered it" />
      </View>

      {/* Node 1102:3280 */}
      <Text style={[styles.heading, styles.statusHeading]}>Status</Text>

      {/* Node 4242:586 */}
      <View style={[styles.panel, styles.statusPanel]}>
        <View style={styles.statusText}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={styles.statusValue}>{statusLabel}</Text>
          </View>
          <Text style={styles.storedLabel}>Stored Location</Text>
          <Text style={styles.storedValue}>{storedLocationLabel}</Text>
        </View>
        <EditButton onPress={onEditDetails} label="Edit status" />
      </View>

      {/* Node 4242:608 */}
      <Text style={[styles.heading, styles.photosHeading]}>Photos</Text>
      <View style={styles.photos}>
        {pictures.map((uri, index) => (
          <Image key={`${uri}-${index}`} source={{ uri }} style={styles.photo} resizeMode="cover" />
        ))}
        {/* Node 4242:600 — the empty slot after the photos. */}
        <TouchableOpacity
          style={styles.photoSlot}
          onPress={onAddPhoto}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Add a photo"
        />
      </View>
    </View>
  );
}

/** A read-only choice: the one taken is solid, the other at 26% (node 4242:568). */
function Option({ label, checked, labelGap }: { label: string; checked: boolean; labelGap: number }) {
  return (
    <View style={[styles.option, !checked && styles.optionMuted]}>
      <View style={styles.optionBox}>
        {checked ? <Icon name="action-check-bold" size={s(14)} color="#5a759d" /> : null}
      </View>
      <Text style={[styles.optionLabel, { marginLeft: s(labelGap) }]}>{label}</Text>
    </View>
  );
}

/** Nodes 2961:162 — the guest in the room, as the room picker draws them. */
function GuestBlock({ room }: { room: RoomPickerRoom | null }) {
  const guest = room?.primaryGuest;
  const [failed, setFailed] = useState(false);
  const dates = `${dayMonth(room?.checkIn)}-${dayMonth(room?.checkOut)}`.replace(/^-|-$/, '');
  const photo = guest?.imageUrl && !failed ? guest.imageUrl : undefined;

  return (
    <View style={styles.guest}>
      <View style={styles.thumbWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.thumb} onError={() => setFailed(true)} />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Text style={styles.thumbInitials}>{initialsOf(guest?.fullName)}</Text>
          </View>
        )}
        {guest?.vipCode ? (
          <View style={styles.vipDisc}>
            <Icon name="guest-arrow" size={s(3.3)} color="#ffffff" style={styles.vipArrow} />
          </View>
        ) : null}
      </View>
      <View style={styles.guestText}>
        <View style={styles.guestNameRow}>
          <Text style={styles.guestName} numberOfLines={1}>
            {guest?.fullName ?? '—'}
          </Text>
          {guest?.vipCode ? <Text style={styles.vipCode}>{guest.vipCode}</Text> : null}
        </View>
        <View style={styles.guestMeta}>
          {dates ? <Text style={styles.guestDates}>{dates}</Text> : null}
          {typeof room?.guestCount === 'number' ? (
            <>
              <Icon name="guest-occupancy" width={s(13)} height={s(12)} color="#000000" />
              <Text style={styles.guestCount}>{room.guestCount}/2</Text>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** Nodes 1102:3324 / 4242:544 — avatar, name, department, and an edit button. */
function PersonRow({
  person,
  onEdit,
  editLabel,
}: {
  person: ConfirmPerson;
  onEdit: () => void;
  editLabel: string;
}) {
  return (
    <View style={styles.personRow}>
      <StaffAvatar name={person.name} avatar={person.avatar} size={s(32)} />
      <View style={styles.personText}>
        <Text style={styles.personName} numberOfLines={1}>
          {person.name}
        </Text>
        {person.department ? <Text style={styles.personDept}>{person.department}</Text> : null}
      </View>
      <EditButton onPress={onEdit} label={editLabel} />
    </View>
  );
}

/** Node 4244:628 — a 32px white disc holding a 16.4px pencil. */
function EditButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <TouchableOpacity
      style={styles.edit}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name="action-add-note" size={s(16.4)} color="#5a759d" />
    </TouchableOpacity>
  );
}

/*
 * Every value below is Figma 733:448, in design px. The scroll content is
 * padded 27, so a node at frame x=29 is 2 in.
 */
const styles = StyleSheet.create({
  heading: {
    fontSize: s(16),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  // Bars end at y=222 (19 of it is the bar's own margin); "Found in" at y=252, x=36.
  foundInHeading: { marginTop: s(11), marginLeft: s(9) },
  panel: {
    backgroundColor: PANEL,
    borderRadius: s(6),
  },
  // y=280, 9 below the heading; x=29.
  foundInPanel: {
    marginTop: s(9),
    marginLeft: s(2),
    paddingTop: s(16),
    paddingBottom: s(29),
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: s(21),
  },
  option: { flexDirection: 'row', alignItems: 'center' },
  optionMuted: { opacity: 0.26 },
  // Nodes 4242:571 / 4242:569 — 28x28, 2px #5a759d.
  optionBox: {
    width: s(28),
    height: s(28),
    borderWidth: 2,
    borderColor: '#5a759d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: s(16),
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
  // Checkboxes end at y=324; the room row starts at y=361.
  whereRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: s(37),
    paddingLeft: s(32),
    paddingRight: s(28),
    minHeight: s(39),
  },
  // Node 1102:3322 — Inter Light 14, black. The guest block starts at x=154.
  roomText: {
    width: s(93),
    fontSize: s(14),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
  },
  areaText: { flex: 1, width: undefined },
  guest: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  thumbWrap: { marginRight: s(14.4) },
  thumb: { width: s(34.59), height: s(34.59), borderRadius: s(5) },
  thumbFallback: { backgroundColor: '#5a759d', alignItems: 'center', justifyContent: 'center' },
  thumbInitials: {
    fontSize: s(12),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Node 2961:166.
  vipDisc: {
    position: 'absolute',
    right: -s(1.4),
    bottom: -s(4.2),
    width: s(14.12),
    height: s(14.12),
    borderRadius: s(7.06),
    backgroundColor: '#f92424',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipArrow: { transform: [{ scaleX: -1 }] },
  guestText: { flex: 1 },
  guestNameRow: { flexDirection: 'row', alignItems: 'baseline' },
  // Node 2961:172 — Helvetica Bold 14.
  guestName: {
    flexShrink: 1,
    fontSize: s(14),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  // Node 2961:163 — Light 12, #334866.
  vipCode: {
    marginLeft: s(6),
    fontSize: s(12),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#334866',
  },
  guestMeta: { flexDirection: 'row', alignItems: 'center', marginTop: s(4), gap: s(6) },
  guestDates: {
    marginRight: s(4),
    fontSize: s(14),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
  },
  guestCount: {
    fontSize: s(14),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
  },
  // Node 4242:626 — y=419, x=36..416.
  foundInRule: {
    height: 1,
    backgroundColor: HAIRLINE,
    marginTop: s(19),
    marginLeft: s(7),
    marginRight: s(1),
  },
  // Ring at y=446, x=44.
  emailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: s(27),
    paddingLeft: s(15),
  },
  emailRing: {
    width: s(22),
    height: s(22),
    borderRadius: s(11),
    borderWidth: 2,
    borderColor: '#5a759d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Node 733:586 — Helvetica 13, #5a759d, at x=77.
  emailLabel: {
    marginLeft: s(11),
    fontSize: s(13),
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
  // Node 3199:199 — 57 tall, x=43..405, 18 below the ring.
  emailField: {
    marginTop: s(18),
    marginLeft: s(14),
    marginRight: s(12),
    height: s(57),
    borderRadius: s(8),
    borderWidth: 1,
    borderColor: HAIRLINE,
    justifyContent: 'center',
    paddingHorizontal: s(16),
  },
  // Node 3199:200 — Inter Light 14.
  emailInput: {
    fontSize: s(14),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    paddingVertical: 0,
  },
  // y=595, 23 below the first panel.
  peoplePanel: {
    marginTop: s(23),
    marginLeft: s(2),
    paddingTop: s(12),
    paddingBottom: s(27),
  },
  // Nodes 1102:3275 / 1102:3279 — x=47.
  peopleHeading: { marginLeft: s(18) },
  registeredHeading: { marginTop: s(23) },
  // Heading ends y=626, avatar at y=649.
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: s(23),
    paddingLeft: s(18),
    paddingRight: s(28),
  },
  personText: { flex: 1, marginLeft: s(14) },
  // Node 1102:3327 — Helvetica Regular 16, #1e1e1e.
  personName: {
    fontSize: s(16),
    fontFamily: typography.fontFamily.primary,
    color: '#1e1e1e',
  },
  // Node 1102:3328 — Inter Light 14.
  personDept: {
    marginTop: s(1),
    fontSize: s(14),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
  },
  // Node 4242:615 — y=715, x=30..410.
  peopleRule: {
    height: 1,
    backgroundColor: HAIRLINE,
    marginTop: s(31),
    marginLeft: s(1),
    marginRight: s(7),
  },
  // y=860, 17 below the panel; x=43.
  statusHeading: { marginTop: s(17), marginLeft: s(16) },
  // Node 4242:586 — x=38..412, 12 below the heading.
  statusPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: s(12),
    marginLeft: s(11),
    marginRight: s(5),
    paddingTop: s(15),
    paddingBottom: s(13),
    paddingLeft: s(13),
    paddingRight: s(23),
  },
  statusText: { flex: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  // Node 1102:3337 — 18px.
  statusDot: { width: s(18), height: s(18), borderRadius: s(9), marginRight: s(7) },
  statusValue: {
    fontSize: s(16),
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
  // Node 1102:3281 — Inter Regular 16, 21 below the status row.
  storedLabel: {
    marginTop: s(21),
    fontSize: s(16),
    fontFamily: typography.fontFamily.primary,
    color: '#000000',
  },
  // Node 1102:3339 — Helvetica Bold 16, #1e1e1e.
  storedValue: {
    marginTop: s(5),
    marginLeft: s(1),
    fontSize: s(16),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  // y=1049, 49 below the panel; x=43.
  photosHeading: { marginTop: s(49), marginLeft: s(16) },
  // Photos at y=1082, x=44.
  photos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(11),
    marginTop: s(14),
    marginLeft: s(17),
  },
  // Node 4242:599 — 113x92, radius 5.
  photo: { width: s(113), height: s(92), borderRadius: s(5), overflow: 'hidden' },
  // Node 4242:600 — 106x92, #c4c4c4 at 28%.
  photoSlot: {
    width: s(106),
    height: s(92),
    borderRadius: s(5),
    backgroundColor: 'rgba(196, 196, 196, 0.28)',
  },
  edit: {
    width: s(32),
    height: s(32),
    borderRadius: s(16),
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RegisterConfirmStep;
