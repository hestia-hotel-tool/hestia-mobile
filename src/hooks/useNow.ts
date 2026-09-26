import { useEffect, useState } from 'react';

/**
 * The current time, refreshed every `TICK_MS` — for live labels such as
 * "32 min left" or "in 25 min" that are only ever shown to the minute.
 *
 * One interval for the whole app, not one per card: a Rooms list of 60 cards
 * would otherwise run 60 timers. Each subscriber re-renders on the tick.
 */
const TICK_MS = 15_000;

const listeners = new Set<(now: number) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: (now: number) => void): () => void {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(() => {
      const now = Date.now();
      listeners.forEach((l) => l(now));
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => subscribe(setNow), []);
  return now;
}

export default useNow;
