'use client';

import { EXPLORER_URL } from '@/lib/config';
import { useProposeMilestone } from '@/hooks/useProposeMilestone';

/** Founder-only: open a release vote for a milestone. Disabled until evidence is
 *  pinned — the proposal binds the evidence CID into its descriptionHash, so
 *  there's nothing to vote on without it. */
export function ProposeButton({
  campaignId,
  vault,
  governor,
  milestoneIndex,
  evidenceCid,
}: {
  campaignId: number;
  vault: `0x${string}`;
  governor: `0x${string}`;
  milestoneIndex: number;
  evidenceCid: string;
}) {
  const p = useProposeMilestone({ campaignId, vault, governor, milestoneIndex, evidenceCid });

  if (!evidenceCid) {
    return (
      <p className="mt-3 font-sans text-caption text-mist">
        Pin evidence above to open a release vote for this milestone.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={p.propose}
        disabled={p.proposing || p.done}
        className="rounded-full bg-data px-4 py-2 font-mono text-caption uppercase tracking-widest text-void transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {p.proposing ? 'Proposing…' : p.done ? 'Proposal opened' : 'Open release vote'}
      </button>
      {p.hash && (
        <a
          href={`${EXPLORER_URL}/tx/${p.hash}`}
          target="_blank"
          rel="noreferrer"
          className="ml-3 font-mono text-caption uppercase tracking-widest text-data hover:opacity-80"
        >
          Tx ↗
        </a>
      )}
      {p.error && (
        <p className="mt-2 font-sans text-caption text-signal">
          {/User rejected|denied/i.test(p.error.message)
            ? 'Transaction rejected in wallet.'
            : p.error.message}
        </p>
      )}
    </div>
  );
}
