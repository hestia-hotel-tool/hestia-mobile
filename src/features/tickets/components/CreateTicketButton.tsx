import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { typography, colors } from '@/theme';
import { GradientText } from '@/components/ui/GradientText';

/** Canvas margin, in design units, so the stroke is never clipped by the viewport edge. */
const PAD = 2;

export type CreateTicketButtonProps = {
  onPress?: () => void;
  /** Design-frame scale. The caller owns it while the header is still on `* scaleX`. */
  scaleX: number;
};

/**
 * The "Create Ticket AI" control in the Tickets header.
 *
 * Replaces `CreateTicketAI.png`, which was a 152x74 raster of something the
 * design never treats as an image. Figma 667-3068 node 3005:59 builds it from
 * four primitives, all of which the app already has:
 *
 *   - a 152x60 rounded rect (rx 29.5, a true stadium) with a **gradient stroke**, from
 *     `border.aiPanelStart` to `border.aiPanelEnd` — the same two tokens the AI
 *     panel border uses;
 *   - the label in Helvetica Bold 16 `#5a759d`;
 *   - a plain white 29x30 disc (the exported asset is literally
 *     `<ellipse fill="white"/>`, so it is a `View` with a radius, not a file);
 *   - "AI" in the pink-to-blue gradient `GradientText` already draws.
 *
 * The stroke is the only part needing SVG: React Native cannot paint a gradient
 * border, so it is one `<Rect>` with `fill="none"` and a gradient stroke.
 */
export default function CreateTicketButton({ onPress, scaleX }: CreateTicketButtonProps) {
  const w = 152 * scaleX;
  const pillH = 60 * scaleX;
  const badge = 29 * scaleX;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Create ticket with AI"
      style={{ width: w, height: 74 * scaleX }}
    >
      {/*
        Node 3005:61, transcribed from the design's own export rather than
        rebuilt from its rendered appearance:

          <rect x="0.5" y="0.5" width="151" height="59" rx="29.5"
                stroke="url(#paint0_linear_3005_61)"/>
          <linearGradient x1="76" y1="0" x2="76" y2="60"
                          gradientUnits="userSpaceOnUse">
            <stop stop-color="#FF4DD8"/><stop offset="1" stop-color="#3BC1F6"/>

        Kept in design units behind a `viewBox` so these are literally the
        export's numbers and `scaleX` only ever touches the rendered size. The
        0.5 inset and 151x59 box are the default 1-unit stroke's half-width, so
        the pill's outer edge is exactly 152x60.

        The viewBox is padded by PAD on every side. Without that the stroke's
        outer half sits on the viewport edge and is clipped: the straight bottom
        run rendered as a washed-out `#d6eafd` hairline instead of `#3bc1f6`,
        while the curved ends — which pull inside the boundary — looked correct.
      */}
      <Svg
        width={(152 + 2 * PAD) * scaleX}
        height={(60 + 2 * PAD) * scaleX}
        viewBox={`${-PAD} ${-PAD} ${152 + 2 * PAD} ${60 + 2 * PAD}`}
        style={{ position: 'absolute', left: -PAD * scaleX, top: -PAD * scaleX }}
      >
        <Defs>
          <LinearGradient
            id="createTicketStroke"
            x1="76"
            y1="0"
            x2="76"
            y2="60"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={colors.border.aiPanelStart} />
            <Stop offset="1" stopColor={colors.border.aiPanelEnd} />
          </LinearGradient>
        </Defs>
        <Rect
          x={0.5}
          y={0.5}
          width={151}
          height={59}
          rx={29.5}
          fill="none"
          stroke="url(#createTicketStroke)"
        />
      </Svg>

      <View style={{ height: pillH, alignItems: 'center', justifyContent: 'center' }}>
        <Text
          style={{
            fontSize: 16 * scaleX,
            fontFamily: typography.fontFamily.primary,
            fontWeight: '700',
            color: colors.text.accent,
          }}
        >
          Create Ticket
        </Text>
      </View>

      {/* Node 3005:62 — white disc at inset (99, 44), straddling the pill's edge. */}
      <View
        style={{
          position: 'absolute',
          left: 99 * scaleX,
          top: 44 * scaleX,
          width: badge,
          height: 30 * scaleX,
          borderRadius: badge / 2,
          backgroundColor: colors.text.white,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <GradientText
          text="AI"
          direction="vertical"
          textStyle={{
            fontSize: 12 * scaleX,
            fontFamily: typography.fontFamily.primary,
            fontWeight: '700',
          }}
        />
      </View>
    </TouchableOpacity>
  );
}
