'use client';

import { useAuthStore } from '@/stores/auth';

/** Read-only view of the session for components that only need to know who's
 *  signed in. Writes go through the SIWE login hook and AuthSync, not here. */
export function useAuth() {
  const status = useAuthStore((s) => s.status);
  const session = useAuthStore((s) => s.session);
  return { status, session, isAuthenticated: status === 'authenticated' };
}
