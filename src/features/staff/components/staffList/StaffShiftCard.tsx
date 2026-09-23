import React from 'react';

import { View } from '@/tw';
import { scaleX } from '@/utils/responsive';
import type { StaffRosterPerson } from '../../types/staffRoster.types';
import StaffIdentityRow from './StaffIdentityRow';
import StaffWorkloadBar from './StaffWorkloadBar';
import StaffTaskStats from './StaffTaskStats';
import StaffCurrentRoom from './StaffCurrentRoom';
import StaffCardDisclosure from './StaffCardDisclosure';
import StaffAssignedRooms from './StaffAssignedRooms';
import { STAFF_LIST_LAYOUT as L } from './staffListLayout';

interface StaffShiftCardProps {
  person: StaffRosterPerson;
  isOpen: boolean;
  /** The closed row's bare chevron: opens the card in place. */
  onToggle: () => void;
  /**
   * The open card's "See rooms": leaves for the full list (Figma 3810:173).
   *
   * Two controls, not one, because the frame gives them two appearances. The
   * chevron alone expands; the words navigate. A single control that did both
   * would have to guess which the tap meant.
   */
  onSeeRooms: () => void;
  onStatusPress?: () => void;
}

/**
 * An On Shift entry, closed or open.
 *
 * **Closed** (node 4211:609) is an identity row with a bare chevron and *no
 * card background* — it reads as a row, which is what makes a roster of ten
 * people scannable. **Open** (node 3809:147) is the card: the "See rooms"
 * label appears beside the chevron, then workload, stats, a hairline, the
 * Current block and the rooms themselves.
 *
 * The frame's 218 height is not asserted — it falls out of this column, so a
 * wrapped guest name or a larger type size grows the card instead of clipping
 * it. The avatar grows 32 → 35 when open, which is the only thing the revised
 * frame changed about the identity row.
 *
 * Open state is owned by the screen, not held here: the roster reloads on
 * focus and on every department switch, and a card holding its own state would
 * silently collapse each time.
 *
 * Someone with nothing assigned gets the row with **no disclosure at all** and
 * can never reach the open branch — see `hasDisclosure`.
 */
export default function StaffShiftCard({
  person,
  isOpen,
  onToggle,
  onSeeRooms,
  onStatusPress,
}: StaffShiftCardProps) {
  const s = (n: number) => n * scaleX;
  const label = person.statKind === 'cleaning' ? 'See rooms' : 'See tickets';

  /*
   * No control for someone with nothing to show.
   *
   * "See rooms" on a person holding no rooms opens onto "No rooms assigned
   * this shift" — a tap that promises something and delivers an apology. The
   * roster entry still lists them, which is the answer to "who is on this
   * morning?"; it just does not offer to expand.
   *
   * Keyed on the list, not on `work.total`: the list is what the disclosure
   * actually reveals, so the two can never disagree.
   */
  const hasDisclosure =
    person.statKind === 'cleaning' ? person.rooms.length > 0 : person.ticketList.length > 0;

  if (!isOpen || !hasDisclosure) {
    return (
      <View
        style={{
          paddingVertical: s(L.collapsedRow.paddingVertical),
          paddingHorizontal: s(L.collapsedRow.paddingHorizontal),
        }}
      >
        <StaffIdentityRow
          person={person}
          showChevron={false}
          trailing={
            hasDisclosure ? (
              <StaffCardDisclosure
                isOpen={false}
                onPress={onToggle}
                label={label}
                showLabel={false}
              />
            ) : undefined
          }
        />
      </View>
    );
  }

  return (
    <View
      className="bg-surface-primary"
      style={{
        borderRadius: s(L.card.radius),
        paddingTop: s(L.card.paddingTop),
        paddingBottom: s(L.card.paddingBottom),
        paddingHorizontal: s(L.card.paddingHorizontal),
        // A clipped view casts no shadow, and a white card on a white page has
        // no edge without one.
        shadowColor: '#6483b0',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <StaffIdentityRow
        person={person}
        showChevron={false}
        avatarSize={L.identity.cardAvatar}
        trailing={<StaffCardDisclosure isOpen onPress={onSeeRooms} label={label} showLabel />}
      />

      {person.work ? (
        <>
          <StaffWorkloadBar work={person.work} />
          <StaffTaskStats work={person.work} />
        </>
      ) : null}

      {/*
        Node 3952:52 runs the full 401, so it cancels the card's horizontal
        padding with negative margins rather than sitting inside it.
      */}
      <View
        className="bg-border-medium"
        style={{
          height: s(L.card.dividerHeight),
          marginTop: s(L.current.dividerMarginTop),
          marginHorizontal: -s(L.card.paddingHorizontal),
        }}
      />

      <StaffCurrentRoom
        current={person.current}
        assignedCount={person.work?.total ?? 0}
        onStatusPress={onStatusPress}
      />

      <StaffAssignedRooms
        rooms={person.rooms}
        tickets={person.ticketList}
        statKind={person.statKind}
      />
    </View>
  );
}
