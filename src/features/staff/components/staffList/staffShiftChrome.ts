import type { StaffShiftState } from '../../types/staffRoster.types';

/**
 * What each shift group is called and what colour it carries.
 *
 * Colours only — geometry lives in `staffListLayout.ts`, the same split the
 * Lost & Found pass uses.
 *
 * **Sampled from Figma 3240:561, not guessed**, and the group's label and its
 * status dot share one colour: On Shift `#41d541` (label 3831:95, dot
 * 3241:779), On Break `#1e1e1e` (3831:90 / 3883:6786), Shift End `#f92424`
 * (3831:83 / 3241:782). All three are already tokens, so nothing new enters
 * the palette.
 *
 * On the vocabulary: `status-inspected` and `status-dirty` are *room* statuses
 * being reused for *people*. That is what the frame draws and the tokens are
 * the right values, but the names read oddly here — hence this table, so a
 * reader meets "On Shift is green" rather than "a housekeeper is inspected".
 */
export interface ShiftGroupChrome {
  title: 'On Shift' | 'On Break' | 'Shift End';
  /** Drives both the heading text and the dot on each avatar. */
  color: string;
  /** Empty-state copy for when this group has nobody in it. */
  emptyLabel: string;
}

export const SHIFT_GROUP_CHROME: Record<StaffShiftState, ShiftGroupChrome> = {
  on_shift: {
    title: 'On Shift',
    color: '#41d541',
    emptyLabel: 'Nobody is on shift in this department.',
  },
  on_break: {
    title: 'On Break',
    color: '#1e1e1e',
    emptyLabel: 'Nobody is on a break.',
  },
  shift_end: {
    title: 'Shift End',
    color: '#f92424',
    emptyLabel: 'Nobody has finished yet.',
  },
};

export default SHIFT_GROUP_CHROME;
