import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View, Text, Pressable } from '@/tw';
import { Icon } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';
import type { StaffRosterPerson } from '../../types/staffRoster.types';
import StaffIdentityRow from '../staffList/StaffIdentityRow';
import { STAFF_ROOMS_LAYOUT as L, STAFF_ROOMS_CHROME as C } from './staffRoomsLayout';

interface StaffRoomsHeaderProps {
  person: StaffRosterPerson;
  onBackPress: () => void;
  /** Enters reassign mode (Figma 3831:99). */
  onReassignPress?: () => void;
  /**
   * False in reassign mode — node 3831:99 does not draw the pill.
   *
   * The pill is what *enters* the mode, so it has nothing left to say once you
   * are in it; Cancel in the footer is the way out. Hidden rather than
   * disabled, because a greyed control implies it might come back.
   */
  showReassign?: boolean;
}

/**
 * The band — Figma 3810:664: a back chevron, the person, and "Reassign Room".
 *
 * The middle of it is `StaffIdentityRow`, unchanged. The frame's group 5046
 * here and group 492 on the roster (4211:609) are **the same component**: the
 * same 32 avatar, the same 13 state dot hung off its corner, the same name over
 * department. Drawing it again is how this feature previously ended up with
 * three avatar implementations that disagreed about the same person's initials.
 *
 * **The identity stays 32 in reassign mode**, though 3831:99 draws it at 48.6.
 * Every dimension of that group — avatar, name, "HSK", the dot — is the 3810
 * value times 1.5185, which is a corner-handle resize rather than a decision,
 * and there is no reason for a person to grow when you start selecting rooms.
 * Change `L.header` if the design meant it.
 */
export default function StaffRoomsHeader({
  person,
  onBackPress,
  onReassignPress,
  showReassign = true,
}: StaffRoomsHeaderProps) {
  const insets = useSafeAreaInsets();
  const s = (n: number) => n * scaleX;

  return (
    <View
      className="flex-row items-center"
      style={{
        backgroundColor: C.headerBackground,
        paddingTop: insets.top + s(L.header.safeAreaGap),
        paddingBottom: s(L.header.paddingBottom),
        paddingHorizontal: s(L.gutter),
        gap: s(L.header.chevronToIdentity),
        // The pill sets the band's height, and keeps setting it once hidden;
        // see `header.contentMinHeight`.
        minHeight:
          insets.top +
          s(L.header.safeAreaGap + L.header.reassign.height + L.header.paddingBottom),
      }}
    >
      <Pressable
        onPress={onBackPress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Back"
        className="items-center justify-center"
        style={{ width: s(L.header.backChevron), height: s(L.header.backChevron) }}
      >
        {/* `action-chevron` already points left. */}
        <Icon name="action-chevron" size={s(L.header.backChevron)} color="#607aa1" />
      </Pressable>

      {/*
        `flex-1` on a wrapper, not on the row itself.

        `StaffIdentityRow` is `flex-row` with a `flex-1` name column inside it
        and no flex of its own, so dropped straight into this row it measured
        the whole remaining width and pushed the pill clean off the right edge —
        invisible, not clipped, because React Native does not clip by default.
        Bounding it here leaves the pill its 143 and still truncates a long name.
      */}
      <View className="flex-1">
        <StaffIdentityRow person={person} showChevron={false} subLines={2} />
      </View>

      {/* Node 3810:691 — absent from the reassign frame; see `showReassign`. */}
      {showReassign ? (
        <Pressable
          onPress={onReassignPress}
          disabled={!onReassignPress}
          accessibilityRole="button"
          accessibilityLabel="Reassign rooms"
          accessibilityState={{ disabled: !onReassignPress }}
          className="items-center justify-center"
          style={{
            width: s(L.header.reassign.width),
            height: s(L.header.reassign.height),
            // Never give up width to a long name; the name truncates instead.
            flexShrink: 0,
            borderRadius: s(L.header.reassign.radius),
            backgroundColor: C.reassignBackground,
          }}
        >
          <Text
            numberOfLines={1}
            className="font-hestia-primary"
            style={{
              fontSize: s(L.header.reassign.fontSize),
              fontFamily: typography.fontFamily.primary,
              color: C.reassignLabel,
            }}
          >
            Reassign Room
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
