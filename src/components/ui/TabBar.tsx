import React, { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Pressable, Text, View } from '@/tw';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';

/** What a label reported about itself at layout time, in device px. */
type LabelBox = { x: number; width: number };

export type TabBarProps<T extends string> = {
  tabs: readonly T[];
  activeTab: T;
  onTabPress: (tab: T) => void;
  /**
   * Rule width in design px, or `'label'` to take the active label's measured
   * width plus `ruleOverhang`.
   *
   * A number is right where the design fixes the rule independently of the word
   * (Room Detail, Tickets). `'label'` is right where it tracks the word: Lost &
   * Found (3128:32) puts a 68-wide rule under a 60-wide "Created", and the next
   * label starts 18px later — a fixed 68 under the 47-wide "Stored" would run
   * to x=186, which is exactly where "Returned" begins. Label-relative is the
   * only reading that survives all four tabs.
   */
  ruleWidth?: number | 'label';
  /**
   * Extra design px added to the measured label width when `ruleWidth` is
   * `'label'`. Ignored otherwise.
   */
  ruleOverhang?: number;
  /**
   * Whether the rule centres on the active label or starts at its left edge.
   *
   * Defaults to `'center'`, which is how Room Detail and Tickets draw it. Lost &
   * Found aligns left: node 3128:43 starts at x=32, the same x as the "Created"
   * label, and extends 8 past its right edge — not centred, which would put it
   * at x=28.
   */
  ruleAlign?: 'left' | 'center';
  ruleHeight?: number;
  ruleColor?: string;
  /**
   * Gap between the labels and the rule, in design px.
   *
   * Defaults to 0, which is how Room Detail draws it — the rule sits directly
   * under the label. Tickets (Figma 667-3068) separates them: the label box
   * ends at y=176 and `Rectangle 73` starts at y=189, so the rule reads as an
   * indicator below the row rather than an underline of the word.
   */
  ruleGap?: number;
  labelColor?: string;
  fontSize?: number;
  /**
   * Label for a tab, when the tab's value is a key rather than display text.
   * Room Detail's tabs are already their own labels; Tickets' are `myTickets`,
   * `all`, `open`, `closed`. Without this a caller would have to key the bar on
   * display strings and map back, which throws away the generic's whole point.
   */
  renderLabel?: (tab: T) => string;
  /**
   * A non-tab control at the end of the row — Lost & Found's search button
   * (node 3128:34).
   *
   * It is a child of the same `justify-between` row rather than a sibling of the
   * bar, because it takes part in the distribution: the four labels plus this
   * glyph span x=32..393, and it is what makes the spacing come out even.
   */
  trailing?: React.ReactNode;
  /**
   * How the labels share the row.
   *
   * `'between'` (the default) spreads them edge to edge, which is what Lost &
   * Found, Tickets and Room Detail all draw. Staff (3240:561) does not: its
   * labels sit at x=35/127/194 with gaps of 47 and 43 while the search glyph is
   * away at x=376 — a left-cluster with the trailing control pushed right, not
   * an even distribution. `justify-between` there would pull AM and PM across
   * the width and look plausible while being wrong.
   */
  distribute?: 'between' | 'start';
  /** Gap between labels in design px. Only read when `distribute` is `'start'`. */
  gap?: number;
  className?: string;
};

/**
 * A row of text tabs with a rule under the active one.
 *
 * Generic over the tab union so a screen keeps its own literal type all the way
 * through — `onTabPress` hands back `T`, not `string`, so a typo in a caller's
 * switch is a type error.
 *
 * **The rule is placed from a measurement, not an estimate.** What this replaces
 * guessed each label's width with a hard-coded number per label
 * (`estimatedTabWidth = 80 / 70 / 85 / 70` inside an IIFE) and centred the rule
 * on the guess. Those numbers only describe Helvetica at one size on a 440pt
 * frame: change the font, the text, the user's type size or the device width and
 * the rule sits off-centre with nothing to say it has. Here each label reports
 * its own box and the rule is derived from what it reported.
 *
 * The rule is hidden until the first layout lands. Otherwise it paints one frame
 * at `left: 0` — a visible flick to the screen's edge on mount.
 *
 * **On the spacing of the row.** Lost & Found's frame places its labels at
 * x=32/118/186/272 with gaps of 26/21/19, which reads as hand-positioning. It
 * is not a spec: labels plus the trailing glyph total 268 across a 361-wide
 * span, leaving 93 over four gaps — 23.25 each, within 3.75px of every gap the
 * frame draws. That is smaller than the difference Helvetica-vs-Roboto
 * introduces on Android for free, so `justify-between` reproduces the frame and
 * there is deliberately no prop for per-gap widths. Encoding 26/21/19 would
 * make drift into an API and would not survive a font change.
 */
export function TabBar<T extends string>({
  tabs,
  activeTab,
  onTabPress,
  ruleWidth = 92,
  ruleOverhang = 0,
  ruleAlign = 'center',
  ruleHeight = 4,
  ruleColor = '#334866',
  ruleGap = 0,
  labelColor = '#5a759d',
  fontSize = 16,
  renderLabel,
  trailing,
  distribute = 'between',
  gap = 0,
  className,
}: TabBarProps<T>) {
  /*
   * The whole box, not just the centre.
   *
   * This held `centres` alone, which is all a centred rule of fixed width
   * needs. A left-aligned or label-width rule needs the edge and the extent
   * too, and deriving those from a centre is impossible. The centre is now
   * derived from the box instead — the cheap direction.
   */
  const [boxes, setBoxes] = useState<Partial<Record<T, LabelBox>>>({});

  const measure = useCallback(
    (tab: T) => (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      setBoxes((prev) => {
        const seen = prev[tab];
        if (seen && seen.x === x && seen.width === width) return prev;
        return { ...prev, [tab]: { x, width } };
      });
    },
    []
  );

  const activeBox = boxes[activeTab];

  // Measured widths are already device px; `ruleWidth` and `ruleOverhang` are
  // design px and have to be scaled.
  const resolvedRuleWidth =
    ruleWidth === 'label'
      ? (activeBox?.width ?? 0) + ruleOverhang * scaleX
      : ruleWidth * scaleX;

  const ruleLeft =
    activeBox == null
      ? 0
      : ruleAlign === 'left'
        ? activeBox.x
        : activeBox.x + activeBox.width / 2 - resolvedRuleWidth / 2;

  return (
    <View className={className}>
      {/*
        The labels stay *direct* children of this row in both modes. Nesting the
        cluster in its own view would be the obvious way to give it a gap, but
        `onLayout` reports `x` relative to the parent, and the rule below is
        positioned in this container's space — so the rule would silently offset
        by the wrapper's own x. `marginLeft: 'auto'` on the trailing control
        pushes it to the end without adding a level.
      */}
      <View
        className={`flex-row items-center ${distribute === 'start' ? '' : 'justify-between'}`}
        style={distribute === 'start' && gap > 0 ? { gap: gap * scaleX } : undefined}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            onLayout={measure(tab)}
            onPress={() => onTabPress(tab)}
            hitSlop={{ top: 10, bottom: 10, left: 14, right: 14 }}
          >
            <Text
              style={{
                fontSize: fontSize * scaleX,
                fontFamily: typography.fontFamily.primary,
                fontWeight: (activeTab === tab
                  ? typography.fontWeights.bold
                  : typography.fontWeights.light) as never,
                color: labelColor,
              }}
            >
              {renderLabel ? renderLabel(tab) : tab}
            </Text>
          </Pressable>
        ))}
        {trailing != null && distribute === 'start' ? (
          <View style={{ marginLeft: 'auto' }}>{trailing}</View>
        ) : (
          trailing
        )}
      </View>

      {ruleGap > 0 ? <View style={{ height: ruleGap * scaleX }} /> : null}

      <View style={{ height: ruleHeight * scaleX }}>
        <View
          style={{
            position: 'absolute',
            left: ruleLeft,
            width: resolvedRuleWidth,
            height: ruleHeight * scaleX,
            backgroundColor: ruleColor,
            opacity: activeBox == null ? 0 : 1,
          }}
        />
      </View>
    </View>
  );
}

export default TabBar;
