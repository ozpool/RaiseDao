import Link from 'next/link';
import { Reveal } from './Reveal';
import { SpotlightCard } from './SpotlightCard';

/** Two sides of the same contract. Founders and backers each get a column with
 *  their concrete steps, so a visitor sees exactly what they'd do — and that both
 *  sides answer to the same code. Reveals on scroll; accents match the palette. */

interface Path {
  label: string;
  title: string;
  steps: string[];
  href: string;
  cta: string;
  dot: string;
  accent: string;
  glow: string;
}

const PATHS: Path[] = [
  {
    label: 'For founders',
    title: 'Raise without ever holding the money.',
    steps: [
      'Deploy a vault and define your milestones.',
      'Backers fund it in USDC, straight into the contract.',
      'Hit a milestone, then request its release.',
      'The vote passes and your tranche unlocks automatically.',
    ],
    href: '/create',
    cta: 'Launch a campaign',
    dot: 'bg-data',
    accent: 'text-data',
    glow: 'rgba(63,233,224,0.13)',
  },
  {
    label: 'For backers',
    title: 'Fund with a refund built into the code.',
    steps: [
      'Browse live, on-chain campaigns.',
      'Contribute in USDC and receive voting weight.',
      'Vote each milestone before any funds move.',
      'If a milestone fails, claim your share back, pro-rata.',
    ],
    href: '/campaigns',
    cta: 'Browse campaigns',
    dot: 'bg-vote',
    accent: 'text-vote',
    glow: 'rgba(200,99,240,0.13)',
  },
];

export function DualPath() {
  return (
    <section className="relative py-24 lg:py-32" aria-label="For founders and backers">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="font-mono text-caption uppercase tracking-widest text-mist">
            Two sides <span className="text-data">·</span> one contract
          </p>
          <h2 className="mt-4 max-w-2xl font-display text-h1 font-semibold leading-[1.05] tracking-tight text-paper">
            Whether you raise or back, the rules are identical.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          {PATHS.map((p, i) => (
            <Reveal key={p.label} delay={i * 110}>
              <SpotlightCard glow={p.glow} className="flex h-full flex-col p-8">
                <p className={`font-mono text-caption uppercase tracking-widest ${p.accent}`}>
                  {p.label}
                </p>
                <h3 className="mt-3 font-display text-h2 font-semibold leading-tight tracking-tight text-paper">
                  {p.title}
                </h3>
                <ol className="mt-6 flex flex-1 flex-col gap-4">
                  {p.steps.map((step, n) => (
                    <li key={n} className="flex gap-3 font-sans text-body text-mist">
                      <span
                        className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${p.dot}`}
                        aria-hidden
                      />
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <Link
                  href={p.href}
                  className={`group mt-8 inline-flex items-center gap-2 font-mono text-caption uppercase tracking-widest ${p.accent}`}
                >
                  {p.cta}
                  <span className="transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
