import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

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
   * UP (elapsed since startTimeIso). Once credit is used up it flips to
   * overtime: "+MM:SS" of extra time, shown in overtimeColor.
   */
  countdownFromMins?: number | null;
  /** Color used when a countdown goes into overtime. */
  overtimeColor?: string;
  style?: any;
}

/** Live HH:MM:SS timer. Counts down from credit when given (with red overtime), else counts up. */
export default function ElapsedTimer({
  startTimeIso,
  paused,
  countdownFromMins,
  overtimeColor = '#f92424',
  style,
}: ElapsedTimerProps) {
  const startMs = startTimeIso ? new Date(startTimeIso).getTime() : NaN;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (paused || !Number.isFinite(startMs)) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [paused, startMs]);

  if (!Number.isFinite(startMs)) return <Text style={style}>--:--:--</Text>;

  const elapsed = now - startMs;
  const isCountdown = countdownFromMins != null && Number.isFinite(countdownFromMins);

  if (!isCountdown) {
    return <Text style={style}>{formatElapsed(elapsed)}</Text>;
  }

  const remaining = (countdownFromMins as number) * 60000 - elapsed;
  if (remaining >= 0) {
    return <Text style={style}>{formatElapsed(remaining)}</Text>;
  }
  // Credit used up: countdown stays at 00:00:00 and the extra time used ticks
  // up in red to the right.
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text style={style}>00:00:00</Text>
      <Text style={[style, { color: overtimeColor, marginLeft: 6 }]}>{`+${formatElapsed(-remaining)}`}</Text>
    </View>
  );
}
