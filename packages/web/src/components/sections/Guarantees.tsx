/** The trust mechanics spelled out in plain language, directly below the gem
 *  journey — so a visitor who watched the animation can now read exactly what
 *  each beat meant and which contract enforces it. Four guarantees, each tied to
 *  a real function. The cards reveal on scroll and lift on hover. */
import { Reveal } from './Reveal';
import { SpotlightCard } from './SpotlightCard';

interface Guarantee {
  label: string;
  title: string;
  body: string;
  call: string;
  bar: string; // accent bar colour (bg-* tokens are JIT-safe whole strings)
  accent: string; // matching text colour for the call
  glow: string; // spotlight tint that follows the cursor on this card
}

const ITEMS: Guarantee[] = [
  {
    label: 'Custody',
    title: 'Every campaign gets its own vault.',
    body: 'Funds are never pooled with other raises or held by the platform. Each campaign deploys a dedicated contract, and the money lives there, not in a founder’s wallet.',
    call: 'RaiseFactory.deploy()',
    bar: 'bg-data',
    accent: 'text-data',
    glow: 'rgba(63,233,224,0.14)',
  },
  {
    label: 'Lock',
    title: 'Raised funds can’t be withdrawn at will.',
    body: 'Once a campaign funds, no one can pull the money out, not the founder and not us. The contract releases it only when a milestone vote passes.',
    call: 'onlyGovernor',
    bar: 'bg-data',
    accent: 'text-data',
    glow: 'rgba(63,233,224,0.14)',
  },
  {
    label: 'Governance',
    title: 'Backers vote every milestone.',
    body: 'Each tranche is released only if backers approve it on-chain. Miss quorum or vote it down and the funds stay locked. Every vote is a transaction anyone can verify.',
    call: 'MilestoneGovernor.castVote()',
    bar: 'bg-vote',
    accent: 'text-vote',
    glow: 'rgba(200,99,240,0.14)',
  },
  {
    label: 'Refunds',
    title: 'Failure returns money, pro-rata.',
    body: 'If a milestone fails, every backer can reclaim their share automatically. The platform has no power to block it. The refund path is the same code as the release path.',
    call: 'RaiseVault.claimRefund()',
    bar: 'bg-gold-unlock',
    accent: 'text-gold-unlock',
    glow: 'rgba(232,184,109,0.13)',
  },
];

export function Guarantees() {
  return (
    <section className="relative py-24 lg:py-32" aria-label="The guarantees">
      <div className="mx-auto max-w-6xl px-6">
        <p className="font-mono text-caption uppercase tracking-widest text-mist">
          Why it’s safe <span className="text-data">·</span> four guarantees
        </p>
        <h2 className="mt-4 max-w-2xl font-display text-h1 font-semibold leading-[1.05] tracking-tight text-paper">
          Trust isn’t a promise here. It’s enforced by code.
        </h2>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {ITEMS.map((g, i) => (
            <Reveal key={g.title} delay={i * 90}>
              <SpotlightCard glow={g.glow} className="flex h-full gap-5 p-6">
                <span className={`mt-1 h-12 w-1 shrink-0 rounded-full ${g.bar}`} aria-hidden />
                <div className="min-w-0">
                  <p className={`font-mono text-caption uppercase tracking-widest ${g.accent}`}>
                    {g.label}
                  </p>
                  <h3 className="mt-2 font-display text-h2 font-semibold tracking-tight text-paper">
                    {g.title}
                  </h3>
                  <p className="mt-3 font-sans text-body leading-relaxed text-mist">{g.body}</p>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
