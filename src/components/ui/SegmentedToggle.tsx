import React from 'react';
import { View, Text, Pressable } from '@/tw';

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
 * Generalised from the old AMPMToggle, which hardcoded the two shift labels,
 * pinned a 121x35.243 track and repositioned the thumb by swapping
 * `left: 'auto'` for a right offset. Here the two halves are flex children, so
 * the thumb lands correctly whatever the labels are and whatever the track
 * width ends up being.
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedToggleProps<T>) {
  return (
    <View
      className={`h-[35px] flex-row items-center rounded-full bg-surface-primary p-[2px] ${className ?? ''}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            className={`h-[31px] flex-1 items-center justify-center rounded-full px-lg ${
              active ? 'bg-primary' : ''
            }`}
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
  );
}
