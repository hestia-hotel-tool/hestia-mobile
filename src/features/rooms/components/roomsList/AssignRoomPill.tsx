import React from 'react';
import { Pressable } from 'react-native';
import { View, Text } from '@/tw';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { ASSIGN_FILL, INK, ROOM_CARD } from './roomCardLayout';

export type AssignRoomPillProps = {
  roomNumber: string;
  /** Opens the attendant picker. Without it (no rooms.reassign) the pill reads "Unassigned" and is not a control. */
  onPress?: () => void;
};

/**
 * "Assign Room" on an unassigned room — Figma 4577:228.
 *
 * 169.6 x 62, fully rounded, in the footer where an assignee would be and
 * centred on the status pill: the 23 person-plus 21 in (an SVG, so it stays
 * sharp at any scale), "Assign Room" in Helvetica Regular 15 #334866 from 57.
 *
 * Read-only readers see the same pill saying "Unassigned", with no icon (the
 * plus would promise an action they cannot take) — so the card keeps its
 * shape whoever looks at it.
 */
export function AssignRoomPill({ roomNumber, onPress }: AssignRoomPillProps) {
  const { assign } = ROOM_CARD;
  const fill = ASSIGN_FILL;
  const label = (
    <Text
      numberOfLines={1}
      style={{
        position: 'absolute',
        left: onPress ? assign.labelLeft : 0,
        right: onPress ? undefined : 0,
        textAlign: onPress ? 'left' : 'center',
        fontFamily: typography.fontFamily.primary,
        fontSize: assign.fontSize,
        fontWeight: '400',
        color: onPress ? INK : '#8a94a6',
      }}
    >
      {onPress ? 'Assign Room' : 'Unassigned'}
    </Text>
  );

  if (!onPress) {
    return (
      <View
        className="justify-center rounded-full"
        style={{ width: assign.width, height: assign.height, backgroundColor: fill, marginLeft: assign.left - ROOM_CARD.footer.left }}
        accessibilityLabel={`Room ${roomNumber} is not assigned`}
      >
        {label}
      </View>
    );
  }

  return (
    // React Native's own Pressable, not the `@/tw` wrapper: the wrapper drops a
    // function `style`, which lost the size and the white fill, leaving the
    // icon and label floating on the card with no pill behind them.
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Assign room ${roomNumber}`}
      accessibilityHint="Choose a room attendant"
      style={({ pressed }) => ({
        width: assign.width,
        height: assign.height,
        borderRadius: assign.height / 2,
        justifyContent: 'center',
        backgroundColor: fill,
        marginLeft: assign.left - ROOM_CARD.footer.left,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View className="absolute" style={{ left: assign.iconLeft }}>
        <Icon name="action-assign-rooms" size={assign.icon} color="#5a759d" />
      </View>
      {label}
    </Pressable>
  );
}

export default AssignRoomPill;
