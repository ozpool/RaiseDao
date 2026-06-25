'use client';

import { useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { api } from '@/lib/api';
import { buildSiweMessage } from '@/lib/siwe';
import { useAuthStore } from '@/stores/auth';

/** Orchestrates the SIWE handshake: ask the API for a nonce, build and sign the
 *  message, then verify it for a JWT. Signing needs wagmi hooks, so the flow
 *  lives here while the store just holds the result. Throws on failure (e.g. the
 *  user rejecting the signature) after resetting state so the UI can retry. */
export function useSiweLogin() {
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setStatus = useAuthStore((s) => s.setStatus);
  const clear = useAuthStore((s) => s.clear);

  return useCallback(async () => {
    if (!address) return;
    setStatus('authenticating');
    try {
      const { nonce } = await api.auth.nonce(address);
      const message = buildSiweMessage({ address, chainId: chainId ?? arbitrumSepolia.id, nonce });
      const signature = await signMessageAsync({ message });
      const result = await api.auth.verify(message, signature);
      setAuth(result.token, { address: result.address, roles: result.roles });
    } catch (err) {
      clear();
      throw err;
    }
  }, [address, chainId, signMessageAsync, setAuth, setStatus, clear]);
}
