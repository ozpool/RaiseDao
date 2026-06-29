'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, type Connector } from 'wagmi';
import { useSiweLogin } from '@/hooks/useSiweLogin';
import { useAuthStore } from '@/stores/auth';
import { ConnectMenu } from './ConnectMenu';
import { AccountMenu } from './AccountMenu';

const PILL =
  'inline-flex items-center gap-2 rounded-full border border-line bg-panel/60 px-4 py-1.5 font-mono text-caption uppercase tracking-widest transition-colors';
const ACTIVE = 'text-paper hover:border-data hover:text-data disabled:opacity-50';

/** EIP-6963 surfaces a named connector per installed wallet (MetaMask, Brave,
 *  Rabby…). When any of those exist, the generic `injected` connector is just a
 *  duplicate that ends at the same wallet, so we hide it and show the real names.
 *  Only when nothing specific is detected do we fall back to the generic one. */
function pickConnectors(connectors: readonly Connector[]): readonly Connector[] {
  const named = connectors.filter((c) => c.id !== 'injected');
  return named.length > 0 ? named : connectors;
}

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

  // Signed in: the address pill opens a menu (copy / explorer / sign out) so a
  // click never logs you out by accident.
  if (isConnected && address && status === 'authenticated') {
    return (
      <AccountMenu
        address={address}
        onSignOut={() => {
          clear();
          disconnect();
        }}
      />
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
      connectors={pickConnectors(connectors)}
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
