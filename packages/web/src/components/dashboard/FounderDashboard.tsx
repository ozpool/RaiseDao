'use client';

import Link from 'next/link';
import { EXPLORER_URL } from '@/lib/config';
import { useFounderDashboard } from '@/hooks/useDashboard';
import { fmtDollars, toUSDCNum } from '@/lib/format';
import { StatCard } from './StatCard';
import { EmptyState } from './EmptyState';
import { FounderRaiseChart } from './FounderRaiseChart';

export function FounderDashboard() {
  const { data, isLoading, isError } = useFounderDashboard();

  if (isLoading)
    return <div className="h-64 animate-pulse rounded-2xl border border-line bg-panel/40" />;

  if (isError)
    return (
      <div className="rounded-2xl border border-line bg-panel/40 px-8 py-10 text-center">
        <p className="font-sans text-small text-mist">Could not load founder data.</p>
      </div>
    );

  if (!data?.length)
    return (
      <EmptyState title="No campaigns yet" body="Deploy a campaign to see your raise stats here." />
    );

  const totalRaised = data.reduce((s, c) => s + BigInt(c.totalRaised), 0n);
  const totalContributors = data.reduce((s, c) => s + c.contributorCount, 0);
  const totalReleased = data.reduce((s, c) => s + c.milestonesReleased, 0);

  // Flatten releases across campaigns, newest block first.
  const allReleases = data
    .flatMap((c) => c.releases.map((r) => ({ ...r, title: c.title, vault: c.vault })))
    .sort((a, b) => b.blockNumber - a.blockNumber);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total raised"
          count={toUSDCNum(totalRaised.toString())}
          format={fmtDollars}
          accent="data"
        />
        <StatCard label="Contributors" value={totalContributors} />
        <StatCard label="Milestones released" value={totalReleased} accent="gold" />
      </div>

      <div>
        <h3 className="mb-4 font-mono text-caption uppercase tracking-widest text-mist">
          Raise progress
        </h3>
        <FounderRaiseChart campaigns={data} />
      </div>

      <div>
        <h3 className="mb-3 font-mono text-caption uppercase tracking-widest text-mist">
          Milestone states
        </h3>
        <ol className="divide-y divide-line rounded-2xl border border-line bg-panel/40">
          {data.map((c) => {
            const pending = c.milestones.length - c.milestonesReleased - c.milestonesFailed;
            return (
              <li key={c.campaignId} className="flex items-center justify-between gap-4 px-6 py-4">
                <Link
                  href={`/campaigns/${c.vault}`}
                  className="truncate font-sans text-small text-paper hover:text-data"
                >
                  {c.title}
                </Link>
                <span className="flex shrink-0 gap-4 font-mono text-caption">
                  <span className="text-data">{c.milestonesReleased} released</span>
                  <span className="text-mist">{c.milestonesFailed} failed</span>
                  <span className="text-mist">{pending} pending</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {allReleases.length > 0 && (
        <div>
          <h3 className="mb-3 font-mono text-caption uppercase tracking-widest text-mist">
            Release history
          </h3>
          <ol className="divide-y divide-line rounded-2xl border border-line bg-panel/40">
            {allReleases.map((r) => (
              <li
                key={`${r.vault}-${r.index}`}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <div>
                  <p className="font-sans text-small text-paper">{r.title}</p>
                  <p className="font-mono text-caption text-mist">
                    Milestone {r.index + 1} · block {r.blockNumber}
                  </p>
                </div>
                {/* gold-unlock is reserved for fund-release events per UI.md */}
                <a
                  href={`${EXPLORER_URL}/tx/${r.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-caption text-gold-unlock hover:opacity-80"
                >
                  ↗ tx
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
