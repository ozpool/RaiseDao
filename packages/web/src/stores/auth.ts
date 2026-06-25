import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session } from '@/lib/api';

/** Where the session can be in its lifecycle. `authenticating` covers the round
 *  trip from nonce request through signature to verify. */
export type AuthStatus = 'unauthenticated' | 'authenticating' | 'authenticated';

interface AuthState {
  token: string | null;
  session: Session | null;
  status: AuthStatus;
  setAuth: (token: string, session: Session) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
}

/** Auth state, persisted to localStorage so a refresh keeps the user signed in.
 *  Only the token + session are persisted — `status` is derived on load (the
 *  token is re-validated against /auth/me before we trust it; see AuthSync).
 *
 *  Storing the JWT in localStorage means it's readable by any script on the
 *  page, so an XSS bug would expose it. That's an accepted tradeoff for this
 *  testnet portfolio build; a production app would prefer an httpOnly cookie,
 *  which is an API-side change (the API currently returns the token in the body
 *  for a bearer header). */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      session: null,
      status: 'unauthenticated',
      setAuth: (token, session) => set({ token, session, status: 'authenticated' }),
      setStatus: (status) => set({ status }),
      clear: () => set({ token: null, session: null, status: 'unauthenticated' }),
    }),
    {
      name: 'raisedao-auth',
      partialize: (s) => ({ token: s.token, session: s.session }),
    },
  ),
);
