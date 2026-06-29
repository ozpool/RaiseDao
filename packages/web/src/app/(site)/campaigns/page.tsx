import type { Metadata } from 'next';
import { CampaignBrowser } from '@/components/campaigns/CampaignBrowser';

export const metadata: Metadata = {
  title: 'Campaigns — RaiseDAO',
};

export default function CampaignsPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <h1 className="font-display text-hero font-semibold tracking-tight text-paper">Campaigns</h1>
      <p className="mb-12 mt-3 max-w-xl font-sans text-body text-mist">
        Browse milestone-gated raises. Pick one to see the full picture. Funds release only as
        backers vote each milestone through.
      </p>
      <CampaignBrowser />
    </section>
  );
}
