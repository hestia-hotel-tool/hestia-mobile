/**
 * Lost & Found drafts — an item someone started registering and left, kept for
 * them only, the way Gmail keeps an unsent message (user, 2026-11-17; the same
 * idea as tickets/store/ticketDrafts).
 *
 * Saved on this device under the signed-in user's id (AsyncStorage): never
 * visible to anyone else, no table or migration, and the photos are the
 * device's own files. The Register sheet autosaves while it is filled in;
 * registering the item deletes the draft.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { RoomPickerRoom } from '@features/rooms/types/roomPicker.types';

export interface LostAndFoundDraft {
  id: string;
  /** ISO time of the last edit. */
  updatedAt: string;
  /** The step the sheet was on (1–3). */
  step: number;
  selectedLocation: 'room' | 'publicArea';
  selectedRoom: RoomPickerRoom | null;
  selectedPublicArea: string | null;
  /** When it was found: the sheet's date with its hour and minute, ISO. */
  foundAt: string;
  title: string;
  notes: string;
  foundedBy: string;
  registeredBy: string;
  status: string;
  storedLocation: string;
  pictures: string[];
  sendEmailToGuest: boolean;
  guestEmail: string;
}

const keyFor = (userId: string) => `lostAndFoundDrafts:${userId}`;

interface DraftsState {
  userId: string | null;
  drafts: LostAndFoundDraft[];
  load: (userId: string | null | undefined) => Promise<void>;
  save: (draft: LostAndFoundDraft) => void;
  remove: (id: string) => void;
}

function persist(userId: string | null, drafts: LostAndFoundDraft[]) {
  if (!userId) return;
  AsyncStorage.setItem(keyFor(userId), JSON.stringify(drafts)).catch((e) => {
    if (__DEV__) console.warn('[lostAndFoundDrafts] save failed', e);
  });
}

export const useLostAndFoundDrafts = create<DraftsState>((set, get) => ({
  userId: null,
  drafts: [],
  load: async (userId) => {
    if (!userId) {
      set({ userId: null, drafts: [] });
      return;
    }
    if (get().userId === userId) return;
    set({ userId, drafts: [] });
    try {
      const raw = await AsyncStorage.getItem(keyFor(userId));
      const parsed = raw ? (JSON.parse(raw) as LostAndFoundDraft[]) : [];
      if (get().userId === userId) set({ drafts: Array.isArray(parsed) ? parsed : [] });
    } catch {
      if (get().userId === userId) set({ drafts: [] });
    }
  },
  save: (draft) => {
    const { userId, drafts } = get();
    const next = [draft, ...drafts.filter((d) => d.id !== draft.id)];
    set({ drafts: next });
    persist(userId, next);
  },
  remove: (id) => {
    const { userId, drafts } = get();
    const next = drafts.filter((d) => d.id !== id);
    if (next.length === drafts.length) return;
    set({ drafts: next });
    persist(userId, next);
  },
}));

export function newLostAndFoundDraftId(): string {
  return `lf-draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Worth keeping: a title, a description or a photo — not just the defaults. */
export function lostAndFoundDraftHasContent(d: Pick<LostAndFoundDraft, 'title' | 'notes' | 'pictures'>): boolean {
  return d.title.trim().length > 0 || d.notes.trim().length > 0 || d.pictures.length > 0;
}
