import React, { useId, useState } from 'react';
import { View, Text, type TextStyle, type StyleProp } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

export type GradientTextProps = {
  text: string;
  /** Font size / family / weight are read from here; colour is the gradient. */
  textStyle?: StyleProp<TextStyle>;
  /** Defaults to the AI mark's pink→blue. */
  colors?: readonly [string, string];
  /**
   * Gradient axis. `diagonal` is what the two copies this was promoted from
   * used, so it stays the default and their rendering is unchanged. Figma
   * 667-3068 node 3005:63 specifies `to-b`, so the Tickets header passes
   * `vertical` — the only consumer whose axis has actually been read off a frame.
   */
  direction?: 'diagonal' | 'vertical';
};

/**
 * Text painted with a linear gradient.
 *
 * React Native cannot fill glyphs with a gradient, so the text is drawn twice:
 * once as a plain `<Text>` to measure its width, then as `<SvgText>` with a
 * gradient fill once that width is known. The plain pass is also the fallback,
 * so the label is readable on the first frame rather than missing.
 *
 * Promoted from two copies that had drifted: `GradientText` inside
 * `TicketForm.tsx` and `DescriptionAIGradientLabel` inside
 * `CreateTicketFormScreen.tsx`, which differed only in the gradient's height
 * multiplier and in hard-coding "AI" as its content.
 *
 * The gradient id comes from `useId()`, not `Math.random()`. Two of these
 * co-render on the Tickets tab, and colliding ids make the second instance
 * silently adopt the first one's gradient.
 */
export function GradientText({
  text,
  textStyle,
  colors = ['#ff46a3', '#4a91fc'],
  direction = 'diagonal',
}: GradientTextProps) {
  const [width, setWidth] = useState(0);
  const gradientId = `gradient-text-${useId()}`;

  const flat = (textStyle ?? {}) as TextStyle;
  const fontSize = typeof flat.fontSize === 'number' ? flat.fontSize : 16;

  return (
    <View
      style={{ alignItems: 'center' }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityLabel={text}
    >
      {width > 0 ? (
        <Svg width={width} height={fontSize * 1.5}>
          <Defs>
            <LinearGradient
              id={gradientId}
              x1="0"
              y1="0"
              x2={direction === "vertical" ? "0" : "1"}
              y2="1"
            >
              <Stop offset="0" stopColor={colors[0]} />
              <Stop offset="1" stopColor={colors[1]} />
            </LinearGradient>
          </Defs>
          <SvgText
            x={width / 2}
            y={fontSize * 1.2}
            textAnchor="middle"
            fontSize={fontSize}
            fontFamily={flat.fontFamily}
            fontWeight={flat.fontWeight as string | undefined}
            fill={`url(#${gradientId})`}
          >
            {text}
          </SvgText>
        </Svg>
      ) : (
        <Text style={textStyle}>{text}</Text>
      )}
    </View>
  );
}

export default GradientText;
