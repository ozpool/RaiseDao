'use client';

import { useEffect, useRef, useState } from 'react';
import { ACCENT_TEXT, type BeatAccent } from '@/components/journey/beats';

/** The plain-language rulebook of a raise, threaded by a living spine: a weaving
 *  SVG path that draws itself as you scroll (stroke-dashoffset), a cyan→magenta→
 *  gold gradient flowing down it, and a glowing node that travels the line while
 *  each ◇ lights as the draw reaches it. The cinematic JourneySection above shows
 *  the *feel* of a raise; this section states the actual rules and numbers, so the
 *  two never repeat each other. */

const GLOW: Record<BeatAccent, string> = {
  data: '#3FE9E0',
  vote: '#C863F0',
  gold: '#E8B86D',
  neutral: '#C2CCE0',
};

interface Step {
  n: string;
  label: string;
  title: string;
  body: string;
  fact: string;
  accent: BeatAccent;
}

// The real, concrete rules of a raise. These are the facts a backer or founder
// actually needs: who holds the money, how funds unlock, how long a vote runs,
// what it costs, and what happens when a milestone fails.
const STEPS: Step[] = [
  {
    n: '01',
    label: 'The vault',
    title: 'Every raise gets its own vault.',
    body: 'When a founder launches, a dedicated smart contract is deployed to hold the money. The founder never holds your funds. The vault does, in plain view on-chain.',
    fact: 'One contract per campaign',
    accent: 'data',
  },
  {
    n: '02',
    label: 'Funding',
    title: 'Backers fund it in USDC.',
    body: 'Anyone can contribute USDC up to the funding deadline. Every contribution is escrowed in the vault and counts toward the goal. Nothing is spent yet.',
    fact: 'Funds escrowed, not spent',
    accent: 'data',
  },
  {
    n: '03',
    label: 'Milestones',
    title: 'Money unlocks one milestone at a time.',
    body: 'Funds never release in one lump. The raise is split into milestones, each holding a fixed share, and milestones come due about a month apart.',
    fact: 'Released in tranches, ~30 days apart',
    accent: 'data',
  },
  {
    n: '04',
    label: 'The vote',
    title: 'Backers vote on every release.',
    body: 'To unlock a milestone, backers vote on-chain. A vote runs for about a day, and at least 10% of the votes must take part for it to count. No vote, no money.',
    fact: 'About 1 day to vote, 10% quorum',
    accent: 'vote',
  },
  {
    n: '05',
    label: 'Release',
    title: 'A passing vote releases the funds.',
    body: 'Once a vote passes, a short safety delay runs before anything moves. Then exactly that milestone’s share goes to the founder. A 2% protocol fee is taken only on what is released.',
    fact: '2% fee, only on released funds',
    accent: 'gold',
  },
  {
    n: '06',
    label: 'Refund',
    title: 'Fail a milestone, get your money back.',
    body: 'If a milestone is voted down or its deadline passes, the raise fails and every backer claims a refund in proportion to what they put in. The rest of the money never leaves the vault.',
    fact: 'Pro-rata refund on failure',
    accent: 'gold',
  },
];

// A snake path in a 40×1000 box (scaled to the measured node span, aspect ignored).
// Fuller amplitude + more cycles so it reads as a weaving snake, not a faint rule.
const SPINE =
  'M20 0 C 40 80, 0 165, 20 250 C 40 335, 2 415, 18 500 C 38 585, 0 665, 22 750 C 40 835, 4 915, 20 1000';

export function Lifecycle() {
  const wrap = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(1);
  const [progress, setProgress] = useState(0);
  const [spine, setSpine] = useState({ top: 0, height: 1 });

  // Measure the spine to sit exactly between the first and last node centres.
  useEffect(() => {
    if (pathRef.current) setLen(pathRef.current.getTotalLength());
    const measure = () => {
      const el = wrap.current;
      if (!el) return;
      const nodes = el.querySelectorAll<HTMLElement>('[data-node]');
      if (nodes.length < 2) return;
      const wr = el.getBoundingClientRect();
      const a = nodes[0]!.getBoundingClientRect();
      const b = nodes[nodes.length - 1]!.getBoundingClientRect();
      const top = a.top + a.height / 2 - wr.top;
      const bottom = b.top + b.height / 2 - wr.top;
      setSpine({ top, height: Math.max(1, bottom - top) });
    };
    measure();
    const t = setTimeout(measure, 300); // re-measure once fonts/layout settle
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Scroll-linked draw progress.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = wrap.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const p = (vh * 0.78 - r.top) / (r.height * 0.82);
        setProgress(Math.max(0, Math.min(1, p)));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="relative py-24 lg:py-32" aria-label="The lifecycle of a raise">
      <div className="mx-auto max-w-5xl px-6">
        <p className="font-mono text-caption uppercase tracking-widest text-mist">
          How a raise works
        </p>
        <h2 className="mt-4 max-w-2xl font-display text-h1 font-semibold leading-[1.05] tracking-tight text-paper">
          The rules, in plain language.
        </h2>
        <p className="mt-4 max-w-xl font-sans text-body leading-relaxed text-mist">
          Every step is enforced by the contract, not by us. Here is exactly what happens to your
          money, from the moment you back a raise to the moment it releases or refunds.
        </p>

        <div ref={wrap} className="relative mt-16 pl-14">
          {/* The living spine, drawn as you scroll, spanning first→last node. */}
          <svg
            aria-hidden
            className="absolute left-0 w-10"
            style={{
              top: spine.top,
              height: spine.height,
              filter: 'drop-shadow(0 0 5px rgba(110,200,255,0.45))',
            }}
            viewBox="0 0 40 1000"
            preserveAspectRatio="none"
            fill="none"
          >
            <defs>
              <linearGradient id="spine-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3FE9E0" />
                <stop offset="55%" stopColor="#C863F0" />
                <stop offset="100%" stopColor="#E8B86D" />
              </linearGradient>
            </defs>
            {/* Faint full track so the unread path still hints. */}
            <path d={SPINE} stroke="#23262e" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            {/* The drawn portion, revealed by dashoffset. */}
            <path
              ref={pathRef}
              d={SPINE}
              stroke="url(#spine-grad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={{ strokeDasharray: len, strokeDashoffset: len * (1 - progress) }}
            />
          </svg>
          {/* The travelling glow node, riding the draw between the first/last node. */}
          <span
            aria-hidden
            className="absolute left-5 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              top: spine.top + progress * spine.height,
              background: '#fff',
              boxShadow: '0 0 14px 4px rgba(120,230,255,0.9)',
              opacity: progress > 0.01 && progress < 0.995 ? 1 : 0,
            }}
          />

          <ol className="relative">
            {STEPS.map((step, i) => {
              const lit = progress >= (i + 0.4) / STEPS.length;
              return (
                <li key={step.n} className="relative pb-14 last:pb-0">
                  <span
                    data-node
                    className="absolute -left-11 top-1 flex h-4 w-4 items-center justify-center"
                    aria-hidden
                  >
                    <span
                      className="h-3 w-3 rotate-45 rounded-[2px] transition-all duration-500"
                      style={{
                        background: lit ? GLOW[step.accent] : '#2a2f3a',
                        boxShadow: lit ? `0 0 14px ${GLOW[step.accent]}` : 'none',
                      }}
                    />
                  </span>
                  <p
                    className={`font-mono text-caption uppercase tracking-widest ${ACCENT_TEXT[step.accent]}`}
                  >
                    {step.n} <span className="text-mist">/ {step.label}</span>
                  </p>
                  <h3 className="mt-2 font-display text-h2 font-semibold tracking-tight text-paper">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-xl font-sans text-body leading-relaxed text-mist">
                    {step.body}
                  </p>
                  <span
                    className={`mt-3 inline-block rounded-full border border-line px-3 py-1 font-mono text-caption uppercase tracking-widest ${ACCENT_TEXT[step.accent]}`}
                  >
                    {step.fact}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
