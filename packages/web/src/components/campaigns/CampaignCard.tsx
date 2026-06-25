import Link from 'next/link';
import { FundingBar } from './FundingBar';
import type { CampaignSummary } from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  funding: 'Funding',
  active: 'Active',
  succeeded: 'Succeeded',
  failed: 'Failed',
};

/** One campaign in the bento grid. `large` is the featured treatment (more
 *  presence, bigger title). Whole card links to the detail page. */
export function CampaignCard({ c, large = false }: { c: CampaignSummary; large?: boolean }) {
  return (
    <Link
      href={`/campaigns/${c.vault}`}
      className="group flex h-full flex-col justify-between rounded-2xl border border-line bg-panel/40 p-6 transition-colors hover:border-data/50"
    >
      <div>
        <div className="flex items-center gap-2 font-mono text-caption uppercase tracking-widest text-mist">
          <span>{c.category || 'Campaign'}</span>
          {c.verified && <span className="text-data">· Verified</span>}
          {c.demo && (
            <span className="rounded-full border border-line px-2 py-0.5 text-mist">Demo</span>
          )}
        </div>
        <h3
          className={`mt-3 font-sans font-semibold tracking-tight text-paper ${
            large ? 'text-h1' : 'text-h2'
          }`}
        >
          {c.title || 'Untitled campaign'}
        </h3>
        {(large || c.summary) && (
          <p className="mt-2 line-clamp-2 font-sans text-small text-mist">{c.summary}</p>
        )}
      </div>

      <div className="mt-6">
        <FundingBar raised={c.totalRaised} target={c.raiseTarget} />
        <div className="mt-3 flex items-center justify-between font-mono text-caption uppercase tracking-widest text-mist">
          <span>{c.city || '—'}</span>
          <span className="text-data/80">{STATUS_LABEL[c.status] ?? c.status}</span>
        </div>
      </div>
    </Link>
  );
}
