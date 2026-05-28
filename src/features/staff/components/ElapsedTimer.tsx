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
  /** ISO timestamp the timer counts up from. */
  startTimeIso?: string | null;
  /** When true, the timer freezes (no ticking). */
  paused?: boolean;
  style?: any;
}

/** Live HH:MM:SS elapsed timer. Ticks every second unless paused. */
export default function ElapsedTimer({ startTimeIso, paused, style }: ElapsedTimerProps) {
  const startMs = startTimeIso ? new Date(startTimeIso).getTime() : NaN;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (paused || !Number.isFinite(startMs)) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [paused, startMs]);

  if (!Number.isFinite(startMs)) return <Text style={style}>--:--:--</Text>;
  return <Text style={style}>{formatElapsed(now - startMs)}</Text>;
}
