import React from 'react';

import { View, Text, Pressable } from '@/tw';
import { typography } from '@/theme';
import { Icon } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import type { StaffRosterPerson, StaffWorkload } from '../../types/staffRoster.types';
import StaffIdentityRow from './StaffIdentityRow';
import StaffWorkloadBar from './StaffWorkloadBar';
import StaffTaskStats from './StaffTaskStats';
import StaffCardDisclosure from './StaffCardDisclosure';
import { STAFF_LIST_LAYOUT as L } from './staffListLayout';

/** The Activity of someone with nothing assigned: every count 0. */
const NO_WORK: StaffWorkload = { total: 0, completed: 0, inProgress: 0, cleaned: 0, dirty: 0 };

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
  /** "View Details": the person's Activity screen (Figma 4319-648). */
  onViewDetails: () => void;
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
 * Everyone opens, from anywhere on the row; someone with nothing assigned
 * shows the Activity at zero.
 */
export default function StaffShiftCard({
  person,
  isOpen,
  onToggle,
  onSeeRooms,
  onViewDetails,
}: StaffShiftCardProps) {
  const s = (n: number) => n * scaleX;
  const label = person.statKind === 'cleaning' ? 'See rooms' : 'See tickets';

  /*
   * Closed: the identity row, tapped anywhere to open. Everyone opens — with
   * nothing assigned the card shows its Activity at zero, which answers
   * "what is this person doing?" as well as a full one does.
   */
  if (!isOpen) {
    return (
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={`${person.name}, show activity`}
        accessibilityState={{ expanded: false }}
        style={{
          paddingVertical: s(L.collapsedRow.paddingVertical),
          paddingHorizontal: s(L.collapsedRow.paddingHorizontal),
        }}
      >
        <StaffIdentityRow person={person} showChevron />
      </Pressable>
    );
  }

  const work = person.work ?? NO_WORK;

  return (
    // The whole card closes it; the controls inside (See rooms, View Details,
    // a room's status) take their own taps first.
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={`${person.name}, hide activity`}
      accessibilityState={{ expanded: true }}
      style={{
        borderRadius: s(L.card.radius),
        borderWidth: 1,
        borderColor: '#e3e3e3',
        backgroundColor: '#f9fafc',
        paddingTop: s(L.card.paddingTop),
        paddingBottom: s(L.card.paddingBottom),
        paddingHorizontal: s(L.card.paddingHorizontal),
      }}
    >
      <StaffIdentityRow
        person={person}
        showChevron={false}
        avatarSize={L.identity.cardAvatar}
        dotSize={L.identity.cardDot}
        trailing={<StaffCardDisclosure isOpen onPress={onSeeRooms} label={label} showLabel />}
      />

      {/* Always: zeros for someone with nothing assigned. */}
      {work ? (
        <>
          {/* 4319:105 — "Activity", bold 14. */}
          <Text
            className="font-hestia-primary font-bold text-black"
            style={{
              marginTop: s(L.activity.headingMarginTop),
              fontSize: s(L.activity.headingFontSize),
              fontFamily: typography.fontFamily.primary,
            }}
          >
            Activity
          </Text>

          {/* 4319:106 — the grey panel: bar, counts, and View Details. */}
          <View
            style={{
              marginTop: s(L.activity.panelMarginTop),
              borderRadius: s(L.activity.panelRadius),
              backgroundColor: L.activity.panelFill,
              paddingTop: s(L.activity.panelPaddingTop),
              paddingHorizontal: s(L.activity.panelPaddingHorizontal),
              paddingBottom: s(L.activity.panelPaddingBottom),
            }}
          >
            <StaffWorkloadBar work={work} />
            <StaffTaskStats work={work} />
            <Pressable
              onPress={onViewDetails}
              hitSlop={8}
              style={{ marginTop: s(L.activity.linkMarginTop), alignSelf: 'flex-start' }}
              accessibilityRole="button"
              accessibilityHint="Opens their activity for today"
            >
              <Text
                className="font-hestia-primary"
                style={{
                  fontSize: s(L.activity.linkFontSize),
                  fontFamily: typography.fontFamily.primary,
                  fontWeight: '300',
                  color: '#5a759d',
                }}
              >
                View Details
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {/* The way back: an up-chevron, centred, that closes the card. */}
      <View className="items-center" style={{ marginTop: s(10) }} pointerEvents="none">
        <View style={{ transform: [{ rotate: '90deg' }] }}>
          <Icon name="action-chevron" size={s(16)} color="#9aa7bd" />
        </View>
      </View>
    </Pressable>
  );
}
