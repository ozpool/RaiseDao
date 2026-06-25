import type { Metadata } from 'next';
import { CampaignGrid } from '@/components/campaigns/CampaignGrid';

export const metadata: Metadata = {
  title: 'Campaigns — RaiseDAO',
};

export default function CampaignsPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <h1 className="font-display text-hero font-semibold tracking-tight text-paper">Campaigns</h1>
      <p className="mb-12 mt-3 max-w-xl font-sans text-body text-mist">
        Browse milestone-gated raises. Funds release only as investors vote each milestone through.
      </p>
      <CampaignGrid />
    </section>
  );
}
