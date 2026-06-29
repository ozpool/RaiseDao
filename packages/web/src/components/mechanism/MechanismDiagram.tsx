'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { STAGES } from './stages';
import { StageNode } from './StageNode';
import { ProgressRail } from './ProgressRail';

// 400vh outer section = 300vh of actual scroll distance (viewport is 100vh).
// 5 stages × 60vh each — comfortable reading pace without excessive scrolling.
const SECTION_HEIGHT = '400vh';

export function MechanismDiagram() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // CSS sticky drives the visual pin — GSAP only reads scroll progress via
  // onUpdate and sets React state. This avoids GSAP's own pin mechanism, which
  // conflicts with Lenis (LenisProvider doesn't expose the lenis instance, so
  // we can't wire lenis.on('scroll', ScrollTrigger.update) directly).
  useLayoutEffect(() => {
    if (reduced) return;

    gsap.registerPlugin(ScrollTrigger);
    // Prevent GSAP adding a second scroll normalisation layer on top of Lenis.
    ScrollTrigger.normalizeScroll(false);

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        onUpdate(self) {
          setProgress(self.progress);
          setActiveIndex(Math.min(STAGES.length - 1, Math.floor(self.progress * STAGES.length)));
        },
      });
      // Refresh after mount so Lenis's initial layout pass is reflected in
      // ScrollTrigger's cached trigger positions.
      ScrollTrigger.refresh();
    }, sectionRef);

    return () => ctx.revert();
  }, [reduced]);

  if (reduced) return <ReducedLayout />;

  return (
    <section
      ref={sectionRef}
      // Explicit height declared before JS runs — prevents the CLS that would
      // occur if the sticky child expanded the document after hydration.
      style={{ height: SECTION_HEIGHT }}
      aria-label="How RaiseDAO works"
    >
      <div className="sticky top-0 flex h-screen flex-col overflow-hidden bg-void">
        <ProgressRail progress={progress} />

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10 lg:py-16">
          {/* Section header */}
          <div className="mb-10 shrink-0 lg:mb-12">
            <p className="font-mono text-caption uppercase tracking-widest text-mist">
              The pipeline <span className="text-data">·</span> How it works
            </p>
            <h2 className="mt-3 font-display text-h1 font-semibold leading-[1.1] tracking-tight text-paper">
              Five layers. <span className="text-mist">One contract of trust.</span>
            </h2>
          </div>

          {/* Pipeline + content — flex-col on mobile, flex-row on desktop */}
          <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:gap-16">
            {/* Desktop: vertical pipeline list */}
            <nav aria-label="Pipeline stages" className="hidden w-56 shrink-0 lg:block">
              {STAGES.map((stage, i) => (
                <StageNode
                  key={stage.id}
                  label={stage.label}
                  isActive={i === activeIndex}
                  isLast={i === STAGES.length - 1}
                />
              ))}
            </nav>

            {/* Mobile: compact horizontal dot row (no labels — content below carries them) */}
            <div className="flex shrink-0 items-center gap-2 lg:hidden" aria-hidden>
              {STAGES.map((stage, i) => (
                <div key={stage.id} className="flex items-center gap-2">
                  <span
                    className={[
                      'block h-2 w-2 rounded-full',
                      'transition-[background-color,box-shadow] duration-300',
                      i === activeIndex
                        ? 'bg-data shadow-[0_0_8px_2px_var(--color-data)]'
                        : 'border border-line bg-void',
                    ].join(' ')}
                  />
                  {i < STAGES.length - 1 && <span className="block h-px w-5 bg-line" />}
                </div>
              ))}
            </div>

            {/* Content panels — all rendered, only active is visible.
                min-h-[50vmin] guarantees height on mobile where the left pipeline
                column (which would otherwise set the row height) is hidden. */}
            <div className="relative flex-1 min-h-[50vmin]">
              {STAGES.map((stage, i) => (
                <div
                  key={stage.id}
                  aria-hidden={i !== activeIndex}
                  className={[
                    'absolute inset-0 flex flex-col justify-center',
                    'transition-[opacity,transform] duration-500 ease-out',
                    i === activeIndex
                      ? 'pointer-events-auto translate-y-0 opacity-100'
                      : 'pointer-events-none translate-y-6 opacity-0',
                  ].join(' ')}
                >
                  <p className="mb-4 font-mono text-caption uppercase tracking-widest text-data">
                    {stage.label}
                  </p>
                  <h3 className="font-display text-h1 font-semibold leading-[1.1] tracking-tight text-paper lg:text-display">
                    {stage.title}
                  </h3>
                  <p className="mt-6 max-w-lg font-sans text-body leading-relaxed text-mist">
                    {stage.blurb}
                  </p>
                  <p className="mt-8 font-mono text-caption uppercase tracking-widest text-mist/40">
                    {i + 1}&thinsp;/&thinsp;{STAGES.length}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Reduced-motion fallback: all 5 stages stacked as readable cards, no pin, no
 *  scrub. Each card has a left accent line so the pipeline metaphor is still
 *  communicated visually without requiring motion. */
function ReducedLayout() {
  return (
    <section aria-label="How RaiseDAO works" className="bg-void py-20">
      <div className="mx-auto max-w-6xl px-6">
        <p className="font-mono text-caption uppercase tracking-widest text-mist">
          The pipeline <span className="text-data">·</span> How it works
        </p>
        <h2 className="mt-3 font-display text-h1 font-semibold leading-[1.1] tracking-tight text-paper">
          Five layers. <span className="text-mist">One contract of trust.</span>
        </h2>
        <div className="mt-14 flex flex-col gap-10">
          {STAGES.map((stage) => (
            <div key={stage.id} className="border-l-2 border-data/30 pl-6">
              <p className="font-mono text-caption uppercase tracking-widest text-data">
                {stage.label}
              </p>
              <h3 className="mt-2 font-display text-h2 font-semibold tracking-tight text-paper">
                {stage.title}
              </h3>
              <p className="mt-3 max-w-lg font-sans text-body text-mist">{stage.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
