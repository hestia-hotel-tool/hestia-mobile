import { useCssElement } from 'react-native-css';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Image as RNImage } from 'expo-image';
import type { ImageContentFit, ImageContentPosition } from 'expo-image';

type CssComponent = React.ComponentType<any>;

export type ImageProps = React.ComponentProps<typeof RNImage> & {
  className?: string;
};

function CSSImage(props: React.ComponentProps<typeof RNImage>) {
  // expo-image accepts objectFit/objectPosition inside style; RN's style types
  // don't know them, so read them off explicitly.
  const { objectFit, objectPosition, ...style } = (StyleSheet.flatten(props.style) ||
    {}) as {
    objectFit?: ImageContentFit;
    objectPosition?: ImageContentPosition;
  };

  return (
    <RNImage
      contentFit={objectFit}
      contentPosition={objectPosition}
      {...props}
      source={
        typeof props.source === 'string' ? { uri: props.source } : props.source
      }
      style={style}
    />
  );
}

export const Image = (
  props: React.ComponentProps<typeof CSSImage> & { className?: string }
) => {
  return useCssElement(CSSImage as unknown as CssComponent, props, {
    className: 'style',
  });
};

Image.displayName = 'CSS(Image)';
