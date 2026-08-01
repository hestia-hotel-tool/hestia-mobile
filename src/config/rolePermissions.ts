export const ALL_TABS = ['Home', 'Rooms', 'Chat', 'Tickets', 'LostAndFound', 'Staff', 'Settings'] as const;
export type TabId = (typeof ALL_TABS)[number];

type RoleCategory = 'admin' | 'housekeeping' | 'housekeepingSupervisor' | 'engineering' | 'frontOffice' | 'night';

const ROLE_CATEGORY_MAP: Record<string, RoleCategory> = {
  'General Manager': 'admin',
  'Hotel Manager': 'admin',
  'IT Administrator': 'admin',
  'Executive Housekeeper': 'housekeepingSupervisor',
  'Housekeeping Manager': 'housekeepingSupervisor',
  'Assistant Housekeeping Manager': 'housekeepingSupervisor',
  'Senior Supervisor': 'housekeepingSupervisor',
  'Supervisor': 'housekeepingSupervisor',
  'Coordinator': 'housekeepingSupervisor',
  'Housekeeping Room Attendant': 'housekeeping',
  'Housekeeping Portier / Houseman': 'housekeeping',
  'Housekeeping Laundry Attendant': 'housekeeping',
  'Housekeeping Public Area Attendant': 'housekeeping',
  'Director of Engineering': 'engineering',
  'Engineering Supervisor': 'engineering',
  'Shift Engineer': 'engineering',
  'Director of Rooms': 'frontOffice',
  'Assistant Director of Rooms': 'frontOffice',
  'Director of Front Office': 'frontOffice',
  'Front Office Manager': 'frontOffice',
  'Front Office Supervisor': 'frontOffice',
  'Front Office Agent': 'frontOffice',
  'Front Office Trainee': 'frontOffice',
  'Night Manager': 'night',
  'Night Auditor': 'night',
  'Night Agent': 'night',
};

const CATEGORY_TABS: Record<RoleCategory, TabId[]> = {
  admin: ['Home', 'Rooms', 'Chat', 'Tickets', 'LostAndFound', 'Staff', 'Settings'],
  housekeepingSupervisor: ['Home', 'Rooms', 'Chat', 'Tickets', 'LostAndFound', 'Staff', 'Settings'],
  housekeeping: ['Home', 'Rooms', 'Chat', 'Tickets'],
  engineering: ['Home', 'Chat', 'Tickets', 'LostAndFound'],
  frontOffice: ['Home', 'Chat', 'Tickets', 'LostAndFound'],
  night: ['Home', 'Chat', 'Tickets', 'LostAndFound'],
};

export function getAllowedTabs(roleName: string | undefined | null): TabId[] {
  if (!roleName) return ['Home', 'Chat'];
  const category = ROLE_CATEGORY_MAP[roleName];
  if (!category) return ['Home', 'Chat'];
  return CATEGORY_TABS[category];
}

export function isTabAllowed(tabId: string, roleName: string | undefined | null): boolean {
  const allowed = getAllowedTabs(roleName);
  return allowed.includes(tabId as TabId);
}
