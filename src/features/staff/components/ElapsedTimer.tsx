import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

interface ElapsedTimerProps {
  /** ISO timestamp the timer measures from (start of work). */
  startTimeIso?: string | null;
  /** When true, the timer freezes (no ticking). */
  paused?: boolean;
  /**
   * When set, the timer counts DOWN from this many minutes (the room's allotted
   * clean credit), i.e. remaining = credit − elapsed. When omitted, it counts
   * UP (elapsed since startTimeIso). Clamps at 00:00:00 once credit is used up.
   */
  countdownFromMins?: number | null;
  style?: any;
}

/** Live HH:MM:SS timer. Counts down from credit when given, else counts up. Ticks every second unless paused. */
export default function ElapsedTimer({ startTimeIso, paused, countdownFromMins, style }: ElapsedTimerProps) {
  const startMs = startTimeIso ? new Date(startTimeIso).getTime() : NaN;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (paused || !Number.isFinite(startMs)) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [paused, startMs]);

  if (!Number.isFinite(startMs)) return <Text style={style}>--:--:--</Text>;

  const elapsed = now - startMs;
  const ms =
    countdownFromMins != null && Number.isFinite(countdownFromMins)
      ? countdownFromMins * 60000 - elapsed
      : elapsed;
  return <Text style={style}>{formatElapsed(ms)}</Text>;
}
