import React from 'react';
import type { SvgProps } from 'react-native-svg';
import { icons, type IconName } from './registry';

export type IconProps = {
  /** Registry key — see `src/components/Icon/registry.ts`. */
  name: IconName;
  /** Square size in px (sets both width and height). Default 24. */
  size?: number;
  /**
   * Tint. SVGs authored with `currentColor` follow this.
   * Pass a design token, e.g. `tokens.status.dirty`.
   */
  color?: string;
} & Omit<SvgProps, 'width' | 'height' | 'color'>;

/**
 * Renders a registered SVG icon.
 *
 *   <Icon name="status-dirty" size={20} color={tokens.status.dirty} />
 */
export function Icon({ name, size = 24, color, ...rest }: IconProps) {
  const Svg = icons[name] as React.FC<SvgProps> | undefined;

  if (!Svg) {
    if (__DEV__) console.warn(`[Icon] unknown icon "${String(name)}"`);
    return null;
  }

  return <Svg width={size} height={size} color={color} {...rest} />;
}
