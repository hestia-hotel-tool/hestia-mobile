import React from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { scaleX } from '../../constants/roomDetailStyles';

/**
 * The delete menu for one note or task on Room Detail: the system action
 * sheet on iOS (a red destructive row, Cancel apart), an alert on Android.
 * The sheet *is* the confirmation — the item's text is its message, so it is
 * clear what goes.
 */
export function openDeleteMenu({
  what,
  preview,
  onDelete,
}: {
  /** "note" or "task". */
  what: 'note' | 'task';
  preview: string;
  onDelete: () => void;
}): void {
  const label = what === 'note' ? 'Delete note' : 'Delete task';
  const message = preview.length > 140 ? `${preview.slice(0, 140)}…` : preview;
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: message, options: [label, 'Cancel'], destructiveButtonIndex: 0, cancelButtonIndex: 1 },
      (i) => {
        if (i === 0) onDelete();
      }
    );
    return;
  }
  Alert.alert(label + '?', message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onDelete },
  ]);
}

/** The "⋯" beside a note or task the person may delete. */
export function ItemMoreButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 28 * scaleX,
        height: 28 * scaleX,
        borderRadius: 14 * scaleX,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? '#e4eaf3' : 'transparent',
      })}
    >
      <Ionicons name="ellipsis-horizontal" size={18 * scaleX} color="#7d8aa0" />
    </Pressable>
  );
}
