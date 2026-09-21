import React from 'react';
import { ActivityIndicator, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable, Text, View } from '@/tw';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import { LOST_AND_FOUND_SCREEN_LAYOUT as S } from '../constants/lostAndFoundScreenLayout';

export type LostAndFoundHeaderProps = {
  onBackPress?: () => void;
  onRegisterPress?: () => void;
  /** Non-blocking refetch — a small spinner beside the title, not an overlay. */
  syncing?: boolean;
  /** Reports the band's measured height so the status popover can clear it. */
  onHeightChange?: (height: number) => void;
};

/**
 * The Lost & Found band — Figma **3128:32**, nodes 3128:119 / 3128:121 /
 * 3128:120.
 *
 * **In the flow, not absolutely positioned.** This was three stacked absolute
 * layers — a container, a background and a "topSection" — each adding
 * `insets.top` to the frame's `top` values by hand. Two things were wrong with
 * that: the frame's y=69 already includes the status bar, so adding a 59pt
 * inset pushed the title to ~122pt; and every element below the header
 * (`LOST_AND_FOUND_TABS.container.top`, `contentPaddingTop: 213`) had to repeat
 * the same addition and stay in step by hand.
 *
 * Now the band pads by `insets.top + safeAreaGap` and everything below it is a
 * sibling in a column, so the gaps the frame specifies are the gaps in the
 * code. On an iPhone 16 Pro this reproduces the frame's 133 exactly; on a device
 * with no inset it is 74 and the content simply sits higher.
 */
export default function LostAndFoundHeader({
  onBackPress,
  onRegisterPress,
  syncing = false,
  onHeightChange,
}: LostAndFoundHeaderProps) {
  const insets = useSafeAreaInsets();

  const handleLayout = (event: LayoutChangeEvent) => {
    onHeightChange?.(event.nativeEvent.layout.height);
  };

  return (
    <View
      className="bg-surface-header"
      onLayout={onHeightChange ? handleLayout : undefined}
      style={{
        paddingTop: insets.top + S.safeAreaGap * scaleX,
        paddingBottom: S.header.bottomGap * scaleX,
        paddingLeft: 27 * scaleX,
        paddingRight: S.header.registerRight * scaleX,
      }}
    >
      <View className="flex-row items-center">
        <Pressable
          onPress={onBackPress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          {/* Node 3128:123 — 14x28; `action-chevron`'s aspect is exactly 0.5. */}
          <Icon name="action-chevron" size={S.header.backChevron * scaleX} color="#607AA1" />
        </Pressable>

        {/* Chevron ends at x=41, title starts at x=69. */}
        <Text
          className="font-hestia-primary font-bold"
          style={{
            marginLeft: 28 * scaleX,
            fontSize: S.header.titleFontSize * scaleX,
            fontFamily: typography.fontFamily.primary,
            color: '#607aa1',
          }}
        >
          Lost &amp; Found
        </Text>

        {syncing ? (
          <ActivityIndicator
            size="small"
            color="#607aa1"
            style={{ marginLeft: 10 * scaleX }}
          />
        ) : null}

        <View className="flex-1" />

        {/*
          Node 3128:120 is a single 95x28 text node — the "+" is a character in
          it, not a glyph, so this stays one Text with two weights rather than an
          icon beside a label.
        */}
        <Pressable
          onPress={onRegisterPress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Register a lost and found item"
        >
          <Text style={{ color: '#ff46a3', fontFamily: typography.fontFamily.primary }}>
            <Text
              style={{
                fontSize: S.header.registerPlusFontSize * scaleX,
                fontWeight: '700',
                fontFamily: typography.fontFamily.primary,
                color: '#ff46a3',
              }}
            >
              +{' '}
            </Text>
            <Text
              style={{
                fontSize: S.header.registerTextFontSize * scaleX,
                fontWeight: '300',
                fontFamily: typography.fontFamily.primary,
                color: '#ff46a3',
              }}
            >
              Register
            </Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
