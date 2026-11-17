import React, { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Ionicons from '@expo/vector-icons/Ionicons';
import { typography } from '@/theme';

/**
 * Swipe a row left to reveal a red Delete — the list pattern every messaging
 * and mail app uses (chat list, General / Tasks notifications).
 *
 * The row closes again when Delete is pressed; the caller decides whether to
 * confirm. The row is painted `background` (the list's colour): the button
 * sits behind it, and a transparent row — or the gap above it — would show red.
 */
export function SwipeToDelete({
  children,
  onDelete,
  label = 'Delete',
  accessibilityLabel,
  background = '#ffffff',
}: {
  children: React.ReactNode;
  onDelete: () => void;
  label?: string;
  accessibilityLabel?: string;
  background?: string;
}) {
  const ref = useRef<SwipeableMethods>(null);
  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <View style={{ width: 92, flexDirection: 'row' }}>
          <Pressable
            onPress={() => {
              ref.current?.close();
              onDelete();
            }}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? '#d61f1f' : '#f92424',
            })}
          >
            <Ionicons name="trash-outline" size={22} color="#ffffff" />
            <Text style={{ marginTop: 4, color: '#ffffff', fontFamily: typography.fontFamily.primary, fontWeight: '600', fontSize: 13 }}>
              {label}
            </Text>
          </Pressable>
        </View>
      )}
    >
      <View style={{ backgroundColor: background }}>{children}</View>
    </ReanimatedSwipeable>
  );
}

export default SwipeToDelete;
