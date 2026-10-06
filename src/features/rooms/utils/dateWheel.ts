/**
 * The date column of the Return Later and Promise Time wheels.
 *
 * The column used to list 14 days *around the selected date* (6 before, 7
 * after) and move the selection whenever the wheel scrolled off the middle
 * row. But moving the selection re-centred the list under the finger, so
 * the next scroll event (about 60 a second) found the wheel off-centre again
 * and moved it again. Days ran away, the programmatic snap-back fed more
 * events in, and the JS thread was flooded: the modal froze.
 *
 * So the list is fixed: today and the next 13 days, in order. Row `i` is
 * always today + i, the scroll offset maps to a day with no feedback, and
 * there are no past days to disable.
 */
export const DATE_WHEEL_DAYS = 14;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** The day on row `index`, clamped to the wheel. */
export function dateAtWheelIndex(index: number): Date {
  const i = Math.min(Math.max(Math.round(index), 0), DATE_WHEEL_DAYS - 1);
  const d = startOfToday();
  d.setDate(d.getDate() + i);
  return d;
}

/** The row that shows `date`'s day, clamped to the wheel. */
export function dateWheelIndex(date: Date): number {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  // Round, not floor: a DST change makes a day 23 or 25 hours long.
  const diff = Math.round((day.getTime() - startOfToday().getTime()) / 86_400_000);
  return Math.min(Math.max(diff, 0), DATE_WHEEL_DAYS - 1);
}

/** Every day on the wheel, top to bottom. */
export function dateWheelDates(): Date[] {
  return Array.from({ length: DATE_WHEEL_DAYS }, (_, i) => dateAtWheelIndex(i));
}
