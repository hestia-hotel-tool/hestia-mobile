/**
 * Where a found item is kept. The column holds these camelCase keys (the
 * register form's StoredLocationDropdown writes them); people read the labels.
 */
export const STORED_LOCATIONS = [
  { value: 'hskOffice', label: 'HSK Office' },
  { value: 'frontDesk', label: 'Front Desk' },
  { value: 'securityOffice', label: 'Security Office' },
  { value: 'lostAndFoundRoom', label: 'Lost & Found Room' },
] as const;

const LABEL: Record<string, string> = Object.fromEntries(STORED_LOCATIONS.map((o) => [o.value, o.label]));

/**
 * A stored-location key as a person would read it — "hskOffice" → "HSK Office".
 *
 * Unknown values fall through unchanged rather than being mangled: a free-text
 * shipped location like "34 bremgarten zug" must survive this untouched.
 */
export function storedLocationLabel(value?: string | null): string {
  const raw = (value ?? '').trim();
  if (!raw) return '—';
  return LABEL[raw] ?? raw;
}
