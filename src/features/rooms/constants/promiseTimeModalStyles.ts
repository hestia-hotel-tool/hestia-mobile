/**
 * Promise Time Modal styles - shared with DatePickerContainer and time picker
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DESIGN_WIDTH = 440;
export const scaleX = SCREEN_WIDTH / DESIGN_WIDTH;

export const PROMISE_TIME_MODAL = {
  datePicker: {
    itemHeight: 40,
    height: 200,
    selectedFontSize: 24,
    unselectedFontSize: 16,
    mediumFontSize: 20,
  },
};
