'use client';

import { formatUnits } from 'viem';
import { useAccount } from 'wagmi';
import { EXPLORER_URL } from '@/lib/config';
import { useBallot, ProposalState, Support } from '@/hooks/useBallot';
import type { Tally } from '@/lib/api';
import { QuorumBar } from './QuorumBar';
import { TimelockRing } from './TimelockRing';
import { ExecutePanel } from './ExecutePanel';

const STATE_LABEL: Record<number, string> = {
  [ProposalState.Pending]: 'Voting opens soon',
  [ProposalState.Active]: 'Voting open',
  [ProposalState.Canceled]: 'Canceled',
  [ProposalState.Defeated]: 'Defeated',
  [ProposalState.Succeeded]: 'Passed',
  [ProposalState.Queued]: 'Queued',
  [ProposalState.Expired]: 'Expired',
  [ProposalState.Executed]: 'Released',
};

/** The investor's voting ballot for one milestone proposal. The vote tally comes
 *  live over the socket (`tally`); state, quorum, weight and the timelock eta are
 *  read on-chain and re-pulled when a live event lands. The For/Against buttons
 *  light up only while voting is Active, the voter has weight, and hasn't voted —
 *  the timing guards are the chain's, not ours. `syncing` flags a stale indexer. */
export function ProposalBallot({
  governor,
  proposalId,
  vault,
  milestoneIndex,
  description,
  tally,
  syncing,
}: {
  governor: `0x${string}`;
  proposalId: string;
  /** Needed by ExecutePanel to reconstruct the deterministic queue/execute args. */
  vault: string;
  milestoneIndex: number;
  description: string;
  tally?: Tally;
  syncing: boolean;
}) {
  const { isConnected } = useAccount();
  const b = useBallot(governor, proposalId, tally?.voters ?? 0);
  const isActive = b.state === ProposalState.Active;
  const hasWeight = b.weight > 0n;
  const canVote = isConnected && isActive && hasWeight && !b.hasVoted;
  const forVotes = tally ? safeBig(tally.forVotes) : 0n;

  return (
    <div className="mt-3 rounded-xl border border-line bg-void/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-caption uppercase tracking-widest text-mist">
          Release vote{' '}
          {syncing && <span className="ml-1 animate-pulse text-signal">· syncing</span>}
        </span>
        <span
          className={`font-mono text-caption uppercase tracking-widest ${
            isActive ? 'text-data' : 'text-mist'
          }`}
        >
          {b.state === undefined ? '…' : (STATE_LABEL[b.state] ?? 'Unknown')}
        </span>
      </div>

      <QuorumBar forVotes={forVotes} quorum={b.quorum} />

      <p className="mt-3 font-sans text-caption text-mist">
        Your voting weight:{' '}
        <span className="text-paper">
          {Number(formatUnits(b.weight, 18)).toLocaleString()} votes
        </span>
        {b.hasVoted && <span className="ml-2 text-data">· you voted</span>}
      </p>

      <TimelockRing eta={b.eta} state={b.state} />

      {/* ExecutePanel decides internally what to show per state — renders null
          during Pending/Active so it never steps on the vote buttons below. */}
      <ExecutePanel
        governor={governor}
        vault={vault as `0x${string}`}
        milestoneIndex={milestoneIndex}
        description={description}
        state={b.state}
        eta={b.eta}
      />

      {canVote && (
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={() => b.vote(Support.For)}
            disabled={b.voting}
            className="flex-1 rounded-full bg-data px-4 py-2 font-mono text-caption uppercase tracking-widest text-void transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {b.voting ? 'Voting…' : 'Vote for'}
          </button>
          <button
            type="button"
            onClick={() => b.vote(Support.Against)}
            disabled={b.voting}
            className="flex-1 rounded-full border border-line px-4 py-2 font-mono text-caption uppercase tracking-widest text-paper transition-colors hover:border-signal hover:text-signal disabled:opacity-40"
          >
            Vote against
          </button>
        </div>
      )}

      {isActive && isConnected && !hasWeight && !b.hasVoted && (
        <p className="mt-2 font-sans text-caption text-mist">
          You held no governance tokens at the snapshot, so you can&apos;t vote on this proposal.
        </p>
      )}
      {!isConnected && (
        <p className="mt-2 font-sans text-caption text-mist">Connect your wallet to vote.</p>
      )}
      {b.done && b.hash && (
        <a
          href={`${EXPLORER_URL}/tx/${b.hash}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block font-mono text-caption uppercase tracking-widest text-data hover:opacity-80"
        >
          Vote confirmed ↗
        </a>
      )}
      {b.error && (
        <p className="mt-2 font-sans text-caption text-signal">
          {/User rejected|denied/i.test(b.error.message)
            ? 'Transaction rejected in wallet.'
            : 'Vote failed — try again.'}
        </p>
      )}
    </div>
  );
}

/** A tally weight is a uint256 decimal string; never trust it blindly into BigInt. */
function safeBig(value: string): bigint {
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}
