'use client';

import { useEffect } from 'react';
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { raiseVaultAbi } from '@/lib/abi';
import { txOverrides } from '@/lib/gas';

export interface UseRefund {
  /** A milestone has failed; pro-rata refunds are claimable. */
  refundsOpen: boolean;
  /** The caller's remaining contribution (0 once refunded). */
  contributed: bigint;
  /** What the caller can claim now: refundPool * contributed / totalRaised. */
  refundAmount: bigint;
  /** Index of the next milestone the governor must act on. */
  currentMilestone: number;
  milestoneCount: number;
  claim: () => void;
  claiming: boolean;
  claimHash?: `0x${string}`;
  claimed: boolean;
  forceFail: () => void;
  failing: boolean;
  failHash?: `0x${string}`;
  failed: boolean;
  error: Error | null;
}

/** Reads the vault's refund/expiry state and exposes the two permissionless
 *  actions: claimRefund (for a contributor once refunds open) and forceFail (the
 *  escape hatch anyone can trigger once a milestone deadline lapses). */
export function useRefund(vault: `0x${string}`): UseRefund {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const enabled = Boolean(address);

  const refundsOpenQ = useReadContract({
    address: vault,
    abi: raiseVaultAbi,
    functionName: 'refundsOpen',
  });
  const refundPoolQ = useReadContract({
    address: vault,
    abi: raiseVaultAbi,
    functionName: 'refundPool',
  });
  const totalRaisedQ = useReadContract({
    address: vault,
    abi: raiseVaultAbi,
    functionName: 'totalRaised',
  });
  const currentQ = useReadContract({
    address: vault,
    abi: raiseVaultAbi,
    functionName: 'currentMilestone',
  });
  const countQ = useReadContract({
    address: vault,
    abi: raiseVaultAbi,
    functionName: 'milestoneCount',
  });
  const contributedQ = useReadContract({
    address: vault,
    abi: raiseVaultAbi,
    functionName: 'contributions',
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const claimW = useWriteContract();
  const claimR = useWaitForTransactionReceipt({ hash: claimW.data });
  const failW = useWriteContract();
  const failR = useWaitForTransactionReceipt({ hash: failW.data });

  // A successful claim zeroes the contribution; a forceFail opens refunds. Refetch
  // the affected reads so the panel reflects the new on-chain state.
  useEffect(() => {
    if (claimR.isSuccess) void contributedQ.refetch();
  }, [claimR.isSuccess, contributedQ]);
  useEffect(() => {
    if (failR.isSuccess) {
      void refundsOpenQ.refetch();
      void refundPoolQ.refetch();
    }
  }, [failR.isSuccess, refundsOpenQ, refundPoolQ]);

  const claim = async () => {
    const fees = await txOverrides(publicClient, address, {
      address: vault,
      abi: raiseVaultAbi,
      functionName: 'claimRefund',
    });
    claimW.writeContract({
      address: vault,
      abi: raiseVaultAbi,
      functionName: 'claimRefund',
      ...fees,
    });
  };
  const forceFail = async () => {
    const fees = await txOverrides(publicClient, address, {
      address: vault,
      abi: raiseVaultAbi,
      functionName: 'forceFail',
    });
    failW.writeContract({ address: vault, abi: raiseVaultAbi, functionName: 'forceFail', ...fees });
  };

  const refundPool = refundPoolQ.data ?? 0n;
  const totalRaised = totalRaisedQ.data ?? 0n;
  const contributed = contributedQ.data ?? 0n;
  const refundAmount = totalRaised > 0n ? (refundPool * contributed) / totalRaised : 0n;

  return {
    refundsOpen: refundsOpenQ.data ?? false,
    contributed,
    refundAmount,
    currentMilestone: Number(currentQ.data ?? 0n),
    milestoneCount: Number(countQ.data ?? 0n),
    claim,
    claiming: claimW.isPending || claimR.isLoading,
    claimHash: claimW.data,
    claimed: claimR.isSuccess,
    forceFail,
    failing: failW.isPending || failR.isLoading,
    failHash: failW.data,
    failed: failR.isSuccess,
    error: claimW.error ?? claimR.error ?? failW.error ?? failR.error ?? null,
  };
}
