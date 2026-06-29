import React, { useEffect } from 'react';
import { useAuthStore } from '@features/auth/store/useAuthStore';

/** Mounts the auth init effect (session restore + onAuthStateChange subscription). */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    const cleanup = init();
    return cleanup;
  }, [init]);

  return <>{children}</>;
}
