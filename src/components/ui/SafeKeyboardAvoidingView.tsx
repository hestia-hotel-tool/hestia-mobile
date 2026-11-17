import React, { forwardRef, useContext, useEffect, useState } from 'react';
import { KeyboardAvoidingView, type KeyboardAvoidingViewProps } from 'react-native';
import { NavigationContext } from 'expo-router/react-navigation';

/** Padding changes smaller than this are layout noise, not the keyboard moving. */
const MIN_CHANGE_PX = 1;
/** More padding changes than this inside WINDOW_MS is a feedback loop, not a keyboard. */
const MAX_CHANGES = 12;
const WINDOW_MS = 1000;

type KavInternals = {
  _bottom: number;
  props: KeyboardAvoidingViewProps;
  state: { bottom: number };
};

/**
 * React Native's KeyboardAvoidingView, hardened against its update loops.
 *
 * The stock component stores `frame.y + frame.height - keyboard.screenY` as
 * its padding and re-measures whenever its height changes. That loops
 * ("Maximum update depth exceeded", seen on Home) in three ways:
 *
 *  1. **NaN.** A keyboard event without `screenY`, or a layout from a hidden
 *     screen, makes the padding NaN; `NaN !== NaN`, so `componentDidUpdate`
 *     sets state forever.
 *  2. **Oscillation.** The padding changes the layout, the layout changes the
 *     padding by a fraction of a pixel, and so on.
 *  3. **Screens that are not on screen.** Tab screens stay mounted (Home is
 *     always alive), and every mounted KeyboardAvoidingView reacts to *any*
 *     keyboard — one opened in a sheet on another screen, the emoji search,
 *     the photo picker's — measuring itself while hidden.
 *
 * So: padding is a whole, finite, non-negative number; changes under 1px are
 * ignored; state is compared with the current state, not the previous one;
 * and if it still changes more than 12 times in a second it stops (padding 0)
 * and says so, rather than taking the app down. The wrapper below also turns
 * it off while its screen is not focused.
 */
class GuardedKeyboardAvoidingView extends KeyboardAvoidingView {
  private changeTimes: number[] = [];
  private tripped = false;

  _setBottom = (value: number) => {
    const self = this as unknown as KavInternals;
    let bottom = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

    const now = Date.now();
    this.changeTimes = this.changeTimes.filter((t) => now - t < WINDOW_MS);
    if (this.changeTimes.length === 0) this.tripped = false;
    if (this.tripped) bottom = 0;

    if (Math.abs(bottom - self._bottom) < MIN_CHANGE_PX) return;

    this.changeTimes.push(now);
    if (this.changeTimes.length > MAX_CHANGES) {
      if (!this.tripped && __DEV__) {
        console.warn('[SafeKeyboardAvoidingView] padding kept changing; stopped to avoid an update loop.');
      }
      this.tripped = true;
      bottom = 0;
    }

    self._bottom = bottom;
    if (self.props.enabled ?? true) this.setState({ bottom });
  };

  componentDidUpdate() {
    const self = this as unknown as KavInternals;
    if ((self.props.enabled ?? true) && self._bottom !== self.state.bottom) {
      this.setState({ bottom: self._bottom });
    }
  }
}

/**
 * Use anywhere `KeyboardAvoidingView` was used — same props.
 *
 * Inside a navigator it is enabled only while its screen is focused, so a
 * screen kept alive in the background never reacts to another screen's
 * keyboard. Outside one (a root-level modal), it behaves as before.
 */
export const SafeKeyboardAvoidingView = forwardRef<GuardedKeyboardAvoidingView, KeyboardAvoidingViewProps>(
  function SafeKeyboardAvoidingView(props, ref) {
    const navigation = useContext(NavigationContext);
    const [focused, setFocused] = useState<boolean>(() => navigation?.isFocused() ?? true);

    useEffect(() => {
      if (!navigation) return;
      const onFocus = navigation.addListener('focus', () => setFocused(true));
      const onBlur = navigation.addListener('blur', () => setFocused(false));
      return () => {
        onFocus();
        onBlur();
      };
    }, [navigation]);

    return <GuardedKeyboardAvoidingView ref={ref} {...props} enabled={(props.enabled ?? true) && focused} />;
  }
);

export default SafeKeyboardAvoidingView;
