/**
 * VIP codes and tiers — migration 20261106120000.
 *
 * A hotel gives its VIP guests a code, a whole number 1–10 (1 the most
 * important); a guest without one is a regular guest. Hestia groups the
 * codes into five tiers, per hotel, and the tier is what the app styles and
 * filters by — and what it prints: every disc and tag reads "V1"–"V5"
 * (client, 2026-11-06). The code stays in the data and the accessibility label.
 *
 * Pure: no React, no Supabase. The hotel's own tiers come from
 * `src/store/vipTiers.ts`; until they load (or if the table is missing) every
 * lookup uses `DEFAULT_VIP_TIERS`, which is exactly what the migration seeds.
 */

export type VipTierLevel = 1 | 2 | 3 | 4 | 5;

export type VipTier = {
  tier: VipTierLevel;
  /** "Very Very Important". */
  name: string;
  /** Text colour on a light ground; the disc is a tint of it (`vipTint`). */
  color: string;
  /** The hotel codes in this tier, inclusive. */
  minCode: number;
  maxCode: number;
};

export const VIP_CODE_MIN = 1;
export const VIP_CODE_MAX = 10;

export const DEFAULT_VIP_TIERS: readonly VipTier[] = [
  { tier: 1, name: 'Very Very Important', color: '#A0760A', minCode: 1, maxCode: 2 },
  { tier: 2, name: 'Very Important', color: '#6D3FD9', minCode: 3, maxCode: 4 },
  { tier: 3, name: 'Important', color: '#2F6FD6', minCode: 5, maxCode: 6 },
  { tier: 4, name: 'Recognition', color: '#0F8A7E', minCode: 7, maxCode: 8 },
  { tier: 5, name: 'Valued Guest', color: '#5A759D', minCode: 9, maxCode: 10 },
];

/** "V1" … "V5". */
export const vipTierLabel = (tier: VipTierLevel) => `V${tier}`;

/**
 * A stored code as the app uses it: "1" … "10", or null for a regular guest.
 * Anything else (blank, "N/A", "22", "VIP") is not a code.
 */
export function normalizeVipCode(raw: string | number | null | undefined): string | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!/^\d{1,2}$/.test(text)) return null;
  const n = Number(text);
  return n >= VIP_CODE_MIN && n <= VIP_CODE_MAX ? String(n) : null;
}

/** The tier a code falls in, or null for a regular guest. */
export function vipTierFor(
  code: string | number | null | undefined,
  tiers: readonly VipTier[] = DEFAULT_VIP_TIERS
): VipTier | null {
  const normal = normalizeVipCode(code);
  if (normal == null) return null;
  const n = Number(normal);
  return tiers.find((t) => n >= t.minCode && n <= t.maxCode) ?? null;
}

/** The tier colour at `alpha` — the disc behind the code. */
export function vipTint(color: string, alpha = 0.15): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!m) return color;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * How a VIP code is drawn, everywhere: Figma 4553:805's grey disc (#b0b4b0 at
 * 17%) with the code in #334866. Neutral on purpose (client feedback,
 * 2026-11-06): colour is kept for what needs attention — status, priority,
 * flags — and a page of coloured VIP discs was visual noise. Tier colours
 * stay in `vip_tiers` but are not drawn.
 */
export const VIP_NEUTRAL = {
  disc: 'rgba(176, 180, 176, 0.17)',
  ink: '#334866',
  /** Labels and the active step of the V1–V5 scale. */
  accent: '#5a759d',
} as const;
