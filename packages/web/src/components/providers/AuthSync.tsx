'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

/** Keeps the persisted session honest. On load it re-validates any stored token
 *  against /auth/me and drops it if the API rejects it, so a stale or revoked
 *  JWT never reads as signed-in. It also binds the session to one wallet: if the
 *  wallet disconnects or switches accounts, the session is cleared. Renders
 *  nothing; mounted once inside the web3 providers. */
export function AuthSync() {
  const { address, isConnected } = useAccount();
  const token = useAuthStore((s) => s.token);
  const session = useAuthStore((s) => s.session);
  const setStatus = useAuthStore((s) => s.setStatus);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    api.auth
      .me(token)
      .then(() => alive && setStatus('authenticated'))
      .catch(() => alive && clear());
    return () => {
      alive = false;
    };
  }, [token, setStatus, clear]);

  useEffect(() => {
    if (!session) return;
    const mismatch = address && address.toLowerCase() !== session.address.toLowerCase();
    if (!isConnected || mismatch) clear();
  }, [address, isConnected, session, clear]);

  return null;
}
