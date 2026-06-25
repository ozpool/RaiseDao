'use client';

import { ProposalState } from '@/hooks/useBallot';
import { useExecuteProposal } from '@/hooks/useExecuteProposal';
import { EXPLORER_URL } from '@/lib/config';

/** Render the correct action (or status note) for each post-vote proposal state.
 *  Active / Pending are handled by ProposalBallot; this panel covers everything
 *  that happens after the vote closes. TimelockRing already shows the countdown,
 *  so we intentionally skip duplicating it here. */
export function ExecutePanel({
  governor,
  vault,
  milestoneIndex,
  description,
  state,
  eta,
}: {
  governor: `0x${string}`;
  vault: `0x${string}`;
  milestoneIndex: number;
  description: string;
  state: number | undefined;
  eta: bigint;
}) {
  const ep = useExecuteProposal({ governor, vault, milestoneIndex, description });

  // While voting is still in progress the ballot handles everything.
  if (state === undefined || state === ProposalState.Pending || state === ProposalState.Active) {
    return null;
  }

  // Read once — avoids re-computing every render while the component is mounted,
  // but a full re-render will refresh it if the user lingers past the eta.
  const now = Math.floor(Date.now() / 1000);
  const timelockPassed = eta > 0n && now >= Number(eta);

  const txLink = (hash: `0x${string}`, label: string) => (
    <a
      href={`${EXPLORER_URL}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      className="mt-2 block font-mono text-caption uppercase tracking-widest text-data hover:opacity-80"
    >
      {label} ↗
    </a>
  );

  return (
    <div className="mt-3">
      {/* ── Succeeded: must be queued through the timelock first ── */}
      {state === ProposalState.Succeeded && (
        <>
          <p className="mb-2 font-sans text-caption text-mist">
            The vote passed. Queue the release through the timelock — funds move only after the
            delay expires.
          </p>
          <button
            type="button"
            onClick={ep.queue}
            disabled={ep.queuing}
            className="rounded-full bg-data px-4 py-2 font-mono text-caption uppercase tracking-widest text-void transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {ep.queuing ? 'Queuing…' : 'Queue release'}
          </button>
          {ep.queueHash && txLink(ep.queueHash, ep.queued ? 'Queued' : 'Queuing — pending')}
        </>
      )}

      {/* ── Queued + timelock not yet expired: the ring shows the countdown ── */}
      {state === ProposalState.Queued && !timelockPassed && (
        <p className="font-mono text-caption uppercase tracking-widest text-mist">
          Release queued — waiting for the timelock
        </p>
      )}

      {/* ── Queued + timelock elapsed: anyone can pull the trigger ── */}
      {state === ProposalState.Queued && timelockPassed && (
        <>
          <button
            type="button"
            onClick={ep.execute}
            disabled={ep.executing}
            className="rounded-full bg-data px-4 py-2 font-mono text-caption uppercase tracking-widest text-void transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {ep.executing ? 'Executing…' : 'Execute release'}
          </button>
          {ep.executeHash &&
            txLink(ep.executeHash, ep.executed ? 'Executed' : 'Executing — pending')}
        </>
      )}

      {/* ── Executed: tranche is out, celebrate with gold ── */}
      {state === ProposalState.Executed && (
        <p className="font-mono text-caption uppercase tracking-widest text-gold-unlock">
          Funds released
        </p>
      )}

      {/* ── Terminal failure states: tranche stays locked ── */}
      {(state === ProposalState.Defeated ||
        state === ProposalState.Expired ||
        state === ProposalState.Canceled) && (
        <p className="font-sans text-caption text-mist">
          This vote did not pass — the tranche remains locked.
        </p>
      )}

      {/* User-rejected vs real errors get different messages. */}
      {ep.error && (
        <p className="mt-2 font-sans text-caption text-signal">
          {/User rejected|denied/i.test(ep.error.message)
            ? 'Transaction rejected in wallet.'
            : 'Transaction failed — try again.'}
        </p>
      )}
    </div>
  );
}
