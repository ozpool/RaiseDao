'use client';

import { useEffect, useRef, useState } from 'react';
import { EXPLORER_URL } from '@/lib/config';

/** The signed-in state: the address pill opens a small menu instead of signing
 *  out on the first click. From here you can copy the address, inspect it on the
 *  explorer, or sign out deliberately — so a stray click never drops your
 *  session. Closes on outside click / Escape. */

const PILL =
  'inline-flex items-center gap-2 rounded-full border border-line bg-panel/60 px-4 py-1.5 font-mono text-caption uppercase tracking-widest text-paper transition-colors hover:border-data hover:text-data';

const ITEM =
  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left font-sans text-small transition-colors hover:bg-paper/[0.06]';

export function AccountMenu({ address, onSignOut }: { address: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;

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

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (insecure context); fail quietly.
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={PILL}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-data" aria-hidden />
        {short}
        <span aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          ⌄
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-line bg-panel/95 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur"
        >
          <p className="px-3 pb-1 pt-2 font-mono text-caption uppercase tracking-widest text-mist">
            Signed in
          </p>
          <button type="button" role="menuitem" onClick={copy} className={`${ITEM} text-paper`}>
            {copied ? 'Copied ✓' : 'Copy address'}
          </button>
          <a
            href={`${EXPLORER_URL}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={`${ITEM} text-paper`}
          >
            View on Arbiscan ↗
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className={`${ITEM} text-signal hover:text-signal`}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
