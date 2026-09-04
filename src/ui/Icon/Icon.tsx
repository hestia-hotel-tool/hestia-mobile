import React from 'react';
import type { SvgProps } from 'react-native-svg';
import { iconSize, type IconSize } from '@/theme';
import { icons, type IconName } from './registry';

export type IconProps = {
  /** Registry key — see `src/ui/Icon/registry.ts`. */
  name: IconName;
  /**
   * A size token (`'md'`) or an explicit number, in design-frame px.
   * Defaults to `'lg'` (24).
   */
  size?: IconSize | number;
  /** Tint. Only affects SVGs authored with `currentColor`. */
  color?: string;
} & Omit<SvgProps, 'width' | 'height' | 'color'>;

/**
 * Renders a registered SVG icon.
 *
 *   <Icon name="status-dirty" size="md" color={colors.status.dirty} />
 *
 * This deliberately does not call `useDesignScale()` itself — scaling is the
 * caller's decision (`<Icon size={s(20)} />`). Keeping it pure means a rotation
 * does not re-render every icon on screen.
 */
export function Icon({ name, size = 'lg', color, ...rest }: IconProps) {
  const Svg = icons[name] as React.FC<SvgProps> | undefined;

  if (!Svg) {
    if (__DEV__) console.warn(`[Icon] unknown icon "${String(name)}"`);
    return null;
  }

  const px = typeof size === 'number' ? size : iconSize[size];

  return <Svg width={px} height={px} color={color} {...rest} />;
}
