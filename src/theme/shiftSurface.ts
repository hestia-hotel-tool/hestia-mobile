/**
 * Text and accents for content drawn straight on the page background, which
 * turns dark slate (#38414F) in PM mode on Home and Rooms.
 *
 * Cards keep their own light grounds and colours; only what sits on the page
 * itself — titles, section headings, empty and off-shift messages, links —
 * switches. Without it, the app's dark ink (#1e1e1e, #334866) all but
 * vanishes on slate (client feedback, 2026-10-26).
 *
 * Contrast on #38414F: text 10.9:1, muted 6.5:1, accent 6.9:1 (AA for body).
 */
export const PM_SURFACE = {
  background: '#38414F',
  /** Titles and primary text. */
  text: '#FFFFFF',
  /** Secondary lines. */
  textMuted: 'rgba(255, 255, 255, 0.78)',
  /** Links and icons that are #5a759d on the light page. */
  accent: '#AFC4E6',
  /** A soft disc behind an icon. */
  iconDisc: 'rgba(255, 255, 255, 0.10)',
} as const;

/** The PM palette when the page is dark, else null (keep the light-page colours). */
export function pmSurface(shift: string | null | undefined): typeof PM_SURFACE | null {
  return shift === 'PM' ? PM_SURFACE : null;
}
