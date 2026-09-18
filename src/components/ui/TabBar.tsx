import React, { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Pressable, Text, View } from '@/tw';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';

export type TabBarProps<T extends string> = {
  tabs: readonly T[];
  activeTab: T;
  onTabPress: (tab: T) => void;
  /** Rule width in design px. The design fixes it rather than matching the label. */
  ruleWidth?: number;
  ruleHeight?: number;
  ruleColor?: string;
  labelColor?: string;
  fontSize?: number;
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
 * its own box and the rule centres on what it reported.
 *
 * The rule is hidden until the first layout lands. Otherwise it paints one frame
 * at `left: 0` — a visible flick to the screen's edge on mount.
 */
export function TabBar<T extends string>({
  tabs,
  activeTab,
  onTabPress,
  ruleWidth = 92,
  ruleHeight = 4,
  ruleColor = '#334866',
  labelColor = '#5a759d',
  fontSize = 16,
  className,
}: TabBarProps<T>) {
  const [centres, setCentres] = useState<Partial<Record<T, number>>>({});

  const measure = useCallback(
    (tab: T) => (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      const centre = x + width / 2;
      setCentres((prev) => (prev[tab] === centre ? prev : { ...prev, [tab]: centre }));
    },
    []
  );

  const activeCentre = centres[activeTab];
  const scaledRuleWidth = ruleWidth * scaleX;

  return (
    <View className={className}>
      <View className="flex-row items-center justify-between">
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
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ height: ruleHeight * scaleX }}>
        <View
          style={{
            position: 'absolute',
            left: activeCentre == null ? 0 : activeCentre - scaledRuleWidth / 2,
            width: scaledRuleWidth,
            height: ruleHeight * scaleX,
            backgroundColor: ruleColor,
            opacity: activeCentre == null ? 0 : 1,
          }}
        />
      </View>
    </View>
  );
}

export default TabBar;
