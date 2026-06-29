import Link from 'next/link';
import { MagneticButton } from './MagneticButton';

/** The closing beat of the page: after the journey and the guarantees, a single
 *  confident call to enter the real product. Continues the dark space with a soft
 *  cyan→gold glow so it reads as the end of the same film, not a new page. */
export function ClosingCta() {
  return (
    <section className="relative overflow-hidden py-32 lg:py-40" aria-label="Enter the platform">
      {/* A warm glow low-centre — the compounded-trust colour, bleeding upward. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(45rem_30rem_at_50%_120%,rgba(232,184,109,0.12),transparent_60%),radial-gradient(40rem_28rem_at_50%_-10%,rgba(63,233,224,0.08),transparent_60%)]"
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <p className="font-mono text-caption uppercase tracking-widest text-mist">
          Trust, made visible <span className="text-gold-unlock">·</span> now use it
        </p>
        <h2 className="mt-5 font-display text-hero font-semibold leading-[1.0] tracking-tight text-paper">
          Raise with proof.
          <br />
          Back without the leap of faith.
        </h2>
        <p className="mx-auto mt-7 max-w-xl font-sans text-body leading-relaxed text-mist">
          Browse live campaigns, fund a milestone, or launch your own vault. Every move is on-chain,
          and every release is earned by a vote.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <MagneticButton
            href="/campaigns"
            className="group inline-flex items-center gap-2 rounded-md bg-paper px-7 py-3.5 font-sans text-body font-semibold text-void shadow-[0_0_0_rgba(255,255,255,0)] transition-[transform,box-shadow] duration-300 ease-out hover:shadow-[0_8px_34px_rgba(199,248,255,0.25)]"
          >
            Enter the platform
            <span className="transition-transform duration-200 group-hover:translate-x-1.5">→</span>
          </MagneticButton>
          <Link
            href="/create"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-md border border-line px-7 py-3.5 font-sans text-body text-paper transition-colors duration-300 hover:border-mist/40"
          >
            {/* Fill-sweep: a faint sheen wipes across on hover for depth. */}
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent,rgba(199,248,255,0.10),transparent)] transition-transform duration-500 ease-out group-hover:translate-x-full"
            />
            <span className="relative">Launch a campaign</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
