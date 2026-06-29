'use client';

import { useEffect, useRef, useState } from 'react';
import type { Connector } from 'wagmi';

/** The not-connected state: a pill that opens a small menu of wallet options
 *  instead of a single take-it-or-leave-it button. Each row connects with that
 *  connector; a hint line guides the choice ("Fastest", "Scan or extension").
 *  Closes on outside click / Escape. The SIWE sign-in step runs after connect,
 *  handled by the parent. */

const PILL =
  'inline-flex items-center gap-2 rounded-full border border-line bg-panel/60 px-4 py-1.5 font-mono text-caption uppercase tracking-widest transition-colors text-paper hover:border-data hover:text-data disabled:opacity-50';

interface Meta {
  label: string;
  hint: string;
}

/** Friendly label + hint per connector id (falls back to the connector's name). */
function metaFor(c: Connector, hasWallet: boolean): Meta {
  if (c.id === 'injected')
    return {
      label: 'Browser Wallet',
      hint: hasWallet ? 'MetaMask, Brave or Rabby' : 'Not detected, install one',
    };
  if (c.id.toLowerCase().includes('coinbase'))
    return { label: 'Coinbase Wallet', hint: 'Scan with the app or extension' };
  // An EIP-6963 wallet detected by name (MetaMask, Brave, Rabby…).
  return { label: c.name, hint: 'Browser extension' };
}

export interface ConnectMenuProps {
  connectors: readonly Connector[];
  isPending: boolean;
  hasWallet: boolean;
  note: string | null;
  onPick: (connector: Connector) => void;
}

export function ConnectMenu({ connectors, isPending, hasWallet, note, onPick }: ConnectMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={isPending}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={note ?? undefined}
        className={PILL}
      >
        {note && <span className="h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />}
        {isPending ? 'Connecting…' : note ? 'Retry connect' : 'Connect Wallet'}
        <span aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          ⌄
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-line bg-panel/95 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur"
        >
          {connectors.map((c) => {
            const m = metaFor(c, hasWallet);
            return (
              <button
                key={c.uid}
                type="button"
                role="menuitem"
                onClick={() => {
                  onPick(c);
                  setOpen(false);
                }}
                className="group flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-paper/[0.06]"
              >
                <span
                  aria-hidden
                  className="mt-1 h-2 w-2 shrink-0 rounded-full bg-mist transition-colors group-hover:bg-data"
                />
                <span className="min-w-0">
                  <span className="block font-sans text-body font-medium text-paper">
                    {m.label}
                  </span>
                  <span className="block font-mono text-caption tracking-tight text-mist">
                    {m.hint}
                  </span>
                </span>
              </button>
            );
          })}
          {!hasWallet && (
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block rounded-md px-3 py-2 font-mono text-caption uppercase tracking-widest text-data hover:bg-paper/[0.06]"
            >
              Install a wallet ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
