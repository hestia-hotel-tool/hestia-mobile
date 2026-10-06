import React from 'react';
import type { SvgProps } from 'react-native-svg';
import { icons, ICON_ASPECT, TINTABLE_ICONS, type IconName } from './registry';

export type IconProps = {
  /** Registry key — see `src/components/Icon/registry.ts`. */
  name: IconName;
  /**
   * Rendered height in px. Width follows the glyph's own aspect ratio, so a
   * 28x14 icon at size 14 renders 28x14, not 14x14 with the art letterboxed
   * into half the box. Default 24.
   */
  size?: number;
  /** Override the derived width when the design pins both dimensions. */
  width?: number;
  /** Override the height independently of `size`. */
  height?: number;
  /**
   * Tint. Applies to icons authored in a single colour (`currentColor`).
   * Two-tone brand marks such as `nav-home` ignore it by design — passing a
   * colour there warns in dev rather than silently doing nothing.
   *
   * Pass a design token, e.g. `colors.status.dirty`.
   */
  color?: string;
} & Omit<SvgProps, 'width' | 'height' | 'color'>;

/**
 * Renders a registered SVG icon.
 *
 *   <Icon name="status-dirty" size={30} color={colors.text.white} />
 *   <Icon name="action-filter" size={14} />   // 28x14, aspect preserved
 */
export function Icon({ name, size = 24, width, height, color, ...rest }: IconProps) {
  const Svg = icons[name] as React.FC<SvgProps> | undefined;

  if (!Svg) {
    if (__DEV__) console.warn(`[Icon] unknown icon "${String(name)}"`);
    return null;
  }

  const h = height ?? size;
  const w = width ?? h * (ICON_ASPECT[name] ?? 1);

  if (__DEV__ && color && !TINTABLE_ICONS.has(name)) {
    console.warn(
      `[Icon] "${name}" is a two-tone mark and ignores \`color\`. ` +
        'Remove the prop, or use a single-colour icon if it needs to tint.'
    );
  }

  return <Svg width={w} height={h} color={color} {...rest} />;
}
