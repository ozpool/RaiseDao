'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { BEATS, ACCENT_TEXT } from './beats';
import { JourneyCaptions } from './JourneyCaptions';
import { JourneyRail } from './JourneyRail';

// 3D loads after paint, never during SSR (R3F + WebGL are client-only).
const TrustCoreCanvas = dynamic(
  () => import('@/components/trustcore/TrustCoreCanvas').then((m) => m.TrustCoreCanvas),
  { ssr: false, loading: () => <div className="h-full w-full bg-void" aria-hidden /> },
);

// 6 beats × ~100vh of scroll each = a comfortable, unhurried read of the ritual.
const SECTION_HEIGHT = '600vh';

/** The cinematic finale: one pinned Trust Core, the six-beat story scrubbed by
 *  scroll. Stage 1 wires the pin, the beat captions and the progress rail; the
 *  core's own morph (converge → lock → vote → gold release) lands in Stage 2.
 *  CSS sticky drives the pin (GSAP only reads progress) — the same Lenis-safe
 *  approach the mechanism diagram uses. */
export function JourneySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    if (reduced) return;

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.normalizeScroll(false);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        onUpdate(self) {
          setProgress(self.progress);
          setActive(Math.min(BEATS.length - 1, Math.floor(self.progress * BEATS.length)));
        },
      });
      ScrollTrigger.refresh();
    }, sectionRef);

    return () => ctx.revert();
  }, [reduced]);

  if (reduced) return <ReducedLayout />;

  return (
    <section ref={sectionRef} style={{ height: SECTION_HEIGHT }} aria-label="How the vault works">
      <div className="sticky top-0 h-screen overflow-hidden bg-void">
        {/* The pinned core, full-bleed behind the editorial layer. */}
        <div className="absolute inset-0">
          <TrustCoreCanvas reducedMotion={false} />
        </div>
        {/* Scrim so the lower-left captions stay legible over the core. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(10,11,14,0.92),transparent_55%),linear-gradient(to_right,rgba(10,11,14,0.6),transparent_45%)]"
        />

        <JourneyRail progress={progress} active={active} />

        <div className="relative mx-auto h-full max-w-6xl px-6 pb-16 pt-10">
          <p className="font-mono text-caption uppercase tracking-widest text-mist">
            The ritual <span className="text-data">//</span> Trust, made visible
          </p>
          <div className="absolute inset-x-6 bottom-16 h-1/2">
            <JourneyCaptions active={active} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Reduced-motion fallback: the six beats stacked as readable cards, each with a
 *  left accent line — the story told without any motion or WebGL. */
function ReducedLayout() {
  return (
    <section aria-label="How the vault works" className="bg-void py-20">
      <div className="mx-auto max-w-6xl px-6">
        <p className="font-mono text-caption uppercase tracking-widest text-mist">
          The ritual <span className="text-data">//</span> Trust, made visible
        </p>
        <div className="mt-14 flex flex-col gap-10">
          {BEATS.map((beat) => (
            <div key={beat.id} className="border-l-2 border-line pl-6">
              <p
                className={`font-mono text-caption uppercase tracking-widest ${ACCENT_TEXT[beat.accent]}`}
              >
                {beat.num} <span className="text-mist">/ {beat.label}</span>
              </p>
              <h3 className="mt-2 font-display text-h2 font-semibold tracking-tight text-paper">
                {beat.title}
              </h3>
              <p className="mt-3 max-w-lg font-sans text-body text-mist">{beat.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
