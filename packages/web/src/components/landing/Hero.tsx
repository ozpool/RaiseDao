'use client';

import dynamic from 'next/dynamic';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// 3D never runs during SSR (avoids a hydration mismatch); it loads after paint.
// The placeholder keeps the square's footprint so layout never shifts.
const VaultCanvas = dynamic(
  () => import('@/components/vault/VaultCanvas').then((m) => m.VaultCanvas),
  { ssr: false, loading: () => <div className="h-full w-full bg-void" aria-hidden /> },
);

/** The landing hero: the wordmark as a layout element, the editorial promise,
 *  and the Vault drifting alongside as a clearly-labelled non-live preview. The
 *  live funds-locked ticker lands next (#21 Stage C) — never a plausible mock. */
export function Hero() {
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      {/* Wordmark band — full-bleed, the type IS the composition. */}
      <div className="px-6 pt-12 lg:pt-20">
        <p className="font-mono text-caption uppercase tracking-[0.3em] text-mist">
          Milestone-gated crowdfunding // Arbitrum Sepolia
        </p>
        <h1 className="mt-5 select-none font-display text-mega font-semibold leading-[0.9] tracking-tighter text-paper">
          RAISEDAO
        </h1>
      </div>

      {/* Promise + the Vault preview. */}
      <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-28 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-2">
        <div className="min-w-0">
          <p className="font-sans text-hero font-semibold leading-[1.02] tracking-tight text-paper">
            Watch trust
            <br />
            become visible.
          </p>
          <p className="mt-7 max-w-md font-sans text-body text-mist">
            Founders raise into a vault that releases funds tranche by tranche — only when investors
            vote each milestone through. Fail a milestone, and the rest refunds pro rata.
          </p>
          <div className="mt-10 flex items-center gap-3 font-mono text-caption uppercase tracking-widest text-mist">
            <span className="h-px w-10 bg-line" />
            Scroll to see it work
          </div>
        </div>

        <div className="relative mx-auto aspect-square w-full min-w-0 max-w-[58vh] border border-line lg:justify-self-end">
          <span className="absolute left-3 top-3 z-10 border border-dashed border-mist px-2 py-0.5 font-mono text-caption uppercase tracking-wide text-mist">
            Preview — not live
          </span>
          <VaultCanvas fillLevel={0.62} state="live" lod="full" mock reducedMotion={reduced} />
        </div>
      </div>
    </section>
  );
}
