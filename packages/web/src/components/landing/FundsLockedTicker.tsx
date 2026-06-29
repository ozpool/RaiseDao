'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// Illustrative only. The real figure comes from the reorg-safe indexer (#30);
// until then it is rendered behind an unmissable DEMO badge (UI.md §9) so it is
// never mistaken for a live on-chain value.
const DEMO_TVL = 2_480_000;

/** The funds-locked headline metric. Counts up once on mount (eased), or snaps
 *  straight to the figure under prefers-reduced-motion. */
export function FundsLockedTicker() {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? DEMO_TVL : 0);
  const raf = useRef(0);

  useEffect(() => {
    if (reduced) {
      setValue(DEMO_TVL);
      return;
    }
    const start = performance.now();
    const duration = 1200;
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic — fast then settle
      setValue(Math.round(DEMO_TVL * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [reduced]);

  return (
    <section className="border-y border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-caption uppercase tracking-widest text-mist">
            Funds locked in escrow
          </p>
          <p className="mt-2 font-mono text-data-lg tabular-nums text-paper">
            <span className="text-data">$</span>
            {value.toLocaleString('en-US')} <span className="text-mist">USDC</span>
          </p>
        </div>
        <span className="self-start border border-dashed border-mist px-2 py-0.5 font-mono text-caption uppercase tracking-wide text-mist sm:self-end">
          Demo data, live at launch
        </span>
      </div>
    </section>
  );
}
