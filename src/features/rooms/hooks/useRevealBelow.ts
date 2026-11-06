import { useCallback, useEffect, useRef, useState } from 'react';
import type { ScrollTarget } from '../utils/scrollTarget';

/** A rectangle in window coordinates (`measureInWindow`). */
export type WindowRect = { x: number; y: number; width: number; height: number };

/** Measures the anchor afresh; null when it cannot be measured (scrolled away, unmounted). */
export type MeasureAnchor = () => Promise<WindowRect | null>;

/** What a reveal hands back: the anchor where it now is, and the screen chrome above the list. */
export type Revealed = {
  rect: WindowRect;
  /** Window y where the screen's header ends: nothing above it is blurred or covered. */
  clearAbove: number;
};

/**
 * Asks the list to make room under an anchor before a popover opens there.
 * Resolves with the anchor's rect after any scroll, or null.
 */
export type RevealBelow = (measure: MeasureAnchor, space: number) => Promise<Revealed | null>;

export type UseRevealBelowOptions = {
  scrollRef: React.RefObject<ScrollTarget | null>;
  scrollOffsetRef: React.MutableRefObject<number>;
  /** Window y the popover must end above — the top of the tab bar. */
  bottomBound: number;
  /** Window y where the screen's header ends; the popover leaves everything above it sharp. */
  headerBottom: number;
};

/** The list's scroll animation, and a little over. */
const SCROLL_SETTLE_MS = 350;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Room for a popover that always opens *downward* from its anchor — the VIP
 * popover on a room card's VIP disc.
 *
 * `reveal(measure, space)`:
 *  1. marks the list as revealing: `extraBottom` pads the list's end by
 *     `space`, so even the last card can scroll up far enough, and `active`
 *     tells the screen to freeze anything that would move the list (the
 *     collapsing header);
 *  2. measures the anchor; if `space` below it would run past `bottomBound`,
 *     scrolls the list up by exactly the shortfall;
 *  3. measures again once the scroll has settled, and returns that rect, so
 *     the popover's tail lands on the anchor where it now is.
 *
 * `end()` drops the padding and the freeze when the popover closes.
 */
export function useRevealBelow({ scrollRef, scrollOffsetRef, bottomBound, headerBottom }: UseRevealBelowOptions) {
  const [extraBottom, setExtraBottom] = useState(0);
  // Read at reveal time from a ref, so `reveal` keeps one identity while the
  // header collapses and expands — every memoised room row receives it.
  const headerBottomRef = useRef(headerBottom);
  useEffect(() => {
    headerBottomRef.current = headerBottom;
  }, [headerBottom]);

  const reveal = useCallback<RevealBelow>(
    async (measure, space) => {
      setExtraBottom(space);
      // Let the padding and the frozen header lay out before measuring.
      await nextFrame();
      await nextFrame();
      const rect = await measure();
      if (!rect) return null;
      const overflow = rect.y + rect.height + space - bottomBound;
      if (overflow <= 0 || !scrollRef.current) return { rect, clearAbove: headerBottomRef.current };
      scrollRef.current.scrollTo({ y: scrollOffsetRef.current + overflow, animated: true });
      await wait(SCROLL_SETTLE_MS);
      return { rect: (await measure()) ?? rect, clearAbove: headerBottomRef.current };
    },
    [scrollRef, scrollOffsetRef, bottomBound]
  );

  const end = useCallback(() => setExtraBottom(0), []);

  return { reveal, end, active: extraBottom > 0, extraBottom };
}
