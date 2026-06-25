'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useCampaigns } from '@/hooks/useCampaigns';
import type { CampaignFilters as Filters } from '@/lib/api';
import { CampaignFilters } from './CampaignFilters';
import { CampaignCard } from './CampaignCard';

function Skeletons() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-52 animate-pulse rounded-2xl border border-line bg-panel/40" />
      ))}
    </div>
  );
}

function Notice({ title, body, cta }: { title: string; body: string; cta?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-panel/40 px-8 py-16 text-center">
      <p className="font-sans text-h2 font-semibold text-paper">{title}</p>
      <p className="mt-3 font-sans text-small text-mist">{body}</p>
      {cta && <div className="mt-6 flex justify-center">{cta}</div>}
    </div>
  );
}

export function CampaignGrid() {
  const [filters, setFilters] = useState<Filters>({});
  const all = useCampaigns({}); // unfiltered — drives the filter option lists
  const { data, isLoading, isError, refetch } = useCampaigns(filters);

  const options = useMemo(() => {
    const src = all.data ?? [];
    return {
      cities: [...new Set(src.map((c) => c.city).filter(Boolean))].sort(),
      categories: [...new Set(src.map((c) => c.category).filter(Boolean))].sort(),
    };
  }, [all.data]);

  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div>
      <CampaignFilters
        filters={filters}
        onChange={update}
        cities={options.cities}
        categories={options.categories}
      />

      {isLoading ? (
        <Skeletons />
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
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 [grid-auto-flow:dense] sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <div key={c.campaignId} className={c.featured ? 'sm:col-span-2' : ''}>
              <CampaignCard c={c} large={c.featured} />
            </div>
          ))}
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
