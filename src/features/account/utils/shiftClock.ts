import { formatMinutesSpan } from '@/utils/formatting';
import { parseShiftTime } from '@features/staff/utils/shiftState';

export type ShiftNow = {
  state: 'on' | 'upcoming' | 'off';
  /** "On shift now", "Starts in 2h 5m", "Off shift". */
  label: string;
  /** "Ends at 14:00 · in 3h 20m", "Today 14:00–22:00". */
  detail: string;
};

const DAY = 24 * 60;

/** Length of a shift in minutes; an end at or before the start runs through midnight. */
export function shiftLengthMinutes(start: string, end: string): number | null {
  const s = parseShiftTime(start);
  const e = parseShiftTime(end);
  if (s == null || e == null) return null;
  return e > s ? e - s : e + DAY - s;
}

/** "8h", "7h 30m"; "" when unknown. */
export function shiftLengthLabel(start: string, end: string): string {
  const mins = shiftLengthMinutes(start, end);
  return mins == null ? '' : formatMinutesSpan(mins * 60_000);
}

export function isOvernight(start: string, end: string): boolean {
  const s = parseShiftTime(start);
  const e = parseShiftTime(end);
  return s != null && e != null && e <= s;
}

/**
 * Where `now` falls against a daily shift: on it (and when it ends), before it
 * today (and when it starts), or after it. Overnight shifts (22:00–06:00)
 * count the early hours as the tail of last night's shift.
 */
export function shiftNow(start: string, end: string, now: Date = new Date()): ShiftNow {
  const s = parseShiftTime(start);
  const e = parseShiftTime(end);
  if (s == null || e == null) return { state: 'off', label: 'Shift hours not set', detail: '' };
  const t = now.getHours() * 60 + now.getMinutes();
  const span = (mins: number) => formatMinutesSpan(mins * 60_000);
  const overnight = e <= s;

  const onShift = overnight ? t >= s || t < e : t >= s && t < e;
  if (onShift) {
    const left = (e - t + DAY) % DAY;
    return { state: 'on', label: 'On shift now', detail: `Ends at ${end} · in ${span(left)}` };
  }
  const untilStart = (s - t + DAY) % DAY;
  if (!overnight && t < s) {
    return { state: 'upcoming', label: `Starts in ${span(untilStart)}`, detail: `Today ${start}–${end}` };
  }
  if (overnight) {
    return { state: 'upcoming', label: `Starts in ${span(untilStart)}`, detail: `Tonight ${start}–${end}` };
  }
  return { state: 'off', label: 'Off shift', detail: `Next shift tomorrow ${start}–${end}` };
}
