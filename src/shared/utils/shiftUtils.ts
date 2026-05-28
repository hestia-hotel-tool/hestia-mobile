import { ShiftType } from '@shared/types/shift.types';

/**
 * Determines the shift based on current time
 * PM: 17:00 (5 PM) to 23:59 (11:59 PM)
 * AM: 00:00 (midnight) to 16:59 (4:59 PM)
 */
export const getShiftFromTime = (): ShiftType => {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 17 ? 'PM' : 'AM';
};
