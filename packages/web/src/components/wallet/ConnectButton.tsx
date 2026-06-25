'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useSiweLogin } from '@/hooks/useSiweLogin';
import { useAuthStore } from '@/stores/auth';

/** 0x1234…abcd — enough to recognise, short enough for the nav. */
function shortAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

const PILL =
  'inline-flex items-center gap-2 rounded-full border border-line bg-panel/60 px-4 py-1.5 font-mono text-caption uppercase tracking-widest transition-colors';
const ACTIVE = 'text-paper hover:border-data hover:text-data disabled:opacity-50';

/** Wallet control for the header, three states: connect the wallet, sign in with
 *  SIWE, then signed-in (click to sign out). A mount guard keeps the server and
 *  first client render identical so wagmi's hydrated state never trips a
 *  mismatch. */
export function ConnectButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const login = useSiweLogin();
  const status = useAuthStore((s) => s.status);
  const clear = useAuthStore((s) => s.clear);

  if (!mounted) {
    return <span className={`${PILL} text-mist`}>Wallet</span>;
  }

  // Signed in: show the address; clicking signs out (and disconnects).
  if (isConnected && address && status === 'authenticated') {
    return (
      <button
        type="button"
        onClick={() => {
          clear();
          disconnect();
        }}
        title="Sign out"
        className={`${PILL} ${ACTIVE}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-data" aria-hidden />
        {shortAddress(address)}
      </button>
    );
  }

  // Connected but not signed in: offer the SIWE sign-in.
  if (isConnected && address) {
    const busy = status === 'authenticating';
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void login().catch(() => undefined)}
        className={`${PILL} ${ACTIVE}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-mist" aria-hidden />
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    );
  }

  // Not connected.
  const injected = connectors[0];
  return (
    <button
      type="button"
      disabled={isPending || !injected}
      onClick={() => injected && connect({ connector: injected })}
      className={`${PILL} ${ACTIVE}`}
    >
      {isPending ? 'Connecting…' : 'Connect Wallet'}
    </button>
  );
}
