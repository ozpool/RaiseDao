'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

/** Keeps the persisted session honest. On load it re-validates any stored token
 *  against /auth/me and drops it if the API rejects it, so a stale or revoked
 *  JWT never reads as signed-in.
 *
 *  The JWT — not the live wallet connection — is the proof of identity, so the
 *  session deliberately survives a wallet disconnect and a page reload. We only
 *  drop it for two reasons: the API rejects the token (below), or a *different*
 *  wallet actively connects (an account switch). Signing out is explicit — the
 *  header button calls clear() itself. Earlier this also cleared on any
 *  `disconnected` status, which logged the user out on every refresh (wagmi
 *  often settles at `disconnected` while reconnecting) and whenever the wallet
 *  briefly dropped. Renders nothing; mounted once inside the web3 providers. */
export function AuthSync() {
  const { address, status } = useAccount();
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
    // Only act on a settled, *connected* wallet. A disconnected/reconnecting
    // wallet (the reload case) leaves the session untouched — the token still
    // proves who you are. Clear only when a genuinely different account is live.
    if (status !== 'connected' || !address) return;
    if (address.toLowerCase() !== session.address.toLowerCase()) clear();
  }, [address, status, session, clear]);

  return null;
}
