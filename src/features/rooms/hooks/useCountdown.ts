import { useEffect, useRef, useState } from 'react';

/**
 * "45 mins" / "1h 20 min 6s" — how long is left, as words.
 *
 * A *duration* formatter, which is why it lives here and not in
 * `@/utils/formatting`: everything there turns an instant into a clock face,
 * and this turns a span into a countdown. Its only caller is the hook below.
 */
export function formatRemaining(
  diffMs: number,
  withSeconds: boolean,
  compact = false
): string {
  if (withSeconds) {
    const totalMins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    if (totalMins >= 60) {
      const hours = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      return compact ? `${hours}h ${mins}min ${secs}s` : `${hours}h ${mins} min ${secs}s`;
    }
    // Figma 2333-312 writes "30min 2s" — no space, singular.
    return compact ? `${totalMins}min ${secs}s` : `${totalMins} mins ${secs}s`;
  }
  const totalMins = Math.max(0, Math.ceil(diffMs / 60000));
  return totalMins >= 60
    ? `${Math.floor(totalMins / 60)}h ${totalMins % 60} min`
    : `${totalMins} mins`;
}

/**
 * Live "time remaining" label for a deadline, or '' when there isn't one.
 *
 * Return Later and Promised Time each had their own copy of this; they differed
 * only in tick rate and whether seconds show.
 *
 * Moved out of `RoomDetailHeader` verbatim when that file was rebuilt — it is a
 * timer, not a view, and keeping it in the component meant the header could not
 * be read without reading an interval loop first.
 */
export function useCountdown(
  targetMs: number | null,
  opts: { withSeconds: boolean; compact?: boolean; onElapsed?: () => void }
): string {
  const { withSeconds, compact = false, onElapsed } = opts;
  const [label, setLabel] = useState('');
  // Kept in a ref so a new callback identity doesn't restart the interval.
  const onElapsedRef = useRef(onElapsed);
  useEffect(() => {
    onElapsedRef.current = onElapsed;
  }, [onElapsed]);

  useEffect(() => {
    if (targetMs == null) {
      setLabel('');
      return;
    }
    let didFire = false;
    const tick = () => {
      const diff = targetMs - Date.now();
      if (diff <= 0) {
        setLabel(withSeconds ? (compact ? '0min 0s' : '0h 0 min 0s') : '0 mins');
        if (!didFire) {
          didFire = true;
          onElapsedRef.current?.();
        }
        return;
      }
      const next = formatRemaining(diff, withSeconds, compact);
      // Avoid pointless state churn (keeps the UI smooth on slower devices).
      setLabel((prev) => (prev === next ? prev : next));
    };
    tick();
    const id = setInterval(tick, withSeconds ? 1000 : 10_000);
    return () => clearInterval(id);
  }, [targetMs, withSeconds, compact]);

  return label;
}

export default useCountdown;
