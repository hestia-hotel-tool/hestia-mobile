import { ShiftType } from '@/types/shift.types';
import { currentShiftNow } from '@/lib/hotelShifts';

/**
 * The shift on now, by the hotel's own shift times (see `lib/hotelShifts`).
 *
 * This used to switch to PM at a fixed 17:00 while the hotel's PM shift starts
 * at 14:00, so between 14:00 and 17:00 rooms assigned from the Rooms list were
 * filed under AM and did not show on the attendant's PM view.
 */
export const getShiftFromTime = (): ShiftType => currentShiftNow();
