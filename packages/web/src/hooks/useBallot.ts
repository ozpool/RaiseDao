'use client';

import { useEffect } from 'react';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { milestoneGovernorAbi } from '@/lib/abi';

/** OZ Governor ProposalState. We only branch on a few, but name them all so the
 *  UI reads clearly. The chain is the source of truth for the timing guards:
 *  `Active` exists only between the snapshot and the deadline, so gating the
 *  vote button on it enforces "after the voting delay, within the period". */
export const ProposalState = {
  Pending: 0,
  Active: 1,
  Canceled: 2,
  Defeated: 3,
  Succeeded: 4,
  Queued: 5,
  Expired: 6,
  Executed: 7,
} as const;

/** Vote support codes the governor expects. */
export const Support = { Against: 0, For: 1, Abstain: 2 } as const;

/** What the ballot UI consumes. Annotated explicitly so the inferred wagmi error
 *  types don't leak un-nameable paths into the public signature (TS2742). */
export interface UseBallot {
  state: number | undefined;
  weight: bigint;
  hasVoted: boolean;
  /** Quorum threshold (For-vote weight needed) at the proposal snapshot. */
  quorum: bigint;
  /** Unix seconds the timelock unlocks execution, or 0n if not yet queued. */
  eta: bigint;
  vote: (support: number) => void;
  voting: boolean;
  done: boolean;
  hash?: `0x${string}`;
  error: Error | null;
}

/** Live ballot for one proposal: its state, quorum threshold, the connected
 *  voter's snapshot weight, whether they've voted, the timelock eta, and the
 *  castVote action. All reads come straight from the governor — the persisted
 *  record only supplies the id. `refreshKey` lets a parent re-pull the on-chain
 *  reads when a live socket event lands (a new vote, a queue). */
export function useBallot(governor: `0x${string}`, proposalId: string, refreshKey = 0): UseBallot {
  const { address } = useAccount();
  const id = BigInt(proposalId);

  const stateQ = useReadContract({
    address: governor,
    abi: milestoneGovernorAbi,
    functionName: 'state',
    args: [id],
  });
  const snapshotQ = useReadContract({
    address: governor,
    abi: milestoneGovernorAbi,
    functionName: 'proposalSnapshot',
    args: [id],
  });
  const weightQ = useReadContract({
    address: governor,
    abi: milestoneGovernorAbi,
    functionName: 'getVotes',
    args: address && snapshotQ.data !== undefined ? [address, snapshotQ.data] : undefined,
    query: { enabled: Boolean(address) && snapshotQ.data !== undefined },
  });
  const votedQ = useReadContract({
    address: governor,
    abi: milestoneGovernorAbi,
    functionName: 'hasVoted',
    args: address ? [id, address] : undefined,
    query: { enabled: Boolean(address) },
  });
  const quorumQ = useReadContract({
    address: governor,
    abi: milestoneGovernorAbi,
    functionName: 'quorum',
    args: snapshotQ.data !== undefined ? [snapshotQ.data] : undefined,
    query: { enabled: snapshotQ.data !== undefined },
  });
  const etaQ = useReadContract({
    address: governor,
    abi: milestoneGovernorAbi,
    functionName: 'proposalEta',
    args: [id],
  });

  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });

  // Refresh the on-chain reads that move when a vote confirms or a live socket
  // event (refreshKey) lands: vote totals shift state/quorum-progress, a queue
  // sets the eta. The snapshot/weight are fixed once set, so they aren't refetched.
  useEffect(() => {
    if (receipt.isSuccess || refreshKey) {
      void votedQ.refetch();
      void stateQ.refetch();
      void etaQ.refetch();
    }
  }, [receipt.isSuccess, refreshKey, votedQ, stateQ, etaQ]);

  const vote = (support: number) =>
    write.writeContract({
      address: governor,
      abi: milestoneGovernorAbi,
      functionName: 'castVote',
      args: [id, support],
    });

  return {
    state: stateQ.data as number | undefined,
    weight: weightQ.data ?? 0n,
    hasVoted: votedQ.data ?? false,
    quorum: quorumQ.data ?? 0n,
    eta: etaQ.data ?? 0n,
    vote,
    voting: write.isPending || receipt.isLoading,
    done: receipt.isSuccess,
    hash: write.data,
    error: write.error ?? receipt.error ?? null,
  };
}
