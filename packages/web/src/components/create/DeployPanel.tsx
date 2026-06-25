'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EXPLORER_URL } from '@/lib/config';
import { useDeployCampaign } from '@/hooks/useDeployCampaign';
import type { DraftRecord } from '@/lib/api';

const PRIMARY =
  'rounded-full bg-data px-5 py-2 font-mono text-caption uppercase tracking-widest text-void transition-opacity hover:opacity-90 disabled:opacity-40';

/** The on-chain deploy step (#24). Drives RaiseFactory.deploy for a saved draft
 *  and walks the transaction from wallet-confirm through mining to the new
 *  campaign's addresses, then redirects to its page. Degrades to an honest
 *  "not configured" note when no factory is set for the network. */
export function DeployPanel({ draft }: { draft: DraftRecord }) {
  const router = useRouter();
  const { deploy, phase, hash, result, error, configured } = useDeployCampaign(draft);

  // Once mined, hand off to the new campaign's page.
  useEffect(() => {
    if (result) {
      const t = setTimeout(() => router.push(`/campaigns/${result.vault}`), 1200);
      return () => clearTimeout(t);
    }
  }, [result, router]);

  if (!configured) {
    return (
      <p className="mt-2 font-sans text-small text-mist">
        On-chain deploy isn&apos;t configured on this network yet. Your draft is saved — deploy the
        RaiseFactory and set{' '}
        <span className="font-mono text-caption">NEXT_PUBLIC_FACTORY_ADDRESS</span> to enable it.
      </p>
    );
  }

  if (phase === 'confirmed' && result) {
    return (
      <div className="mt-2 space-y-2">
        <p className="font-mono text-caption uppercase tracking-widest text-data">
          Deployed on-chain
        </p>
        <p className="font-sans text-small text-mist">Vault {result.vault}</p>
        <p className="font-sans text-caption text-mist">Taking you to the campaign…</p>
      </div>
    );
  }

  const busy = phase === 'signing' || phase === 'confirming';
  const label =
    phase === 'signing'
      ? 'Confirm in wallet…'
      : phase === 'confirming'
        ? 'Deploying…'
        : 'Deploy on-chain';

  return (
    <div className="mt-2 space-y-3">
      <button type="button" className={PRIMARY} onClick={deploy} disabled={busy}>
        {label}
      </button>
      {hash && (
        <a
          href={`${EXPLORER_URL}/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          className="block font-mono text-caption uppercase tracking-widest text-data hover:opacity-80"
        >
          View transaction ↗
        </a>
      )}
      {phase === 'error' && error && (
        <p className="font-sans text-caption text-signal">
          {/^User rejected|denied/i.test(error.message)
            ? 'Transaction rejected in wallet.'
            : 'Deploy failed — check the network and try again.'}
        </p>
      )}
    </div>
  );
}
