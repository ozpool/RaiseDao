import Link from 'next/link';
import { FundingBar } from './FundingBar';
import { coverFor } from '@/lib/cover';
import type { CampaignSummary } from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  funding: 'Funding',
  active: 'Active',
  succeeded: 'Succeeded',
  failed: 'Failed',
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-paper/[0.02] px-4 py-3">
      <p className="font-mono text-caption uppercase tracking-widest text-mist">{label}</p>
      <p className="mt-1 font-sans text-body font-semibold text-paper">{value}</p>
    </div>
  );
}

/** The live detail panel of the master-detail browser — the full picture of the
 *  selected campaign without leaving the list: generated cover, funding, the key
 *  facts, and the routes into the real campaign. */
export function CampaignPreview({ c }: { c: CampaignSummary }) {
  const cover = coverFor(c.vault);
  const initial = (c.title || 'R').trim().charAt(0).toUpperCase() || 'R';
  const deadline = c.fundingDeadline
    ? new Date(c.fundingDeadline * 1000).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not set';

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-panel/60">
      {/* Cover: the campaign photo when present, else a generated gradient. The
          faint initial + accent diamond sit on top either way. */}
      <div
        className="relative h-40 w-full overflow-hidden"
        style={{ background: cover.background }}
        aria-hidden
      >
        {c.image && (
          <>
            {' '}
            <img src={c.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,11,14,0.85),transparent_70%)]" />
          </>
        )}
        {!c.image && (
          <span className="pointer-events-none absolute -top-8 right-3 select-none font-display text-[8rem] font-bold leading-none text-paper/[0.06]">
            {initial}
          </span>
        )}
        <span
          className="absolute bottom-4 left-5 h-9 w-9 rotate-45 rounded-[4px]"
          style={{ background: cover.accent, boxShadow: `0 0 22px ${cover.accent}` }}
        />
      </div>

      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-2 font-mono text-caption uppercase tracking-widest text-mist">
          <span>{c.category || 'Campaign'}</span>
          {c.verified && <span className="text-data">· Verified</span>}
          {c.demo && (
            <span className="rounded-full border border-line px-2 py-0.5 text-mist">Demo</span>
          )}
          <span className="ml-auto text-data/80">{STATUS_LABEL[c.status] ?? c.status}</span>
        </div>

        <h2 className="mt-3 font-display text-h1 font-semibold tracking-tight text-paper">
          {c.title || 'Untitled campaign'}
        </h2>
        {c.summary && (
          <p className="mt-3 max-w-2xl font-sans text-body leading-relaxed text-mist">
            {c.summary}
          </p>
        )}

        <div className="mt-6">
          <FundingBar raised={c.totalRaised} target={c.raiseTarget} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Milestones" value={String(c.milestoneCount)} />
          <Stat label="Location" value={c.city || 'Not set'} />
          <Stat label="Closes" value={deadline} />
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          {/* Primary: open the campaign (where contributing / backing happens). */}
          <Link
            href={`/campaigns/${c.vault}`}
            className="group inline-flex items-center gap-2 rounded-md bg-paper px-6 py-3 font-sans text-body font-semibold text-void transition-transform duration-200 hover:-translate-y-0.5"
          >
            View campaign
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </Link>
          {/* Secondary, genuinely distinct: inspect the vault on-chain. */}
          <a
            href={`https://sepolia.arbiscan.io/address/${c.vault}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-line px-6 py-3 font-sans text-body text-paper transition-colors duration-200 hover:border-data/50 hover:text-data"
          >
            View on Arbiscan ↗
          </a>
        </div>
      </div>
    </div>
  );
}
