'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useSiweLogin } from '@/hooks/useSiweLogin';
import { useAuthStore } from '@/stores/auth';
import { ConnectMenu } from './ConnectMenu';

/** 0x1234…abcd — enough to recognise, short enough for the nav. */
function shortAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

const PILL =
  'inline-flex items-center gap-2 rounded-full border border-line bg-panel/60 px-4 py-1.5 font-mono text-caption uppercase tracking-widest transition-colors';
const ACTIVE = 'text-paper hover:border-data hover:text-data disabled:opacity-50';

/** Wallet control for the header, with explicit states: install a wallet, connect
 *  it, sign in with SIWE, then signed-in (click to sign out). Errors are surfaced
 *  (as a title + a signal dot) instead of being swallowed, so a failed connect or
 *  sign-in is visible rather than a dead button. A mount guard keeps the server
 *  and first client render identical so wagmi's hydrated state never trips a
 *  mismatch. */
export function ConnectButton() {
  const [mounted, setMounted] = useState(false);
  const [hasWallet, setHasWallet] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // An injected wallet exposes window.ethereum; without it, connect can't work.
    setHasWallet(
      typeof window !== 'undefined' && Boolean((window as { ethereum?: unknown }).ethereum),
    );
  }, []);

  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const login = useSiweLogin();
  const status = useAuthStore((s) => s.status);
  const clear = useAuthStore((s) => s.clear);

  // Surface a wagmi connect error the moment it changes.
  useEffect(() => {
    if (connectError) setNote(connectError.message);
  }, [connectError]);

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
        onClick={() => {
          setNote(null);
          void login().catch((e: unknown) =>
            setNote(e instanceof Error ? e.message : 'Sign-in failed'),
          );
        }}
        title={note ?? undefined}
        className={`${PILL} ${ACTIVE}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${note ? 'bg-signal' : 'bg-mist'}`}
          aria-hidden
        />
        {busy ? 'Signing in…' : note ? 'Retry sign-in' : 'Sign in'}
      </button>
    );
  }

  // Not connected: a menu of wallet options (multi-wallet picker → SIWE next).
  return (
    <ConnectMenu
      connectors={connectors}
      isPending={isPending}
      hasWallet={hasWallet}
      note={note}
      onPick={(connector) => {
        setNote(null);
        connect({ connector });
      }}
    />
  );
}
