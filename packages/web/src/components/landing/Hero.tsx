'use client';

import dynamic from 'next/dynamic';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { CanvasLoader } from '@/components/sections/CanvasLoader';

// 3D never runs during SSR (avoids a hydration mismatch); it loads after paint.
// The loader keeps the square's footprint and reads as the vault arriving rather
// than a flat black box while the chunk downloads.
const TrustCoreCanvas = dynamic(
  () => import('@/components/trustcore/TrustCoreCanvas').then((m) => m.TrustCoreCanvas),
  { ssr: false, loading: () => <CanvasLoader /> },
);

/** The landing hero: the wordmark as a layout element, the editorial promise,
 *  and the Vault drifting alongside as a clearly-labelled non-live preview. The
 *  live funds-locked ticker lands next (#21 Stage C) — never a plausible mock. */
export function Hero() {
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      {/* Atmospheric depth — a light cyan haze under the Vault (right side) and a
          soft neutral-grey on the low-left for depth. Kept faint, no heavy purple. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_45rem_at_78%_55%,rgba(63,233,224,0.06),transparent_60%),radial-gradient(50rem_40rem_at_8%_90%,rgba(150,165,190,0.045),transparent_60%)]"
      />
      {/* Wordmark band — full-bleed, the type IS the composition. */}
      <div className="px-6 pt-12 lg:pt-20">
        <p className="font-mono text-caption uppercase tracking-[0.3em] text-mist">
          Milestone-gated crowdfunding <span className="text-data">//</span> Arbitrum Sepolia
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
            <span className="h-px w-10 bg-data/70" />
            Scroll to see it work
          </div>
        </div>

        <div className="mx-auto w-full min-w-0 max-w-[58vh] lg:justify-self-end">
          <div className="relative aspect-square w-full">
            <TrustCoreCanvas reducedMotion={reduced} />
          </div>
          <p className="mt-4 text-center font-mono text-caption uppercase tracking-widest text-mist lg:text-right">
            Vault preview · not live data
          </p>
        </div>
      </div>
    </section>
  );
}
