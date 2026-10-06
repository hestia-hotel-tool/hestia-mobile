import React from 'react';
import { StyleSheet } from 'react-native';
import { View, Text, Pressable } from '@/tw';

/**
 * Measured from Figma node 2702:3472.
 *
 * Fractional and fixed rather than derived from flex, because the control has an
 * intrinsic size in the design and the thumb is deliberately wider than half the
 * track — 64.612 of 121 is 53.4%. Letting the two halves size themselves put the
 * divide in the wrong place and made the whole control ~11px too wide.
 */
const TRACK_WIDTH = 121;
const TRACK_HEIGHT = 35.243;
const THUMB_WIDTH = 64.612;
const THUMB_HEIGHT = 30.544;
const INSET = (TRACK_HEIGHT - THUMB_HEIGHT) / 2; // 2.35

const geometry = StyleSheet.create({
  track: { width: TRACK_WIDTH, height: TRACK_HEIGHT },
  thumb: {
    position: 'absolute',
    top: INSET,
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
  },
  thumbStart: { left: INSET },
  thumbEnd: { right: INSET },
  labels: { paddingHorizontal: INSET },
  /** First label sits over the thumb, so it takes the thumb's width. */
  firstLabel: { width: THUMB_WIDTH },
});

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

export type SegmentedToggleProps<T extends string> = {
  options: readonly [SegmentedOption<T>, SegmentedOption<T>];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

/**
 * Two-option pill switch — Figma node 2702:3472, used for the AM/PM shift.
 *
 * The thumb is a sibling behind the labels rather than a background on the
 * active one: it keeps its width in both positions, which is what the design
 * shows, and a background on the active child would have to shrink to whatever
 * that child measured.
 *
 * Generalised from the old AMPMToggle, which hardcoded the two shift labels.
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedToggleProps<T>) {
  const activeIndex = options[1].value === value ? 1 : 0;

  return (
    <View
      className={`justify-center rounded-full bg-surface-primary ${className ?? ''}`}
      style={geometry.track}
    >
      <View
        className="rounded-full bg-primary"
        style={[geometry.thumb, activeIndex === 0 ? geometry.thumbStart : geometry.thumbEnd]}
      />

      <View className="flex-row items-center" style={geometry.labels}>
        {options.map((option, index) => {
          const active = index === activeIndex;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option.label}
              className={index === 0 ? 'items-center justify-center' : 'flex-1 items-center justify-center'}
              style={index === 0 ? geometry.firstLabel : undefined}
            >
              <Text
                className={`font-hestia-primary text-hestia-lg ${
                  active ? 'font-bold text-ink-white' : 'font-light text-ink-light'
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
