'use client';

import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { milestoneGovernorAbi } from '@/lib/abi';
import { buildExecuteArgs } from '@/lib/proposal';

/** What the execute/release panel consumes. Annotated explicitly so inferred
 *  wagmi error types don't escape as un-nameable paths (TS2742). */
export interface UseExecuteProposal {
  queue: () => void;
  execute: () => void;
  /** true while the queue write is in-flight or the receipt is still loading. */
  queuing: boolean;
  /** true while the execute write is in-flight or the receipt is still loading. */
  executing: boolean;
  queueHash?: `0x${string}`;
  executeHash?: `0x${string}`;
  /** true once the queue tx receipt confirms. */
  queued: boolean;
  /** true once the execute tx receipt confirms. */
  executed: boolean;
  error: Error | null;
}

/** Two-step finalization for a passed milestone proposal: queue it through the
 *  OZ timelock, then execute once the eta passes. Both calls are permissionless —
 *  any address can send them, not just the founder. */
export function useExecuteProposal({
  governor,
  vault,
  milestoneIndex,
  description,
}: {
  governor: `0x${string}`;
  vault: `0x${string}`;
  milestoneIndex: number;
  description: string;
}): UseExecuteProposal {
  // Deterministic args derived from stored proposal fields — same encoding the
  // governor hashed at propose-time, so queue/execute don't revert.
  const args = buildExecuteArgs(vault, milestoneIndex, description);

  const queueW = useWriteContract();
  const executeW = useWriteContract();
  const queueR = useWaitForTransactionReceipt({ hash: queueW.data });
  const executeR = useWaitForTransactionReceipt({ hash: executeW.data });

  const queue = () =>
    queueW.writeContract({
      address: governor,
      abi: milestoneGovernorAbi,
      functionName: 'queue',
      args: [
        args.targets as `0x${string}`[],
        args.values as bigint[],
        args.calldatas as `0x${string}`[],
        args.descriptionHash,
      ],
    });

  const execute = () =>
    executeW.writeContract({
      address: governor,
      abi: milestoneGovernorAbi,
      functionName: 'execute',
      args: [
        args.targets as `0x${string}`[],
        args.values as bigint[],
        args.calldatas as `0x${string}`[],
        args.descriptionHash,
      ],
    });

  return {
    queue,
    execute,
    queuing: queueW.isPending || queueR.isLoading,
    executing: executeW.isPending || executeR.isLoading,
    queueHash: queueW.data,
    executeHash: executeW.data,
    queued: queueR.isSuccess,
    executed: executeR.isSuccess,
    error: queueW.error ?? queueR.error ?? executeW.error ?? executeR.error ?? null,
  };
}
