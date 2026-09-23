import React from 'react';

import { View, Text } from '@/tw';
import { Avatar } from '@/components';
import { Icon } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';
import type { StaffRosterPerson } from '../../types/staffRoster.types';
import { SHIFT_GROUP_CHROME } from './staffShiftChrome';
import { STAFF_LIST_LAYOUT as L } from './staffListLayout';

interface StaffIdentityRowProps {
  person: StaffRosterPerson;
  /** Hidden where the row's trailing slot carries its own control. */
  showChevron?: boolean;
  /**
   * 32 by default (nodes 3240:645 / 4211:612). The open card uses 35
   * (4211:617) — the one thing the revised frame changed here.
   */
  avatarSize?: number;
  /** Replaces the chevron: the card puts its disclosure control here. */
  trailing?: React.ReactNode;
  /**
   * How many lines the job title may take. One in a list; two in the Staff
   * Rooms header, where the "Reassign Room" pill leaves it about half the
   * width and real titles ("Housekeeping Public Area Attendant") lose most of
   * themselves to an ellipsis.
   */
  subLines?: number;
}

/**
 * Avatar, state dot, name, department — the row both the On Shift card and the
 * compact row open with (nodes 3810:682 and 3240:643, the same construction at
 * the same 32px).
 *
 * One component for both, because they *are* the same: drawing them twice is
 * how this feature ended up with three avatar implementations and two different
 * colour-hash functions for the same person's initials.
 */
export default function StaffIdentityRow({
  person,
  showChevron = true,
  avatarSize = L.identity.avatar,
  trailing,
  subLines = 1,
}: StaffIdentityRowProps) {
  const s = (n: number) => n * scaleX;
  const chrome = SHIFT_GROUP_CHROME[person.state];

  return (
    <View className="flex-row items-center" style={{ gap: s(L.identity.avatarToText) }}>
      <View className="relative">
        {/*
          `ui/Avatar` rather than a local initials disc. It already does
          first+last initials on a filled accent disc; the three hand-rolled
          versions in this feature disagreed with each other on the same name.
        */}
        <Avatar uri={person.avatarUrl} name={person.name} size={s(avatarSize)} />
        <View
          className="absolute rounded-full border-2 border-surface-primary"
          style={{
            right: s(L.identity.dotOffset.right),
            bottom: s(L.identity.dotOffset.bottom),
            width: s(L.identity.dot),
            height: s(L.identity.dot),
            backgroundColor: chrome.color,
          }}
          // The dot repeats the group heading, so it is decoration to a screen
          // reader that has just heard "On Shift".
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>

      <View className="flex-1" style={{ gap: s(L.identity.nameToSub) }}>
        <Text
          className="font-hestia-primary font-bold text-ink-primary"
          numberOfLines={1}
          style={{ fontSize: s(L.identity.nameFontSize), fontFamily: typography.fontFamily.primary }}
        >
          {person.name}
        </Text>
        {/*
          The person's **job title** — "Senior Supervisor", "Room Attendant" —
          not their department.

          The frame writes "HSK" here, and this read `departmentName` first to
          match it. But every list this row appears in is already filtered to
          one department: the roster is entered through a department chip, and
          the Staff Rooms header belongs to the person you just tapped there.
          Repeating it captions nine people "Housekeeping" and distinguishes
          none of them, which is the same fault `mapUserRowToUser` was fixed for
          in the staff pickers.

          `departmentName` stays as the fallback for the one seeded user with no
          `job_title_id`; an empty line under a name reads as a loading failure.
        */}
        <Text
          className="font-hestia-primary text-ink-tertiary"
          numberOfLines={subLines}
          style={{ fontSize: s(L.identity.subFontSize), fontFamily: typography.fontFamily.primary }}
        >
          {person.jobTitle ?? person.departmentName ?? ''}
        </Text>
      </View>

      {trailing}

      {showChevron && !trailing ? (
        /* `action-chevron` points left; the frame's points right. */
        <View style={{ transform: [{ rotate: '180deg' }] }}>
          <Icon name="action-chevron" size={s(L.identity.chevron)} color="#c9c9d0" />
        </View>
      ) : null}
    </View>
  );
}
