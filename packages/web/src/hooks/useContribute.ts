'use client';

import { useEffect, useMemo } from 'react';
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { decodeEventLog } from 'viem';
import { erc20Abi, raiseVaultAbi } from '@/lib/abi';
import { USDC_ADDRESS } from '@/lib/config';
import { txOverrides } from '@/lib/gas';

export interface UseContribute {
  balance: bigint;
  allowance: bigint;
  approve: (amount: bigint) => void;
  contribute: (amount: bigint) => void;
  approving: boolean;
  contributing: boolean;
  approveHash?: `0x${string}`;
  contributeHash?: `0x${string}`;
  mintedVotes: bigint | null;
  done: boolean;
  error: Error | null;
}

/** The two-step USDC contribution: approve the vault to pull `amount`, then call
 *  vault.contribute. Reads the live allowance/balance so the UI knows which step
 *  is next, and pulls the minted vote count out of the Contributed event. */
export function useContribute(vault: `0x${string}`): UseContribute {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const enabled = Boolean(address);

  const allowanceQ = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, vault] : undefined,
    query: { enabled },
  });
  const balanceQ = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const approveW = useWriteContract();
  const contributeW = useWriteContract();
  const approveR = useWaitForTransactionReceipt({ hash: approveW.data });
  const contributeR = useWaitForTransactionReceipt({ hash: contributeW.data });

  // Refresh the allowance once an approval confirms, so the UI advances to step 2.
  useEffect(() => {
    if (approveR.isSuccess) void allowanceQ.refetch();
  }, [approveR.isSuccess, allowanceQ]);

  const approve = async (amount: bigint) => {
    const fees = await txOverrides(publicClient, address, {
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [vault, amount],
    });
    approveW.writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [vault, amount],
      ...fees,
    });
  };
  const contribute = async (amount: bigint) => {
    const fees = await txOverrides(publicClient, address, {
      address: vault,
      abi: raiseVaultAbi,
      functionName: 'contribute',
      args: [amount],
    });
    contributeW.writeContract({
      address: vault,
      abi: raiseVaultAbi,
      functionName: 'contribute',
      args: [amount],
      ...fees,
    });
  };

  const mintedVotes = useMemo<bigint | null>(() => {
    if (!contributeR.data) return null;
    for (const log of contributeR.data.logs) {
      try {
        const ev = decodeEventLog({ abi: raiseVaultAbi, data: log.data, topics: log.topics });
        if (ev.eventName === 'Contributed') return ev.args.votesMinted;
      } catch {
        // not the Contributed event
      }
    }
    return null;
  }, [contributeR.data]);

  return {
    balance: balanceQ.data ?? 0n,
    allowance: allowanceQ.data ?? 0n,
    approve,
    contribute,
    approving: approveW.isPending || approveR.isLoading,
    contributing: contributeW.isPending || contributeR.isLoading,
    approveHash: approveW.data,
    contributeHash: contributeW.data,
    mintedVotes,
    done: contributeR.isSuccess,
    error: approveW.error ?? approveR.error ?? contributeW.error ?? contributeR.error ?? null,
  };
}
