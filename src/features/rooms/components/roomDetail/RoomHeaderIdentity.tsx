import React from 'react';
import { Text, View } from '@/tw';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import { ROOM_DETAIL_HEADER_LAYOUT as L } from './roomDetailHeaderLayout';

export type RoomHeaderIdentityProps = {
  roomNumber: string;
  roomCode: string;
  numberColor: string;
  /** Also the front-office label's colour — they are one design decision. */
  codeColor: string;
  flagged?: boolean;
  /** "Stayover", or nothing. Only Stayover rooms show one. */
  frontOfficeLabel?: string;
  showWithLinenBadge?: boolean;
};

/**
 * "Room 201" / "ST2K-1.4", plus the two badges that hang off them.
 *
 * Split out because it owns the header's only two *non-activity* conditionals —
 * the flag badge and the front-office line — and neither appears in the Paused
 * frame (2333-132). Keeping them here means the shell reads as an unbroken
 * column and "the paused header has neither" is one absent prop rather than two
 * nested conditionals buried in it.
 *
 * `showWithLinenBadge` is only meaningful alongside `frontOfficeLabel`: the
 * badge sits beside that word, so without it there is nothing to sit beside.
 * That was true of the old implementation too, silently; here it is the
 * nesting.
 */
export function RoomHeaderIdentity({
  roomNumber,
  roomCode,
  numberColor,
  codeColor,
  flagged = false,
  frontOfficeLabel,
  showWithLinenBadge = false,
}: RoomHeaderIdentityProps) {
  return (
    <>
      <View
        className="flex-row items-center justify-center"
        style={{ height: L.roomNumber.height * scaleX, gap: L.roomNumber.flagGap * scaleX }}
      >
        <Text
          style={{
            fontSize: L.roomNumber.fontSize * scaleX,
            fontFamily: typography.fontFamily.primary,
            fontWeight: typography.fontWeights.bold as never,
            color: numberColor,
          }}
        >
          Room {roomNumber}
        </Text>

        {flagged ? (
          <View
            className="items-center justify-center bg-white"
            style={{
              width: L.roomNumber.flagBadge * scaleX,
              height: L.roomNumber.flagBadge * scaleX,
              borderRadius: (L.roomNumber.flagBadge / 2) * scaleX,
            }}
          >
            {/* The outline variant: the 14x19 PNG this replaced had aspect
                0.737, which is outline's 0.718, not `action-flag`'s 1.18. */}
            <Icon name="action-flag-outline" size={12 * scaleX} color="#f92424" />
          </View>
        ) : null}
      </View>

      <View style={{ height: L.numberToCode * scaleX }} />

      <Text
        className="text-center"
        style={{
          height: L.roomCode.height * scaleX,
          fontSize: L.roomCode.fontSize * scaleX,
          fontFamily: typography.fontFamily.primary,
          fontWeight: typography.fontWeights.light as never,
          color: codeColor,
        }}
      >
        {roomCode}
      </Text>

      {frontOfficeLabel ? (
        <>
          <View style={{ height: L.codeToFrontOffice * scaleX }} />
          <View
            className="flex-row items-center justify-center"
            style={{ height: L.frontOffice.height * scaleX, gap: L.frontOffice.badgeGap * scaleX }}
          >
            <Text
              style={{
                fontSize: L.frontOffice.fontSize * scaleX,
                fontFamily: typography.fontFamily.primary,
                fontWeight: typography.fontWeights.bold as never,
                color: codeColor,
              }}
            >
              {frontOfficeLabel}
            </Text>
            {showWithLinenBadge ? (
              <View
                style={{
                  paddingHorizontal: 8 * scaleX,
                  paddingVertical: 2 * scaleX,
                  borderRadius: 6 * scaleX,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  borderWidth: 1,
                  borderColor: 'rgba(123, 31, 162, 0.7)',
                }}
              >
                <Text
                  style={{
                    fontSize: 12 * scaleX,
                    fontFamily: typography.fontFamily.primary,
                    fontWeight: typography.fontWeights.bold as never,
                    color: '#334866',
                  }}
                >
                  with Linen
                </Text>
              </View>
            ) : null}
          </View>
        </>
      ) : null}
    </>
  );
}

export default RoomHeaderIdentity;
