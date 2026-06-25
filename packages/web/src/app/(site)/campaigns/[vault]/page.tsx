import type { Metadata } from 'next';
import { CampaignDetailView } from '@/components/campaigns/CampaignDetailView';

export const metadata: Metadata = {
  title: 'Campaign — RaiseDAO',
};

/** Campaign detail (#26). Reads the campaign by vault address and renders its
 *  schedule, contracts, and the USDC contribute panel. The deploy flow (#24)
 *  redirects here after a successful on-chain deploy. */
export default async function CampaignPage({ params }: { params: Promise<{ vault: string }> }) {
  const { vault } = await params;
  return (
    <section className="px-6 py-20">
      <CampaignDetailView vault={vault} />
    </section>
  );
}
