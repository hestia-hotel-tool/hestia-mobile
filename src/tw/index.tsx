import {
  useCssElement,
  useNativeVariable as useFunctionalVariable,
} from 'react-native-css';

import { Link as RouterLink } from 'expo-router';
import React from 'react';
import {
  View as RNView,
  Text as RNText,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  TouchableHighlight as RNTouchableHighlight,
  TextInput as RNTextInput,
  StyleSheet,
} from 'react-native';

// NOTE: passing the component `as unknown as ComponentType<any>` keeps
// useCssElement's generic from materializing the enormous union of React
// component props (TS2590 "union type too complex"), which also avoids a
// severe type-check slowdown in this codebase.

type CssComponent = React.ComponentType<any>;

// CSS-enabled Link
export const Link = (
  props: React.ComponentProps<typeof RouterLink> & { className?: string }
) => {
  return useCssElement(RouterLink as unknown as CssComponent, props, {
    className: 'style',
  });
};

Link.Trigger = RouterLink.Trigger;
Link.Menu = RouterLink.Menu;
Link.MenuAction = RouterLink.MenuAction;
Link.Preview = RouterLink.Preview;

// CSS Variable hook
export const useCSSVariable =
  process.env.EXPO_OS !== 'web'
    ? useFunctionalVariable
    : (variable: string) => `var(${variable})`;

// View
export type ViewProps = React.ComponentProps<typeof RNView> & {
  className?: string;
};

export const View = (props: ViewProps) => {
  return useCssElement(RNView as unknown as CssComponent, props, {
    className: 'style',
  });
};
View.displayName = 'CSS(View)';

// Text
export const Text = (
  props: React.ComponentProps<typeof RNText> & { className?: string }
) => {
  return useCssElement(RNText as unknown as CssComponent, props, {
    className: 'style',
  });
};
Text.displayName = 'CSS(Text)';

// ScrollView
export const ScrollView = (
  props: React.ComponentProps<typeof RNScrollView> & {
    className?: string;
    contentContainerClassName?: string;
  }
) => {
  return useCssElement(RNScrollView as unknown as CssComponent, props, {
    className: 'style',
    contentContainerClassName: 'contentContainerStyle',
  });
};
ScrollView.displayName = 'CSS(ScrollView)';

// Pressable
export const Pressable = (
  props: React.ComponentProps<typeof RNPressable> & { className?: string }
) => {
  return useCssElement(RNPressable as unknown as CssComponent, props, {
    className: 'style',
  });
};
Pressable.displayName = 'CSS(Pressable)';

// TextInput
export const TextInput = (
  props: React.ComponentProps<typeof RNTextInput> & { className?: string }
) => {
  return useCssElement(RNTextInput as unknown as CssComponent, props, {
    className: 'style',
  });
};
TextInput.displayName = 'CSS(TextInput)';

// TouchableHighlight with underlayColor extraction
function XXTouchableHighlight(
  props: React.ComponentProps<typeof RNTouchableHighlight>
) {
  // underlayColor is a TouchableHighlight prop, not a ViewStyle key; RN
  // historically allows it in style, so flatten + pick it out.
  const { underlayColor, ...style } = (StyleSheet.flatten(props.style) || {}) as {
    underlayColor?: string;
  };
  return (
    <RNTouchableHighlight
      underlayColor={underlayColor}
      {...props}
      style={style as unknown as ViewProps['style']}
    />
  );
}

export const TouchableHighlight = (
  props: React.ComponentProps<typeof RNTouchableHighlight>
) => {
  return useCssElement(XXTouchableHighlight as unknown as CssComponent, props, {
    className: 'style',
  });
};
TouchableHighlight.displayName = 'CSS(TouchableHighlight)';
