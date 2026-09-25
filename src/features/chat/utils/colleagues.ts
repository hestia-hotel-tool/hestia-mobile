import type { User } from '@/types';
import { getUsers } from '@features/account/services/user';
import { getCurrentUserId } from '../services/chat';

/** `getUsers` caps a page at 100; a hotel's staff list is a few pages at most. */
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

/**
 * Everyone in the caller's hotel except the caller — for the New Chat and
 * Create Chat Group pickers. Both used to load only the first 50.
 */
export async function loadAllColleagues(): Promise<User[]> {
  const [uid, first] = await Promise.all([getCurrentUserId(), getUsers({ page: 1, limit: PAGE_SIZE })]);
  let all = first.data;
  for (let page = 2; page <= Math.min(first.totalPages, MAX_PAGES); page += 1) {
    const next = await getUsers({ page, limit: PAGE_SIZE });
    all = all.concat(next.data);
  }
  return uid ? all.filter((u) => u.id !== uid) : all;
}

export type ColleagueSection = { title: string; data: User[] };

/** Name, job title, role or department contains `query` (case-insensitive). */
export function matchesColleague(user: User, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [user.name, user.jobTitle, user.role, user.department].some((f) => (f ?? '').toLowerCase().includes(q));
}

/** Department sections A–Z ("Other" last), people A–Z within each. */
export function groupByDepartment(users: User[]): ColleagueSection[] {
  const groups = new Map<string, User[]>();
  for (const user of users) {
    const department = user.department?.trim() || 'Other';
    const list = groups.get(department) ?? [];
    list.push(user);
    groups.set(department, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)))
    .map(([title, data]) => ({ title, data: [...data].sort((a, b) => a.name.localeCompare(b.name)) }));
}
