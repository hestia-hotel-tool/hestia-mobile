/** How many suggestions the popover will ever show. */
export const SHIPPED_LOCATION_SUGGESTION_LIMIT = 20;

/**
 * Score one candidate against the typed query.
 *
 * Exported for tests. The bands are deliberately far apart — 100 / 60 / 40 / 20
 * for the whole query, then a tenth of that per token — so a whole-query match
 * always outranks any number of token matches. Without the gap, "bremgarten
 * zug" typed against "zug bremgarten 34" and "bremgarten zug" would tie.
 */
export function scoreShippedLocation(candidate: string, query: string): number {
  const lc = candidate.toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  let score = 0;
  if (lc === q) score += 100;
  if (lc.startsWith(q)) score += 60;
  // A word-ish boundary: the query starts a word rather than landing mid-word.
  if (lc.includes(` ${q}`) || lc.includes(`-${q}`) || lc.includes(`,${q}`)) score += 40;
  if (lc.includes(q)) score += 20;

  for (const token of q.split(/\s+/).filter(Boolean)) {
    if (lc === token) score += 10;
    if (lc.startsWith(token)) score += 6;
    if (lc.includes(` ${token}`) || lc.includes(`-${token}`) || lc.includes(`,${token}`)) score += 4;
    if (lc.includes(token)) score += 2;
  }

  // Break ties towards the shorter string, which is the more exact one.
  return score - Math.min(10, Math.floor(lc.length / 20));
}

/**
 * Rank shipped-location suggestions for the status popover.
 *
 * Sources are merged in priority order and de-duplicated case-insensitively,
 * keeping the first spelling seen: the local cache of what this user typed
 * recently comes first, then locations already on other items. A hotel ships to
 * the same few addresses, so the cache is usually the better list — and it is
 * also the only list that works while the `shipped_location` column is missing
 * from the schema cache.
 *
 * An empty query returns the merged list unranked, so opening the field shows
 * recent destinations rather than nothing.
 *
 * Pure and dependency-free, extracted from a 40-line `useMemo` inside the
 * screen so the ranking can be tested without mounting anything.
 */
export function rankShippedLocations(
  query: string,
  sources: { cached?: readonly string[]; fromItems?: readonly (string | undefined)[] }
): string[] {
  const unique = new Map<string, string>(); // lowercased -> first spelling seen
  const add = (value?: string) => {
    const trimmed = (value ?? '').trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!unique.has(key)) unique.set(key, trimmed);
  };

  for (const value of sources.cached ?? []) add(value);
  for (const value of sources.fromItems ?? []) add(value);

  const values = Array.from(unique.values());
  if (!query.trim()) return values.slice(0, SHIPPED_LOCATION_SUGGESTION_LIMIT);

  return values
    .map((value) => ({ value, score: scoreShippedLocation(value, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.value)
    .slice(0, SHIPPED_LOCATION_SUGGESTION_LIMIT);
}
