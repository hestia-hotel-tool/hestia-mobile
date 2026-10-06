import { useRef } from 'react';

/**
 * Dev-only diagnostic for "Maximum update depth exceeded".
 *
 * React's error names the component it was rendering when it hit the limit, not
 * the value whose churn caused it — so on a screen with a dozen pieces of state
 * the message tells you *where* but never *what*. This closes that gap: it
 * watches a labelled bag of values, counts renders, and when a screen renders
 * far more often than a second's worth of real interaction could explain, it
 * names the values whose identity changed on the render before the spike.
 *
 * That list is the answer. A value that changes on every render of a loop is
 * either the cause (an unmemoised object feeding a `useEffect` dependency) or
 * one hop downstream of it. A loop that reports `(none)` is a `setState` fired
 * unconditionally from an effect or a layout handler, with no dependency churn
 * behind it — a different fix, which is why the two cases are distinguished.
 *
 * Costs nothing in release: the whole body is behind `__DEV__`, which the
 * production Metro transform folds to `false` and drops.
 *
 * Refs are read and written during render, which is impure. That is deliberate
 * and safe here — nothing it writes is rendered, and a probe that deferred to
 * an effect would miss the renders that never commit, which in a loop is most
 * of them.
 */
export function useRenderLoopProbe(
  label: string,
  watched: Record<string, unknown>,
  /** Renders within one second past which this stops being plausible traffic. */
  threshold = 30
): void {
  const previous = useRef<Record<string, unknown> | null>(null);
  const renders = useRef(0);
  const windowStart = useRef(0);
  const reported = useRef(false);

  if (__DEV__) {
    const now = Date.now();
    // A quiet second means the previous burst ended; start a fresh window and
    // re-arm, so a loop entered twice is reported twice rather than once.
    if (now - windowStart.current > 1000) {
      windowStart.current = now;
      renders.current = 0;
      reported.current = false;
    }
    renders.current += 1;

    const changed: string[] = [];
    if (previous.current) {
      for (const key of Object.keys(watched)) {
        if (!Object.is(previous.current[key], watched[key])) changed.push(key);
      }
    }
    previous.current = { ...watched };

    if (renders.current > threshold && !reported.current) {
      reported.current = true;
      console.warn(
        `[render-loop] ${label} rendered ${renders.current}x in under 1s.\n` +
          `Changed identity on the last render: ${
            changed.length > 0
              ? changed.join(', ')
              : '(none — an unconditional setState in an effect or onLayout, not a dependency change)'
          }`
      );
    }
  }
}

export default useRenderLoopProbe;
