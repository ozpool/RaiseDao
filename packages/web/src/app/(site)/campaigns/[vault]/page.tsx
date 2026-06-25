import type { Metadata } from 'next';
import Link from 'next/link';
import { EXPLORER_URL } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Campaign — RaiseDAO',
};

/** Minimal campaign page — the deploy flow (#24) redirects here with the new
 *  vault address. The full detail view and the USDC contribute flow arrive in
 *  #26 (which reads live state from the indexer); for now this confirms the
 *  on-chain deploy and links to the contracts. */
export default async function CampaignPage({ params }: { params: Promise<{ vault: string }> }) {
  const { vault } = await params;
  const isAddress = /^0x[0-9a-fA-F]{40}$/.test(vault);

  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <p className="font-mono text-caption uppercase tracking-widest text-data">Campaign deployed</p>
      <h1 className="mt-3 break-all font-display text-h1 font-semibold tracking-tight text-paper">
        {isAddress ? `${vault.slice(0, 10)}…${vault.slice(-8)}` : 'Unknown campaign'}
      </h1>
      <p className="mt-4 max-w-xl font-sans text-body text-mist">
        Your milestone-gated vault is live on Arbitrum Sepolia. The full detail view and the USDC
        contribute flow land in the next milestone.
      </p>

      {isAddress && (
        <dl className="mt-10 divide-y divide-line rounded-2xl border border-line bg-panel/40">
          <div className="flex items-center justify-between gap-6 px-6 py-4">
            <dt className="font-mono text-caption uppercase tracking-widest text-mist">Vault</dt>
            <dd className="break-all font-mono text-small text-paper">{vault}</dd>
          </div>
          <div className="px-6 py-4">
            <a
              href={`${EXPLORER_URL}/address/${vault}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-caption uppercase tracking-widest text-data hover:opacity-80"
            >
              View on Arbiscan ↗
            </a>
          </div>
        </dl>
      )}

      <Link
        href="/create"
        className="mt-10 inline-block font-mono text-caption uppercase tracking-widest text-mist transition-colors hover:text-paper"
      >
        ← Create another
      </Link>
    </section>
  );
}
