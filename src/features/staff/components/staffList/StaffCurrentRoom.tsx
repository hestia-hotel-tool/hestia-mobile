import React from 'react';

import { Image } from '@/tw/image';
import { View, Text, Pressable } from '@/tw';
import { Icon } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';
import { getInitialsFromFullName } from '@/utils/formatting';
import ElapsedTimer from '../ElapsedTimer';
import type { StaffCurrentAssignment } from '../../types/staffRoster.types';
import { STAFF_LIST_LAYOUT as L } from './staffListLayout';

interface StaffCurrentRoomProps {
  current?: StaffCurrentAssignment;
  /**
   * How many rooms they hold, regardless of whether one is open.
   *
   * "No rooms assigned" and "rooms assigned, none started" are different facts
   * and need different words — conflating them produced a card reading
   * "Dirty. 1" directly above "No rooms assigned yet".
   */
  assignedCount: number;
  onStatusPress?: () => void;
}

/**
 * The "Current" block — the room this person is standing in, with its guest.
 *
 * Nodes 3952:67 (caption), 3952:70 (49px thumb), 3952:77 / 3952:96 (room and
 * guest), 3952:97 (elapsed), 3952:86 (the yellow pill).
 *
 * **When `current` is absent this is the empty state**, not a hidden component.
 * Per the decision on this refactor, a person with nothing assigned keeps their
 * card and their place among colleagues — a supervisor scanning the list needs
 * to see the idle person, and dropping them to a compact row would make idle
 * indistinguishable from off-shift.
 */
export default function StaffCurrentRoom({
  current,
  assignedCount,
  onStatusPress,
}: StaffCurrentRoomProps) {
  const s = (n: number) => n * scaleX;

  if (!current) {
    return (
      <Text
        className="font-hestia-primary text-ink-tertiary"
        style={{
          fontSize: s(L.current.guestFontSize),
          fontFamily: typography.fontFamily.primary,
          marginTop: s(L.current.rowMarginTop),
        }}
      >
        {assignedCount > 0
          ? `${assignedCount} ${assignedCount === 1 ? 'room' : 'rooms'} assigned — not started yet`
          : 'No rooms assigned yet'}
      </Text>
    );
  }

  const guestName = current.guest?.fullName?.trim();
  const photo = current.guest?.imageUrl;

  return (
    <View>
      {/* Node 3952:67. Declared in the layout table from the start and then
          never rendered — caught by putting the two cards side by side. */}
      <Text
        className="font-hestia-primary"
        style={{
          marginTop: s(L.current.captionMarginTop),
          fontSize: s(L.current.captionFontSize),
          fontFamily: typography.fontFamily.primary,
          color: L.current.captionColor,
        }}
      >
        Current
      </Text>
      <View
        className="flex-row items-center"
        style={{ gap: s(L.current.thumbToText), marginTop: s(L.current.rowMarginTop) }}
      >
      <View className="relative">
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={{
              width: s(L.current.thumb),
              height: s(L.current.thumb),
              borderRadius: s(L.current.thumbRadius),
            }}
          />
        ) : (
          /*
            Initials, never a synthesised portrait. A placeholder face here
            would be attached to a named, real guest.
          */
          <View
            className="items-center justify-center overflow-hidden bg-ink-accent"
            style={{
              width: s(L.current.thumb),
              height: s(L.current.thumb),
              borderRadius: s(L.current.thumbRadius),
            }}
          >
            <Text
              className="font-hestia-primary font-bold text-ink-white"
              style={{ fontSize: s(15), fontFamily: typography.fontFamily.primary }}
            >
              {getInitialsFromFullName(guestName ?? '')}
            </Text>
          </View>
        )}

        {current.guest?.vipCode ? (
          <View
            className="absolute items-center justify-center rounded-full bg-status-dirty"
            style={{
              right: s(-6),
              bottom: s(-6),
              width: s(L.current.vipDisc),
              height: s(L.current.vipDisc),
            }}
          >
            {/* `guest-arrow` points left; the badge points right. */}
            <Icon
              name="guest-arrow"
              size={s(L.current.vipArrow)}
              color="#ffffff"
              style={{ transform: [{ scaleX: -1 }] }}
            />
          </View>
        ) : null}
      </View>

      <View className="flex-1" style={{ gap: s(L.current.lineGap) }}>
        <Text
          className="font-hestia-primary font-bold text-ink-primary"
          numberOfLines={1}
          style={{ fontSize: s(L.current.roomFontSize), fontFamily: typography.fontFamily.primary }}
        >
          Room {current.roomNumber}
        </Text>
        {guestName ? (
          <Text
            className="font-hestia-primary text-ink-secondary"
            numberOfLines={1}
            style={{ fontSize: s(L.current.guestFontSize), fontFamily: typography.fontFamily.primary }}
          >
            {guestName}
          </Text>
        ) : null}
        <View className="flex-row items-center" style={{ gap: s(4) }}>
          <Text
            className="font-hestia-primary text-ink-tertiary"
            style={{ fontSize: s(L.current.elapsedFontSize), fontFamily: typography.fontFamily.primary }}
          >
            Time
          </Text>
          {/*
            `ElapsedTimer` already counts up from a start and down against a
            credit; reimplementing the tick here would be a second clock to keep
            correct.
          */}
          <ElapsedTimer
            startTimeIso={current.startTimeIso}
            countdownFromMins={current.creditMins}
            paused={current.isPaused}
            style={{
              fontSize: s(L.current.elapsedFontSize),
              fontFamily: typography.fontFamily.primary,
            }}
          />
        </View>
      </View>

      <Pressable
        onPress={onStatusPress}
        disabled={!onStatusPress}
        accessibilityRole="button"
        accessibilityLabel={`Change status for room ${current.roomNumber}`}
        className="flex-row items-center justify-center bg-status-in-progress"
        style={{
          width: s(L.current.pill.width),
          height: s(L.current.pill.height),
          borderRadius: s(L.current.pill.radius),
          gap: s(6),
        }}
      >
        <Icon name="status-in-progress" size={s(L.current.pill.glyph)} color="#ffffff" />
        <View style={{ transform: [{ rotate: '-90deg' }] }}>
          <Icon name="action-chevron" size={s(L.current.pill.chevron)} color="#ffffff" />
        </View>
        </Pressable>
      </View>
    </View>
  );
}
