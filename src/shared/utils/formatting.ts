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

