import React from 'react';

import { View, Text } from '@/tw';
import { Icon } from '@/components/Icon';
import { ROOM_STATUS } from '@/components/ui/StatusCircle';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';
import type {
  StaffAssignedRoom,
  StaffAssignedTicket,
} from '../../types/staffRoster.types';
import { STAFF_LIST_LAYOUT as L } from './staffListLayout';

interface StaffAssignedRoomsProps {
  rooms: StaffAssignedRoom[];
  tickets: StaffAssignedTicket[];
  statKind: 'cleaning' | 'tickets';
}

/**
 * What "See rooms" reveals: every room this person holds this shift.
 *
 * **No frame draws these rows**, so the geometry follows the card's own rhythm
 * rather than inventing a new one, and the colour comes from `ROOM_STATUS` in
 * `ui/StatusCircle` — the canonical table that already carries the label,
 * glyph, tone class and glyph height for all four statuses. Nothing here
 * decides a colour.
 *
 * Deliberately **not** `roomsList/RoomStatusPill` or `GuestRow`, which would be
 * the obvious reuse: those are built on unscaled Tailwind plus `ROOM_CARD`
 * pixels, while this whole tree multiplies design units by `scaleX`. Dropping
 * them in would put two sizing conventions inside one card. The shared thing
 * worth sharing is the status table, and that is what is shared.
 *
 * **Rooms only, no guest per row.** The Current block above already names the
 * guest for the room being worked. Resolving a guest for every assigned room
 * in a department would mean a second `loadRoomPickerRoomsByIds` pass for
 * something the design never asks for.
 */
export default function StaffAssignedRooms({
  rooms,
  tickets,
  statKind,
}: StaffAssignedRoomsProps) {
  const s = (n: number) => n * scaleX;
  const A = L.assignedRooms;

  const isCleaning = statKind === 'cleaning';
  const items = isCleaning ? rooms : tickets;

  if (items.length === 0) {
    return (
      <Text
        className="font-hestia-primary text-ink-tertiary"
        style={{
          marginTop: s(A.marginTop),
          fontSize: s(A.fontSize),
          fontFamily: typography.fontFamily.primary,
        }}
      >
        {isCleaning ? 'No rooms assigned this shift.' : 'No tickets assigned.'}
      </Text>
    );
  }

  return (
    <View style={{ marginTop: s(A.marginTop), gap: s(A.rowGap) }}>
      <Text
        className="font-hestia-primary text-ink-tertiary"
        style={{
          fontSize: s(A.captionFontSize),
          fontFamily: typography.fontFamily.primary,
        }}
      >
        {isCleaning
          ? `${rooms.length} ${rooms.length === 1 ? 'room' : 'rooms'} this shift`
          : `${tickets.length} ${tickets.length === 1 ? 'ticket' : 'tickets'}`}
      </Text>

      {isCleaning
        ? rooms.map((room) => {
            const spec = ROOM_STATUS[room.status];
            return (
              <View
                key={room.roomId ?? room.roomNumber}
                className="flex-row items-center"
                style={{ gap: s(A.discToText) }}
              >
                <View
                  className={`items-center justify-center overflow-hidden rounded-full ${spec.toneClassName}`}
                  style={{ width: s(A.disc), height: s(A.disc) }}
                >
                  {/*
                    The glyph's own designed height, scaled down to fit this
                    disc — `ROOM_STATUS` sizes them for the 50pt status circle.
                  */}
                  {/* `StatusSpec.icon` is optional; the disc's tone already
                      carries the status if a glyph is ever missing. */}
                  {spec.icon ? (
                    <Icon
                      name={spec.icon}
                      size={s((spec.glyphHeight ?? 24) * 0.5)}
                      color={spec.glyphColor}
                    />
                  ) : null}
                </View>
                <Text
                  className="font-hestia-primary font-bold text-ink-primary"
                  style={{ fontSize: s(A.fontSize), fontFamily: typography.fontFamily.primary }}
                >
                  Room {room.roomNumber}
                </Text>
                <Text
                  className="flex-1 font-hestia-primary text-ink-tertiary"
                  numberOfLines={1}
                  style={{ fontSize: s(A.fontSize), fontFamily: typography.fontFamily.primary }}
                >
                  {room.isPaused ? 'Paused' : spec.label}
                </Text>
              </View>
            );
          })
        : tickets.map((ticket, index) => (
            <View
              key={`${ticket.title}-${index}`}
              className="flex-row items-center"
              style={{ gap: s(A.discToText) }}
            >
              <View
                className={`items-center justify-center rounded-full ${
                  ticket.isResolved ? 'bg-status-inspected' : 'bg-status-dirty'
                }`}
                style={{ width: s(A.disc), height: s(A.disc) }}
              >
                <Icon
                  name={ticket.isResolved ? 'action-check' : 'action-priority'}
                  size={s(12)}
                  color="#ffffff"
                />
              </View>
              <Text
                className="flex-1 font-hestia-primary text-ink-primary"
                numberOfLines={1}
                style={{ fontSize: s(A.fontSize), fontFamily: typography.fontFamily.primary }}
              >
                {ticket.title}
              </Text>
            </View>
          ))}
    </View>
  );
}
