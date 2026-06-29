'use client';

import Link from 'next/link';
import { EXPLORER_URL } from '@/lib/config';
import { useCampaign } from '@/hooks/useCampaign';
import type { CampaignMilestone } from '@/lib/api';
import { coverFor } from '@/lib/cover';
import { fmtUSDC } from '@/lib/format';
import { FundingBar } from './FundingBar';
import { FundingGem } from './FundingGem';
import { ContributePanel } from './ContributePanel';
import { ActivateVoting } from './governance/ActivateVoting';
import { RefundPanel } from './RefundPanel';
import { EvidenceSection } from './evidence/EvidenceSection';

const STATUS_LABEL: Record<string, string> = {
  funding: 'Funding',
  active: 'Active',
  succeeded: 'Succeeded',
  failed: 'Failed',
  pending: 'Pending',
  passed: 'Passed',
  released: 'Released',
};

function Schedule({ milestones }: { milestones: CampaignMilestone[] }) {
  return (
    <ol className="divide-y divide-line rounded-2xl border border-line bg-panel/40">
      {milestones.map((m) => (
        <li key={m.index} className="flex items-center justify-between gap-4 px-6 py-4">
          <span className="flex items-center gap-3">
            <span className="font-mono text-caption text-mist">
              {String(m.index + 1).padStart(2, '0')}
            </span>
            <span className="font-sans text-small text-paper">
              {(m.pctBps / 100).toFixed(m.pctBps % 100 ? 1 : 0)}% release
            </span>
          </span>
          <span
            className={`font-mono text-caption uppercase tracking-widest ${
              m.status === 'passed' || m.status === 'released' ? 'text-data' : 'text-mist'
            }`}
          >
            {STATUS_LABEL[m.status] ?? m.status}
          </span>
        </li>
      ))}
    </ol>
  );
}

function AddressRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 px-6 py-4">
      <dt className="font-mono text-caption uppercase tracking-widest text-mist">{label}</dt>
      <dd className="flex items-center gap-3">
        <span className="break-all font-mono text-small text-paper">
          {value.slice(0, 10)}…{value.slice(-8)}
        </span>
        <a
          href={`${EXPLORER_URL}/address/${value}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`View ${label} contract on Arbiscan`}
          className="font-mono text-caption uppercase text-data hover:opacity-80"
        >
          ↗
        </a>
      </dd>
    </div>
  );
}

export function CampaignDetailView({ vault }: { vault: string }) {
  const { data: c, isLoading, isError } = useCampaign(vault);

  if (isLoading) {
    return (
      <div className="mx-auto h-96 max-w-4xl animate-pulse rounded-2xl border border-line bg-panel/40" />
    );
  }
  if (isError || !c) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-panel/40 px-8 py-16 text-center">
        <p className="font-sans text-h2 font-semibold text-paper">Campaign not found</p>
        <p className="mt-3 font-sans text-small text-mist">
          No campaign exists at this address yet.
        </p>
        <Link
          href="/campaigns"
          className="mt-6 inline-block font-mono text-caption uppercase tracking-widest text-data hover:opacity-80"
        >
          ← Browse campaigns
        </Link>
      </div>
    );
  }

  const cover = coverFor(c.vault);
  const initial = (c.title || 'R').trim().charAt(0).toUpperCase() || 'R';

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1 font-mono text-caption uppercase tracking-widest text-mist transition-colors hover:text-data"
      >
        ← Campaigns
      </Link>

      {/* Cinematic cover hero — the campaign's generated "picture", title overlaid. */}
      <div
        className="relative mt-5 overflow-hidden rounded-2xl border border-line"
        style={{ background: cover.background }}
      >
        {c.image && (
          <>
            {' '}
            <img
              src={c.image}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover opacity-60"
            />
            <span
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,11,14,0.92),rgba(10,11,14,0.5))]"
            />
          </>
        )}
        {!c.image && (
          <span
            aria-hidden
            className="pointer-events-none absolute -top-10 right-4 select-none font-display text-[12rem] font-bold leading-none text-paper/[0.06]"
          >
            {initial}
          </span>
        )}
        <span
          aria-hidden
          className="absolute right-8 top-8 h-10 w-10 rotate-45 rounded-[4px]"
          style={{ background: cover.accent, boxShadow: `0 0 24px ${cover.accent}` }}
        />
        <div className="relative p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-2 font-mono text-caption uppercase tracking-widest text-mist">
            <span>{c.category || 'Campaign'}</span>
            {c.city && <span>· {c.city}</span>}
            {c.verified && <span className="text-data">· Verified</span>}
            {c.demo && <span className="rounded-full border border-line px-2 py-0.5">Demo</span>}
          </div>
          <h1 className="mt-3 max-w-2xl font-display text-hero font-semibold leading-[1.0] tracking-tight text-paper">
            {c.title || 'Untitled campaign'}
          </h1>
          <p className="mt-4 max-w-xl font-sans text-body leading-relaxed text-mist">{c.summary}</p>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <FundingBar raised={c.totalRaised} target={c.raiseTarget} />

          <h2 className="mb-3 mt-10 font-mono text-caption uppercase tracking-widest text-mist">
            Milestone schedule
          </h2>
          <Schedule milestones={c.milestones} />

          <EvidenceSection
            campaignId={c.campaignId}
            vault={c.vault}
            governor={c.governor}
            founder={c.founder}
            milestones={c.milestones}
          />

          <h2 className="mb-3 mt-10 font-mono text-caption uppercase tracking-widest text-mist">
            Contracts
          </h2>
          <dl className="divide-y divide-line rounded-2xl border border-line bg-panel/40">
            <AddressRow label="Vault" value={c.vault} />
            <AddressRow label="Token" value={c.token} />
            <AddressRow label="Governor" value={c.governor} />
          </dl>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-panel/40 p-6">
            <div className="flex items-center justify-between">
              <p className="font-mono text-caption uppercase tracking-widest text-mist">Status</p>
              <p className="font-mono text-caption uppercase tracking-widest text-data">
                {STATUS_LABEL[c.status] ?? c.status}
              </p>
            </div>
            <FundingGem raised={c.totalRaised} target={c.raiseTarget} status={c.status} />
            <div className="mt-2 flex items-baseline justify-between font-mono text-caption">
              <span className="text-paper">{fmtUSDC(c.totalRaised)}</span>
              <span className="text-mist">of {fmtUSDC(c.raiseTarget)}</span>
            </div>
          </div>
          <ContributePanel vault={c.vault as `0x${string}`} status={c.status} demo={c.demo} />
          {!c.demo && <ActivateVoting token={c.token as `0x${string}`} />}
          {!c.demo && <RefundPanel vault={c.vault as `0x${string}`} milestones={c.milestones} />}
        </aside>
      </div>
    </div>
  );
}
