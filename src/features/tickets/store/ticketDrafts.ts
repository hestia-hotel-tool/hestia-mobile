/**
 * Ticket drafts — a ticket started and left halfway, kept for its author only,
 * the way Gmail keeps an unsent message.
 *
 * Saved on this device under the signed-in user's id (AsyncStorage), so a
 * draft is never visible to anyone else and needs no table or migration. The
 * form autosaves while it is being filled; submitting deletes the draft.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

export type TicketDraftPriority = 'high' | 'medium' | 'low';

export interface TicketDraft {
  id: string;
  /** ISO time of the last edit. */
  updatedAt: string;
  // Where the ticket is for — what the form was opened with.
  roomId?: string;
  roomNumber?: string;
  isPublicArea?: boolean;
  publicAreaName?: string;
  // What had been filled in.
  departmentId?: string | null;
  title: string;
  description: string;
  priority: TicketDraftPriority;
  /** Local photo URIs (device files), so a draft's photos live on this device. */
  pictures: string[];
  taggedStaffIds: string[];
}

const keyFor = (userId: string) => `ticketDrafts:${userId}`;

interface DraftsState {
  userId: string | null;
  drafts: TicketDraft[];
  /** Load this user's drafts (no-op when already loaded for them). */
  load: (userId: string | null | undefined) => Promise<void>;
  save: (draft: TicketDraft) => void;
  remove: (id: string) => void;
}

function persist(userId: string | null, drafts: TicketDraft[]) {
  if (!userId) return;
  AsyncStorage.setItem(keyFor(userId), JSON.stringify(drafts)).catch((e) => {
    if (__DEV__) console.warn('[ticketDrafts] save failed', e);
  });
}

export const useTicketDrafts = create<DraftsState>((set, get) => ({
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
      const parsed = raw ? (JSON.parse(raw) as TicketDraft[]) : [];
      // A sign-out or a second user may have landed while reading.
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

export function newDraftId(): string {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Worth keeping: something the user typed or attached, not just the defaults. */
export function draftHasContent(d: Pick<TicketDraft, 'title' | 'description' | 'pictures' | 'taggedStaffIds'>): boolean {
  return d.title.trim().length > 0 || d.description.trim().length > 0 || d.pictures.length > 0 || d.taggedStaffIds.length > 0;
}
