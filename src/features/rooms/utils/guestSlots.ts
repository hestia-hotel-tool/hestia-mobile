import type { GuestInfo } from '../types/allRooms.types';
import type { GuestSlot, RoomType } from '../types/roomDetail.types';
import { getRoomTypeConfig } from '../constants/roomTypeConfigs';

export interface ResolvedGuestSlot {
  slot: GuestSlot;
  guest: GuestInfo;
  /** Already resolved per the slot's `numberBadge` rule; undefined when there is none. */
  numberBadge?: string;
}

/**
 * A guest block to show when the room has no usable guest data.
 *
 * The detail screen has always rendered at least one block rather than an empty
 * Guest Info section. `seed` keeps the placeholder avatar stable for a room
 * instead of changing on every render.
 */
function placeholderGuest(seed: string): GuestInfo {
  return {
    name: 'Guest',
    datesOfStay: { from: '', to: '' },
    time: 'N/A',
    timeLabel: 'N/A',
    guestCount: { adults: 0, kids: 0 },
    imageUrl: `https://i.pravatar.cc/96?u=${seed}-0`,
  } as GuestInfo;
}

function pickGuest(slot: GuestSlot, guests: GuestInfo[]): GuestInfo | undefined {
  // Destructured so the discriminant narrows — a property access off `slot`
  // does not.
  const match = slot.match;
  const matched =
    match.by === 'index'
      ? guests[match.index]
      : guests.find((g) => g.timeLabel === match.timeLabel);

  if (matched) return matched;
  return slot.fallbackIndex === undefined ? undefined : guests[slot.fallbackIndex];
}

/**
 * The guest blocks to render for a room, in order.
 *
 * The single place guest selection happens. It used to run twice with different
 * rules — the screen built a typed array (Arrival/Departure by index, the
 * single-guest types by ETA/EDT label), then the content component threw that
 * away and re-derived it by `type` — plus a third block that invented a
 * placeholder guest when neither found anything.
 */
export function resolveGuestSlots(
  roomType: RoomType,
  guests: GuestInfo[] = [],
  opts?: { fallbackSeed?: string }
): ResolvedGuestSlot[] {
  const { guestSlots } = getRoomTypeConfig(roomType);

  const resolved: ResolvedGuestSlot[] = [];
  for (const slot of guestSlots) {
    const guest = pickGuest(slot, guests);
    if (!guest) continue;
    resolved.push({ slot, guest });
  }

  // Never show an empty Guest Info section; fall back to the first slot's role.
  if (resolved.length === 0) {
    const slot = guestSlots[0];
    if (!slot) return [];
    const guest = guests[0] ?? placeholderGuest(opts?.fallbackSeed ?? 'room');
    resolved.push({
      slot,
      guest: {
        ...guest,
        imageUrl: guest.imageUrl ?? `https://i.pravatar.cc/96?u=${opts?.fallbackSeed ?? 'room'}-0`,
      },
    });
  }

  const firstBadge = resolved[0]?.guest?.vipCode?.toString();
  return resolved.map((entry) => ({
    ...entry,
    numberBadge:
      entry.slot.numberBadge === 'none'
        ? undefined
        : entry.slot.numberBadge === 'inheritFromFirst'
          ? entry.guest.vipCode?.toString() || firstBadge
          : entry.guest.vipCode?.toString(),
  }));
}
