import { useAuthStore } from '../store/useAuthStore';

export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const hotelId = useAuthStore((s) => s.hotelId);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);
  const resetPassword = useAuthStore((s) => s.resetPassword);

  return {
    session,
    hotelId,
    isLoading,
    isAuthenticated: !!session,
    error,
    signIn,
    signOut,
    resetPassword,
  };
}
