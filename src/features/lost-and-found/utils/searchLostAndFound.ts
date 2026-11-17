import type { LostAndFoundItem } from '../types/lostAndFound.types';
import { LOST_AND_FOUND_CARD_CHROME } from '../constants/lostAndFoundCardChrome';
import { storedLocationLabel } from './storedLocations';

/** "11:00, 12/2/2026" from an ISO string; empty when unparseable. The card's own format (node 3871:3716). */
export function formatCardTimestamp(iso?: string): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(dt.getHours())}:${pad(dt.getMinutes())}, ${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`;
}

const STATUS_LABEL: Record<LostAndFoundItem['status'], string> = {
  stored: 'Stored',
  shipped: 'Shipped',
  returned: 'Returned',
  discarded: 'Discarded',
};

/** Lower-case, accents stripped, so "nguyen" finds "Nguyễn" and "cafe" finds "Café". */
export function normaliseSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Everything a Lost & Found card shows, as one searchable string: the item
 * and its tracking number, where it was found (room, public area, the guest
 * and their stay), who stored / shipped / discarded it and when, the stored or
 * shipped location, and the status. Searching for anything you can read on a
 * card finds that card.
 */
export function lostAndFoundSearchText(item: LostAndFoundItem): string {
  const chrome = LOST_AND_FOUND_CARD_CHROME[item.status] ?? LOST_AND_FOUND_CARD_CHROME.stored;
  const room = item.roomNumber != null ? String(item.roomNumber) : (item.location || '').match(/room\s*(\d+)/i)?.[1];
  const parts = [
    item.itemName,
    item.itemId,
    item.location,
    item.publicArea,
    room,
    room ? `room ${room}` : null,
    item.guestName,
    item.guestVipCode,
    item.guestDates,
    item.storedLocation,
    storedLocationLabel(item.storedLocation),
    item.notes,
    item.shippedLocation,
    item.shippedLocation ? storedLocationLabel(item.shippedLocation) : null,
    chrome.footerLabel,
    item.registeredBy?.name,
    item.registeredBy?.timestamp,
    formatCardTimestamp(item.storedAt ?? item.createdAt),
    STATUS_LABEL[item.status],
  ];
  return normaliseSearch(parts.filter((p): p is string => typeof p === 'string' && p.trim() !== '').join(' \n '));
}

/**
 * Does the item match the query? Every word must appear somewhere on the card
 * ("towel 201" finds the towels from room 201), in any order.
 */
export function matchesLostAndFoundQuery(item: LostAndFoundItem, query: string): boolean {
  const words = normaliseSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = lostAndFoundSearchText(item);
  return words.every((w) => haystack.includes(w));
}
