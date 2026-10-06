import React, { useMemo, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import type { RoomPickerRoom } from '../../types/roomPicker.types';
import RoomPickerCard from './RoomPickerCard';
import RoomPickerModal from './RoomPickerModal';
import { ROOM_PICKER_LAYOUT as L } from './roomPickerLayout';

export interface RoomNumberSelectorProps {
  rooms: RoomPickerRoom[];
  /** The chosen room, or `null` for "nothing picked yet". Controlled. */
  value: RoomPickerRoom | null;
  onChange: (room: RoomPickerRoom | null) => void;
  scaleX: number;
  loading?: boolean;
  placeholder?: string;
  /** Header for the picker modal. */
  modalTitle?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pick a room, and see who is in it.
 *
 * Shared by Lost & Found → Register (node 1102:3287, frame 733:7) and Create
 * Ticket → Select Location (node 3005:494). Both had their own copy; they had
 * drifted apart on the card's fill, the room label's weight, the padding
 * before the divider and whether the tab on the top edge was drawn at all.
 *
 * On the form this is only ever two things: a button that opens the picker, or
 * the chosen room's card. The list lives in `RoomPickerModal`, so nothing here
 * has to fight the form's scroll view for room or stacking — which is what an
 * inline dropdown did, and why it never fitted.
 *
 * Tapping the chosen card reopens the picker with that room ticked, rather
 * than clearing it: "change the room" is what a user actually wants there, and
 * the previous behaviour threw the choice away on a mistap with no undo.
 * Callers that need to clear it set `value` to `null` themselves — which is
 * what the ticket screen does when you switch to Public Area.
 */
export default function RoomNumberSelector({
  rooms,
  value,
  onChange,
  scaleX,
  loading = false,
  placeholder = 'Select a room',
  modalTitle,
  style,
}: RoomNumberSelectorProps) {
  const styles = useMemo(() => buildRoomNumberSelectorStyles(scaleX), [scaleX]);
  const [pickerOpen, setPickerOpen] = useState(false);
  /*
   * Bumped on every open so the modal remounts with a clean search. It stays
   * mounted while closing, so the slide-out animation still plays; a reset
   * effect keyed on `visible` would instead clear the list mid-animation.
   */
  const [pickerGeneration, setPickerGeneration] = useState(0);

  const openPicker = () => {
    setPickerGeneration((n) => n + 1);
    setPickerOpen(true);
  };

  const picker = (
    <RoomPickerModal
      key={pickerGeneration}
      visible={pickerOpen}
      rooms={rooms}
      value={value}
      loading={loading}
      scaleX={scaleX}
      title={modalTitle}
      onSelect={(room) => {
        onChange(room);
        setPickerOpen(false);
      }}
      onClose={() => setPickerOpen(false)}
    />
  );

  if (value) {
    return (
      <View style={style}>
        <RoomPickerCard
          room={value}
          scaleX={scaleX}
          variant="selected"
          onPress={openPicker}
        />
        {picker}
      </View>
    );
  }

  return (
    <View style={style}>
      <TouchableOpacity
        style={styles.field}
        onPress={openPicker}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={placeholder}
      >
        <Text style={styles.fieldPlaceholder} numberOfLines={1}>
          {placeholder}
        </Text>
        {/*
          `action-chevron` points *left*; turned -90 it points down, which is
          what a control that opens something should show. The box keeps the
          unrotated footprint, because a transform does not change layout size.
        */}
        <View style={styles.chevronBox}>
          <View style={{ transform: [{ rotate: '-90deg' }] }}>
            <Icon name="action-chevron" size={L.field.chevronBox * scaleX} color="#5a759d" />
          </View>
        </View>
      </TouchableOpacity>
      {picker}
    </View>
  );
}

function buildRoomNumberSelectorStyles(scaleX: number) {
  const androidText = Platform.select({
    android: { includeFontPadding: false } as const,
    default: {} as const,
  });

  return StyleSheet.create({
    field: {
      height: L.field.height * scaleX,
      borderWidth: 1,
      borderColor: L.field.borderColor,
      borderRadius: L.field.radius * scaleX,
      paddingHorizontal: L.field.paddingHorizontal * scaleX,
      backgroundColor: '#fff',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    fieldPlaceholder: {
      flex: 1,
      fontSize: L.field.fontSize * scaleX,
      fontFamily: typography.fontFamily.primary,
      color: '#9aa7bd',
      ...androidText,
    },
    /*
     * Square at 12 even though the glyph paints 12x6, so the box's
     * contribution to the row does not depend on the glyph's aspect.
     */
    chevronBox: {
      width: L.field.chevronBox * scaleX,
      height: L.field.chevronBox * scaleX,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
