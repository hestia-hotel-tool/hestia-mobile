import React from 'react';
import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '@/theme';

/** Pass as `inputAccessoryViewID` on a TextInput to give it the Done bar. */
export const KEYBOARD_DONE_BAR_ID = 'hestia-keyboard-done';

/**
 * A "Done" bar above the iOS keyboard.
 *
 * A multiline TextInput's Return key adds a line; the iOS keyboard has no key
 * that closes it. Without this, typing a note, reason or description left the
 * keyboard up over the Save / Confirm button with no way down — the screen
 * looked frozen. Android's keyboard has its own hide control, so this renders
 * nothing there.
 *
 * Render it once beside the inputs (inside the same Modal, if they are in
 * one) and give each multiline input `inputAccessoryViewID={KEYBOARD_DONE_BAR_ID}`.
 */
export function KeyboardDoneBar() {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_BAR_ID}>
      <View style={styles.bar}>
        <Pressable onPress={Keyboard.dismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide keyboard">
          <Text style={styles.done}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f1f3f6',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#c8ccd2',
  },
  done: {
    fontSize: 16,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: colors.primary.main,
  },
});

export default KeyboardDoneBar;
