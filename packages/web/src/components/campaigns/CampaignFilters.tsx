'use client';

import type { CampaignFilters as Filters } from '@/lib/api';

const SELECT =
  'rounded-lg border border-line bg-panel/40 px-3 py-2 font-mono text-caption uppercase tracking-widest text-paper outline-none transition-colors focus:border-data';

interface Props {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  cities: string[];
  categories: string[];
}

export function CampaignFilters({ filters, onChange, cities, categories }: Props) {
  return (
    <div className="mb-10 flex flex-wrap items-center gap-3">
      <input
        value={filters.q ?? ''}
        onChange={(e) => onChange({ q: e.target.value })}
        placeholder="Search campaigns"
        className="min-w-[12rem] flex-1 rounded-lg border border-line bg-panel/40 px-3 py-2 font-sans text-small text-paper outline-none transition-colors placeholder:text-mist/50 focus:border-data"
      />
      <select
        value={filters.city ?? ''}
        onChange={(e) => onChange({ city: e.target.value || undefined })}
        className={SELECT}
      >
        <option value="">All cities</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={filters.category ?? ''}
        onChange={(e) => onChange({ category: e.target.value || undefined })}
        className={SELECT}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={filters.status ?? ''}
        onChange={(e) => onChange({ status: e.target.value || undefined })}
        className={SELECT}
      >
        <option value="">Any status</option>
        <option value="funding">Funding</option>
        <option value="active">Active</option>
        <option value="succeeded">Succeeded</option>
      </select>
      <button
        type="button"
        onClick={() => onChange({ verified: filters.verified ? undefined : true })}
        className={`rounded-full border px-4 py-2 font-mono text-caption uppercase tracking-widest transition-colors ${
          filters.verified ? 'border-data text-data' : 'border-line text-mist hover:text-paper'
        }`}
      >
        Verified only
      </button>
    </div>
  );
}
