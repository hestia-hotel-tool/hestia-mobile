/**
 * The checklist's bulk-ticket form, kept for its author until they create the
 * tickets — "Save draft and continue later" (Figma 4759:1554). Like ticket
 * drafts (features/tickets/store/ticketDrafts) it lives on this device under
 * the signed-in user's id, so it needs no table and nobody else sees it.
 *
 * One draft per room and service day; each issue keeps its title, urgency and
 * local photo URIs.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TicketUrgency } from '@features/tickets/components/UrgencyPicker';

export type InspectionIssueDraft = {
  title: string;
  urgency: TicketUrgency;
  /** Local photo URIs (device files). */
  pictures: string[];
};

/** By inspection item id. */
export type InspectionTicketsDraft = Record<string, InspectionIssueDraft>;

const keyFor = (userId: string) => `inspectionTicketDrafts:${userId}`;
export const inspectionDraftKey = (roomId: string, serviceDay: string) => `${roomId}:${serviceDay}`;

async function readAll(userId: string): Promise<Record<string, InspectionTicketsDraft>> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    return raw ? (JSON.parse(raw) as Record<string, InspectionTicketsDraft>) : {};
  } catch {
    return {};
  }
}

export async function loadInspectionTicketsDraft(userId: string, key: string): Promise<InspectionTicketsDraft | null> {
  return (await readAll(userId))[key] ?? null;
}

/** Save (or, with `null`, delete) this room's draft. Older days' drafts are dropped. */
export async function saveInspectionTicketsDraft(
  userId: string,
  key: string,
  draft: InspectionTicketsDraft | null
): Promise<void> {
  const all = await readAll(userId);
  const day = key.split(':')[1];
  for (const k of Object.keys(all)) if (k.split(':')[1] !== day) delete all[k];
  if (draft) all[key] = draft;
  else delete all[key];
  try {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(all));
  } catch (e) {
    if (__DEV__) console.warn('[inspectionTicketDrafts] save failed', e);
  }
}
