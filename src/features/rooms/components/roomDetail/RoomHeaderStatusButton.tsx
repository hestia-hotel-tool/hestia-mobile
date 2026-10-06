import React from 'react';
import type { View as RNView } from 'react-native';
import { Pressable, Text, View } from '@/tw';
import { Icon, type IconName } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import { ROOM_DETAIL_HEADER_LAYOUT as L } from './roomDetailHeaderLayout';

/**
 * The mark beside the status label.
 *
 * `disc` is nullable because a bespoke mark is not always on one: Refused
 * Service and Promised Time sit on a tinted circle, but Return Later
 * (Figma 2333-312) is a bare glyph on the header's own ground. That was the
 * structural surprise in reading the frame — the old code drew a disc behind
 * all three because the 51x51 PNGs it replaced had one baked in.
 *
 * `glyph` is nullable for the same reason: a bare mark takes the header's
 * status colour, where a mark on a disc needs its own against that fill.
 */
export type StatusMarkSpec = {
  icon: IconName;
  /** Glyph height, in design units. */
  glyphHeight: number;
  /** The circle behind the glyph, or `null` for a bare mark. */
  disc: { color: string; size: number } | null;
  /** Glyph colour, or `null` to inherit the header's status colour. */
  glyph: string | null;
};

export type RoomHeaderStatusButtonProps = {
  label: string;
  /** The mark, however it is drawn. `null` for a status with none. */
  mark: StatusMarkSpec | null;
  /** Label, dropdown chevron and any mark that does not override it. */
  color: string;
  /** Paused, Return Later and Refused Service all draw the label bolder. */
  emphasis: 'regular' | 'strong';
  onPress?: () => void;
  measureRef?: React.Ref<RNView>;
};

/**
 * The status control in the detail header: mark, label, dropdown chevron.
 *
 * **Not `RoomStatusPill`.** That is a 134x70 control painting its own solid
 * ground; this is a transparent inline row sitting on the header's ground, and
 * it has to render the three overlay-disc states and the emphasised label,
 * neither of which `RoomDisplayStatus` can express. The one genuinely shared
 * idea — giving a rotated glyph an outer view that carries its rotated
 * footprint, because a transform does not change layout size — is copied from
 * [RoomStatusPill.tsx:129-134](../roomsList/RoomStatusPill.tsx#L129-L134) with
 * the citation, which is the right amount of sharing for six lines.
 */
export function RoomHeaderStatusButton({
  label,
  mark,
  color,
  emphasis,
  onPress,
  measureRef,
}: RoomHeaderStatusButtonProps) {
  return (
    <Pressable
      ref={measureRef}
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      className="flex-row items-center justify-center"
      style={{ height: L.statusRow.height * scaleX }}
    >
      {mark ? (
        <View
          className="items-center justify-center"
          style={{
            marginRight: L.statusRow.glyphGap * scaleX,
            ...(mark.disc
              ? {
                  width: mark.disc.size * scaleX,
                  height: mark.disc.size * scaleX,
                  borderRadius: (mark.disc.size / 2) * scaleX,
                  backgroundColor: mark.disc.color,
                }
              : null),
          }}
        >
          <Icon
            name={mark.icon}
            size={mark.glyphHeight * scaleX}
            color={mark.glyph ?? color}
          />
        </View>
      ) : null}

      <Text
        style={{
          fontSize: (emphasis === 'strong' ? 18 : L.statusRow.fontSize) * scaleX,
          fontFamily: 'Helvetica',
          fontWeight: emphasis === 'strong' ? '700' : '300',
          color,
        }}
      >
        {label}
      </Text>

      {/*
        The same `action-chevron` as the back button, turned to point down. The
        outer view keeps the rotated footprint so the row's spacing does not
        depend on the transform; `size` is the *unrotated* height, so a chevron
        of height N paints N wide and N/2 tall once turned.

        Drawn only when the row actually opens something. The chevron is the
        affordance, so rendering it without `onPress` advertises an action that
        does nothing — which is what a host reusing this header without a status
        sheet (the create-ticket form) looked like: a status row that read as
        tappable and was inert.
      */}
      {onPress ? (
        <View
          className="items-center justify-center"
          style={{
            width: L.statusRow.chevron * scaleX,
            height: (L.statusRow.chevron / 2) * scaleX,
            marginLeft: L.statusRow.chevronGap * scaleX,
          }}
        >
          <View style={{ transform: [{ rotate: '-90deg' }] }}>
            <Icon name="action-chevron" size={L.statusRow.chevron * scaleX} color={color} />
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

export default RoomHeaderStatusButton;
