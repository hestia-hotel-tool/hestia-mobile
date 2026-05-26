/** Formats `tickets.due_at` for ticket cards (Figma 3129:1335 — e.g. "Due Today 11pm", "Due Thursday 11pm"). */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime12h(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  if (m === 0) return `${h12}${ampm}`;
  return `${h12}:${String(m).padStart(2, '0')}${ampm}`;
}

function startOfLocalDay(x: Date): Date {
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}

export function formatDueAtCalendarLabel(iso: string, nowMs: number = Date.now()): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const now = new Date(nowMs);
  const diffDays = Math.round(
    (startOfLocalDay(d).getTime() - startOfLocalDay(now).getTime()) / 86400000
  );
  const timeStr = formatTime12h(d);

  if (diffDays === 0) return `Due Today ${timeStr}`;
  if (diffDays === 1) return `Due Tomorrow ${timeStr}`;
  if (diffDays === -1) return `Due Yesterday ${timeStr}`;
  if (diffDays > 1 && diffDays <= 14) return `Due ${WEEKDAYS[d.getDay()]} ${timeStr}`;
  if (diffDays < -1 && diffDays >= -14) return `Due ${WEEKDAYS[d.getDay()]} ${timeStr}`;

  const pad2 = (n: number) => String(n).padStart(2, '0');
  return `Due ${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${timeStr}`;
}
