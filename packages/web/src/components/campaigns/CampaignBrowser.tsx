'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useCampaigns } from '@/hooks/useCampaigns';
import type { CampaignFilters as Filters, CampaignSummary } from '@/lib/api';
import { CampaignFilters } from './CampaignFilters';
import { CampaignPreview } from './CampaignPreview';
import { coverFor } from '@/lib/cover';

function pctOf(c: CampaignSummary): number {
  const t = Number(c.raiseTarget);
  return t > 0 ? Math.min(100, Math.round((Number(c.totalRaised) / t) * 100)) : 0;
}

function Row({
  c,
  selected,
  onSelect,
}: {
  c: CampaignSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  const cover = coverFor(c.vault);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected}
      className={`flex w-full items-center gap-4 rounded-xl border p-3 text-left transition-colors ${
        selected
          ? 'border-data/50 bg-paper/[0.05]'
          : 'border-line bg-panel/30 hover:border-mist/30 hover:bg-paper/[0.03]'
      }`}
    >
      <span
        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg"
        style={{ background: cover.background }}
        aria-hidden
      >
        {c.image && (          <img src={c.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <span
          className="absolute bottom-1.5 left-1.5 h-3 w-3 rotate-45 rounded-[2px]"
          style={{ background: cover.accent }}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-sans text-body font-semibold text-paper">
            {c.title || 'Untitled'}
          </span>
          {c.verified && <span className="shrink-0 text-caption text-data">✓</span>}
        </span>
        <span className="mt-0.5 block truncate font-mono text-caption uppercase tracking-widest text-mist">
          {c.category || 'Campaign'} · {pctOf(c)}% funded
        </span>
      </span>
    </button>
  );
}

function Notice({ title, body, cta }: { title: string; body: string; cta?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-panel/40 px-8 py-16 text-center">
      <p className="font-sans text-h2 font-semibold text-paper">{title}</p>
      <p className="mt-3 font-sans text-small text-mist">{body}</p>
      {cta && <div className="mt-6 flex justify-center">{cta}</div>}
    </div>
  );
}

/** The campaigns browser as a master-detail view: a scrollable list of campaigns
 *  on the left, the full live detail of the selected one on the right — browse and
 *  decide without leaving the page. The right panel sticks while the list scrolls. */
export function CampaignBrowser() {
  const [filters, setFilters] = useState<Filters>({});
  const [selected, setSelected] = useState<string | null>(null);
  const all = useCampaigns({});
  const { data, isLoading, isError, refetch } = useCampaigns(filters);

  const options = useMemo(() => {
    const src = all.data ?? [];
    return {
      cities: [...new Set(src.map((c) => c.city).filter(Boolean))].sort(),
      categories: [...new Set(src.map((c) => c.category).filter(Boolean))].sort(),
    };
  }, [all.data]);

  // Keep a valid selection as the list changes (default to the first row).
  useEffect(() => {
    if (!data || data.length === 0) return;
    if (!selected || !data.some((c) => c.vault === selected)) setSelected(data[0]!.vault);
  }, [data, selected]);

  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const active = data?.find((c) => c.vault === selected) ?? data?.[0];

  return (
    <div>
      <CampaignFilters
        filters={filters}
        onChange={update}
        cities={options.cities}
        categories={options.categories}
      />

      {isLoading ? (
        <div className="h-72 animate-pulse rounded-2xl border border-line bg-panel/40" />
      ) : isError ? (
        <Notice
          title="Couldn't load campaigns"
          body="The API didn't respond. Check it's running, then retry."
          cta={
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full border border-line px-5 py-2 font-mono text-caption uppercase tracking-widest text-paper hover:border-data hover:text-data"
            >
              Retry
            </button>
          }
        />
      ) : data && data.length > 0 && active ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(300px,360px)_1fr]">
          <div className="flex max-h-[78vh] flex-col gap-2 overflow-y-auto pr-1 lg:pr-2">
            {data.map((c) => (
              <Row
                key={c.campaignId}
                c={c}
                selected={c.vault === active.vault}
                onSelect={() => setSelected(c.vault)}
              />
            ))}
          </div>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <CampaignPreview c={active} />
          </div>
        </div>
      ) : (
        <Notice
          title="No campaigns yet"
          body="Nothing matches here. Be the first to launch a milestone-gated raise."
          cta={
            <Link
              href="/create"
              className="rounded-full bg-data px-5 py-2 font-mono text-caption uppercase tracking-widest text-void hover:opacity-90"
            >
              Create a campaign
            </Link>
          }
        />
      )}
    </div>
  );
}
