'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

/** 0x1234…abcd — enough to recognise, short enough for the nav. */
function shortAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

const PILL =
  'inline-flex items-center gap-2 rounded-full border border-line bg-panel/60 px-4 py-1.5 font-mono text-caption uppercase tracking-widest transition-colors';

/** Wallet connect/disconnect for the header. Connection only (the injected
 *  connector); SIWE sign-in layers on in a later stage. A mount guard keeps the
 *  server and first client render identical so wagmi's hydrated account state
 *  never trips a mismatch. */
export function ConnectButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (!mounted) {
    return <span className={`${PILL} text-mist`}>Wallet</span>;
  }

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={() => disconnect()}
        title="Disconnect"
        className={`${PILL} text-paper hover:border-data hover:text-data`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-data" aria-hidden />
        {shortAddress(address)}
      </button>
    );
  }

  const injected = connectors[0];
  return (
    <button
      type="button"
      disabled={isPending || !injected}
      onClick={() => injected && connect({ connector: injected })}
      className={`${PILL} text-paper hover:border-data hover:text-data disabled:opacity-50`}
    >
      {isPending ? 'Connecting…' : 'Connect Wallet'}
    </button>
  );
}
