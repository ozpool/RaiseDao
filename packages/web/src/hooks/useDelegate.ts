'use client';

import { useEffect } from 'react';
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { zeroAddress } from 'viem';
import { govTokenAbi } from '@/lib/abi';
import { txOverrides } from '@/lib/gas';

export interface UseDelegate {
  /** GovToken balance of the connected wallet (18 dec, soulbound). */
  balance: bigint;
  /** True once the wallet has any delegate set — voting power is live. */
  delegated: boolean;
  /** Self-delegate to activate the wallet's own minted votes. */
  activate: () => void;
  activating: boolean;
  activateHash?: `0x${string}`;
  /** True the moment a freshly-sent activation confirms. */
  done: boolean;
  error: Error | null;
}

/** ERC20Votes only counts a holder's balance toward `getVotes` once a delegate is
 *  set; the vault mints soulbound votes but never delegates, so a contributor's
 *  power stays dormant until they call `delegate(self)` once. This hook reads
 *  whether that's been done and exposes the one-click activation. */
export function useDelegate(token: `0x${string}`): UseDelegate {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const enabled = Boolean(address);

  const balanceQ = useReadContract({
    address: token,
    abi: govTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled },
  });
  const delegateeQ = useReadContract({
    address: token,
    abi: govTokenAbi,
    functionName: 'delegates',
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const activateW = useWriteContract();
  const activateR = useWaitForTransactionReceipt({ hash: activateW.data });

  // Refresh the delegate once activation confirms, so the CTA flips to confirmed.
  useEffect(() => {
    if (activateR.isSuccess) void delegateeQ.refetch();
  }, [activateR.isSuccess, delegateeQ]);

  const activate = async () => {
    if (!address) return;
    const fees = await txOverrides(publicClient, address, {
      address: token,
      abi: govTokenAbi,
      functionName: 'delegate',
      args: [address],
    });
    activateW.writeContract({
      address: token,
      abi: govTokenAbi,
      functionName: 'delegate',
      args: [address],
      ...fees,
    });
  };

  const delegatee = delegateeQ.data;

  return {
    balance: balanceQ.data ?? 0n,
    delegated: Boolean(delegatee && delegatee !== zeroAddress),
    activate,
    activating: activateW.isPending || activateR.isLoading,
    activateHash: activateW.data,
    done: activateR.isSuccess,
    error: activateW.error ?? activateR.error ?? null,
  };
}
