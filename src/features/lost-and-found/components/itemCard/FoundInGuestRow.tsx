import React, { useState } from 'react';
import { Text, View } from '@/tw';
import { Image } from '@/tw/image';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import { LOST_AND_FOUND_CARD_LAYOUT as L } from './lostAndFoundCardLayout';
import { MetaChip } from './MetaChip';

export type FoundInGuestRowProps = {
  guestName?: string;
  guestDates?: string;
  guestImage?: { uri: string } | number;
  /** Drives the red badge on the thumbnail. */
  guestVipCode?: string | null;
  /** Rendered as the small chip beside the name. */
  roomNumber?: string | null;
};

/** "Mr Mohamed" -> "MM"; "Mohamed" -> "M". */
function initialsFrom(name?: string): string {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase();
}

/**
 * The guest a room item was found against — Figma node 3871:3604.
 *
 * Thumbnail 34.588 square at radius 5 (3871:3607), a 14.118 red VIP disc
 * overlapping its bottom-right (3871:3608) carrying a 3.294-tall mirrored
 * arrow, then the name with the room chip beside it and the stay dates below.
 */
export function FoundInGuestRow({
  guestName,
  guestDates,
  guestImage,
  guestVipCode,
  roomNumber,
}: FoundInGuestRowProps) {
  /*
   * No effect resets this.
   *
   * It used to be cleared by a `useEffect` on [guestImage, guestName] — the
   * "reset state when a prop changes" shape, which React's own guidance says to
   * express as a remount instead, and which lint flags because a setState in an
   * effect body cascades a second render every time. The parent gives this row
   * a `key` derived from the same two values, so a different guest is a
   * different component and starts with a clean error state by construction.
   */
  const [thumbFailed, setThumbFailed] = useState(false);

  const thumb = L.guestThumb.size * scaleX;
  const disc = L.vipDisc.size * scaleX;

  /*
   * No generated portrait.
   *
   * This used to fall back to `i.pravatar.cc` seeded on the room and guest
   * name, which produced a stable but entirely invented face for a real guest.
   * The only portrait shown now is the one `guests.image_url` holds; without
   * one, the initials below are the answer.
   */

  return (
    <View className="flex-row items-center" style={{ gap: 12 * scaleX }}>
      <View style={{ width: thumb, height: thumb }}>
        {/* Android does not clip to borderRadius without overflow-hidden. */}
        <View
          className="items-center justify-center overflow-hidden bg-surface-secondary"
          style={{ width: thumb, height: thumb, borderRadius: L.guestThumb.radius * scaleX }}
        >
          {thumbFailed || !guestImage ? (
            <Text
              className="font-hestia-primary font-bold text-ink-accent"
              style={{ fontSize: thumb * 0.36, fontFamily: typography.fontFamily.primary }}
            >
              {initialsFrom(guestName)}
            </Text>
          ) : (
            <Image
              source={guestImage}
              style={{ width: thumb, height: thumb }}
              contentFit="cover"
              onError={() => setThumbFailed(true)}
            />
          )}
        </View>

        {guestVipCode ? (
          <View
            className="absolute items-center justify-center"
            style={{
              width: disc,
              height: disc,
              borderRadius: disc / 2,
              backgroundColor: L.vipDisc.color,
              right: -4 * scaleX,
              bottom: -4 * scaleX,
            }}
          >
            {/*
              `guest-arrow` points left and the badge points right, so this is a
              mirror of the mark the rooms list already uses — not a new export.
              The colour is mandatory: a tintable SVG with no `color` resolves
              `currentColor` to black, which on a red disc reads as a hole.
            */}
            <Icon
              name="guest-arrow"
              size={L.vipDisc.glyph * scaleX}
              color="#ffffff"
              style={{ transform: [{ scaleX: -1 }] }}
            />
          </View>
        ) : null}
      </View>

      <View className="shrink">
        <View className="flex-row items-center" style={{ gap: 8 * scaleX }}>
          {guestName ? (
            <Text
              className="shrink font-hestia-primary font-bold text-black"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ fontSize: 14 * scaleX, fontFamily: typography.fontFamily.primary }}
            >
              {guestName}
            </Text>
          ) : null}
          {roomNumber ? <MetaChip label={roomNumber} variant="room" /> : null}
        </View>
        {guestDates ? (
          <Text
            className="font-hestia-primary font-light text-black"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              fontSize: 14 * scaleX,
              fontFamily: typography.fontFamily.primary,
              marginTop: 4 * scaleX,
            }}
          >
            {guestDates}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default FoundInGuestRow;
