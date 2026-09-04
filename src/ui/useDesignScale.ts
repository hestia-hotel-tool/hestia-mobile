import { useMemo } from 'react';
import { PixelRatio, Platform, useWindowDimensions } from 'react-native';
import { DESIGN_FRAME, SCALE_CLAMP } from '@/theme';

export interface DesignScale {
  /** Live window size — updates on rotation, split view and folding. */
  width: number;
  height: number;
  /** The OS text-size preference. See `fs` / `fsA11y` before using it. */
  fontScale: number;

  /** Raw width ratio: `window.width / 440`. Unclamped. */
  ratio: number;
  /** `ratio` clamped to `SCALE_CLAMP`. This is what `s()` applies. */
  scale: number;

  /**
   * Scale a design-frame value — type, icons, gaps, radii, fixed control sizes.
   * Snapped to the device pixel grid so hairline borders stay crisp.
   */
  s: (designPx: number) => number;
  /** Font size. Identical to `s` — see the note on `fontScale` below. */
  fs: (designPx: number) => number;
  /**
   * Accessibility-aware font size, for the rarer case where a *container* must
   * grow with the user's text-size setting. Capped so layouts survive.
   */
  fsA11y: (designPx: number, maxFactor?: number) => number;

  /** True when the shorter window edge is tablet-width. */
  isTablet: boolean;
  /** Spread onto `<Text>` to bring Android line metrics closer to iOS. */
  textMetrics: { includeFontPadding?: false };

  /** @deprecated Unclamped ratio. Use `s()`, or `ratio` if you really mean the raw number. */
  scaleX: number;
  /**
   * @deprecated Legacy clamp `[0.8, 1.2]`, kept bit-identical so migrating a
   * call site to this hook is visually neutral. Use `scale` (`[0.85, 1.15]`).
   */
  normalizedScaleX: number;
}

const TABLET_MIN_WIDTH = 600;
const LEGACY_CLAMP = { min: 0.8, max: 1.2 } as const;

/**
 * The single scaling primitive for Hestia. Replaces `utils/scaling`,
 * `utils/layoutScale`, `hooks/useScale` and (eventually) `utils/responsive`.
 *
 * Use it for SIZE — type, icons, gaps, radii, fixed control heights.
 * Do NOT use it for POSITION: position with flex and `useSafeAreaInsets()`.
 * `top: 376 * scale` is a bug on every device that is not exactly 440×956.
 *
 * Width-only on purpose. Phone aspect ratios vary far more in height than in
 * width, so a height-derived scale distorts type. Vertical rhythm comes from
 * flex distribution, not from multiplying design-frame Y coordinates — which is
 * also why the old `scaleY` (built on a 800pt height that matched no comp in
 * the Figma file) was never trustworthy and ended up with zero consumers.
 */
export function useDesignScale(): DesignScale {
  const { width, height, fontScale } = useWindowDimensions();

  return useMemo(() => {
    const ratio = width / DESIGN_FRAME.width;
    const scale = Math.min(SCALE_CLAMP.max, Math.max(SCALE_CLAMP.min, ratio));
    const s = (designPx: number) => PixelRatio.roundToNearestPixel(designPx * scale);

    return {
      width,
      height,
      fontScale,
      ratio,
      scale,
      s,
      // `fs` deliberately ignores `fontScale`: React Native already applies the
      // OS text-size multiplier to <Text>, so folding it in here double-applies
      // it. `fsA11y` is the opt-in for sizing a container around scaled text.
      fs: s,
      fsA11y: (designPx: number, maxFactor = 1.3) =>
        PixelRatio.roundToNearestPixel(designPx * scale * Math.min(fontScale, maxFactor)),
      isTablet: Math.min(width, height) >= TABLET_MIN_WIDTH,
      textMetrics: Platform.OS === 'android' ? { includeFontPadding: false as const } : {},

      scaleX: ratio,
      normalizedScaleX: Math.min(LEGACY_CLAMP.max, Math.max(LEGACY_CLAMP.min, ratio)),
    };
  }, [width, height, fontScale]);
}
