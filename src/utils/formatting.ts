/**
 * Format date to display string
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format time to display string
 */
export const formatTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * A `Date` as "HH:mm", 24-hour — the form the Room Detail header's activity
 * line prints ("Paused at 11:22", Figma 2333-132).
 *
 * A sibling of `formatClockTime` below rather than an overload of it: that one
 * parses a *string* from the database and argues at length for staying
 * string-only, since a bare time is not a date. This one starts from an instant
 * and never parses anything. Same output shape, different input world.
 */
export const formatClock24 = (date: Date): string =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

/**
 * A wall-clock time as "HH:mm", 24-hour.
 *
 * `reservations.eta` is a Postgres `time`, so PostgREST returns it with seconds
 * — "17:00:00". It was passed through untouched, and every ETA and EDT on the
 * room cards and the detail screen read "ETA: 17:00:00" against a design that
 * shows "ETA: 17:00" (Figma 1772-104). `GuestInfo.time`'s own doc comment
 * already promised "HH:mm (24h)", so the service was the thing that was wrong.
 *
 * Not `formatTime` above: that takes a Date, returns 12-hour with AM/PM, and
 * `new Date('17:00:00')` is Invalid Date anyway — a bare time is not a date.
 *
 * Tolerant on input because the value has three possible origins: the DB
 * ("17:00:00"), a modal that already formatted it ("17:00"), and hand-entered
 * strings in seed data ("5:00 PM"). Anything unparseable comes back empty
 * rather than as itself, so a bad value shows nothing instead of showing
 * garbage next to a label.
 */
export const formatClockTime = (value: string | null | undefined): string => {
  const raw = (value ?? '').trim();
  if (!raw || raw.toUpperCase() === 'N/A') return '';

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return '';

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes > 59) return '';
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (hours > 23) return '';

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Format date and time together
 */
export const formatDateTime = (date: Date | string): string => {
  return `${formatDate(date)} ${formatTime(date)}`;
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return formatDate(date);
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Format guest count for display: "adults/kids" (e.g. "2/2")
 * Returns empty string when undefined or both adults and kids are 0
 */
export const formatGuestCount = (guestCount: { adults: number; kids: number } | undefined | null): string => {
  if (!guestCount) return '';
  if (guestCount.adults === 0 && guestCount.kids === 0) return '';
  return `${guestCount.adults}/${guestCount.kids}`;
};

/**
 * Get floor number from room number (first digit determines floor)
 * e.g. 101 -> 1, 305 -> 3, 507 -> 5
 */
export const getFloorFromRoomNumber = (roomNumber: string): number | null => {
  const firstChar = (roomNumber || '').trim()[0];
  const floor = Number.parseInt(firstChar || '', 10);
  return Number.isFinite(floor) && floor >= 1 && floor <= 9 ? floor : null;
};

/**
 * Get display label for floor number (1st Floor, 2nd Floor, 3rd Floor, etc.)
 */
export const getFloorLabel = (floorNum: number): string => {
  const n = Math.floor(floorNum);
  if (n === 1) return '1st Floor';
  if (n === 2) return '2nd Floor';
  if (n === 3) return '3rd Floor';
  return `${n}th Floor`;
};

/**
 * Get initials from full name (first letter of first and last name)
 * e.g. "John Doe" -> "JD", "Mary" -> "M"
 */
export const getInitialsFromFullName = (fullName: string): string => {
  if (!fullName?.trim()) return '?';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  const first = parts[0].charAt(0).toUpperCase();
  const last = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${first}${last}`;
};

/**
 * Format dates of stay for display: "DD/MM - DD/MM" (e.g. "03/01 - 06/01"), year trimmed
 * Accepts ISO (YYYY-MM-DD) in from/to
 */
export const formatDatesOfStay = (datesOfStay: { from: string; to: string } | undefined | null): string => {
  if (!datesOfStay?.from || !datesOfStay?.to) return '';
  const formatPart = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };
  return `${formatPart(datesOfStay.from)} - ${formatPart(datesOfStay.to)}`;
};

/**
 * The same range with no spaces around the dash: "07/10-15/10".
 *
 * What the room card actually shows — Figma 3883:5592 and 3838:1329. The spaced
 * form is ~8px wider at 14px Helvetica, which is enough to push the occupancy
 * count off a 402pt-wide card.
 *
 * A separate export rather than a change to `formatDatesOfStay`, because that
 * one also feeds the room-detail guest card and this pass has no design for it.
 */
export const formatDatesOfStayCompact = (
  datesOfStay: { from: string; to: string } | undefined | null
): string => formatDatesOfStay(datesOfStay).replace(' - ', '-');


/**
 * A moment, the way staff say it — 24-hour, and only as much date as needed:
 * "14:30" today, "tomorrow 09:00", "yesterday 18:10", otherwise
 * "Mon 29 Sep 09:00".
 *
 * Replaces showing the bare clock for Return Later and Promise Time, where a
 * time on another day read as today's.
 */
export const formatDueTime = (at: Date | number, now: Date = new Date()): string => {
  const d = typeof at === 'number' ? new Date(at) : at;
  if (!Number.isFinite(d.getTime())) return '';
  const clock = formatClock24(d);
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((dayStart(d) - dayStart(now)) / 86_400_000);
  if (days === 0) return clock;
  if (days === 1) return `tomorrow ${clock}`;
  if (days === -1) return `yesterday ${clock}`;
  // Fixed names, not toLocaleDateString: en-GB writes "Sept", and the
  // server-side notification text (to_char 'Dy FMDD Mon') writes "Sep".
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return `${weekday} ${d.getDate()} ${month} ${clock}`;
};

/**
 * A span, rounded to whole minutes: "1 min", "25 min", "1 h", "1 h 5 min".
 * Under half a minute reads "under a minute". No seconds: a ticking seconds
 * counter on a housekeeping card is noise, not information.
 */
export const formatMinutesSpan = (ms: number): string => {
  const mins = Math.round(Math.abs(ms) / 60_000);
  if (mins < 1) return 'under a minute';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
};

/**
 * How far off a deadline is: "in 25 min", "in 1 h 5 min", "due now", or
 * "25 min late" once it has passed.
 */
export const formatDueIn = (at: number, now: number = Date.now()): string => {
  const diff = at - now;
  if (Math.abs(diff) < 60_000) return 'due now';
  return diff > 0 ? `in ${formatMinutesSpan(diff)}` : `${formatMinutesSpan(diff)} late`;
};
