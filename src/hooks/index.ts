/**
 * Global hooks - central export
 */
export { useAuth } from '@features/auth';
export { useUser } from '@features/account';
export type { UseUserResult } from '@features/account';
export { useFetch } from './useFetch';
export type { UseFetchResult } from './useFetch';
export { useHomeFilters } from '@features/home';
export { useDesignScale } from './useDesignScale';
export { useScale } from './useScale';
