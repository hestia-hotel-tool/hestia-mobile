import React from 'react';
import { View, Text } from '@/tw';
import { Icon, type IconName } from '@/components/Icon';
import { typography } from '@/theme';
import { STATUS_CONFIGS, type RoomDisplayStatus } from '../../types/allRooms.types';
import { cardPx } from './roomCardLayout';

/**
 * The statuses Front Office caps, and the mark in each cap's white disc:
 * Figma 3859:2887 (pause ring, 27 with its stroke) and 3859:2437 (vacuum, 25.4).
 */
const CAPS: Partial<Record<RoomDisplayStatus, { label: string; icon: IconName; glyph: number }>> = {
  Paused: { label: 'Paused', icon: 'status-pause-circle-small', glyph: 27 },
  InProgress: { label: 'In Progress', icon: 'status-vacuum', glyph: 25.4 },
};

export function hasStatusCap(status: RoomDisplayStatus): boolean {
  return status in CAPS;
}

/**
 * Front Office's coloured cap over a Paused or In Progress card — Figma
 * 3859:2876 / 3859:2426: a 73 band in the status colour, a 50 white disc 29 in
 * holding the status mark in that colour, the status in bold 20 #f9fafc 13
 * after it, and a 1pt rule (#5a759d at 9%) between the cap and the card.
 *
 * The card's `overflow-hidden` rounds its top corners.
 */
export function StatusCap({ status }: { status: RoomDisplayStatus }) {
  const cap = CAPS[status];
  const colour = STATUS_CONFIGS[status]?.color;
  if (!cap || !colour) return null;
  return (
    <>
      <View
        className="flex-row items-center"
        style={{ height: cardPx(73), paddingLeft: cardPx(29), gap: cardPx(13), backgroundColor: colour }}
        accessibilityRole="header"
      >
        <View
          className="items-center justify-center rounded-full"
          style={{ width: cardPx(50), height: cardPx(50), backgroundColor: '#ffffff' }}
        >
          <Icon name={cap.icon} size={cardPx(cap.glyph)} color={colour} />
        </View>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: typography.fontFamily.primary,
            fontSize: cardPx(20),
            lineHeight: cardPx(23),
            fontWeight: '700',
            color: '#f9fafc',
          }}
        >
          {cap.label}
        </Text>
      </View>
      <View style={{ height: 1, marginHorizontal: cardPx(2), backgroundColor: 'rgba(90, 117, 157, 0.09)' }} />
    </>
  );
}

export default StatusCap;
