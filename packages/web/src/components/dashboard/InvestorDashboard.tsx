'use client';

import Link from 'next/link';
import { EXPLORER_URL } from '@/lib/config';
import { useInvestorDashboard } from '@/hooks/useDashboard';
import { fmtUSDC, fmtGov } from '@/lib/format';
import { StatCard } from './StatCard';
import { EmptyState } from './EmptyState';
import { InvestorContribChart } from './InvestorContribChart';

// support values from the Governor contract: 0 Against, 1 For, 2 Abstain.
const SUPPORT: Record<number, { label: string; cls: string }> = {
  0: { label: 'Against', cls: 'text-mist' },
  1: { label: 'For', cls: 'text-data' },
  2: { label: 'Abstain', cls: 'text-gold-unlock' },
};

export function InvestorDashboard() {
  const { data, isLoading, isError } = useInvestorDashboard();

  if (isLoading)
    return <div className="h-64 animate-pulse rounded-2xl border border-line bg-panel/40" />;

  if (isError)
    return (
      <div className="rounded-2xl border border-line bg-panel/40 px-8 py-10 text-center">
        <p className="font-sans text-small text-mist">Could not load investor data.</p>
      </div>
    );

  if (!data) return null;

  const { contributions, votes, refundable } = data;
  const totalContrib = contributions.reduce((s, c) => s + BigInt(c.amount), 0n);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total contributed"
          value={fmtUSDC(totalContrib.toString())}
          accent="signal"
        />
        <StatCard
          label="Campaigns backed"
          value={new Set(contributions.map((c) => c.campaignId)).size}
        />
        <StatCard label="Votes cast" value={votes.length} accent="data" />
      </div>

      {contributions.length === 0 ? (
        <EmptyState title="No contributions yet" body="Back a campaign to see your history here." />
      ) : (
        <div className="space-y-4">
          <h3 className="font-mono text-caption uppercase tracking-widest text-mist">
            Contributions by campaign
          </h3>
          <InvestorContribChart contributions={contributions} />
          <ol className="divide-y divide-line rounded-2xl border border-line bg-panel/40">
            {contributions.map((c) => (
              <li key={c.txHash} className="flex items-center justify-between gap-4 px-6 py-4">
                <div>
                  <Link
                    href={`/campaigns/${c.vault}`}
                    className="font-sans text-small text-paper hover:text-data"
                  >
                    {c.title}
                  </Link>
                  <p className="font-mono text-caption text-mist">
                    {fmtGov(c.votesMinted)} votes · block {c.blockNumber}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-small text-data">{fmtUSDC(c.amount)}</span>
                  <a
                    href={`${EXPLORER_URL}/tx/${c.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-caption text-mist hover:text-paper"
                  >
                    ↗
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {votes.length > 0 && (
        <div>
          <h3 className="mb-3 font-mono text-caption uppercase tracking-widest text-mist">
            Vote history
          </h3>
          <ol className="divide-y divide-line rounded-2xl border border-line bg-panel/40">
            {votes.map((v) => (
              <li
                key={`${v.proposalId}-${v.blockNumber}`}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <div>
                  <Link
                    href={`/campaigns/${v.vault}`}
                    className="font-sans text-small text-paper hover:text-data"
                  >
                    {v.title}
                  </Link>
                  <p className="font-mono text-caption text-mist">
                    {fmtGov(v.weight)} weight · block {v.blockNumber}
                  </p>
                </div>
                <span
                  className={`font-mono text-caption uppercase tracking-widest ${SUPPORT[v.support]?.cls ?? 'text-mist'}`}
                >
                  {SUPPORT[v.support]?.label ?? '—'}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {refundable.length > 0 && (
        <div>
          <h3 className="mb-2 font-mono text-caption uppercase tracking-widest text-mist">
            Claimable refunds
          </h3>
          {/* Claim action wired in #34 — this section is display-only for now. */}
          <p className="mb-3 font-sans text-caption text-mist">
            Claim available in the next release. Click a campaign to view details.
          </p>
          <ol className="divide-y divide-line rounded-2xl border border-line bg-panel/40">
            {refundable.map((r) => (
              <li key={r.campaignId} className="flex items-center justify-between gap-4 px-6 py-4">
                <Link
                  href={`/campaigns/${r.vault}`}
                  className="font-sans text-small text-paper hover:text-data"
                >
                  {r.title}
                </Link>
                <span className="font-mono text-caption uppercase tracking-widest text-gold-unlock">
                  {r.status}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
