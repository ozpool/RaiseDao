'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { BEATS, ACCENT_TEXT } from './beats';
import { JourneyCaptions } from './JourneyCaptions';
import { JourneyRail } from './JourneyRail';
import { useJourneyStore } from './useJourneyStore';
import { activeBeat } from './journey-morph';
import { CanvasLoader } from '@/components/sections/CanvasLoader';

// 3D loads after paint, never during SSR (R3F + WebGL are client-only).
const VaultGemCanvas = dynamic(
  () => import('@/components/journey/VaultGemCanvas').then((m) => m.VaultGemCanvas),
  { ssr: false, loading: () => <CanvasLoader /> },
);

// 6 beats over a long scroll — unhurried, Apple-style holds where each beat
// reaches its state and sits a while before the next begins.
const SECTION_HEIGHT = '1320vh';

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
  // Defer the (heavy) gem canvas until the section is near the viewport, so on
  // first page load only the hero's WebGL context spins up — not both at once,
  // which was the cold-start stutter.
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near) return;
    const el = sectionRef.current;
    // Mount when the section approaches the viewport...
    const io = el
      ? new IntersectionObserver(
          ([e]) => {
            if (e?.isIntersecting) setNear(true);
          },
          { rootMargin: '100% 0px' },
        )
      : null;
    io?.observe(el!);
    // ...and as a fallback, warm the canvas shortly after the hero settles, so the
    // gem is already drawn by the time the visitor scrolls down to it.
    const warm = setTimeout(() => setNear(true), 1800);
    return () => {
      io?.disconnect();
      clearTimeout(warm);
    };
  }, [near]);

  useLayoutEffect(() => {
    if (reduced) return;

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.normalizeScroll(false);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.4,
        onUpdate(self) {
          // Transient write for the 3D scene (no React render); React state only
          // for the captions/rail, which genuinely need to re-render.
          useJourneyStore.getState().setProgress(self.progress);
          setProgress(self.progress);
          setActive(activeBeat(self.progress));
        },
      });
      ScrollTrigger.refresh();
    }, sectionRef);

    return () => ctx.revert();
  }, [reduced]);

  if (reduced) return <ReducedLayout />;

  return (
    <section ref={sectionRef} style={{ height: SECTION_HEIGHT }} aria-label="How the vault works">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* A soft glow seated where the gem sits — the alpha canvas lets it show
            through, so the diamond's light appears to bleed into the page instead
            of stopping at a hard edge. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(48rem_42rem_at_50%_58%,rgba(70,150,200,0.12),transparent_62%)]"
        />
        {/* The pinned diamond vault, full-bleed behind the editorial layer. Mounted
            only once the section nears the viewport (see `near`). */}
        <div className="absolute inset-0">{near && <VaultGemCanvas reducedMotion={false} />}</div>
        {/* Vignette — fades the lit canvas edges into the page void so the gem
            reads as part of the black page, not a bright rectangle in its own
            window. Plus a soft top-left wash to keep the upper captions legible. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(125%_115%_at_50%_45%,transparent_52%,rgba(10,11,14,0.85)_92%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,11,14,0.78),transparent_42%),linear-gradient(to_right,rgba(10,11,14,0.55),transparent_40%)]"
        />
        {/* Bottom dissolve — the canvas fades fully to void at its lower edge so the
            pinned journey melts into the section below instead of meeting it at a
            hard line (no "two windows" seam). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_bottom,transparent,var(--color-void))]"
        />

        <JourneyRail progress={progress} active={active} />

        <div className="relative h-full w-full px-6 pt-10 lg:px-12">
          <p className="font-mono text-caption uppercase tracking-widest text-mist">
            The ritual <span className="text-data">//</span> Trust, made visible
          </p>
          {/* Captions hug the left edge, above the lowered gem, so the copy reads
              easily and never sits across the centre of the diamond. */}
          <div className="absolute left-9 top-24 max-w-md lg:left-16 lg:top-28">
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
