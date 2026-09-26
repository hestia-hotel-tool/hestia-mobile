import { KeyboardAvoidingView } from 'react-native';

/**
 * React Native's KeyboardAvoidingView, minus its NaN update loop.
 *
 * The stock component computes its padding as `frame.y + frame.height -
 * keyboard.screenY`. When either side is missing — a keyboard event carrying no
 * `screenY`, or a layout reported by a screen that is mounted but hidden (the
 * tab screens stay alive with `freezeOnBlur`) — that is `NaN`, and it is stored
 * as the padding. Its `componentDidUpdate` then compares
 * `this._bottom !== prevState.bottom`, which is always true for `NaN`, so it
 * sets state on every update: "Maximum update depth exceeded" on the Home
 * screen after a refresh, plus iOS's "invalid numeric value (NaN) passed to
 * CoreGraphics" as that padding reaches the native view.
 *
 * This overrides the one method every write goes through so a non-finite
 * value becomes 0 (no padding) instead. Everything else is the stock
 * component; use it anywhere `KeyboardAvoidingView` was used.
 */
export class SafeKeyboardAvoidingView extends KeyboardAvoidingView {
  _setBottom = (value: number) => {
    const bottom = Number.isFinite(value) ? value : 0;
    const self = this as unknown as { _bottom: number; props: { enabled?: boolean } };
    self._bottom = bottom;
    if (self.props.enabled ?? true) {
      this.setState({ bottom });
    }
  };
}

export default SafeKeyboardAvoidingView;
