import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '@/theme';
import {
  STAFF_SHIFT_CALENDAR,
  STAFF_SHIFT_DAY_COLORS,
  STAFF_SHIFT_DAY_NEUTRAL,
} from '../constants/staffStyles';

const WEEKDAYS = ['Su', 'M', 'T', 'W', 'Th', 'F', 'S'] as const;

function hashStaffDay(staffId: string, y: number, m: number, d: number): number {
  const s = `${staffId}|${y}|${m}|${d}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) || 0;
  }
  return Math.abs(h);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Past and today get a stable pseudo-random shift color; future days use neutral (current / future months). */
function shouldUseNeutralFill(y: number, m: number, day: number): boolean {
  const target = new Date(y, m, day);
  const today = startOfLocalDay(new Date());
  const monthStart = new Date(y, m, 1);
  const monthEnd = new Date(y, m + 1, 0);
  if (monthEnd < today) return false;
  if (monthStart > today) return true;
  return target > today;
}

function buildMonthGrid(year: number, month: number): (number | null)[][] {
  const firstDow = new Date(year, month, 1).getDay();
  const dim = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

type StaffShiftMonthCalendarProps = {
  staffId: string;
  scaleX: number;
};

export default function StaffShiftMonthCalendar({ staffId, scaleX }: StaffShiftMonthCalendarProps) {
  const now = new Date();
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const monthLabel = useMemo(
    () =>
      cursor.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [cursor]
  );

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const sx = scaleX;
  const circleSize = STAFF_SHIFT_CALENDAR.dayCircle.size * sx;
  const dayFont = STAFF_SHIFT_CALENDAR.dayCircle.fontSize * sx;

  const goPrev = () => {
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const goNext = () => {
    setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={goPrev} hitSlop={12} style={styles.navHit}>
          <Ionicons name="chevron-back" size={22 * sx} color="#5a759d" />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { fontSize: STAFF_SHIFT_CALENDAR.monthTitle.fontSize * sx }]}>
          {monthLabel}
        </Text>
        <TouchableOpacity onPress={goNext} hitSlop={12} style={styles.navHit}>
          <Ionicons name="chevron-forward" size={22 * sx} color="#5a759d" />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((w) => (
          <View key={w} style={styles.weekdayCell}>
            <Text
              style={[
                styles.weekdayText,
                { fontSize: STAFF_SHIFT_CALENDAR.weekdayLabel.fontSize * sx },
              ]}
            >
              {w}
            </Text>
          </View>
        ))}
      </View>

      {grid.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (day == null) {
              return <View key={`empty-${wi}-${di}`} style={styles.dayCell} />;
            }
            const neutral = shouldUseNeutralFill(year, month, day);
            const idx = hashStaffDay(staffId, year, month, day) % STAFF_SHIFT_DAY_COLORS.length;
            const fill = neutral ? STAFF_SHIFT_DAY_NEUTRAL : STAFF_SHIFT_DAY_COLORS[idx];
            const textColor = neutral ? '#9ca3af' : '#000000';
            return (
              <View key={`${wi}-${di}-${day}`} style={styles.dayCell}>
                <View
                  style={[
                    styles.dayCircle,
                    {
                      width: circleSize,
                      height: circleSize,
                      borderRadius: circleSize / 2,
                      backgroundColor: fill,
                    },
                  ]}
                >
                  <Text style={[styles.dayNum, { fontSize: dayFont, color: textColor }]}>{day}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  navHit: {
    padding: 4,
  },
  monthTitle: {
    fontFamily: typography.fontFamily.primary,
    fontWeight: typography.fontWeights.bold as any,
    color: STAFF_SHIFT_CALENDAR.monthTitle.color,
    minWidth: 160,
    textAlign: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontFamily: typography.fontFamily.secondary,
    fontWeight: typography.fontWeights.semibold as any,
    color: STAFF_SHIFT_CALENDAR.weekdayLabel.color,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dayCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNum: {
    fontFamily: typography.fontFamily.secondary,
    fontWeight: typography.fontWeights.light as any,
  },
});
