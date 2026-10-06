/**
 * Time zones a hotel can pick, grouped by region, by their IANA names (what
 * `hotels.timezone` stores and Postgres checks). A curated list rather than
 * every zone: hotel managers look for their city, not "America/Argentina/
 * ComodRivadavia".
 */
export const TIME_ZONES: { region: string; zones: string[] }[] = [
  {
    region: 'Europe',
    zones: [
      'Europe/Zurich',
      'Europe/London',
      'Europe/Dublin',
      'Europe/Lisbon',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Rome',
      'Europe/Madrid',
      'Europe/Amsterdam',
      'Europe/Brussels',
      'Europe/Vienna',
      'Europe/Prague',
      'Europe/Warsaw',
      'Europe/Stockholm',
      'Europe/Athens',
      'Europe/Istanbul',
      'Europe/Moscow',
    ],
  },
  {
    region: 'Africa',
    zones: [
      'Africa/Douala',
      'Africa/Lagos',
      'Africa/Casablanca',
      'Africa/Cairo',
      'Africa/Johannesburg',
      'Africa/Nairobi',
      'Africa/Accra',
      'Africa/Abidjan',
      'Africa/Dakar',
      'Africa/Kinshasa',
    ],
  },
  {
    region: 'Middle East & Asia',
    zones: [
      'Asia/Dubai',
      'Asia/Riyadh',
      'Asia/Qatar',
      'Asia/Kolkata',
      'Asia/Bangkok',
      'Asia/Singapore',
      'Asia/Hong_Kong',
      'Asia/Shanghai',
      'Asia/Tokyo',
      'Asia/Seoul',
    ],
  },
  {
    region: 'Americas',
    zones: [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Toronto',
      'America/Mexico_City',
      'America/Sao_Paulo',
      'America/Buenos_Aires',
    ],
  },
  { region: 'Oceania', zones: ['Australia/Sydney', 'Australia/Perth', 'Pacific/Auckland'] },
  { region: 'Other', zones: ['UTC'] },
];

/** "Europe/Zurich" → "Zurich"; "America/New_York" → "New York". */
export function timeZoneCity(zone: string): string {
  if (zone === 'UTC') return 'UTC (Coordinated Universal Time)';
  return (zone.split('/').pop() ?? zone).replace(/_/g, ' ');
}

/** The time now in a zone, "14:30"; "" if this device cannot tell. */
export function timeInZone(zone: string, now: Date = new Date()): string {
  try {
    return now.toLocaleTimeString('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}
