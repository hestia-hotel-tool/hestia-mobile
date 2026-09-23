import React from 'react';

import { View, Text } from '@/tw';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';
import type { StaffWorkload } from '../../types/staffRoster.types';
import { STAFF_LIST_LAYOUT as L } from './staffListLayout';

/**
 * The workload bar and its "3/7" — Figma 3809:148 / 3809:155.
 *
 * The frame draws three overlapping rounded rectangles; they are one track with
 * two proportional fills here, which is the same picture and survives any
 * ratio. Width is **flex**, not the frame's 335: the two bars this replaces
 * (`StaffCardProgressBar`, `rooms/WorkloadProgressBar`) both pinned a Figma
 * width and so could not sit in a card that stretches.
 *
 * With nothing assigned the track still draws, empty, and the count reads 0/0.
 * That is the "no task yet" state — a person with no work should look like a
 * person with no work, not like a missing component.
 */
export default function StaffWorkloadBar({ work }: { work: StaffWorkload }) {
  const s = (n: number) => n * scaleX;
  const total = Math.max(work.total, 0);
  const ratio = (n: number) => (total > 0 ? Math.min(Math.max(n / total, 0), 1) : 0);

  return (
    <View
      className="flex-row items-center"
      style={{ gap: s(L.workload.countGap), marginTop: s(L.workload.marginTop) }}
      accessibilityLabel={`${work.completed} of ${total} rooms done`}
    >
      {/*
        One fill, not two.
        
        A first pass split this into a green "completed" and a yellow
        "in progress" segment. The frame does neither: sampling node 3809:148
        gives `#5a759d` across both of its filled rectangles and `#cdd3dd` for
        the remainder. Nothing is lost by matching it — the stats row directly
        underneath already reads "Inprogress. 1".
      */}
      <View
        className="flex-1 flex-row overflow-hidden"
        style={{
          height: s(L.workload.height),
          borderRadius: s(L.workload.radius),
          backgroundColor: L.workload.trackColor,
        }}
      >
        <View style={{ flex: ratio(work.completed), backgroundColor: L.workload.fillColor }} />
        <View style={{ flex: Math.max(1 - ratio(work.completed), 0) }} />
      </View>
      <Text
        className="font-hestia-primary font-bold text-ink-secondary"
        style={{ fontSize: s(L.workload.countFontSize), fontFamily: typography.fontFamily.primary }}
      >
        {work.completed}/{total}
      </Text>
    </View>
  );
}
