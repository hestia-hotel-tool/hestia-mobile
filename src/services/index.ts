/**
 * Services – all data from Supabase
 * rooms: rooms + reservations + guests (Supabase)
 * dashboard: screen data aggregation (rooms from Supabase, rest mock until migrated)
 * (auth moved to @features/auth in phase 4.1; user moved to @features/account in phase 4.2)
 */

export * from './rooms';
export * from './guests';
export * from './dashboard';
