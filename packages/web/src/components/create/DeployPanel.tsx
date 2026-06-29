'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { parseUnits } from 'viem';
import { EXPLORER_URL } from '@/lib/config';
import { USDC_DECIMALS } from '@/lib/config';
import {
  useDeployCampaign,
  type DeployParams,
  type DeployedCampaign,
} from '@/hooks/useDeployCampaign';
import { useAuthStore } from '@/stores/auth';
import { api, type DraftRecord, type CampaignCreatePayload } from '@/lib/api';

const PRIMARY =
  'rounded-full bg-data px-5 py-2 font-mono text-caption uppercase tracking-widest text-void transition-opacity hover:opacity-90 disabled:opacity-40';

/** Combine the draft's display metadata with the on-chain addresses and the exact
 *  deadlines that were deployed, into the campaign-persistence payload. */
function toCreatePayload(
  draft: DraftRecord,
  result: DeployedCampaign,
  params: DeployParams,
): CampaignCreatePayload {
  return {
    campaignId: Number(result.id),
    vault: result.vault,
    token: result.token,
    governor: result.governor,
    title: draft.title,
    summary: draft.summary,
    image: draft.image,
    // Stored as raw 6-decimal USDC (the on-chain money unit the rest of the app
    // reads), so the founder's dollar input "1" persists as "1000000".
    raiseTarget: parseUnits(draft.raiseTarget || '0', USDC_DECIMALS).toString(),
    fundingDeadline: Number(params.fundingDeadline),
    milestones: draft.milestones.map((m, i) => ({
      pctBps: m.pctBps,
      deadline: Number(params.deadlines[i] ?? 0n),
    })),
  };
}

/** The on-chain deploy step (#24). Drives RaiseFactory.deploy for a saved draft
 *  and walks the transaction from wallet-confirm through mining to the new
 *  campaign's addresses, then redirects to its page. Degrades to an honest
 *  "not configured" note when no factory is set for the network. */
export function DeployPanel({ draft }: { draft: DraftRecord }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const { deploy, phase, hash, result, params, error, configured } = useDeployCampaign(draft);
  // Whether the off-chain metadata write that backs the campaign page succeeded.
  const [saveFailed, setSaveFailed] = useState(false);

  // Once mined, persist the campaign's display metadata (so its page resolves),
  // then hand off. The deploy is already on-chain; if the save fails we don't
  // fake success — we say so and let the user retry from the browse page.
  useEffect(() => {
    if (!result || !params) return;
    let cancelled = false;
    void (async () => {
      try {
        if (!token) throw new Error('no session token');
        await api.campaigns.create(toCreatePayload(draft, result, params), token);
        if (!cancelled) router.push(`/campaigns/${result.vault}`);
      } catch {
        if (!cancelled) setSaveFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [result, params, token, draft, router]);

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
        {saveFailed ? (
          <p className="font-sans text-caption text-signal">
            Your campaign is live on-chain, but saving its page didn&apos;t go through. It&apos;ll
            appear once the indexer syncs —{' '}
            <Link href={`/campaigns/${result.vault}`} className="text-data hover:opacity-80">
              try the page
            </Link>
            .
          </p>
        ) : (
          <p className="font-sans text-caption text-mist">Saving and taking you to the campaign…</p>
        )}
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
